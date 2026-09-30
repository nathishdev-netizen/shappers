import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { Meal } from "./members";

const SELECT = `*,
  member:members(id, first_name, last_name, primary_goal),
  trainer:profiles!diet_plans_trainer_id_fkey(id, first_name, last_name)`;

export async function listDietPlans(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("diet_plans")
    .select(SELECT)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type DietPlanRow = Awaited<ReturnType<typeof listDietPlans>>[number];

export async function dietPlansForMember(supabase: SupabaseClient<Database>, memberId: string) {
  const { data, error } = await supabase
    .from("diet_plans")
    .select(`*, trainer:profiles!diet_plans_trainer_id_fkey(id, first_name, last_name)`)
    .eq("member_id", memberId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface CreateDietPlanInput {
  tenant_id: string;
  member_id: string;
  trainer_id?: string;
  title: string;
  goal?: Database["public"]["Enums"]["diet_goal"];
  daily_calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meals: Meal[];
  notes?: string;
  start_date?: string;
  end_date?: string;
}

/** Creates via the create_diet_plan RPC, which atomically deactivates the
 * member's prior active plan first — "one active plan per member". */
export async function createDietPlan(supabase: SupabaseClient<Database>, input: CreateDietPlanInput) {
  const { data, error } = await supabase.rpc("create_diet_plan", { p_plan: input as never });
  if (error) throw error;
  return data;
}

export async function updateDietPlan(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<{ is_active: boolean; notes: string; meals: Meal[] }>,
) {
  const { data, error } = await supabase.from("diet_plans").update(patch as never).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
