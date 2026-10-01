// Full demo dataset: tenants, branches, staff, 9 named members spanning every
// access state, measurements, PT packages/sessions, diet plans, payments,
// 70 days of attendance, leads, and a week of classes — mirrors the old
// apps/api/prisma/seed.ts scenarios against the new Supabase schema.
//
// Run with: node supabase/seed.mjs
// Reads Supabase URL + secret key from .env.local (not committed). Safe to
// re-run — wipes and recreates the shaper/iron-house tenants' data each time.

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
const SEED_NOW = new Date();

function daysAgo(n) {
  const d = new Date(SEED_NOW);
  d.setDate(d.getDate() - n);
  return d;
}

function pick(arr, i) {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

const MEMBER_SEEDS = [
  { name: "Nathish", plan: 0, state: "ACTIVE", joined: 42 },
  { name: "Sabaresh", plan: 1, state: "ACTIVE", joined: 128 },
  { name: "Kishore", plan: 0, state: "EXPIRING", joined: 64 },
  { name: "Kumar", plan: 0, state: "OVERDUE", joined: 96 },
  { name: "Abdul", plan: 2, state: "ACTIVE", joined: 210 },
  { name: "Yogesh", plan: 1, state: "FROZEN", joined: 155 },
  { name: "Krithik", plan: 3, state: "ACTIVE", joined: 4 },
  { name: "Ram", plan: 0, state: "CANCELLED", joined: 185 },
  { name: "Prasad", plan: 1, state: "ACTIVE", joined: 72 },
];

const KIN_NAMES = ["Meena", "Arun", "Latha", "Suresh", "Divya", "Karthik", "Anitha", "Vimal"];
const GENDERS = ["MALE", "FEMALE", "FEMALE", "MALE", "PREFER_NOT_TO_SAY"];
const CONTACT_METHODS = ["WHATSAPP", "PHONE", "EMAIL", "SMS"];
const ID_PROOF_TYPES = ["AADHAAR", "AADHAAR", "PASSPORT", "DRIVING_LICENSE"];
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "BEGINNER"];
const GOALS = ["WEIGHT_LOSS", "MUSCLE_GAIN", "GENERAL_FITNESS", "STRENGTH", "REHAB", "ENDURANCE"];
const OCCUPATIONS = ["Software engineer", "Teacher", "Doctor", "Chartered accountant", "Architect", "Sales manager", "Student", "Graphic designer", "Civil engineer", "Consultant"];
const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Friend", "Child"];
const PAYMENT_METHODS = ["UPI", "CARD", "UPI", "CASH", "BANK_TRANSFER"];
const CITIES = ["Bengaluru", "Chennai", "Hyderabad", "Pune", "Mumbai"];
const STATES = ["Karnataka", "Tamil Nadu", "Telangana", "Maharashtra", "Maharashtra"];
const STREETS = ["MG Road", "5th Cross, Indiranagar", "Anna Salai", "Jubilee Hills", "FC Road"];
const CONDITIONS = ["Hypertension (controlled)", "Type 2 diabetes", "Asthma", "Hypothyroidism"];
const ALLERGIES = ["Peanuts", "Dust", "Penicillin", "Lactose intolerant"];
const INJURIES = ["Left knee ACL repair, 2023 — avoid deep squats", "Lower back strain — no heavy deadlifts", "Right shoulder impingement", "Ankle sprain, healed"];
const NOTES = ["Prefers morning slots. Asked about nutrition coaching.", "Travels often for work — flexible scheduling needed.", "Training for a half marathon in December.", "Mentioned considering an upgrade to Annual Elite.", "Card declined last cycle — followed up, now on UPI autopay."];
const SESSION_FOCUS = ["Lower body", "Upper push", "Upper pull", "Core & mobility", "Conditioning", "Full body"];
const DIET_GOALS = ["FAT_LOSS", "MUSCLE_GAIN", "MAINTENANCE", "PERFORMANCE"];
const DIET_TITLES = ["Lean & Strong 8-week", "Muscle Builder", "Balanced Maintenance", "Endurance Fuel"];
const LEAD_NOTES = ["Asked about morning batches. Wants to start next week.", "Saw the Instagram reel. Interested in PT bundle.", "Comparing with another gym nearby — price sensitive.", "Referred by Pooja Reddy. Trial booked for Saturday."];
const SESSION_NOTES = ["Focused on squat depth and bracing.", "Upper body push. Increased bench to 45kg.", "Mobility and core. Knee felt stable throughout.", "Deadlift technique — kept load light, form improving.", "Conditioning intervals. Good effort, recovery improving."];
const MEALS = [
  { time: "7:30 AM", name: "Breakfast", items: ["Oats with milk", "2 boiled eggs", "Banana"], calories: 520 },
  { time: "10:30 AM", name: "Snack", items: ["Greek yogurt", "Almonds (10)"], calories: 220 },
  { time: "1:30 PM", name: "Lunch", items: ["Brown rice", "Grilled chicken 150g", "Mixed veg sabzi", "Salad"], calories: 680 },
  { time: "4:30 PM", name: "Pre-workout", items: ["Whole-wheat toast + peanut butter", "Black coffee"], calories: 280 },
  { time: "8:00 PM", name: "Dinner", items: ["Paneer / fish 150g", "2 rotis", "Dal", "Cucumber salad"], calories: 600 },
];

