import type { Database } from "@/lib/supabase/types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type SubscriptionFreeze = Database["public"]["Tables"]["subscription_freezes"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type AttendanceEvent = Database["public"]["Tables"]["attendance_events"]["Row"];
type MembershipPlan = Database["public"]["Tables"]["membership_plans"]["Row"];

const DAY_MS = 86_400_000;

export type ChurnRisk = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface AccessStatus {
  allowed: boolean;
  reason: "ACTIVE" | "NO_SUBSCRIPTION" | "EXPIRED" | "PAST_DUE" | "CANCELLED" | "FROZEN" | "MANUALLY_BLOCKED";
  /** Days of gym access left on the current period. Negative once expired. */
  daysRemaining: number | null;
  validUntil: Date | null;
  frozenUntil: Date | null;
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Whether this member may walk through the door right now, and for how much longer.
 * A manual block beats everything; an active freeze beats an otherwise-valid period.
 */
export function computeAccessStatus(
  subscription: (Subscription & { freezes?: SubscriptionFreeze[] }) | null | undefined,
  accessBlocked: boolean,
  now = new Date(),
): AccessStatus {
  if (accessBlocked) {
    return { allowed: false, reason: "MANUALLY_BLOCKED", daysRemaining: null, validUntil: null, frozenUntil: null };
  }

  if (!subscription) {
    return { allowed: false, reason: "NO_SUBSCRIPTION", daysRemaining: null, validUntil: null, frozenUntil: null };
  }

  const validUntil = new Date(subscription.current_period_end);
  const daysRemaining = daysBetween(now, validUntil);

  const activeFreeze = subscription.freezes?.find(
    (f) => new Date(f.start_date) <= now && new Date(f.end_date) >= now,
  );
  if (activeFreeze || subscription.status === "FROZEN") {
    return {
      allowed: false,
      reason: "FROZEN",
      daysRemaining,
      validUntil,
      frozenUntil: activeFreeze ? new Date(activeFreeze.end_date) : null,
    };
  }

  if (subscription.status === "CANCELLED") {
    return { allowed: false, reason: "CANCELLED", daysRemaining, validUntil, frozenUntil: null };
  }

  if (validUntil < now) {
    return { allowed: false, reason: "EXPIRED", daysRemaining, validUntil, frozenUntil: null };
  }

  if (subscription.status === "PAST_DUE") {
    return { allowed: false, reason: "PAST_DUE", daysRemaining, validUntil, frozenUntil: null };
  }

  return { allowed: true, reason: "ACTIVE", daysRemaining, validUntil, frozenUntil: null };
}

export interface VisitStats {
  lastVisitAt: Date | null;
  daysSinceLastVisit: number | null;
  visitsLast30: number;
  visitsPrev30: number;
  /** Percentage change between the two 30-day windows. Null when there is no baseline. */
  trendPercent: number | null;
  /** Hour of day (0-23) the member most often turns up. */
  usualHour: number | null;
}

export function computeVisitStats(events: AttendanceEvent[], now = new Date()): VisitStats {
  if (events.length === 0) {
    return { lastVisitAt: null, daysSinceLastVisit: null, visitsLast30: 0, visitsPrev30: 0, trendPercent: null, usualHour: null };
  }

  const checkedInAt = (e: AttendanceEvent) => new Date(e.checked_in_at);
  const sorted = [...events].sort((a, b) => checkedInAt(b).getTime() - checkedInAt(a).getTime());
  const lastVisitAt = checkedInAt(sorted[0]);

  const cutoff30 = new Date(now.getTime() - 30 * DAY_MS);
  const cutoff60 = new Date(now.getTime() - 60 * DAY_MS);

  const visitsLast30 = events.filter((e) => checkedInAt(e) >= cutoff30).length;
  const visitsPrev30 = events.filter((e) => checkedInAt(e) >= cutoff60 && checkedInAt(e) < cutoff30).length;

  const hourCounts = new Map<number, number>();
  for (const event of events) {
    const hour = checkedInAt(event).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const usualHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  return {
    lastVisitAt,
    daysSinceLastVisit: daysBetween(lastVisitAt, now),
    visitsLast30,
    visitsPrev30,
    trendPercent: visitsPrev30 === 0 ? null : Math.round(((visitsLast30 - visitsPrev30) / visitsPrev30) * 100),
    usualHour,
  };
}

/**
 * Attendance decay is the earliest reliable churn signal, so risk is driven by
 * silence since the last visit first, and by the drop between 30-day windows second.
 */
export function computeChurnRisk(stats: VisitStats, access: AccessStatus): ChurnRisk {
  if (stats.lastVisitAt === null) return "UNKNOWN";

  const silent = stats.daysSinceLastVisit ?? 0;
  if (silent >= 14) return "HIGH";
  if (!access.allowed && access.reason === "PAST_DUE") return "HIGH";

  const drop = stats.trendPercent;
  if (drop !== null && drop <= -60) return "HIGH";
  if (silent >= 7) return "MEDIUM";
  if (drop !== null && drop <= -30) return "MEDIUM";

  return "LOW";
}

export function computeOutstandingCents(payments: Payment[]): number {
  return payments.filter((p) => p.status === "PENDING" || p.status === "FAILED").reduce((sum, p) => sum + p.amount_cents, 0);
}

export interface PaymentSummary {
  planName: string | null;
  planPriceCents: number | null;
  billingCycle: string | null;
  /** Everything invoiced against the current membership — paid plus still owing. */
  totalBilledCents: number;
  paidCents: number;
  outstandingCents: number;
  /** 0-1, for a progress bar. 1 when nothing is owed. */
  paidRatio: number;
  nextDueAt: Date | null;
  lastPaidAt: Date | null;
  instalments: number;
}

/** "What's the plan, how much have they paid, how much is left" in one object. */
export function buildPaymentSummary(
  subscription: (Subscription & { membershipPlan: Pick<MembershipPlan, "name" | "price_cents" | "billing_cycle">; payments: Payment[] }) | null | undefined,
): PaymentSummary {
  if (!subscription) {
    return {
      planName: null, planPriceCents: null, billingCycle: null,
      totalBilledCents: 0, paidCents: 0, outstandingCents: 0, paidRatio: 0,
      nextDueAt: null, lastPaidAt: null, instalments: 0,
    };
  }

  const paid = subscription.payments.filter((p) => p.status === "SUCCEEDED");
  const owing = subscription.payments.filter((p) => p.status === "PENDING" || p.status === "FAILED");

  const paidCents = paid.reduce((s, p) => s + p.amount_cents, 0);
  const outstandingCents = owing.reduce((s, p) => s + p.amount_cents, 0);
  const totalBilledCents = paidCents + outstandingCents;

  const nextDue = owing
    .filter((p) => p.due_at)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
  const lastPaid = paid
    .filter((p) => p.paid_at)
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0];

  return {
    planName: subscription.membershipPlan.name,
    planPriceCents: subscription.membershipPlan.price_cents,
    billingCycle: subscription.membershipPlan.billing_cycle,
    totalBilledCents,
    paidCents,
    outstandingCents,
    paidRatio: totalBilledCents === 0 ? 1 : paidCents / totalBilledCents,
    nextDueAt: nextDue?.due_at ? new Date(nextDue.due_at) : null,
    lastPaidAt: lastPaid?.paid_at ? new Date(lastPaid.paid_at) : null,
    instalments: subscription.payments.length,
  };
}

export function computeBmi(heightCm: number | null, weightKg: number | null | undefined) {
  if (!heightCm || !weightKg) return null;
  const metres = heightCm / 100;
  return Math.round((weightKg / (metres * metres)) * 10) / 10;
}

export type TimelineEvent = {
  id: string;
  at: Date;
  kind: "JOINED" | "PAYMENT" | "FREEZE" | "PLAN_START" | "EXPIRY";
  title: string;
  detail?: string;
  status?: "good" | "warning" | "critical" | "neutral";
  amountCents?: number;
};

/**
 * One merged, chronological fee-and-access story: joining, every payment, freezes,
 * plan periods, and the upcoming expiry — newest first.
 */
export function buildTimeline(
  memberCreatedAt: Date,
  subscriptions: (Subscription & { membershipPlan: Pick<MembershipPlan, "name">; payments: Payment[]; freezes: SubscriptionFreeze[] })[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: "joined", at: memberCreatedAt, kind: "JOINED", title: "Joined the club", status: "neutral" },
  ];

  for (const sub of subscriptions) {
    const currentPeriodEnd = new Date(sub.current_period_end);

    events.push({
      id: `sub-${sub.id}`,
      at: new Date(sub.start_date),
      kind: "PLAN_START",
      title: `${sub.membershipPlan.name} started`,
      status: "neutral",
    });

    if (sub.status !== "CANCELLED") {
      events.push({
        id: `exp-${sub.id}`,
        at: currentPeriodEnd,
        kind: "EXPIRY",
        title: currentPeriodEnd < new Date() ? `${sub.membershipPlan.name} expired` : `${sub.membershipPlan.name} renews`,
        status: currentPeriodEnd < new Date() ? "critical" : "good",
      });
    }

    for (const payment of sub.payments) {
      const succeeded = payment.status === "SUCCEEDED";
      events.push({
        id: `pay-${payment.id}`,
        at: new Date(payment.paid_at ?? payment.due_at ?? payment.created_at),
        kind: "PAYMENT",
        title: succeeded ? "Payment received" : `Payment ${payment.status.toLowerCase()}`,
        detail: payment.method ?? undefined,
        status: succeeded ? "good" : payment.status === "FAILED" ? "critical" : "warning",
        amountCents: payment.amount_cents,
      });
    }

    for (const freeze of sub.freezes) {
      events.push({
        id: `frz-${freeze.id}`,
        at: new Date(freeze.start_date),
        kind: "FREEZE",
        title: `Membership frozen (${freeze.reason.toLowerCase()})`,
        detail: freeze.note ?? undefined,
        status: "warning",
      });
    }
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
