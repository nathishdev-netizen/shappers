// One-off provisioning: tenants, branches, and staff auth users + profiles.
// Run with: node supabase/seed.mjs
// Reads Supabase URL + secret key from .env.local (not committed).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Password123!";

async function upsertTenant(name, subdomain, colors) {
  const { data: existing } = await supabase.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("tenants").insert({ name, subdomain, colors }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertBranch(tenantId, name, city) {
  const { data: existing } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("branches")
    .insert({ tenant_id: tenantId, name, city })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertStaff(tenantId, { email, firstName, lastName, role, branchId }) {
  // list + find by email since admin.createUser errors on duplicate rather than upserting
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let authUser = list.users.find((u) => u.email === email);

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    authUser = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: authUser.id,
      tenant_id: tenantId,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      branch_id: branchId ?? null,
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  console.log(`  ${role.padEnd(8)} ${email}`);
}

async function main() {
  console.log("Seeding tenant: shaper");
  const shaperId = await upsertTenant("SHAPER Elite Fitness Studio", "shaper", { primary: "#f00000", secondary: "#0b0b0b" });
  const indiranagar = await upsertBranch(shaperId, "Indiranagar", "Bengaluru");
  await upsertBranch(shaperId, "Whitefield", "Bengaluru");

  await upsertStaff(shaperId, { email: "owner@shaper.fit", firstName: "Nathish", lastName: "Owner", role: "OWNER", branchId: indiranagar });
  await upsertStaff(shaperId, { email: "prethive@shaper.fit", firstName: "Prethive", lastName: "Kumar", role: "TRAINER", branchId: indiranagar });
  await upsertStaff(shaperId, { email: "sagar@shaper.fit", firstName: "Sagar", lastName: "R", role: "TRAINER", branchId: indiranagar });

  console.log("Seeding tenant: iron-house");
  const ironHouseId = await upsertTenant("Iron House Strength Co.", "iron-house", { primary: "#2a78d6", secondary: "#0b0b0b" });
  await upsertStaff(ironHouseId, { email: "owner@iron-house.com", firstName: "Iron", lastName: "Owner", role: "OWNER" });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
