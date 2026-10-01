import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function listClasses(supabase: SupabaseClient<Database>, from: Date, to: Date) {
  const { data, error } = await supabase
    .from("gym_classes")
    .select("*, branch:branches(id, name), trainer:profiles!gym_classes_trainer_id_fkey(id, first_name, last_name), bookings(id)")
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map(({ bookings, ...c }) => ({
    ...c,
    booked: bookings.length,
    spotsLeft: c.capacity - bookings.length,
  }));
}

export async function createClass(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: Omit<Database["public"]["Tables"]["gym_classes"]["Insert"], "tenant_id" | "id">,
) {
  const { data, error } = await supabase.from("gym_classes").insert({ tenant_id: tenantId, ...input }).select().single();
  if (error) throw error;
  return data;
}

/** Books via the book_class RPC, which row-locks the class to avoid a
 * capacity race between concurrent bookings. */
export async function bookClass(supabase: SupabaseClient<Database>, gymClassId: string, memberId: string, trainerId?: string) {
  const { data, error } = await supabase.rpc("book_class", {
    p_gym_class_id: gymClassId,
    p_member_id: memberId,
    p_trainer_id: trainerId,
  });
  if (error) throw error;
  return data;
}
