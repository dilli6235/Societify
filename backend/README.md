# Society SaaS — Backend

Multi-tenant Society & Residential Community Management API.
Node.js · Express · TypeScript · Prisma · PostgreSQL (Row-Level Security).

## What's implemented

### Module 1 — Auth + Multi-Tenancy core

- JWT access tokens (short-lived) + rotating, hashed, revocable refresh tokens (httpOnly cookie).
- RBAC middleware (`requireRole`).
- Three-layer tenant isolation: app middleware → `tenantPrisma` client extension → PostgreSQL RLS.
- Endpoints: `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`.

### Module 2 — Property Management

Full tenant-isolated CRUD for the society's physical structure. All routes are
`authenticate` + `withTenant`; mutations require `SOCIETY_ADMIN` /
`COMMITTEE_MEMBER` / `FACILITY_ADMIN`.

- **Society profile** — `GET /properties/society`, `PATCH /properties/society` (admin only).
- **Blocks** — `GET|POST /properties/blocks`, `GET|PATCH|DELETE /properties/blocks/:id`.
- **Units** — `GET|POST /properties/units`, `GET|PATCH|DELETE /properties/units/:id` (filter by block/occupancy/search).
- **Residencies** — link users to units over time: `GET|POST /properties/residencies`,
  `GET|PATCH|DELETE /properties/residencies/:id`, `POST /properties/residencies/:id/end` (move-out).
  Unit `occupancyStatus` is auto-derived from active residencies.

Cross-tenant FK attacks are blocked explicitly: a unit's `blockId` and a
residency's `unitId`/`userId` are verified to belong to the caller's society
(FK checks alone bypass RLS, so the service re-validates).

### Module 3 — Finance & Billing

Restricted to `SOCIETY_ADMIN` / `COMMITTEE_MEMBER` (treasurer), except resident
self-service payment.

- **Invoices** — `GET|POST /billing/invoices`, `GET /billing/invoices/:id`,
  `POST /billing/invoices/:id/issue`, `/cancel`. Created with line items in one
  atomic transaction; invoice numbers come from a **concurrency-safe
  per-society counter** (`Society.invoiceSeq`, incremented via `UPDATE … RETURNING`).
- **Payments** —
  - `POST /billing/payments/manual` — admin records cash/cheque/bank/UPI.
  - `POST /billing/payments/order` — resident starts an online payment (creates a Razorpay order).
  - `POST /billing/payments/verify` — verifies the checkout handshake signature.
  - `POST /billing/payments/webhook` — **public, unauthenticated** server-to-server
    reconciliation (the authoritative path). HMAC-verified against the captured
    raw body. Fully idempotent — never double-applies a payment.
  - Applying a payment recomputes the invoice (`PARTIALLY_PAID` / `PAID`).
- **Expenses** — full CRUD plus `GET /billing/expenses/summary` (totals grouped
  by category over a date range, for dashboards).

Payment gateway code lives behind a provider interface
(`src/integrations/payments/`) — swapping in Stripe means implementing one
interface, no billing-service changes. Online payments are disabled gracefully
if `RAZORPAY_*` env vars are unset; manual recording always works.

> **Razorpay webhook setup:** point your dashboard webhook at
> `POST /api/v1/billing/payments/webhook`, subscribe to `payment.captured` and
> `payment.failed`, and set `RAZORPAY_WEBHOOK_SECRET` to the configured secret.

### Module 4 — Gate & Security

Visitor/delivery/daily-help passes with QR + OTP and a guard check-in/out loop.

- **Passes** — `GET|POST /gate/passes`, `GET /gate/passes/:id`. Who creates a
  pass sets its initial status: **resident/admin → `APPROVED`**, **guard walk-in
  → `PENDING_APPROVAL`**. Every pass is minted with a unique `qrToken` + 6-digit
  `otpCode`.
- **Approval** — `POST /gate/passes/:id/approve` · `/deny`. The service verifies
  the actor is an **active resident of that unit** (or an admin) — not just any
  authenticated user.
