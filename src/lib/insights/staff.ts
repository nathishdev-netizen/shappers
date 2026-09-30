import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeAccessStatus, computeChurnRisk, computeVisitStats } from "./member-insights";

/** Directory with workload: how many clients and upcoming PT sessions each person carries. */
export async function listStaffDirectory(supabase: SupabaseClient<Database>) {
  const weekAhead = new Date(Date.now() + 7 * 86_400_000);

  const [{ data: staff, error }, { data: members }, { data: dietPlans }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("*, branch:branches(id, name)").order("is_active", { ascending: false }).order("role", { ascending: true }).order("first_name", { ascending: true }),
    supabase.from("members").select("id, assigned_trainer_id"),
    supabase.from("diet_plans").select("id, trainer_id"),
    supabase.from("pt_sessions").select("id, trainer_id").gte("scheduled_at", new Date().toISOString()).lte("scheduled_at", weekAhead.toISOString()).eq("status", "SCHEDULED"),
  ]);
  if (error) throw error;

  return (staff ?? []).map((s) => ({
    ...s,
    assignedClients: (members ?? []).filter((m) => m.assigned_trainer_id === s.id).length,
    activeDietPlans: (dietPlans ?? []).filter((d) => d.trainer_id === s.id).length,
    sessionsThisWeek: (sessions ?? []).filter((x) => x.trainer_id === s.id).length,
  }));
}

export type StaffDirectoryRow = Awaited<ReturnType<typeof listStaffDirectory>>[number];

/** Everything one staff member is carrying: their clients, sessions and plans. */
export async function getStaffDetail(supabase: SupabaseClient<Database>, id: string) {
  const { data: staff, error } = await supabase.from("profiles").select("*, branch:branches(id, name)").eq("id", id).single();
  if (error) throw error;

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);

  const [{ data: clientsRaw }, { data: sessions }, { data: dietPlans }, { data: packagesRaw }, { count: openLeads }] = await Promise.all([
    supabase
      .from("members")
      .select(`*,
        branch:branches(name),
        subscriptions(*, membership_plan:membership_plans(*), freezes:subscription_freezes(*)),
        attendance_events(checked_in_at)`)
      .eq("assigned_trainer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pt_sessions")
      .select("*, member:members(id, first_name, last_name)")
      .eq("trainer_id", id)
      .order("scheduled_at", { ascending: false })
      .limit(60),
    supabase
      .from("diet_plans")
      .select("*, member:members(id, first_name, last_name)")
      .eq("trainer_id", id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("pt_packages")
      .select("*, member:members(id, first_name, last_name), sessions:pt_sessions(status)")
      .eq("trainer_id", id),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("assigned_trainer_id", id).in("status", ["NEW", "CONTACTED", "TRIAL"]),
  ]);

  const clients = (clientsRaw ?? []).map((m) => {
    const subscriptions = [...m.subscriptions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const subscription = subscriptions[0] ?? null;
    const visits = computeVisitStats(m.attendance_events as never);
    const access = computeAccessStatus(subscription, m.access_blocked);
    return { ...m, subscriptions, access, visits, churnRisk: computeChurnRisk(visits, access) };
  });

  const upcoming = (sessions ?? []).filter((s) => s.status === "SCHEDULED" && new Date(s.scheduled_at) >= now);
  const packages = (packagesRaw ?? []).map(({ sessions: ss, ...p }) => {
    const used = ss.filter((s) => s.status === "COMPLETED").length;
    return { ...p, used, remaining: p.sessions_purchased - used };
  });

  return {
    ...staff,
    clients,
    sessions: sessions ?? [],
    dietPlans: dietPlans ?? [],
    packages,
    stats: {
      clients: clients.length,
      openLeads: openLeads ?? 0,
      sessionsUpcoming: upcoming.length,
      sessionsThisWeek: upcoming.filter((s) => new Date(s.scheduled_at) <= weekAhead).length,
      sessionsCompleted: (sessions ?? []).filter((s) => s.status === "COMPLETED").length,
      noShows: (sessions ?? []).filter((s) => s.status === "NO_SHOW").length,
      activeDietPlans: (dietPlans ?? []).filter((d) => d.is_active).length,
    },
  };
}

export type StaffDetail = Awaited<ReturnType<typeof getStaffDetail>>;
