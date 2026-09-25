# Shappers — White-Label Gym Management Platform

Multi-tenant gym management: a staff admin panel plus a member/front-desk app that ships to
Android and the browser from one codebase. Every club gets its own name and colours.
Built entirely on open-source infrastructure.

## Structure

```
apps/
  api/         NestJS + Prisma + Postgres — JWT auth, RBAC, tenant-scoped data
  admin-web/   Next.js staff panel — dashboard, members, attendance, branding
  mobile/      Expo (React Native) front-desk app — Android APK + Web/PWA
packages/
  shared-types/   Shared TypeScript enums/DTOs
  theme-config/   Per-tenant white-label branding contract
infra/
  docker-compose.yml   Postgres, pgAdmin, MinIO
```

> `apps/mobile` sits outside the pnpm workspace on purpose — Expo's Metro bundler
> has known friction with pnpm's symlinked `node_modules`, so it keeps its own npm lockfile.

## Prerequisites

- Node.js 20+ · pnpm 9+ · Docker Desktop

## Getting started

```bash
pnpm install                       # api + admin-web
npm --prefix apps/mobile install   # mobile

pnpm infra:up                      # Postgres :5434, pgAdmin :5050, MinIO :9000/:9001
cp infra/.env.example apps/api/.env

cd apps/api
pnpm exec prisma migrate dev       # create schema
node --experimental-strip-types prisma/seed.ts   # demo data
cd ../..

pnpm dev:api      # http://localhost:3000/api
pnpm dev:admin    # http://localhost:3001
pnpm dev:mobile   # Expo — press "w" for web, "a" for Android
```

> Postgres is mapped to host port **5434**, not 5432 — a native Postgres already owns
> 5432 on the development machine and 5433 belongs to another project's container.

## Demo logins

| Club | Subdomain | Email | Password |
|---|---|---|---|
| Pulse Fitness Club (orange, 28 members) | `demo-gym` | `owner@demo-gym.com` | `Password123!` |
| Iron House Strength (blue, empty) | `iron-house` | `owner@iron-house.com` | `Password123!` |

Two tenants on one deployment — switching between them shows both the branding swap and
the data isolation. Extra roles on `demo-gym`: `manager@demo-gym.com` (ADMIN),
`coach@demo-gym.com` (TRAINER).

### Refresh before a demo

```bash
pnpm seed
```

Attendance and payments are generated **relative to the day you seed**, so data seeded last
week leaves "Check-ins today" at zero and flat-lines the end of the trend chart. Re-seeding
regenerates it against today. Note it recreates both demo tenants from scratch, so any
branding you saved in the UI is reset.

## Design decisions worth knowing

- **Brand colour owns chrome; charts keep their own palette.** A club's accent drives
  buttons, nav and highlights, but plotted marks use a fixed, contrast- and
  colourblind-validated palette — so data stays readable whatever brand is applied.
- **Every chart has a table view.** The toggle in each chart card exposes the same values
  as text, so nothing is gated behind colour or a hover tooltip.
- **Status never rides on colour alone** — each pill carries an icon and a label.

## Producing demo deliverables

- **Android APK**: `cd apps/mobile && npx expo run:android --variant release`
- **Web/PWA**: `cd apps/mobile && npx expo export --platform web` → serve `dist/`
- **Admin panel**: `cd apps/admin-web && pnpm build && pnpm start`

## Notes

- Payments run in mock mode — no real transactions, no vendor lock-in. Swapping in a real
  gateway is a config change at the boundary.
- No iOS build in scope; the web/PWA build covers iPhone via "Add to Home Screen".
