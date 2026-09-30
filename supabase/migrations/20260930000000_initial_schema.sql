-- Shappers initial schema: multi-tenant gym management platform.
-- Ported from apps/api/prisma/schema.prisma. Every table (including deep
-- children) carries a denormalized tenant_id so RLS policies are flat,
-- indexed equality checks instead of multi-join subqueries.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type staff_role as enum ('OWNER', 'ADMIN', 'STAFF', 'TRAINER');
create type subscription_status as enum ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'FROZEN');
create type attendance_source as enum ('QR', 'RFID', 'BIOMETRIC', 'MANUAL');
create type billing_cycle as enum ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME');
create type payment_status as enum ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
create type payment_method as enum ('CARD', 'UPI', 'CASH', 'BANK_TRANSFER', 'OTHER');
create type gender as enum ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
create type contact_method as enum ('PHONE', 'EMAIL', 'SMS', 'WHATSAPP');
create type id_proof_type as enum ('AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'OTHER');
create type experience_level as enum ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
create type fitness_goal as enum ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'ENDURANCE', 'REHAB', 'GENERAL_FITNESS');
create type freeze_reason as enum ('MEDICAL', 'TRAVEL', 'PERSONAL', 'OTHER');
create type lead_status as enum ('NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST');
create type lead_source as enum ('WALK_IN', 'WEBSITE', 'INSTAGRAM', 'REFERRAL', 'PHONE', 'OTHER');
create type diet_goal as enum ('FAT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE', 'PERFORMANCE');
create type pt_session_status as enum ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenants (top of the hierarchy — no tenant_id column on itself)
-- ---------------------------------------------------------------------------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  logo_url text,
  colors jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tenants_set_updated_at before update on tenants
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles — replaces the old `users` (staff) table, keyed by auth.users.id
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  role staff_role not null default 'STAFF',
  phone text,
  specialty text,
  branch_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions — SECURITY DEFINER to avoid recursive RLS on profiles.
-- STABLE so the planner can cache the result within one statement.
-- ---------------------------------------------------------------------------

create or replace function public.staff_tenant() returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.staff_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------

create table branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text,
  address_line text,
  city text,
  phone text,
  opening_hours text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

alter table profiles add constraint profiles_branch_fkey
  foreign key (branch_id) references branches(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Membership plans
-- ---------------------------------------------------------------------------

create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  currency text not null default 'INR',
  billing_cycle billing_cycle not null default 'MONTHLY',
  is_active boolean not null default true,
  pt_sessions_included integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger membership_plans_set_updated_at before update on membership_plans
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

create table members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,

  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  alternate_phone text,
  date_of_birth date,
  gender gender,
  occupation text,
  preferred_contact contact_method not null default 'PHONE',
  photo_url text,

  address_line text,
  city text,
  state text,
  postal_code text,

  -- Identity proof. The full number is deliberately NOT stored — holding
  -- complete Aadhaar/passport numbers is a DPDP-Act liability. Staff verify
  -- against the uploaded document; the last 4 digits are enough to match it.
  id_proof_type id_proof_type,
  id_proof_last4 text,
  id_proof_doc_url text,

  emergency_name text,
  emergency_relationship text,
  emergency_phone text,

  medical_conditions text,
  allergies text,
  medications text,
  injuries text,
  physician_clearance boolean not null default false,
  physician_clearance_date date,
  parq_completed_at timestamptz,
  waiver_signed_at timestamptz,

  primary_goal fitness_goal,
  experience_level experience_level,
  height_cm double precision,

  assigned_trainer_id uuid references profiles(id) on delete set null,

  access_card_number text,
  access_blocked boolean not null default false,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id, email)
);
create index members_tenant_trainer_idx on members (tenant_id, assigned_trainer_id);
create index members_tenant_branch_idx on members (tenant_id, branch_id);
create trigger members_set_updated_at before update on members
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Body measurements
-- ---------------------------------------------------------------------------

create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  recorded_at timestamptz not null default now(),

  weight_kg double precision,
  body_fat_percent double precision,
  chest_cm double precision,
  waist_cm double precision,
  hips_cm double precision,
  arm_cm double precision,
  thigh_cm double precision,
  notes text
);
create index body_measurements_member_recorded_idx on body_measurements (member_id, recorded_at);

-- ---------------------------------------------------------------------------
-- PT packages & sessions
-- ---------------------------------------------------------------------------

create table pt_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  trainer_id uuid references profiles(id) on delete set null,

  sessions_purchased integer not null,
  price_cents integer not null,
  currency text not null default 'INR',
  purchased_at timestamptz not null default now(),
  expires_at timestamptz
);
create index pt_packages_member_idx on pt_packages (member_id);

create table pt_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  package_id uuid not null references pt_packages(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  trainer_id uuid references profiles(id) on delete set null,

  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  status pt_session_status not null default 'SCHEDULED',
  completed_at timestamptz,
  focus text,
  notes text
);
create index pt_sessions_member_scheduled_idx on pt_sessions (member_id, scheduled_at);
create index pt_sessions_trainer_scheduled_idx on pt_sessions (trainer_id, scheduled_at);

-- ---------------------------------------------------------------------------
-- Member notes
-- ---------------------------------------------------------------------------

create table member_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,

  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index member_notes_member_created_idx on member_notes (member_id, created_at);

