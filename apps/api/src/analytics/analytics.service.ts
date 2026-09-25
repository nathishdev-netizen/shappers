import { Injectable } from '@nestjs/common';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const MONTHLY_EQUIVALENT: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
  ONE_TIME: 0,
};

// Bucket keys must be built from local calendar parts. toISOString() converts to
// UTC first, which shifts every date into the previous bucket east of Greenwich.
function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(tenantId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday.getTime() + 86_400_000);
    const weekAhead = new Date(startOfToday.getTime() + 7 * 86_400_000);

    const [
      members, subscriptions, checkedInToday, attendanceTrend, revenueByMonth,
      registrations, trainersAvailable, classesToday, expiringSoon, sessionsToday, openLeads, dueAgg,
    ] = await Promise.all([
      this.prisma.member.count({ where: { tenantId } }),
      this.prisma.subscription.findMany({
        where: { member: { tenantId } },
        include: { membershipPlan: true },
      }),
      this.prisma.attendanceEvent.count({
        where: { tenantId, checkedInAt: { gte: startOfToday } },
      }),
      this.attendanceTrend(tenantId, 14),
      this.revenueByMonth(tenantId, 6),
      this.registrationsByDay(tenantId, 7),
      this.prisma.user.count({ where: { tenantId, isActive: true, role: 'TRAINER' } }),
      this.prisma.gymClass.count({
        where: { tenantId, startsAt: { gte: startOfToday, lt: endOfToday } },
      }),
      this.prisma.subscription.findMany({
        where: {
          member: { tenantId },
          status: 'ACTIVE',
          currentPeriodEnd: { gte: startOfToday, lte: weekAhead },
        },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, phone: true } },
          membershipPlan: { select: { name: true, priceCents: true } },
        },
        orderBy: { currentPeriodEnd: 'asc' },
        take: 8,
      }),
      this.prisma.ptSession.findMany({
        where: {
          member: { tenantId },
          scheduledAt: { gte: startOfToday, lt: endOfToday },
          status: 'SCHEDULED',
        },
        include: {
          member: { select: { firstName: true, lastName: true } },
          trainer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.lead.count({ where: { tenantId, status: { in: ['NEW', 'CONTACTED', 'TRIAL'] } } }),
      this.prisma.payment.aggregate({
        where: { subscription: { member: { tenantId } }, status: { in: ['PENDING', 'FAILED'] } },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);

    const active = subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE);
    const overdue = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.PAST_DUE || s.currentPeriodEnd < new Date(),
    );

    const mrrCents = active.reduce((sum, s) => {
      const factor = MONTHLY_EQUIVALENT[s.membershipPlan.billingCycle] ?? 0;
      return sum + s.membershipPlan.priceCents * factor;
    }, 0);

    const planCounts = new Map<string, { name: string; count: number }>();
    for (const sub of active) {
      const entry = planCounts.get(sub.membershipPlanId) ?? {
        name: sub.membershipPlan.name,
        count: 0,
      };
      entry.count += 1;
      planCounts.set(sub.membershipPlanId, entry);
    }

    return {
      totals: {
        members,
        activeSubscriptions: active.length,
        overdueSubscriptions: overdue.length,
        checkedInToday,
        mrrCents: Math.round(mrrCents),
        trainersAvailable,
        classesToday,
        openLeads,
        sessionsToday: sessionsToday.length,
        outstandingCents: dueAgg._sum.amountCents ?? 0,
        outstandingInvoices: dueAgg._count,
      },
      attendanceTrend,
      revenueByMonth,
      registrations,
      expiringSoon,
      sessionsToday,
      planDistribution: [...planCounts.values()].sort((a, b) => b.count - a.count),
    };
  }

  /** New sign-ups per day — the "Members Registrations" chart. */
  private async registrationsByDay(tenantId: string, days: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const members = await this.prisma.member.findMany({
      where: { tenantId, createdAt: { gte: start } },
      select: { createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      buckets.set(dayKey(day), 0);
    }
    for (const m of members) {
      const key = dayKey(m.createdAt);
      if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
    }
    return [...buckets.entries()].map(([date, count]) => ({ date, count }));
  }

  private async attendanceTrend(tenantId: string, days: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const events = await this.prisma.attendanceEvent.findMany({
      where: { tenantId, checkedInAt: { gte: start } },
      select: { checkedInAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      buckets.set(dayKey(day), 0);
    }

    for (const event of events) {
      const key = dayKey(event.checkedInAt);
      if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
    }

    return [...buckets.entries()].map(([date, checkIns]) => ({ date, checkIns }));
  }

  private async revenueByMonth(tenantId: string, months: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(1);
    start.setMonth(start.getMonth() - (months - 1));

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: { gte: start },
        subscription: { member: { tenantId } },
      },
      select: { amountCents: true, paidAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      const month = new Date(start);
      month.setMonth(start.getMonth() + i);
      buckets.set(monthKey(month), 0);
    }

    for (const payment of payments) {
      if (!payment.paidAt) continue;
      const key = monthKey(payment.paidAt);
      if (buckets.has(key)) buckets.set(key, buckets.get(key)! + payment.amountCents);
    }

    return [...buckets.entries()].map(([month, amountCents]) => ({ month, amountCents }));
  }
}
