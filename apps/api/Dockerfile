# Build the NestJS API out of the pnpm workspace.
#
# Built from the REPO ROOT, not this directory, because pnpm needs the workspace
# manifest and lockfile to resolve `apps/api`:
#   docker build -f apps/api/Dockerfile .
# Railway and Render do this automatically when the Dockerfile path is set.

FROM node:22-slim AS base
# Prisma's query engine is linked against OpenSSL; the slim image omits it.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

# ---- dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
# Only the API's workspace is needed; the web and mobile apps never run here.
RUN pnpm install --filter ./apps/api... --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN pnpm prisma generate && pnpm run build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api /app/apps/api
WORKDIR /app/apps/api

# The platform injects PORT; main.ts binds 0.0.0.0 so health checks can reach it.
EXPOSE 3000

# Migrations run on boot so a fresh database is schema-correct before traffic
# arrives. `migrate deploy` only applies committed migrations — it never resets
# data, unlike `migrate dev`.
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
