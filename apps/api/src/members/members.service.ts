import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingCycle, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { AddNoteDto } from './dto/add-note.dto.js';
import { AddMeasurementDto } from './dto/add-measurement.dto.js';
import {
  buildPaymentSummary,
  buildTimeline,
  computeAccessStatus,
  computeBmi,
  computeChurnRisk,
  computeOutstandingCents,
  computeVisitStats,
} from './member-insights.js';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateMemberDto) {
    const { membership, parqCompleted, waiverSigned, ...profile } = dto;

    const plan = membership
      ? await this.prisma.membershipPlan.findFirst({
          where: { id: membership.membershipPlanId, tenantId },
        })
      : null;

    if (membership && !plan) throw new NotFoundException('Membership plan not found');

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          tenantId,
          ...profile,
          dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
          parqCompletedAt: parqCompleted ? now : null,
          waiverSignedAt: waiverSigned ? now : null,
        },
      });

      if (!membership || !plan) {
        return tx.member.findUniqueOrThrow({
          where: { id: member.id },
          include: { subscriptions: { include: { membershipPlan: true } } },
        });
      }

      const startDate = membership.startDate ? new Date(membership.startDate) : now;
      const durationDays = membership.durationDays ?? daysForCycle(plan.billingCycle);
      const currentPeriodEnd = addDays(startDate, durationDays);

      const totalFeeCents = membership.totalFeeCents ?? plan.priceCents;
      const paidCents = Math.min(membership.amountPaidCents ?? 0, totalFeeCents);
      const balanceCents = totalFeeCents - paidCents;

      const subscription = await tx.subscription.create({
        data: {
          memberId: member.id,
          membershipPlanId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          currentPeriodEnd,
        },
      });

      if (paidCents > 0) {
        await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            amountCents: paidCents,
            currency: plan.currency,
            status: PaymentStatus.SUCCEEDED,
            method: membership.paymentMethod,
            provider: 'mock',
            paidAt: now,
          },
        });
      }

      // The unpaid remainder becomes a real due row, so it shows up in the
      // outstanding balance and the dues list rather than being invisible.
      if (balanceCents > 0) {
        await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            amountCents: balanceCents,
            currency: plan.currency,
            status: PaymentStatus.PENDING,
            method: membership.paymentMethod,
            provider: 'mock',
            dueAt: membership.balanceDueAt ? new Date(membership.balanceDueAt) : currentPeriodEnd,
          },
        });
      }

      return tx.member.findUniqueOrThrow({
        where: { id: member.id },
        include: { subscriptions: { include: { membershipPlan: true, payments: true } } },
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateMemberDto) {
    await this.assertExists(tenantId, id);

    return this.prisma.member.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  /** Roster view — enough per row to triage, without loading every member's full history. */
  async findAll(tenantId: string) {
    const members = await this.prisma.member.findMany({
      where: { tenantId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { membershipPlan: true, freezes: true },
        },
        attendanceEvents: { orderBy: { checkedInAt: 'desc' }, take: 60 },
        assignedTrainer: { select: { firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((member) => {
      const subscription = member.subscriptions[0] ?? null;
      const access = computeAccessStatus(subscription, member.accessBlocked);
      const visits = computeVisitStats(member.attendanceEvents);

      const { attendanceEvents, ...rest } = member;
      return {
        ...rest,
        access,
        visits,
        churnRisk: computeChurnRisk(visits, access),
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
      include: {
        assignedTrainer: { select: { id: true, firstName: true, lastName: true } },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: {
            membershipPlan: true,
            payments: { orderBy: { createdAt: 'desc' } },
            freezes: { orderBy: { startDate: 'desc' } },
          },
        },
        attendanceEvents: { orderBy: { checkedInAt: 'desc' }, take: 120 },
        measurements: { orderBy: { recordedAt: 'desc' } },
        memberNotes: {
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          include: { author: { select: { firstName: true, lastName: true } } },
        },
        ptPackages: {
          include: {
            trainer: { select: { firstName: true, lastName: true } },
            sessions: { orderBy: { scheduledAt: 'desc' } },
          },
        },
        dietPlans: {
          orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
          include: { trainer: { select: { firstName: true, lastName: true } } },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!member) throw new NotFoundException('Member not found');

    const subscription = member.subscriptions[0] ?? null;
    const access = computeAccessStatus(subscription, member.accessBlocked);
    const visits = computeVisitStats(member.attendanceEvents);
    const allPayments = member.subscriptions.flatMap((s) => s.payments);
    const latestMeasurement = member.measurements[0] ?? null;

    const ptSummary = member.ptPackages.reduce(
      (acc, pkg) => {
        acc.purchased += pkg.sessionsPurchased;
        acc.used += pkg.sessions.filter((s) => s.status === 'COMPLETED').length;
        acc.scheduled += pkg.sessions.filter((s) => s.status === 'SCHEDULED').length;
        return acc;
      },
      { purchased: 0, used: 0, scheduled: 0 },
    );

    const upcomingSessions = member.ptPackages
      .flatMap((p) => p.sessions)
      .filter((s) => s.status === 'SCHEDULED' && s.scheduledAt >= new Date())
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .slice(0, 5);

    return {
      ...member,
      access,
      visits,
      churnRisk: computeChurnRisk(visits, access),
      outstandingCents: computeOutstandingCents(allPayments),
      paymentSummary: buildPaymentSummary(subscription),
      bmi: computeBmi(member.heightCm, latestMeasurement?.weightKg),
      latestMeasurement,
      ptSummary: { ...ptSummary, remaining: ptSummary.purchased - ptSummary.used },
      upcomingSessions,
      activeDietPlan: member.dietPlans.find((d) => d.isActive) ?? null,
      timeline: buildTimeline(member.createdAt, member.subscriptions),
    };
  }

  async duesOverview(tenantId: string) {
    return this.prisma.subscription.findMany({
      where: {
        member: { tenantId },
        OR: [{ status: SubscriptionStatus.PAST_DUE }, { currentPeriodEnd: { lt: new Date() } }],
      },
      include: { member: true, membershipPlan: true },
    });
  }

  async addNote(tenantId: string, memberId: string, authorId: string, dto: AddNoteDto) {
    await this.assertExists(tenantId, memberId);

    return this.prisma.memberNote.create({
      data: { memberId, authorId, body: dto.body, pinned: dto.pinned ?? false },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
  }

  async addMeasurement(tenantId: string, memberId: string, dto: AddMeasurementDto) {
    await this.assertExists(tenantId, memberId);
    return this.prisma.bodyMeasurement.create({ data: { memberId, ...dto } });
  }

  private async assertExists(tenantId: string, id: string) {
    const found = await this.prisma.member.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!found) throw new NotFoundException('Member not found');
  }
}

/** Default length of a membership period, before staff override it. */
function daysForCycle(cycle: BillingCycle): number {
  switch (cycle) {
    case BillingCycle.MONTHLY:
      return 30;
    case BillingCycle.QUARTERLY:
      return 90;
    case BillingCycle.YEARLY:
      return 365;
    default:
      return 30;
  }
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