-- ---------------------------------------------------------------------------
-- Subscriptions, freezes, payments
-- ---------------------------------------------------------------------------

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  membership_plan_id uuid not null references membership_plans(id),
  status subscription_status not null default 'ACTIVE',
  start_date timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();

create table subscription_freezes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,

  start_date date not null,
  end_date date not null,
  reason freeze_reason not null default 'OTHER',
  note text,
  created_at timestamptz not null default now()
);
create index subscription_freezes_subscription_idx on subscription_freezes (subscription_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'INR',
  status payment_status not null default 'PENDING',
  method payment_method,
  provider text not null default 'mock',
  provider_ref text,
  invoice_number text,
  note text,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------

create table attendance_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  source attendance_source not null default 'QR',
  checked_in_at timestamptz not null default now(),
  -- one check-in per member per local calendar day (idempotent check-in invariant)
  local_date date not null default (now()::date)
);
create index attendance_events_tenant_checked_in_idx on attendance_events (tenant_id, checked_in_at);
create unique index attendance_events_member_local_date_key on attendance_events (member_id, local_date);

-- ---------------------------------------------------------------------------
-- Classes & bookings
-- ---------------------------------------------------------------------------

create table gym_classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  trainer_id uuid references profiles(id) on delete set null,
  name text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 20,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  gym_class_id uuid not null references gym_classes(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  trainer_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (gym_class_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------

create table leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  source lead_source not null default 'WALK_IN',
  status lead_status not null default 'NEW',
  interested_plan_id uuid references membership_plans(id) on delete set null,
  assigned_trainer_id uuid references profiles(id) on delete set null,
  notes text,
  follow_up_at timestamptz,
  converted_member_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_tenant_status_idx on leads (tenant_id, status);
create trigger leads_set_updated_at before update on leads
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Diet plans
-- ---------------------------------------------------------------------------

create table diet_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  trainer_id uuid references profiles(id) on delete set null,
  title text not null,
  goal diet_goal not null default 'MAINTENANCE',
  daily_calories integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  meals jsonb not null,
  notes text,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index diet_plans_member_active_idx on diet_plans (member_id, is_active);
-- enforce "one active plan per member" at the DB level
create unique index diet_plans_one_active_per_member on diet_plans (member_id) where is_active;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table branches enable row level security;
alter table membership_plans enable row level security;
alter table members enable row level security;
alter table body_measurements enable row level security;
alter table pt_packages enable row level security;
alter table pt_sessions enable row level security;
alter table member_notes enable row level security;
alter table subscriptions enable row level security;
alter table subscription_freezes enable row level security;
alter table payments enable row level security;
alter table attendance_events enable row level security;
alter table gym_classes enable row level security;
alter table bookings enable row level security;
alter table leads enable row level security;
alter table diet_plans enable row level security;

-- tenants: public, read-only branding lookup (subdomain -> name/logo/colors)
-- for the login page, before the visitor is authenticated.
create policy tenants_public_read on tenants for select using (true);
create policy tenants_admin_write on tenants for update
  using (id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'))
  with check (id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));

-- profiles: no self-referencing subquery (avoids RLS recursion) — direct
-- auth.uid() check for "my own row", plus a tenant-roster policy for
-- OWNER/ADMIN via the SECURITY DEFINER helpers.
create policy profiles_self on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_tenant_roster on profiles for select
  using (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));
create policy profiles_tenant_admin_write on profiles for all
  using (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'))
  with check (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));

-- Standard tenant-isolation shape, reused for every remaining table:
--   SELECT/INSERT/UPDATE: tenant_id = public.staff_tenant()
--   DELETE (where destructive): additionally gated to OWNER/ADMIN

create policy branches_isolation on branches for select using (tenant_id = public.staff_tenant());
create policy branches_write on branches for insert with check (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));
create policy branches_update on branches for update
  using (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'))
  with check (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));

create policy membership_plans_isolation on membership_plans for select using (tenant_id = public.staff_tenant());
create policy membership_plans_write on membership_plans for insert with check (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));
create policy membership_plans_update on membership_plans for update
  using (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'))
  with check (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));

create policy members_isolation on members for select using (tenant_id = public.staff_tenant());
create policy members_write on members for insert with check (tenant_id = public.staff_tenant());
create policy members_update on members for update
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());
create policy members_delete on members for delete
  using (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN'));

create policy body_measurements_all on body_measurements for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy pt_packages_all on pt_packages for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy pt_sessions_all on pt_sessions for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy member_notes_all on member_notes for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy subscriptions_all on subscriptions for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy subscription_freezes_all on subscription_freezes for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

-- payments: read for any staff role, write restricted to OWNER/ADMIN/STAFF
-- (financially sensitive — TRAINER should not be able to record/edit payments)
create policy payments_read on payments for select using (tenant_id = public.staff_tenant());
create policy payments_write on payments for all
  using (tenant_id = public.staff_tenant())
  with check (tenant_id = public.staff_tenant() and public.staff_role() in ('OWNER', 'ADMIN', 'STAFF'));

create policy attendance_events_all on attendance_events for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy gym_classes_all on gym_classes for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy bookings_all on bookings for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy leads_all on leads for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());

create policy diet_plans_all on diet_plans for all
  using (tenant_id = public.staff_tenant()) with check (tenant_id = public.staff_tenant());