async function upsertTenant(name, subdomain, colors, code) {
  const { data: existing } = await supabase.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle();
  if (existing) {
    await supabase.from("tenants").update({ code }).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from("tenants").insert({ name, subdomain, colors, code }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertBranch(tenantId, name, rest) {
  const { data: existing } = await supabase.from("branches").select("id").eq("tenant_id", tenantId).eq("name", name).maybeSingle();
  if (existing) {
    await supabase.from("branches").update(rest).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from("branches").insert({ tenant_id: tenantId, name, ...rest }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertStaff(tenantId, { email, firstName, lastName, role, branchId, phone, specialty }) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let authUser = list.users.find((u) => u.email === email);
  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw error;
    authUser = data.user;
  }
  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: authUser.id, tenant_id: tenantId, email, first_name: firstName, last_name: lastName, role, branch_id: branchId ?? null, phone: phone ?? null, specialty: specialty ?? null },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;
  return authUser.id;
}

async function upsertPlan(tenantId, name, rest) {
  const { data: existing } = await supabase.from("membership_plans").select("*").eq("tenant_id", tenantId).eq("name", name).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from("membership_plans").insert({ tenant_id: tenantId, name, ...rest }).select("*").single();
  if (error) throw error;
  return data;
}

async function wipeTenantData(tenantId) {
  // Children first, via their parent member_ids (FKs cascade from members, but
  // leads/classes/bookings/plans don't hang off members so need their own deletes).
  const { data: members } = await supabase.from("members").select("id").eq("tenant_id", tenantId);
  const memberIds = (members ?? []).map((m) => m.id);
  if (memberIds.length) {
    await supabase.from("members").delete().in("id", memberIds); // cascades subscriptions/payments/etc.
  }
  await supabase.from("leads").delete().eq("tenant_id", tenantId);
  await supabase.from("bookings").delete().eq("tenant_id", tenantId);
  await supabase.from("gym_classes").delete().eq("tenant_id", tenantId);
}

async function main() {
  console.log("Seeding tenant: shaper");
  const shaperId = await upsertTenant("SHAPER Elite Fitness Studio", "shaper", { primary: "#f00000", secondary: "#0a0a0a" }, "SHP");
  const hqBranch = await upsertBranch(shaperId, "Indiranagar", { code: "IND", city: "Bengaluru", address_line: "100 Feet Road, Indiranagar", phone: "+91-80-4111-2200", opening_hours: "5:30am – 10:30pm" });
  const eastBranch = await upsertBranch(shaperId, "Whitefield", { code: "WHF", city: "Bengaluru", address_line: "ITPL Main Road, Whitefield", phone: "+91-80-4111-2201", opening_hours: "6:00am – 10:00pm" });

  const ownerId = await upsertStaff(shaperId, { email: "owner@shaper.fit", firstName: "Nathish", lastName: "", role: "OWNER", branchId: hqBranch, phone: "+91-98450-11225" });
  const sagarId = await upsertStaff(shaperId, { email: "sagar@shaper.fit", firstName: "Sagar", lastName: "", role: "TRAINER", branchId: hqBranch, phone: "+91-98450-11224", specialty: "Functional training, rehab" });
  const prethiveId = await upsertStaff(shaperId, { email: "prethive@shaper.fit", firstName: "Prethive", lastName: "", role: "TRAINER", branchId: eastBranch, phone: "+91-98450-11223", specialty: "Strength & conditioning" });
  const trainers = [sagarId, prethiveId];

  const plans = [
    await upsertPlan(shaperId, "Monthly Unlimited", { description: "Full gym access, all group classes", price_cents: 199900, billing_cycle: "MONTHLY" }),
    await upsertPlan(shaperId, "Quarterly Saver", { description: "3 months, billed upfront", price_cents: 519900, billing_cycle: "QUARTERLY" }),
    await upsertPlan(shaperId, "Annual Elite", { description: "Gym + classes + 4 PT sessions/month", price_cents: 1799900, billing_cycle: "YEARLY" }),
    await upsertPlan(shaperId, "Off-Peak", { description: "Weekdays before 4pm", price_cents: 129900, billing_cycle: "MONTHLY" }),
  ];

  console.log("Wiping prior demo members/leads/classes for shaper...");
  await wipeTenantData(shaperId);

  const memberIds = [];
  const joinedDaysAgoById = new Map();

  for (let i = 0; i < MEMBER_SEEDS.length; i++) {
    const k = Math.floor(i / 3);
    const seed = MEMBER_SEEDS[i];
    const { name: firstName, state } = seed;
    const plan = plans[seed.plan];
    const joinedDaysAgo = seed.joined;

    const cycleDays = plan.billing_cycle === "YEARLY" ? 365 : plan.billing_cycle === "QUARTERLY" ? 90 : 30;
    const periodsElapsed = Math.floor(joinedDaysAgo / cycleDays);
    const isOverdue = state === "OVERDUE";
    const isCancelled = state === "CANCELLED";
    const status = isOverdue ? "PAST_DUE" : isCancelled ? "CANCELLED" : "ACTIVE";

    const latestStartDaysAgo = joinedDaysAgo - periodsElapsed * cycleDays;
    const expiringShift = state === "EXPIRING" ? cycleDays - latestStartDaysAgo - 4 : 0;
    const periodStartDaysAgo = (isOverdue ? latestStartDaysAgo + cycleDays : latestStartDaysAgo) + expiringShift;
    const periodEndDaysAgo = periodStartDaysAgo - cycleDays;
    const periodEnd = daysAgo(periodEndDaysAgo);
    const heightCm = 155 + ((i * 7) % 35);

    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({
        tenant_id: shaperId,
        first_name: firstName,
        last_name: "",
        email: `${firstName.toLowerCase()}${i}@example.com`,
        phone: `+91-9${String(100000000 + i * 7654321).slice(0, 9)}`,
        alternate_phone: i % 4 === 0 ? `+91-8${String(200000000 + i * 1234567).slice(0, 9)}` : null,
        date_of_birth: new Date(1978 + (i % 25), i % 12, 1 + (i % 27)).toISOString().slice(0, 10),
        gender: pick(GENDERS, i),
        occupation: pick(OCCUPATIONS, i),
        preferred_contact: pick(CONTACT_METHODS, i),
        address_line: `${12 + i} ${pick(STREETS, i)}`,
        city: pick(CITIES, i),
        state: pick(STATES, i),
        postal_code: String(560000 + ((i * 37) % 900)),
        id_proof_type: pick(ID_PROOF_TYPES, i),
        id_proof_last4: String(1000 + ((i * 7919) % 9000)),
        emergency_name: pick(KIN_NAMES, i),
        emergency_relationship: pick(RELATIONSHIPS, i),
        emergency_phone: `+91-7${String(300000000 + i * 2345678).slice(0, 9)}`,
        medical_conditions: i % 6 === 0 ? pick(CONDITIONS, i) : null,
        allergies: i % 5 === 0 ? pick(ALLERGIES, i) : null,
        medications: i % 7 === 0 ? "Metformin 500mg, daily" : null,
        injuries: i % 4 === 0 ? pick(INJURIES, i) : null,
        physician_clearance: i % 6 === 0,
        physician_clearance_date: i % 6 === 0 ? daysAgo(joinedDaysAgo - 2).toISOString().slice(0, 10) : null,
        parq_completed_at: i % 11 === 0 ? null : daysAgo(joinedDaysAgo).toISOString(),
        waiver_signed_at: i % 11 === 0 ? null : daysAgo(joinedDaysAgo).toISOString(),
        primary_goal: pick(GOALS, i),
        experience_level: pick(LEVELS, i),
        height_cm: heightCm,
        branch_id: i % 3 === 2 ? eastBranch : hqBranch,
        assigned_trainer_id: i % 3 === 0 ? pick(trainers, k) : null,
        access_card_number: `RF-${String(10000 + i * 137)}`,
        created_at: daysAgo(joinedDaysAgo).toISOString(),
      })
      .select("id")
      .single();
    if (memberError) throw memberError;

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        tenant_id: shaperId,
        member_id: member.id,
        membership_plan_id: plan.id,
        status,
        start_date: daysAgo(periodStartDaysAgo).toISOString(),
        current_period_end: periodEnd.toISOString(),
        ...(isCancelled ? { cancelled_at: daysAgo(10).toISOString() } : {}),
      })
      .select("id")
      .single();
    if (subError) throw subError;

    // Measurement history
    const startWeight = 62 + ((i * 11) % 38);
    const measurements = [];
    for (let m = 3; m >= 0; m--) {
      if (m * 28 + 2 > joinedDaysAgo) continue;
      measurements.push({
        tenant_id: shaperId,
        member_id: member.id,
        recorded_at: daysAgo(m * 28 + 2).toISOString(),
        weight_kg: Math.round((startWeight - (3 - m) * 0.8) * 10) / 10,
        body_fat_percent: Math.round((26 - (3 - m) * 0.6 + (i % 5)) * 10) / 10,
        waist_cm: 78 + (i % 18) - (3 - m),
        chest_cm: 92 + (i % 14),
        arm_cm: 30 + (i % 8),
      });
    }
    if (measurements.length) await supabase.from("body_measurements").insert(measurements);

    if (i % 5 === 0) {
      await supabase.from("member_notes").insert({
        tenant_id: shaperId, member_id: member.id, author_id: ownerId,
        body: pick(NOTES, i), pinned: i % 10 === 0, created_at: daysAgo(4 + (i % 20)).toISOString(),
      });
    }

    if (i % 3 === 0) {
      const ptTrainer = pick(trainers, k);
      const purchased = 8 + (k % 3) * 4;
      const { data: pkg, error: pkgError } = await supabase
        .from("pt_packages")
        .insert({
          tenant_id: shaperId, member_id: member.id, trainer_id: ptTrainer,
          sessions_purchased: purchased, price_cents: purchased * 80000,
          purchased_at: daysAgo(Math.min(joinedDaysAgo, 50)).toISOString(), expires_at: daysAgo(-60).toISOString(),
        })
        .select("id")
        .single();
      if (pkgError) throw pkgError;

      const used = Math.min(purchased - 2, 3 + (k % 5));
      const sessions = [];
      for (let s = 0; s < used; s++) {
        sessions.push({
          tenant_id: shaperId, package_id: pkg.id, member_id: member.id, trainer_id: ptTrainer,
          scheduled_at: daysAgo(s * 6 + 3).toISOString(), status: "COMPLETED", completed_at: daysAgo(s * 6 + 3).toISOString(),
          focus: pick(SESSION_FOCUS, k + s), notes: pick(SESSION_NOTES, k + s),
        });
      }
      const SLOTS = [6, 7, 9, 11, 17, 18, 19, 20];
      for (let s = 0; s < 2; s++) {
        const when = daysAgo(-(s * 3 + (k % 3)));
        when.setHours(pick(SLOTS, k * 3 + s), (k + s) % 2 === 0 ? 0 : 30, 0, 0);
        sessions.push({
          tenant_id: shaperId, package_id: pkg.id, member_id: member.id, trainer_id: ptTrainer,
          scheduled_at: when.toISOString(), status: "SCHEDULED", focus: pick(SESSION_FOCUS, k + s + 2),
        });
      }
      if (sessions.length) await supabase.from("pt_sessions").insert(sessions);

      const goal = pick(DIET_GOALS, k);
      await supabase.from("diet_plans").insert({
        tenant_id: shaperId, member_id: member.id, trainer_id: pick(trainers, k),
        title: pick(DIET_TITLES, k), goal,
        daily_calories: goal === "FAT_LOSS" ? 1800 : goal === "MUSCLE_GAIN" ? 2600 : 2200,
        protein_g: goal === "MUSCLE_GAIN" ? 160 : 120,
        carbs_g: goal === "FAT_LOSS" ? 150 : 250,
        fat_g: 65, meals: MEALS, notes: "Hydration target 3L/day. Adjust carbs on rest days.",
        start_date: daysAgo(Math.min(joinedDaysAgo, 21)).toISOString(),
      });
    }

    if (state === "FROZEN") {
      await supabase.from("subscription_freezes").insert({
        tenant_id: shaperId, subscription_id: subscription.id,
        start_date: daysAgo(6).toISOString().slice(0, 10), end_date: daysAgo(-12).toISOString().slice(0, 10),
        reason: "MEDICAL", note: "Knee rehab — cleared to return next month",
      });
    }

    memberIds.push(member.id);
    joinedDaysAgoById.set(member.id, joinedDaysAgo);

    const monthsActive = Math.min(6, Math.max(1, Math.floor(joinedDaysAgo / 30)));
    const payments = [];
    for (let m = 0; m < monthsActive; m++) {
      const paidAt = new Date();
      paidAt.setMonth(paidAt.getMonth() - m);
      paidAt.setDate(2 + (i % 20));
      if (paidAt < daysAgo(joinedDaysAgo)) continue;
      payments.push({
        tenant_id: shaperId, subscription_id: subscription.id, amount_cents: plan.price_cents,
        status: "SUCCEEDED", method: pick(PAYMENT_METHODS, i + m), provider: "mock",
        due_at: paidAt.toISOString(), paid_at: paidAt.toISOString(), created_at: paidAt.toISOString(),
      });
    }
    if (isOverdue) {
      payments.push({
        tenant_id: shaperId, subscription_id: subscription.id, amount_cents: plan.price_cents,
        status: i % 18 === 0 ? "FAILED" : "PENDING", method: pick(PAYMENT_METHODS, i), provider: "mock",
        due_at: periodEnd.toISOString(), created_at: periodEnd.toISOString(),
      });
    }
    if (payments.length) await supabase.from("payments").insert(payments);

    process.stdout.write(`  member ${i + 1}/${MEMBER_SEEDS.length}: ${firstName} (${state})\r\n`);
  }

  console.log("Seeding 70 days of attendance...");
  const sources = ["QR", "QR", "RFID", "BIOMETRIC", "MANUAL"];
  const lapsedMemberIds = new Set(memberIds.filter((_, idx) => idx % 7 === 0));
  const attendanceRows = [];
  for (let d = 69; d >= 0; d--) {
    const day = daysAgo(d);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    memberIds.forEach((memberId, idx) => {
      if (d < 21 && lapsedMemberIds.has(memberId)) return;
      if (d > (joinedDaysAgoById.get(memberId) ?? 0)) return;
      const everyNDays = 2 + (idx % 3);
      if ((d + idx) % everyNDays !== 0) return;
      if (isWeekend && (d + idx) % 2 !== 0) return;
      const checkedInAt = new Date(day);
      checkedInAt.setHours(6 + ((idx * 5 + d) % 14), (idx * 17) % 60, 0, 0);
      attendanceRows.push({ tenant_id: shaperId, member_id: memberId, source: pick(sources, idx + d), checked_in_at: checkedInAt.toISOString() });
    });
  }
  // One check-in per member per local day (unique index) — de-dupe by (member, date) before insert.
  const seen = new Set();
  const deduped = attendanceRows.filter((r) => {
    const key = `${r.member_id}:${r.checked_in_at.slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  for (let i = 0; i < deduped.length; i += 500) {
    const { error } = await supabase.from("attendance_events").insert(deduped.slice(i, i + 500));
    if (error) throw error;
  }

  console.log("Seeding leads...");
  const LEAD_ROWS = [
    ["Kiran", "Bhat", "WALK_IN", "NEW", 0],
    ["Sunita", "Pillai", "INSTAGRAM", "NEW", 1],
    ["Farhan", "Ali", "WEBSITE", "CONTACTED", 2],
    ["Deepa", "Menon", "REFERRAL", "CONTACTED", 0],
    ["Arun", "Kumar", "PHONE", "TRIAL", 3],
    ["Shreya", "Ghosh", "INSTAGRAM", "TRIAL", 1],
    ["Vivek", "Nanda", "WEBSITE", "CONVERTED", 2],
    ["Lata", "Iyer", "WALK_IN", "LOST", 0],
    ["Mohit", "Saxena", "REFERRAL", "NEW", 3],
  ];
  const leadRows = LEAD_ROWS.map(([fn, ln, source, status, planIdx], idx) => ({
    tenant_id: shaperId,
    branch_id: idx % 2 === 0 ? hqBranch : eastBranch,
    first_name: fn, last_name: ln,
    phone: `+91-97${String(100000000 + idx * 3456789).slice(0, 8)}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
    source, status,
    interested_plan_id: plans[planIdx].id,
    assigned_trainer_id: pick(trainers, idx),
    notes: pick(LEAD_NOTES, idx),
    follow_up_at: status === "CONVERTED" || status === "LOST" ? null : daysAgo(-(1 + (idx % 4))).toISOString(),
    created_at: daysAgo(idx * 2 + 1).toISOString(),
  }));
  await supabase.from("leads").insert(leadRows);

  console.log("Seeding a week of classes...");
  const CLASS_NAMES = ["HIIT Blast", "Yoga Flow", "Strength Circuit", "Spin 45", "Mobility & Core", "Boxing Basics"];
  for (let d = 0; d < 7; d++) {
    for (let slot = 0; slot < 3; slot++) {
      const startsAt = daysAgo(-d);
      startsAt.setHours(slot === 0 ? 6 : slot === 1 ? 12 : 18, 30, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 60 * 60000);
      const { data: cls, error: clsError } = await supabase
        .from("gym_classes")
        .insert({
          tenant_id: shaperId, branch_id: slot === 1 ? eastBranch : hqBranch, trainer_id: pick(trainers, d + slot),
          name: pick(CLASS_NAMES, d + slot), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), capacity: 12 + slot * 4,
        })
        .select("id, trainer_id")
        .single();
      if (clsError) throw clsError;
      const bookers = memberIds.slice((d * 3 + slot) % 10, (d * 3 + slot) % 10 + 5 + slot * 2);
      if (bookers.length) {
        await supabase.from("bookings").insert(bookers.map((memberId) => ({ tenant_id: shaperId, gym_class_id: cls.id, member_id: memberId, trainer_id: cls.trainer_id })));
      }
    }
  }

  console.log("Seeding tenant: iron-house");
  const ironHouseId = await upsertTenant("Iron House Strength Co.", "iron-house", { primary: "#2a78d6", secondary: "#0b0b0b" }, "IHS");
  await upsertStaff(ironHouseId, { email: "owner@iron-house.com", firstName: "Sam", lastName: "Okafor", role: "OWNER" });
  await upsertPlan(ironHouseId, "Strength Monthly", { price_cents: 249900, billing_cycle: "MONTHLY" });

  console.log(`\nSeed complete.
  Tenant 1: subdomain "shaper"      · owner@shaper.fit     · Password123!  (SHAPER red, ${memberIds.length} members)
  Tenant 2: subdomain "iron-house"  · owner@iron-house.com · Password123!  (blue brand, empty — proves isolation)
  Staff: Nathish (owner) · Prethive & Sagar (trainers) — prethive@ / sagar@shaper.fit`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
