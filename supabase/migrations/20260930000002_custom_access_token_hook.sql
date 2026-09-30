-- Custom Access Token Hook: injects tenant_id + role into the JWT's
-- app_metadata on every token mint/refresh, so read-path RLS checks and the
-- Next.js app can use cheap claim reads instead of a DB round trip.
--
-- After running this migration, it must also be wired up in the dashboard:
-- Authentication -> Hooks (Beta) -> Custom Access Token -> select
-- "custom_access_token_hook" (Postgres Hook). This cannot be done via SQL.
--
-- Write paths that are sensitive (role changes, payments) must still
-- re-verify live against `profiles` via public.staff_tenant()/public.staff_role()
-- rather than trusting the JWT claim — those can be stale for up to one
-- token-refresh interval after a role change or deactivation.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable as $$
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

-- Supabase Auth calls this hook as the supabase_auth_admin role.
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

grant usage on schema public to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;

-- profiles RLS must not block the hook's lookup (it runs as supabase_auth_admin,
-- not through the normal authenticated-user session, so this is a distinct grant,
-- not a new policy — RLS is bypassed for roles with BYPASSRLS, which
-- supabase_auth_admin has by default on Supabase-managed projects).
