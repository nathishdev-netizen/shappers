import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Service-role client — bypasses RLS entirely. Only import this from
 * server-only code (Server Actions, Route Handlers), never from a
 * Client Component. The `server-only` import above enforces that at build time. */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
