import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Invoice ledger: every payment row across the club, newest first. */
export async function listInvoices(supabase: SupabaseClient<Database>, status?: Database["public"]["Enums"]["payment_status"]) {
  let query = supabase
    .from("payments")
    .select(`*,
      subscription:subscriptions(
        membership_plan:membership_plans(name),
        member:members(id, first_name, last_name, phone)
      )`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>[number];
