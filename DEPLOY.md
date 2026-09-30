# Deploying SHAPER

One app, one service: a Next.js app on Vercel talking directly to Supabase. No API
container, no Docker image, no CORS to configure.

## 1. Database — Supabase

Already set up for this project (ref `nxgcwljzaqdthfbgesbh`). For a new project:

1. Create a project at [supabase.com](https://supabase.com).
2. Install the CLI and link it: `brew install supabase/tap/supabase` (or download the
   binary from the [releases page](https://github.com/supabase/cli/releases) — no
   Homebrew/Xcode license needed), then `supabase link --project-ref <your-ref>`.
3. Push the schema: `supabase db push` — applies everything in `supabase/migrations/`
   (tables, RLS policies, business-logic RPCs).
4. In the dashboard, go to **Authentication → Hooks (Beta) → Custom Access Token** and
   select `custom_access_token_hook` (this one step can't be done via SQL/CLI).
5. Seed demo data: `node supabase/seed.mjs` (reads `.env.local`).

## 2. Web app — Vercel

Import the repo at [vercel.com/new](https://vercel.com/new). Root directory stays the
repository root — `vercel.json` handles the rest (it's a plain Next.js app now).

Environment variables (Project Settings → Environment Variables):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The `publishable`/`anon` key (Project Settings → API) |
| `SUPABASE_SECRET_KEY` | The `secret`/`service_role` key — server-only, never exposed to the client |

Deploy. There's no migration step on boot — the schema already lives in Supabase,
managed via `supabase db push` from your machine (or a CI step, if you want that later).

## Costs and gotchas

- **Supabase** free projects pause after a week of inactivity; opening the dashboard
  wakes them. Check it the day before a demo.
- `supabase/seed.mjs` is idempotent (looks up existing rows by email/subdomain) but still
  writes real rows — don't point it at a project holding real customer data.
