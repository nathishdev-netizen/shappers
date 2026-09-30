import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function getTodayAttendance(supabase: SupabaseClient<Database>) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("attendance_events")
    .select("*, member:members(first_name, last_name)")
    .gte("checked_in_at", startOfToday.toISOString())
    .order("checked_in_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
