# Shappers — White-Label Gym Management Platform

Multi-tenant gym management, built as a single Next.js app (an installable PWA) talking
directly to Supabase — Postgres, Auth, and Row Level Security for tenant isolation. Every
club gets its own name and colours.

## Structure

```
src/                Next.js App Router app
  app/               Pages, grouped under (app) for the authenticated shell
  lib/insights/      Data-access + business logic (queries, RPC calls, computed fields)
  lib/actions/       Server Actions for operations that need the service-role key
  lib/supabase/      Client/server/admin Supabase client helpers + generated types
supabase/
  migrations/        Schema, RLS policies, and business-logic RPCs (SQL)
  seed.mjs           Provisions demo tenants, staff, and a full demo dataset
```

There is no separate API service and no mobile app — a previous version of this project
had both (a NestJS API, an Expo/React Native app). The NestJS API's logic was ported into
`src/lib/insights/` and `supabase/migrations/` (as RLS policies and RPCs) and the service
itself retired; the mobile app was a feature-for-feature duplicate of the web admin panel,
so the installable PWA replaces it.

## Prerequisites

- Node.js 20+ · pnpm 10+
- A Supabase project (schema/RLS already defined in `supabase/migrations/`)

## Getting started

```bash
pnpm install
cp .env.example .env.local    # fill in your Supabase project URL + anon key
pnpm dev                      # http://localhost:3000
```

The `SUPABASE_SECRET_KEY` var in `.env.local` is only needed for server-only/admin
operations (e.g. `supabase/seed.mjs`) — never commit it, and never prefix it with
`NEXT_PUBLIC_`.

## Demo logins

| Club | Email | Password |
|---|---|---|
| SHAPER Elite Fitness Studio (red) | `owner@shaper.fit` | `Password123!` |
| Iron House Strength Co. (blue) | `owner@iron-house.com` | `Password123!` |

Two tenants on one deployment — switching between them shows both the branding swap and
RLS-enforced data isolation. Extra `shaper` staff: `prethive@shaper.fit`, `sagar@shaper.fit`
(both TRAINER).

### Re-seeding

```bash
node supabase/seed.mjs
```

Idempotent — safe to re-run; it looks up existing tenants/users by email/subdomain rather
than duplicating them.

## Design decisions worth knowing

- **Brand colour owns chrome; charts keep their own palette.** A club's accent drives
  buttons, nav and highlights, but plotted marks use a fixed, contrast- and
  colourblind-validated palette — so data stays readable whatever brand is applied.
- **Every chart has a table view.** The toggle in each chart card exposes the same values
  as text, so nothing is gated behind colour or a hover tooltip.
- **Status never rides on colour alone** — each pill carries an icon and a label.
- **Tenant isolation is enforced by Postgres RLS**, not application code — every table
  carries a `tenant_id` column and a policy scoping it to the caller's tenant (see
  `supabase/migrations/`), so a missed `where` clause in app code can't leak data across
  tenants.

## Notes

- Payments run in mock mode — no real transactions, no vendor lock-in. Swapping in a real
  gateway is a config change at the boundary.
- No iOS build in scope; the installable PWA covers iPhone via "Add to Home Screen".