- **Gate desk (guards/admins)** —
  - `POST /gate/verify` — look up a pass by `qrToken` or `otp`; lazily expires
    stale passes and rejects pending/denied/checked-out ones.
  - `POST /gate/passes/:id/check-in` · `/check-out` — writes a `CheckInLog`
    (IN/OUT) and advances pass status, **atomically** (log + status in one tx).
- **Audit** — `GET /gate/logs` (filter by pass / date range).

State machine: `PENDING_APPROVAL → APPROVED → CHECKED_IN → CHECKED_OUT`, with
`DENIED` / `EXPIRED` as terminal branches. Each transition validates the current
state, so a visitor can't be checked in twice or checked out before entering.

### Module 5 — Resident & Staff Provisioning

Lets a `SOCIETY_ADMIN` onboard residents, guards, committee members, vendors,
etc. — the missing link that makes Property, Billing, and Gate usable at scale.

- **Invite flow** — `POST /users/invite` creates a `PENDING` account (cannot log
  in), assigns roles, optionally attaches a unit residency, and mints a hashed
  invitation token. The raw token is returned (email it in production).
- **Accept** — `POST /users/accept-invite` (**public**) — invitee sets a
  password; account flips to `ACTIVE`. Token looked up by hash, single-use,
  7-day expiry.
- **Direct create** — `POST /users` makes an `ACTIVE` user with a temporary
  password (no email round-trip).
- **Management** — `GET /users` (filter role/status/search), `GET /users/:id`,
  `PATCH /users/:id` (profile + activate/disable), `PUT /users/:id/roles`
  (atomic role replacement), `POST /users/:id/resend-invite`.

Security: a tenant admin can **never** grant `SUPER_ADMIN` (excluded from the
assignable-role enum), can only act within their own society (RLS), and email is
unique per society. Optional residency assignment re-derives the unit's
occupancy and respects the one-primary-contact-per-unit rule.

New user lifecycle: `PENDING` (invited) → `ACTIVE` (accepted / direct) →
`DISABLED`. Login + token refresh both require `ACTIVE`.

### Module 6 — Operations & Community Hub

The fifth pillar — four resident-facing features, all tenant-isolated.

- **Amenities & Bookings** — `/amenities` CRUD (managers) + `/amenities/bookings`.
  Booking does an **overlap check + insert in one transaction**, so two
  residents racing for the same slot can't both win. Cancellation is limited to
  the booker or a manager.
- **Complaints / Tickets** — `/complaints`. Per-society sequential ticket numbers
  (`TKT-000001`, atomic counter), priority, attachments, assignment, threaded
  comments (with **staff-only internal notes**), and an enforced status machine
  (`OPEN → IN_PROGRESS → RESOLVED → CLOSED`, `REOPENED`). Residents see only
  their own tickets; staff see all.
- **Notices** — `/notices`. Priority + pinned + publish/expire windows; the
  resident feed (`activeOnly=true`) shows pinned-first, hides expired/future.
- **Polls** — `/polls`. Single- or multiple-choice, optional close date,
  one-submission-per-user enforcement, live tallies and the caller's own
  selections in `GET /polls/:id`.

### Module 7 — Background Jobs (BullMQ)

A separate **worker process** (`npm run worker`) runs platform-wide scheduled
work via BullMQ + Redis, so nothing heavy blocks the API.

- **Overdue sweep** (daily 02:00 UTC) — flips past-due `ISSUED`/`PARTIALLY_PAID`
  invoices to `OVERDUE` across all tenants in one statement.
- **Gate-pass expiry** (hourly) — expires stale pending/approved passes past
  their validity window.
- **Invoice generation** (1st of month 01:00 UTC) — creates the monthly
  maintenance invoice for every occupied unit in every active society.
  **Idempotent** — skips units already invoiced for the period, so retries never
  double-bill.

