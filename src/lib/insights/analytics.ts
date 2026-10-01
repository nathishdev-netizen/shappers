import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const MONTHLY_EQUIVALENT: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
  ONE_TIME: 0,
};

// Bucket keys must be built from local calendar parts. toISOString() converts to
// UTC first, which shifts every date into the previous bucket east of Greenwich.
function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

async function registrationsByDay(supabase: SupabaseClient<Database>, start: Date, days: number) {
  const { data: members } = await supabase.from("members").select("created_at").gte("created_at", start.toISOString());

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    buckets.set(dayKey(day), 0);
  }
  for (const m of members ?? []) {
    const key = dayKey(new Date(m.created_at));
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

async function attendanceTrend(supabase: SupabaseClient<Database>, start: Date, days: number) {
  const { data: events } = await supabase
    .from("attendance_events")
    .select("checked_in_at")
    .gte("checked_in_at", start.toISOString());

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    buckets.set(dayKey(day), 0);
  }
  for (const event of events ?? []) {
    const key = dayKey(new Date(event.checked_in_at));
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }
  return [...buckets.entries()].map(([date, checkIns]) => ({ date, checkIns }));
}

async function revenueByMonth(supabase: SupabaseClient<Database>, months: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(1);
  start.setMonth(start.getMonth() - (months - 1));

  const { data: payments } = await supabase
    .from("payments")
    .select("amount_cents, paid_at")
    .eq("status", "SUCCEEDED")
    .gte("paid_at", start.toISOString());

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const month = new Date(start);
    month.setMonth(start.getMonth() + i);
    buckets.set(monthKey(month), 0);
  }
  for (const payment of payments ?? []) {
    if (!payment.paid_at) continue;
    const key = monthKey(new Date(payment.paid_at));
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + payment.amount_cents);
  }
  return [...buckets.entries()].map(([month, amountCents]) => ({ month, amountCents }));
}

/** Everything the dashboard needs, fetched in parallel and aggregated client-side
 * over RLS-scoped rows — mirrors the shape of the old NestJS AnalyticsService. */
export async function getAnalyticsOverview(supabase: SupabaseClient<Database>) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000);
  const weekAhead = new Date(startOfToday.getTime() + 7 * 86_400_000);
  const trendStart = new Date(startOfToday);
  trendStart.setDate(trendStart.getDate() - 13);
  const regStart = new Date(startOfToday);
  regStart.setDate(regStart.getDate() - 6);

  const [
    membersCount,
    subscriptionsRes,
    checkedInTodayCount,
    trend,
    revenue,
    registrations,
    trainersCount,
    classesTodayCount,
    expiringSoonRes,
    sessionsTodayRes,
    openLeadsCount,
    dueRes,
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*, membership_plan:membership_plans(*)"),
    supabase.from("attendance_events").select("*", { count: "exact", head: true }).gte("checked_in_at", startOfToday.toISOString()),
    attendanceTrend(supabase, trendStart, 14),
    revenueByMonth(supabase, 6),
    registrationsByDay(supabase, regStart, 7),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true).eq("role", "TRAINER"),
    supabase.from("gym_classes").select("*", { count: "exact", head: true }).gte("starts_at", startOfToday.toISOString()).lt("starts_at", endOfToday.toISOString()),
    supabase
      .from("subscriptions")
      .select("*, member:members(id, first_name, last_name, phone), membership_plan:membership_plans(name, price_cents)")
      .eq("status", "ACTIVE")
      .gte("current_period_end", startOfToday.toISOString())
      .lte("current_period_end", weekAhead.toISOString())
      .order("current_period_end", { ascending: true })
      .limit(8),
    supabase
      .from("pt_sessions")
      .select("*, member:members(first_name, last_name), trainer:profiles(first_name, last_name)")
      .gte("scheduled_at", startOfToday.toISOString())
      .lt("scheduled_at", endOfToday.toISOString())
      .eq("status", "SCHEDULED")
      .order("scheduled_at", { ascending: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).in("status", ["NEW", "CONTACTED", "TRIAL"]),
    supabase.from("payments").select("amount_cents").in("status", ["PENDING", "FAILED"]),
  ]);

  const subscriptions = subscriptionsRes.data ?? [];
  const active = subscriptions.filter((s) => s.status === "ACTIVE");
  const overdue = subscriptions.filter((s) => s.status === "PAST_DUE" || new Date(s.current_period_end) < new Date());

  const mrrCents = active.reduce((sum, s) => {
    const factor = MONTHLY_EQUIVALENT[s.membership_plan!.billing_cycle] ?? 0;
    return sum + s.membership_plan!.price_cents * factor;
  }, 0);

  const planCounts = new Map<string, { name: string; count: number }>();
  for (const sub of active) {
    const entry = planCounts.get(sub.membership_plan_id) ?? { name: sub.membership_plan!.name, count: 0 };
    entry.count += 1;
    planCounts.set(sub.membership_plan_id, entry);
  }

  const dueRows = dueRes.data ?? [];

  return {
    totals: {
      members: membersCount.count ?? 0,
      activeSubscriptions: active.length,
      overdueSubscriptions: overdue.length,
      checkedInToday: checkedInTodayCount.count ?? 0,
      mrrCents: Math.round(mrrCents),
      trainersAvailable: trainersCount.count ?? 0,
      classesToday: classesTodayCount.count ?? 0,
      openLeads: openLeadsCount.count ?? 0,
      sessionsToday: (sessionsTodayRes.data ?? []).length,
      outstandingCents: dueRows.reduce((sum, p) => sum + p.amount_cents, 0),
      outstandingInvoices: dueRows.length,
    },
    attendanceTrend: trend,
    revenueByMonth: revenue,
    registrations,
    expiringSoon: expiringSoonRes.data ?? [],
    sessionsToday: sessionsTodayRes.data ?? [],
    planDistribution: [...planCounts.values()].sort((a, b) => b.count - a.count),
  };
}

/** Subscriptions that are past due or whose period has already lapsed — the
 * dashboard's "payments to follow up" list. */
export async function getDuesOverview(supabase: SupabaseClient<Database>) {
  const { data } = await supabase
    .from("subscriptions")
    .select("*, member:members(*), membership_plan:membership_plans(*)")
    .or(`status.eq.PAST_DUE,current_period_end.lt.${new Date().toISOString()}`);

  return data ?? [];
}
