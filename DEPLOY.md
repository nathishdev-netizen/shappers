# Deploying SHAPER

Two accounts, one domain:

| Piece | Host | Notes |
|---|---|---|
| PostgreSQL | **Supabase** | free tier, always available |
| Web + API | **Vercel** | one project, one URL, via [Services](https://vercel.com/docs/services) |

`vercel.json` at the repo root declares both halves as services, so
`https://your-app.vercel.app` serves the site and `/api/*` reaches the NestJS
server. They share an origin, which means **there is no CORS to configure**.

> Vercel Services is in beta and may need enabling on your account. If it is not
> available, see [Fallback](#fallback-api-on-railway) at the bottom — the same
> Docker image runs on Railway or Render unchanged.

---

## 1. Database — Supabase

1. Create a project at [supabase.com](https://supabase.com). Save the database
   password it generates; you cannot read it back later.
2. **Project Settings → Database → Connection string → URI**, and copy two of them:

   | Which | Port | Used for |
   |---|---|---|
   | **Transaction pooler** | `6543` | `DATABASE_URL` — every normal query |
   | **Direct connection** | `5432` | `DIRECT_URL` — migrations only |

Both are needed, and the distinction matters:

- Serverless containers each open their own connection, so the **pooled** URL is
  what keeps Postgres from running out of connections under load.
- Migrations need the **direct** URL: the pooler runs in transaction mode and
  cannot execute the advisory locks and DDL that Prisma migrations use.

Append `?pgbouncer=true&connection_limit=1` to the pooled URL.

---

## 2. Web + API — Vercel

Import `nathishdev-netizen/shappers` at [vercel.com/new](https://vercel.com/new).
Leave the root directory as the repository root — the root `vercel.json` handles
the rest.

Environment variables:

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase pooled URL (port 6543) |
| `DIRECT_URL` | Supabase direct URL (port 5432) |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 32` |
| `JWT_ACCESS_EXPIRES_IN` | `12h` |
| `NEXT_PUBLIC_API_URL` | `/api` |

`NEXT_PUBLIC_API_URL` is a **relative** path on purpose: the API is served from
the same domain, so the browser calls `/api/...` with no cross-origin request at
all. It is also inlined at build time, so changing it later needs a redeploy
rather than a restart.

Deploy. The API container runs `prisma migrate deploy` on boot, so the Supabase
schema is created automatically.

### Check it

```bash
curl -i https://<your-app>.vercel.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"subdomain":"x","email":"x@y.z","password":"x"}'
```

A **401** is the correct answer — it proves the API booted and reached the
database. A 404 means the rewrite is not matching; a 500 means the database
variables are wrong.

---

## 3. Seed the demo data

Supabase starts empty. From your Mac, pointed at it:

```bash
cd apps/api
DATABASE_URL='<pooled url>' DIRECT_URL='<direct url>' pnpm run seed
```

That creates the club, 28 members, staff, plans, payments and attendance.
Re-running is safe — it only deletes and recreates the demo tenants.

Then sign in:

```
subdomain  shaper
email      owner@shaper.fit
password   Password123!
```

---

## 4. Point the Android app at it

The APK has its API URL compiled in, so switching it to the hosted API is a
rebuild:

```bash
cd apps/mobile/android
EXPO_PUBLIC_API_URL="https://<your-app>.vercel.app/api" ./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`.

Because the hosted API is HTTPS, you can now drop the cleartext allowance from
`apps/mobile/app.json` (`expo-build-properties` → `usesCleartextTraffic`). It
only ever existed to permit plain-HTTP traffic to a laptop on the local network.

---

## Fallback: API on Railway

If Services is unavailable, run the web app on Vercel by itself and put the API
on Railway with the same Dockerfile:

1. Railway → *Deploy from GitHub repo* → **Root Directory**: `apps/api`
   (the Dockerfile is self-contained and builds from that folder).
2. Set `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`.
3. Generate a domain.
4. On Vercel set `NEXT_PUBLIC_API_URL` to `https://<railway-domain>/api` — an
   absolute URL this time, since the origins now differ.
5. Set `CORS_ORIGIN` on Railway to your Vercel URL, because cross-origin requests
   now need to be allowed explicitly.

---

## Costs and gotchas

- **Supabase** free projects pause after a week of inactivity; opening the
  dashboard wakes them. Check it the day before a demo.
- **Vercel** container services consume build minutes; the free tier is fine for
  a demo but not for constant redeploys.
- The seed wipes and recreates the demo tenants, so never point it at a database
  holding anything real.
