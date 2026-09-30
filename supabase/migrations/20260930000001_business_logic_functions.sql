-- Atomic operations that enforce a cross-row invariant and therefore cannot
-- safely live as plain client-side Supabase calls (no multi-statement
-- transaction primitive in supabase-js). SECURITY INVOKER throughout so RLS
-- still applies to every statement inside — these functions provide
-- atomicity, not a privilege escalation.

-- ---------------------------------------------------------------------------
-- create_member_with_subscription — Member + Subscription + Payment(s) in one
-- transaction (Postgres function bodies are atomic by default).
-- ---------------------------------------------------------------------------

create or replace function create_member_with_subscription(
  p_member jsonb,              -- member column/value pairs, tenant_id required inside
  p_membership_plan_id uuid,
  p_current_period_end timestamptz,
  p_paid_cents integer,        -- amount paid up front (0 allowed)
  p_total_cents integer,       -- full amount due for this period (plan price, usually)
  p_method payment_method default null
) returns members
language plpgsql security invoker as $$
declare
  v_member members;
  v_subscription subscriptions;
  v_tenant_id uuid := (p_member->>'tenant_id')::uuid;
begin
  if p_paid_cents > p_total_cents then
    raise exception 'paid amount (%) cannot exceed total due (%)', p_paid_cents, p_total_cents;
  end if;

  insert into members
  select * from jsonb_populate_record(null::members, p_member)
  returning * into v_member;

  insert into subscriptions (tenant_id, member_id, membership_plan_id, status, current_period_end)
  values (v_tenant_id, v_member.id, p_membership_plan_id, 'ACTIVE', p_current_period_end)
  returning * into v_subscription;

  if p_paid_cents > 0 then
    insert into payments (tenant_id, subscription_id, amount_cents, status, method, provider, invoice_number, paid_at)
    values (v_tenant_id, v_subscription.id, p_paid_cents, 'SUCCEEDED', p_method, 'mock',
            'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_subscription.id::text, 1, 8), now());
  end if;

  if p_total_cents - p_paid_cents > 0 then
    insert into payments (tenant_id, subscription_id, amount_cents, status, due_at)
    values (v_tenant_id, v_subscription.id, p_total_cents - p_paid_cents, 'PENDING', p_current_period_end);
  end if;

  return v_member;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_payment — applies an incoming payment across a member's oldest
-- PENDING/FAILED invoices first (by due_at, then created_at), splitting a
-- row when the payment only partially covers it, and auto-clearing a
-- subscription's PAST_DUE status once its balance reaches zero.
-- ---------------------------------------------------------------------------

create or replace function record_payment(
  p_member_id uuid,
  p_amount_cents integer,
  p_method payment_method default null,
  p_note text default null
) returns setof payments
language plpgsql security invoker as $$
declare
  v_due record;
  v_remaining integer := p_amount_cents;
  v_apply integer;
  v_tenant_id uuid;
  v_new_payment payments;
begin
  if p_amount_cents <= 0 then
    raise exception 'payment amount must be positive';
  end if;

  select tenant_id into v_tenant_id from members where id = p_member_id;
  if v_tenant_id is null then
    raise exception 'member % not found', p_member_id;
  end if;

  for v_due in
    select p.* from payments p
    join subscriptions s on s.id = p.subscription_id
    where s.member_id = p_member_id and p.status in ('PENDING', 'FAILED')
    order by coalesce(p.due_at, p.created_at) asc, p.created_at asc
    for update of p
  loop
    exit when v_remaining <= 0;
    v_apply := least(v_remaining, v_due.amount_cents);

    if v_apply = v_due.amount_cents then
      -- fully covers this invoice
      update payments
      set status = 'SUCCEEDED', method = p_method, paid_at = now(), note = coalesce(p_note, note),
          invoice_number = coalesce(invoice_number, 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_due.id::text, 1, 8))
      where id = v_due.id
      returning * into v_new_payment;
    else
      -- partial: split off the paid portion as its own SUCCEEDED row,
      -- shrink the original PENDING/FAILED row by that amount
      insert into payments (tenant_id, subscription_id, amount_cents, status, method, provider, note, paid_at, invoice_number)
      values (v_tenant_id, v_due.subscription_id, v_apply, 'SUCCEEDED', p_method, v_due.provider, p_note, now(),
              'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_due.id::text, 1, 8))
      returning * into v_new_payment;

      update payments set amount_cents = amount_cents - v_apply where id = v_due.id;
    end if;

    return next v_new_payment;
    v_remaining := v_remaining - v_apply;
  end loop;

  if v_remaining > 0 then
    raise notice 'payment of % applied with % cents left over (no outstanding invoices to apply it to)', p_amount_cents, v_remaining;
  end if;

  -- auto-clear PAST_DUE on any subscription of this member that has no
  -- remaining PENDING/FAILED invoices
  update subscriptions s
  set status = 'ACTIVE'
  where s.member_id = p_member_id
    and s.status = 'PAST_DUE'
    and not exists (
      select 1 from payments p where p.subscription_id = s.id and p.status in ('PENDING', 'FAILED')
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- book_class — capacity-checked booking. Row-locks the class to close the
-- check-then-insert race a plain client-side check can't avoid.
-- ---------------------------------------------------------------------------

create or replace function book_class(p_gym_class_id uuid, p_member_id uuid, p_trainer_id uuid default null)
returns bookings
language plpgsql security invoker as $$
declare
  v_class gym_classes;
  v_booked_count integer;
  v_booking bookings;
begin
  select * into v_class from gym_classes where id = p_gym_class_id for update;
  if v_class is null then
    raise exception 'class % not found', p_gym_class_id;
  end if;

  select count(*) into v_booked_count from bookings where gym_class_id = p_gym_class_id;
  if v_booked_count >= v_class.capacity then
    raise exception 'class % is full (capacity %)', p_gym_class_id, v_class.capacity;
  end if;

  insert into bookings (tenant_id, gym_class_id, member_id, trainer_id)
  values (v_class.tenant_id, p_gym_class_id, p_member_id, p_trainer_id)
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- book_pt_session — capacity-checked against the package's sessions_purchased.
-- ---------------------------------------------------------------------------

create or replace function book_pt_session(
  p_package_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes integer default 60,
  p_focus text default null,
  p_notes text default null
) returns pt_sessions
language plpgsql security invoker as $$
declare
  v_package pt_packages;
  v_used_count integer;
  v_session pt_sessions;
begin
  select * into v_package from pt_packages where id = p_package_id for update;
  if v_package is null then
    raise exception 'pt package % not found', p_package_id;
  end if;

  select count(*) into v_used_count from pt_sessions
  where package_id = p_package_id and status <> 'CANCELLED';
  if v_used_count >= v_package.sessions_purchased then
    raise exception 'pt package % has no sessions remaining (% of % used)', p_package_id, v_used_count, v_package.sessions_purchased;
  end if;

  insert into pt_sessions (tenant_id, package_id, member_id, trainer_id, scheduled_at, duration_minutes, focus, notes)
  values (v_package.tenant_id, p_package_id, v_package.member_id, v_package.trainer_id, p_scheduled_at, p_duration_minutes, p_focus, p_notes)
  returning * into v_session;

  return v_session;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_diet_plan — enforces "one active plan per member": deactivates the
-- prior active plan (if any) and inserts the new one, atomically.
-- (Belt-and-suspenders alongside the partial unique index on diet_plans.)
-- ---------------------------------------------------------------------------

create or replace function create_diet_plan(p_plan jsonb) returns diet_plans
language plpgsql security invoker as $$
declare
  v_member_id uuid := (p_plan->>'member_id')::uuid;
  v_plan diet_plans;
begin
  update diet_plans set is_active = false, end_date = now()
  where member_id = v_member_id and is_active;

  insert into diet_plans
  select * from jsonb_populate_record(null::diet_plans, p_plan || jsonb_build_object('is_active', true))
  returning * into v_plan;

  return v_plan;
end;
$$;

-- ---------------------------------------------------------------------------
-- checkin_member — idempotent check-in (one per member per local day).
-- Backed by the unique index on (member_id, local_date); this wrapper lets
-- the app get either the new row or the existing one back in a single call.
-- ---------------------------------------------------------------------------

create or replace function checkin_member(p_member_id uuid, p_source attendance_source default 'MANUAL')
returns attendance_events
language plpgsql security invoker as $$
declare
  v_tenant_id uuid;
  v_event attendance_events;
begin
  select tenant_id into v_tenant_id from members where id = p_member_id;
  if v_tenant_id is null then
    raise exception 'member % not found', p_member_id;
  end if;

  insert into attendance_events (tenant_id, member_id, source)
  values (v_tenant_id, p_member_id, p_source)
  on conflict (member_id, local_date) do nothing
  returning * into v_event;

  if v_event is null then
    select * into v_event from attendance_events
    where member_id = p_member_id and local_date = now()::date;
  end if;

  return v_event;
end;
$$;

-- ---------------------------------------------------------------------------
-- mrr_by_tenant — billing-cycle-weighted MRR, as a view (matches the
-- analytics dashboard's MRR figure; queryable/testable in isolation).
-- ---------------------------------------------------------------------------

create or replace view mrr_by_tenant with (security_invoker = true) as
select
  s.tenant_id,
  sum(
    mp.price_cents * case mp.billing_cycle
      when 'MONTHLY' then 1
      when 'QUARTERLY' then 1.0 / 3
      when 'YEARLY' then 1.0 / 12
      else 0 -- ONE_TIME plans don't contribute to recurring revenue
    end
  )::bigint as mrr_cents
from subscriptions s
join membership_plans mp on mp.id = s.membership_plan_id
where s.status = 'ACTIVE'
group by s.tenant_id;
