import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function listPtSessions(supabase: SupabaseClient<Database>, from: Date, to: Date, trainerId?: string) {
  let query = supabase
    .from("pt_sessions")
    .select(`*,
      member:members(id, first_name, last_name),
      trainer:profiles!pt_sessions_trainer_id_fkey(id, first_name, last_name),
      package:pt_packages(id, sessions_purchased)`)
    .gte("scheduled_at", from.toISOString())
    .lte("scheduled_at", to.toISOString())
    .order("scheduled_at", { ascending: true });
  if (trainerId) query = query.eq("trainer_id", trainerId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type PtSessionRow = Awaited<ReturnType<typeof listPtSessions>>[number];

/** Packages with remaining balance so staff see who is running out. */
export async function listPtPackages(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("pt_packages")
    .select(`*,
      member:members(id, first_name, last_name),
      trainer:profiles!pt_packages_trainer_id_fkey(id, first_name, last_name),
      sessions:pt_sessions(status)`)
    .order("purchased_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map(({ sessions, ...p }) => {
    const used = sessions.filter((s) => s.status === "COMPLETED").length;
    const scheduled = sessions.filter((s) => s.status === "SCHEDULED").length;
    return { ...p, used, scheduled, remaining: p.sessions_purchased - used };
  });
}

export type PtPackageRow = Awaited<ReturnType<typeof listPtPackages>>[number];

export async function createPtPackage(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: { member_id: string; trainer_id?: string; sessions_purchased: number; price_cents: number; expires_at?: string },
) {
  const { data, error } = await supabase.from("pt_packages").insert({ tenant_id: tenantId, ...input }).select().single();
  if (error) throw error;
  return data;
}

/** Schedules via the book_pt_session RPC, which row-locks the package and
 * checks sessions_purchased vs. sessions already used/booked. */
export async function schedulePtSession(
  supabase: SupabaseClient<Database>,
  packageId: string,
  scheduledAt: string,
  durationMinutes?: number,
  focus?: string,
) {
  const { data, error } = await supabase.rpc("book_pt_session", {
    p_package_id: packageId,
    p_scheduled_at: scheduledAt,
    p_duration_minutes: durationMinutes,
    p_focus: focus,
  });
  if (error) throw error;
  return data;
}

export async function updatePtSession(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<{ status: Database["public"]["Enums"]["pt_session_status"]; notes: string; scheduled_at: string }>,
) {
  const { data, error } = await supabase
    .from("pt_sessions")
    .update({ ...patch, completed_at: patch.status === "COMPLETED" ? new Date().toISOString() : undefined })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