Cross-tenant jobs use the `withBypass` RLS escape hatch; per-society work uses
`withSociety`. Schedulers are registered idempotently on worker boot
(`registerSchedules`), so deploys don't create duplicates.

### Module 8 — Notifications

A channel-pluggable notification system delivered asynchronously through a
dedicated BullMQ queue, wired into domain events.

- **Channels** — in-app (always; persisted as the feed), **push** (FCM, enabled
  by `FCM_SERVER_KEY`), **email** (enabled by `EMAIL_FROM`). Each channel is
  skipped if unconfigured. Providers sit behind interfaces
  (`src/integrations/notifications/`) — swap FCM/SES for anything by
  implementing one interface.
- **Events wired** — `INVOICE_ISSUED` (→ unit's primary resident),
  `COMPLAINT_ASSIGNED` (→ assignee), `COMPLAINT_STATUS_CHANGED` (→ raiser),
  `GATE_PASS_PENDING` (→ unit residents), `GATE_PASS_APPROVED` (→ pass creator),
  `AMENITY_BOOKING_CONFIRMED` (→ booker).
- **Async + safe** — services call `enqueueNotification(...)`, which is
  fire-and-forget: a Redis/queue failure is logged but **never breaks the
  originating request**. The worker's notification consumer (concurrency 20)
  renders the template, persists the feed row, sends push/email, and **prunes
  dead device tokens** that FCM reports as unregistered.
- **API** — `GET /notifications` (feed + unread count), `POST /notifications/:id/read`,
  `POST /notifications/read-all`, `POST /notifications/devices` (register an FCM
  token), `DELETE /notifications/devices`.

Recipients are resolved at enqueue time and re-validated (active, same society)
at delivery, so a stale or cross-tenant id can never receive a notification.

## How tenant isolation works

1. **Token** carries `societyId` (derived only at login — never from the request body).
2. **`authenticate`** verifies the token → `req.auth`.
3. **`withTenant`** attaches `req.tenant.db = tenantPrisma(societyId)`.
4. **`tenantPrisma`** auto-injects `societyId` into every query AND runs each
   operation inside a transaction that sets `app.current_society_id`.
5. **PostgreSQL RLS** policies (`prisma/rls/enable-rls.sql`) physically restrict
   every row touched to that society. The app connects as a NOSUPERUSER role, so
   RLS is genuinely enforced — an unscoped query sees zero rows.

Platform `SUPER_ADMIN` operations use `withBypass()`, which sets `app.bypass_rls`.

## Setup

```bash
cd backend
cp .env.example .env          # then fill in JWT secrets: openssl rand -base64 48
docker compose up -d          # postgres (+ app role) and redis
npm install

npm run prisma:migrate        # create tables (runs as owner)
# Apply RLS policies (run as the OWNER/superuser connection, not society_app):
psql "postgresql://postgres:postgres@localhost:5432/society_saas" -f prisma/rls/enable-rls.sql
npm run db:seed               # plans + super admin + demo society

npm run dev                   # API → http://localhost:4000/api/v1
npm run worker                # background jobs worker (separate process)
```

> **Important:** `DATABASE_URL` in `.env` uses the `society_app` (NOSUPERUSER)
> role so RLS is enforced at runtime. Migrations and the RLS script must be run
> with the owner/superuser `postgres` connection.

## Try it

```bash
# Login as the seeded society admin
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"societySlug":"greenwood-heights","email":"admin@greenwood.local","password":"ChangeMe123!"}'

# Use the returned accessToken
curl http://localhost:4000/api/v1/auth/me -H "Authorization: Bearer <accessToken>"
```

## Adding the next module

1. Add models (already in `schema.prisma`) → `npm run prisma:migrate`.
2. Re-run `enable-rls.sql` (idempotent) so new tables get tenant policies.
3. Create `src/modules/<name>/` with `routes / controller / service / schema`.
4. In handlers, use `req.tenant.db` — never the raw client — for tenant data.
5. Mount in `src/routes.ts` behind `authenticate` + `withTenant`.
