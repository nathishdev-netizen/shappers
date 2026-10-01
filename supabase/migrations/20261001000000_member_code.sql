-- Human-facing member ID (e.g. "SHP001") — separate from the internal uuid,
-- for front-desk lookup, physical cards, and search. Auto-generated per
-- tenant from a short club code + a zero-padded sequential number.

alter table tenants add column code text;
update tenants set code = 'SHP' where subdomain = 'shaper';
update tenants set code = 'IHS' where subdomain = 'iron-house';

alter table members add column member_code text;
create unique index members_tenant_member_code_key on members (tenant_id, member_code);

create or replace function set_member_code() returns trigger
language plpgsql as $$
declare
  v_prefix text;
  v_next int;
begin
  if new.member_code is not null then
    return new;
  end if;

  -- Serializes concurrent inserts for the same tenant so two staff adding a
  -- member at the same moment can't compute the same "next" number.
  perform pg_advisory_xact_lock(hashtext(new.tenant_id::text));

  select coalesce(code, 'MEM') into v_prefix from tenants where id = new.tenant_id;
  select coalesce(max(substring(member_code from '(\d+)$')::int), 0) + 1 into v_next
    from members where tenant_id = new.tenant_id;

  new.member_code := v_prefix || lpad(v_next::text, 3, '0');
  return new;
end;
$$;

create trigger members_set_member_code before insert on members
  for each row execute function set_member_code();
