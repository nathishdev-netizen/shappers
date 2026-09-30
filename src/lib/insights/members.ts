import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  buildPaymentSummary,
  buildTimeline,
  computeAccessStatus,
  computeBmi,
  computeChurnRisk,
  computeOutstandingCents,
  computeVisitStats,
} from "./member-insights";

type BillingCycle = Database["public"]["Enums"]["billing_cycle"];

/** Default length of a membership period, before staff override it. */
function daysForCycle(cycle: BillingCycle): number {
  switch (cycle) {
    case "MONTHLY":
      return 30;
    case "QUARTERLY":
      return 90;
    case "YEARLY":
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

/** Roster view — enough per row to triage, without loading every member's full history. */
export async function listMembers(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("members")
    .select(
      `*,
      subscriptions(*, membership_plan:membership_plans(*), freezes:subscription_freezes(*)),
      attendance_events(checked_in_at),
      assigned_trainer:profiles!members_assigned_trainer_id_fkey(first_name, last_name),
      branch:branches(id, name)`,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((member) => {
    const subscriptions = [...member.subscriptions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const subscription = subscriptions[0] ?? null;
    const access = computeAccessStatus(subscription, member.access_blocked);
    const visits = computeVisitStats(member.attendance_events as never);

    const { attendance_events, ...rest } = member;
    void attendance_events;
    return { ...rest, subscriptions, access, visits, churnRisk: computeChurnRisk(visits, access) };
  });
}

export type MemberListRow = Awaited<ReturnType<typeof listMembers>>[number];

/** Full detail view for one member — every tab on the member page reads from this. */
export async function getMember(supabase: SupabaseClient<Database>, id: string) {
  const { data: member, error } = await supabase
    .from("members")
    .select(
      `*,
      assigned_trainer:profiles!members_assigned_trainer_id_fkey(id, first_name, last_name),
      subscriptions(*, membership_plan:membership_plans(*), payments(*), freezes:subscription_freezes(*)),
      attendance_events(*),
      measurements:body_measurements(*),
      member_notes(*, author:profiles(first_name, last_name)),
      pt_packages(*, trainer:profiles(first_name, last_name), sessions:pt_sessions(*)),
      diet_plans(*, trainer:profiles(first_name, last_name)),
      branch:branches(id, name)`,
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  const subscriptions = [...member.subscriptions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const attendanceEvents = [...member.attendance_events]
    .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
    .slice(0, 120);
  const measurements = [...member.measurements].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
  const memberNotes = [...member.member_notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const subscription = subscriptions[0] ?? null;
  const access = computeAccessStatus(subscription, member.access_blocked);
  const visits = computeVisitStats(attendanceEvents);
  const allPayments = subscriptions.flatMap((s) => s.payments);
  const latestMeasurement = measurements[0] ?? null;

  const ptSummary = member.pt_packages.reduce(
    (acc, pkg) => {
      acc.purchased += pkg.sessions_purchased;
      acc.used += pkg.sessions.filter((s) => s.status === "COMPLETED").length;
      acc.scheduled += pkg.sessions.filter((s) => s.status === "SCHEDULED").length;
      return acc;
    },
    { purchased: 0, used: 0, scheduled: 0 },
  );

  const upcomingSessions = member.pt_packages
    .flatMap((p) => p.sessions)
    .filter((s) => s.status === "SCHEDULED" && new Date(s.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 5);

  return {
    ...member,
    subscriptions,
    attendance_events: attendanceEvents,
    measurements,
    member_notes: memberNotes,
    access,
    visits,
    churnRisk: computeChurnRisk(visits, access),
    outstandingCents: computeOutstandingCents(allPayments),
    paymentSummary: buildPaymentSummary(
      subscription
        ? { ...subscription, membershipPlan: subscription.membership_plan!, payments: subscription.payments }
        : null,
    ),
    bmi: computeBmi(member.height_cm, latestMeasurement?.weight_kg),
    latestMeasurement,
    ptSummary: { ...ptSummary, remaining: ptSummary.purchased - ptSummary.used },
    upcomingSessions,
    activeDietPlan: member.diet_plans.find((d) => d.is_active) ?? null,
    timeline: buildTimeline(
      new Date(member.created_at),
      subscriptions.map((s) => ({ ...s, membershipPlan: s.membership_plan!, payments: s.payments, freezes: s.freezes })),
    ),
  };
}

export type MemberDetail = Awaited<ReturnType<typeof getMember>>;

export interface Meal {
  time: string;
  name: string;
  items: string[];
  calories?: number;
}

export interface EnrolMembership {
  membershipPlanId: string;
  startDate?: string;
  durationDays?: number;
  totalFeeCents?: number;
  amountPaidCents?: number;
  paymentMethod?: Database["public"]["Enums"]["payment_method"];
  balanceDueAt?: string;
}

export interface NewMemberPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  alternate_phone?: string;
  date_of_birth?: string;
  gender?: Database["public"]["Enums"]["gender"];
  occupation?: string;
  preferred_contact?: Database["public"]["Enums"]["contact_method"];
  address_line?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  id_proof_type?: Database["public"]["Enums"]["id_proof_type"];
  id_proof_last4?: string;
  emergency_name?: string;
  emergency_relationship?: string;
  emergency_phone?: string;
  medical_conditions?: string;
  allergies?: string;
  medications?: string;
  injuries?: string;
  physician_clearance?: boolean;
  parq_completed?: boolean;
  waiver_signed?: boolean;
  primary_goal?: Database["public"]["Enums"]["fitness_goal"];
  experience_level?: Database["public"]["Enums"]["experience_level"];
  height_cm?: number;
  assigned_trainer_id?: string;
  access_card_number?: string;
  notes?: string;
  membership?: EnrolMembership;
}

/** Creates a member and (optionally) its opening subscription+payment(s) atomically,
 * via the create_member_with_subscription RPC — mirrors the old transactional create(). */
export async function createMember(supabase: SupabaseClient<Database>, tenantId: string, dto: NewMemberPayload) {
  const { membership, parq_completed, waiver_signed, ...profile } = dto;
  const now = new Date();

  if (!membership) {
    const { data, error } = await supabase
      .from("members")
      .insert({
        tenant_id: tenantId,
        ...profile,
        parq_completed_at: parq_completed ? now.toISOString() : null,
        waiver_signed_at: waiver_signed ? now.toISOString() : null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("id", membership.membershipPlanId)
    .single();
  if (planError) throw planError;

  const startDate = membership.startDate ? new Date(membership.startDate) : now;
  const durationDays = membership.durationDays ?? daysForCycle(plan.billing_cycle);
  const currentPeriodEnd = addDays(startDate, durationDays);
  const totalFeeCents = membership.totalFeeCents ?? plan.price_cents;
  const paidCents = Math.min(membership.amountPaidCents ?? 0, totalFeeCents);

  const { data: member, error } = await supabase.rpc("create_member_with_subscription", {
    p_member: {
      tenant_id: tenantId,
      ...profile,
      parq_completed_at: parq_completed ? now.toISOString() : null,
      waiver_signed_at: waiver_signed ? now.toISOString() : null,
    },
    p_membership_plan_id: plan.id,
    p_current_period_end: currentPeriodEnd.toISOString(),
    p_paid_cents: paidCents,
    p_total_cents: totalFeeCents,
    p_method: membership.paymentMethod ?? undefined,
  });
  if (error) throw error;
  return member;
}

export async function addMemberNote(supabase: SupabaseClient<Database>, tenantId: string, memberId: string, authorId: string, body: string, pinned = false) {
  const { data, error } = await supabase
    .from("member_notes")
    .insert({ tenant_id: tenantId, member_id: memberId, author_id: authorId, body, pinned })
    .select("*, author:profiles(first_name, last_name)")
    .single();
  if (error) throw error;
  return data;
}

export async function addMeasurement(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  memberId: string,
  measurement: Omit<Database["public"]["Tables"]["body_measurements"]["Insert"], "tenant_id" | "member_id">,
) {
  const { data, error } = await supabase
    .from("body_measurements")
    .insert({ tenant_id: tenantId, member_id: memberId, ...measurement })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listBranches(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("branches").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listStaff(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("profiles").select("*").order("first_name");
  if (error) throw error;
  return data ?? [];
}

export async function checkInMember(supabase: SupabaseClient<Database>, memberId: string) {
  const { data, error } = await supabase.rpc("checkin_member", { p_member_id: memberId });
  if (error) throw error;
  return data;
}

/** Applies a payment via the record_payment RPC, then reports whether the
 * member's balance is now fully settled — mirrors the old REST response shape. */
export async function recordPayment(
  supabase: SupabaseClient<Database>,
  memberId: string,
  amountCents: number,
  method: Database["public"]["Enums"]["payment_method"],
  note?: string,
) {
  const { data: rows, error } = await supabase.rpc("record_payment", {
    p_member_id: memberId,
    p_amount_cents: amountCents,
    p_method: method,
    p_note: note,
  });
  if (error) throw error;

  const { data: outstanding } = await supabase
    .from("payments")
    .select("amount_cents, subscription:subscriptions!inner(member_id)")
    .eq("subscription.member_id", memberId)
    .in("status", ["PENDING", "FAILED"]);

  return {
    invoiceNumber: rows?.[rows.length - 1]?.invoice_number ?? null,
    balanceCleared: (outstanding ?? []).length === 0,
  };
}

export async function listPlans(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("membership_plans").select("*").eq("is_active", true).order("price_cents");
  if (error) throw error;
  return data ?? [];
}

export async function createPlan(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: { name: string; description?: string; price_cents: number; billing_cycle: Database["public"]["Enums"]["billing_cycle"]; currency?: string },
) {
  const { data, error } = await supabase
    .from("membership_plans")
    .insert({ tenant_id: tenantId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}
