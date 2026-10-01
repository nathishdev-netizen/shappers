-- Fix: supabase_auth_admin does NOT have BYPASSRLS on this project (verified
-- via pg_roles), so the hook's `select ... from profiles` was blocked by RLS
-- even with the explicit grant. SECURITY DEFINER makes it run as the
-- function's owner (postgres, which does have BYPASSRLS) regardless of the
-- calling role, closing that gap.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  claims jsonb;
  v_profile profiles;
begin
  select * into v_profile from public.profiles where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if v_profile is not null then
    claims := jsonb_set(claims, '{app_metadata,tenant_id}', to_jsonb(v_profile.tenant_id));
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(v_profile.role));
    claims := jsonb_set(claims, '{app_metadata,is_active}', to_jsonb(v_profile.is_active));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
