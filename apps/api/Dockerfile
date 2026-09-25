# Build the NestJS API.
#
# The build context is THIS directory, not the repo root, so the image works
# anywhere the service's own folder is the root: Vercel Services (root: apps/api),
# Railway and Render (root directory: apps/api), or locally:
#
#   docker build -t shaper-api apps/api
#
# apps/api has no workspace dependencies, so nothing outside this folder is needed.

FROM node:22-slim AS base
# Prisma's query engine links against OpenSSL, which the slim image omits.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

# ---- dependencies ----
FROM base AS deps
COPY package.json ./
# No lockfile here: it lives at the workspace root, outside this build context.
RUN pnpm install --no-frozen-lockfile

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm run build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app ./
EXPOSE 3000

# Migrations run on boot so a fresh database is schema-correct before traffic
# arrives. `migrate deploy` only applies committed migrations and never resets
# data, unlike `migrate dev`. It uses DIRECT_URL, because pgbouncer's transaction
# mode cannot run the advisory locks and DDL that migrations need.
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
