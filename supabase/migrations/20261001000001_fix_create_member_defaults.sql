-- Bug fix: jsonb_populate_record(null::members, p_member) does NOT apply the
-- table's column defaults for keys missing from p_member (defaults are a
-- table-level concept, not part of the composite type) — every NOT NULL
-- column with a default (id, created_at, updated_at, preferred_contact,
-- physician_clearance, access_blocked) came back as SQL NULL unless the
-- caller happened to pass it explicitly, crashing the insert on id's
-- NOT NULL constraint the first time this was actually exercised end-to-end.
-- Fix: seed the known defaults first, then let p_member override on top.

create or replace function create_member_with_subscription(
  p_member jsonb,
  p_membership_plan_id uuid,
  p_current_period_end timestamptz,
  p_paid_cents integer,
  p_total_cents integer,
  p_method payment_method default null
) returns members
language plpgsql security invoker as $$
declare
  v_member members;
  v_subscription subscriptions;
  v_tenant_id uuid := (p_member->>'tenant_id')::uuid;
  v_payload jsonb;
begin
  if p_paid_cents > p_total_cents then
    raise exception 'paid amount (%) cannot exceed total due (%)', p_paid_cents, p_total_cents;
  end if;

  v_payload := jsonb_build_object(
    'id', gen_random_uuid(),
    'created_at', now(),
    'updated_at', now(),
    'preferred_contact', 'PHONE',
    'physician_clearance', false,
    'access_blocked', false
  ) || p_member;

  insert into members
  select * from jsonb_populate_record(null::members, v_payload)
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
