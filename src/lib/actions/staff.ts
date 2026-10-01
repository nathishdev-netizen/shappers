"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Database["public"]["Enums"]["staff_role"];
  phone?: string;
  specialty?: string;
  branchId?: string;
}

/** Creates a staff login (Supabase Auth user + profiles row). Must run
 * server-side: provisioning an auth user needs the service-role key, which
 * must never reach the browser. The caller's own session (via the RLS-scoped
 * server client) gates this to OWNER/ADMIN through the profiles_tenant_admin_write
 * policy on the insert below. */
export async function createStaffAccount(input: CreateStaffInput) {
  const caller = await createClient();
  const {
    data: { user: callerUser },
  } = await caller.auth.getUser();
  if (!callerUser) throw new Error("Not signed in");

  const { data: callerProfile, error: callerError } = await caller
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", callerUser.id)
    .single();
  if (callerError || !callerProfile) throw new Error("Could not resolve caller's tenant");
  if (!["OWNER", "ADMIN"].includes(callerProfile.role)) {
    throw new Error("Only owners and admins can add staff");
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", callerProfile.tenant_id)
    .eq("email", input.email)
    .maybeSingle();
  if (existing) throw new Error("A staff member with that email already exists");

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(createError?.message ?? "Could not create the account");

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: created.user.id,
      tenant_id: callerProfile.tenant_id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.role,
      phone: input.phone,
      specialty: input.specialty,
      branch_id: input.branchId,
    })
    .select()
    .single();
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw profileError;
  }

  return profile;
}

export async function updateStaffAccount(
  id: string,
  patch: Partial<{
    role: Database["public"]["Enums"]["staff_role"];
    isActive: boolean;
    specialty: string;
    branchId: string | null;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role: patch.role,
      is_active: patch.isActive,
      specialty: patch.specialty,
      branch_id: patch.branchId,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
