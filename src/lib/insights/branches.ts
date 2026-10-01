import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Each branch carries live counts so the branches screen reads as a network overview. */
export async function listBranchesOverview(supabase: SupabaseClient<Database>) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: branches, error }, { data: members }, { data: staff }, { data: classes }, { data: leads }, { data: checkIns }] =
    await Promise.all([
      supabase.from("branches").select("*").order("created_at", { ascending: true }),
      supabase.from("members").select("id, branch_id"),
      supabase.from("profiles").select("id, branch_id"),
      supabase.from("gym_classes").select("id, branch_id"),
      supabase.from("leads").select("id, branch_id"),
      supabase.from("attendance_events").select("member_id").gte("checked_in_at", startOfToday.toISOString()),
    ]);
  if (error) throw error;

  const memberBranch = new Map((members ?? []).map((m) => [m.id, m.branch_id]));

  return (branches ?? []).map((b) => ({
    ...b,
    _count: {
      members: (members ?? []).filter((m) => m.branch_id === b.id).length,
      users: (staff ?? []).filter((s) => s.branch_id === b.id).length,
      classes: (classes ?? []).filter((c) => c.branch_id === b.id).length,
      leads: (leads ?? []).filter((l) => l.branch_id === b.id).length,
    },
    checkInsToday: (checkIns ?? []).filter((e) => memberBranch.get(e.member_id) === b.id).length,
  }));
}

export type BranchOverviewRow = Awaited<ReturnType<typeof listBranchesOverview>>[number];

export async function createBranch(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: Omit<Database["public"]["Tables"]["branches"]["Insert"], "tenant_id" | "id">,
) {
  const { data, error } = await supabase.from("branches").insert({ tenant_id: tenantId, ...input }).select().single();
  if (error) throw error;
  return data;
}

export async function updateBranch(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<Database["public"]["Tables"]["branches"]["Update"]>,
) {
  const { data, error } = await supabase.from("branches").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
