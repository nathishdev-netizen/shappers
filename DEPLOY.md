# Deploying SHAPER

Three services, all on free tiers:

| Piece | Host | What it serves |
|---|---|---|
| Web console (Next.js) | Vercel | the site your client opens |
| API (NestJS) | Railway or Render | every request the site makes |
| PostgreSQL | Neon | the demo data |

Deploy them in that order — **database → API → web** — because each needs the URL of
the one before it.

---

## 0. Push the repo

Vercel and Railway both deploy from GitHub.

```bash
cd ~/Desktop/Nathish/explore/shappers
gh repo create shappers --private --source=. --push
```

`.env` files are gitignored, so no secrets leave your machine. You will set each
secret in the hosting dashboards instead.

---

## 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech) (region: closest to your client).
2. Copy the **pooled** connection string. It looks like:
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

Use the **pooled** one (`-pooler` in the host). The direct URL runs out of
connections under even light demo traffic.

---

## 2. API — Railway

1. New project at [railway.app](https://railway.app) → *Deploy from GitHub repo*.
2. Settings → **Dockerfile path**: `apps/api/Dockerfile`
   (leave the root directory as the repo root — pnpm needs the workspace manifest).
3. Variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon pooled string from step 1 |
   | `JWT_ACCESS_SECRET` | a long random string — generate with `openssl rand -base64 32` |
   | `JWT_ACCESS_EXPIRES_IN` | `12h` |
   | `CORS_ORIGIN` | leave unset for now; set it in step 4 |

4. Deploy, then **Settings → Networking → Generate Domain**.

The container runs `prisma migrate deploy` on boot, so the schema is created
automatically. Check it is alive:

```bash
curl -i https://<your-api>.up.railway.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"subdomain":"x","email":"x@y.z","password":"x"}'
```

A **401** is the correct answer — it means the API and database are talking. A 502
or a timeout means the service did not boot; check the deploy logs.

### Seed the demo data

The hosted database starts empty. From your Mac, pointing at Neon:

```bash
cd apps/api
DATABASE_URL='<neon pooled url>' pnpm run seed
```

This creates the SHAPER club, 28 members, staff, plans, payments and attendance.
Re-running it is safe — it deletes and recreates the demo tenants only.

---

## 3. Web — Vercel

1. [vercel.com](https://vercel.com) → *Add New Project* → import the repo.
2. **Root Directory**: `apps/admin-web`
3. Environment variable:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<your-api>.up.railway.app/api` |

   The `/api` suffix matters — the server sets that global prefix.

4. Deploy.

`NEXT_PUBLIC_*` values are baked in at build time, so **changing this later needs a
redeploy**, not just a restart.

---

## 4. Lock down CORS

Back in Railway, set `CORS_ORIGIN` to your Vercel URL:

```
CORS_ORIGIN=https://shappers.vercel.app
```

Unset, the API accepts requests from any origin — fine while wiring things up,
worth closing once the domain is known. Redeploy the API after changing it.

---

## Sign in

```
subdomain  shaper
email      owner@shaper.fit
password   Password123!
```

The site installs to a phone home screen too: open it in the phone browser and
choose **Add to Home Screen**.

---

## Updating the Android app

The APK has its API URL compiled in, so pointing it at the hosted API means a
rebuild:

```bash
cd apps/mobile/android
EXPO_PUBLIC_API_URL="https://<your-api>.up.railway.app/api" \
  ./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`.

Once the API is on HTTPS you can drop the cleartext allowance from `app.json`
(`expo-build-properties` → `usesCleartextTraffic`), since it only exists to permit
plain-HTTP traffic to a laptop on the local network.

---

## Costs

Free tiers cover a demo. The limits that actually bite:

- **Neon** free databases suspend after inactivity; the first request afterwards
  takes a few seconds to wake. Open the site once before a client walks in.
- **Railway** free usage is metered per month and the service sleeps when it runs
  out.
- **Vercel** is generous for this kind of traffic.
