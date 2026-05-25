# ── Stage 1: build the web dashboard (Vite → static dist) ──────────────────
FROM node:20-slim AS web
WORKDIR /web
COPY web-dashboard/package*.json ./
RUN npm ci
COPY web-dashboard/ ./
RUN npm run build

# ── Stage 2: API runtime (also serves the dashboard, same origin) ──────────
FROM node:20-slim
WORKDIR /app

# openssl: required by Prisma. postgresql-client: used by the deploy step to
# apply the RLS policy file. ca-certificates: TLS to managed DB/Redis.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# STATIC_DIR points at the built dashboard. NODE_ENV is set to "production" at
# runtime by the host (render.yaml) — NOT here, so `npm ci` still installs the
# devDependencies (Prisma CLI, tsx) needed to generate the client and run.
ENV STATIC_DIR=/app/public

COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate

# Built dashboard from stage 1, served at the same origin as the API.
COPY --from=web /web/dist ./public

EXPOSE 4000
# Run via tsx so TS path aliases (@/…) resolve exactly as in dev.
CMD ["npx", "tsx", "src/server.ts"]
