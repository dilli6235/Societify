# Societify — All-In-One Society & Community Management SaaS

A multi-tenant platform for residential communities, covering five pillars:
governance, finance & billing, multi-role apps, operations & amenities, and a
community hub — plus cross-cutting jobs and notifications.

```
society_app/
├── backend/         Node + Express + TypeScript + Prisma + PostgreSQL (RLS)
└── web-dashboard/   React + TypeScript + Vite + Tailwind admin console
```

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env            # fill JWT secrets: openssl rand -base64 48
docker compose up -d            # postgres (+ app role) + redis
npm install
npm run prisma:migrate
psql "postgresql://postgres:postgres@localhost:5432/society_saas" -f prisma/rls/enable-rls.sql
npm run db:seed
npm run dev                     # API   → http://localhost:4000/api/v1
npm run worker                  # jobs  → background worker (separate process)

# 2. Web dashboard (new terminal)
cd ../web-dashboard
npm install
npm run dev                     # UI    → http://localhost:5173
```

Seeded logins: society admin → slug `greenwood-heights`,
`admin@greenwood.local` / `ChangeMe123!`; platform super admin →
`superadmin@platform.local` / `ChangeMe123!` (no slug).

## What's implemented

**Backend (`backend/README.md` for detail)** — 8 modules:

1. **Auth + Multi-tenancy** — JWT + rotating refresh tokens; 3-layer tenant
   isolation (middleware → Prisma client extension → PostgreSQL Row-Level
   Security with a non-superuser app role).
2. **Property** — blocks, units, residencies (with occupancy derivation).
3. **Finance & Billing** — invoices (atomic numbering + line items), payments
   (manual + Razorpay online + idempotent webhook), expenses.
4. **Gate & Security** — QR/OTP visitor passes, resident approval, guard
   check-in/out, state machine.
5. **Provisioning** — invite/onboard residents & staff, role management.
6. **Community Hub** — amenity bookings (overlap-safe), complaints/tickets,
   notices, polls.
7. **Background Jobs (BullMQ)** — monthly invoicing, overdue sweeps, gate-pass
   expiry.
8. **Notifications** — channel-pluggable (in-app + FCM push + email), delivered
   async via queue, wired into domain events.

**Web dashboard (`web-dashboard/README.md`)** — admin console covering every
module: auth + RBAC, dashboard KPIs, properties, people/invites, billing, gate,
amenities, complaints, notices, polls, and a live notification bell.

## Architecture highlights

- **Tenant isolation is structural, not incidental.** Every tenant query goes
  through an RLS-scoped Prisma client; the app connects as a `NOSUPERUSER` role,
  so an unscoped query returns zero rows — secure by default.
- **Clean layered backend** — `routes → controller → service → Prisma`, vertical
  slices per module, providers behind interfaces (payments, notifications) for
  drop-in swaps.
- **Idempotency + async by design** — payment webhooks and invoice generation
  never double-apply; notifications can never break the originating request.

> Note: these projects were authored without a local Node runtime available to
> compile them. Run `npm install && npm run typecheck` in each before first use.
