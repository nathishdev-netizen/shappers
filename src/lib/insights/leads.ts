import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
const ALL_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "TRIAL", "CONVERTED", "LOST"];

const SELECT = `*,
  interested_plan:membership_plans(id, name, price_cents),
  assigned_trainer:profiles!leads_assigned_trainer_id_fkey(id, first_name, last_name),
  branch:branches(id, name)`;

export async function listLeads(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("leads")
    .select(SELECT)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const leads = data ?? [];
  const funnel = ALL_STATUSES.map((status) => ({ status, count: leads.filter((l) => l.status === status).length }));
  return { leads, funnel };
}

export type LeadRow = Awaited<ReturnType<typeof listLeads>>["leads"][number];

export interface CreateLeadInput {
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  source?: Database["public"]["Enums"]["lead_source"];
  interested_plan_id?: string;
  assigned_trainer_id?: string;
  branch_id?: string;
  notes?: string;
  follow_up_at?: string;
}

export async function createLead(supabase: SupabaseClient<Database>, input: CreateLeadInput) {
  const { data, error } = await supabase.from("leads").insert(input).select(SELECT).single();
  if (error) throw error;
  return data;
}

export async function updateLead(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<{
    status: LeadStatus;
    assigned_trainer_id: string | null;
    interested_plan_id: string | null;
    notes: string;
    follow_up_at: string | null;
  }>,
) {
  const { data, error } = await supabase.from("leads").update(patch).eq("id", id).select(SELECT).single();
  if (error) throw error;
  return data;
}
