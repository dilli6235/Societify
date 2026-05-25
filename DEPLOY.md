# Deploying Societify (permanent URL)

The repo is ready to deploy to **Render** from one blueprint (`render.yaml`):
the API also serves the web dashboard (same origin), with managed Postgres +
Redis. One stable URL replaces the temporary tunnel.

> The two steps that need **your** accounts (I can't do these for you): push the
> code to **GitHub**, and click **Deploy** in **Render**. Everything else is
> already configured.

## 1. Push the code to GitHub
```bash
cd /Users/rakeesh/Documents/society_app
# create an empty repo on github.com first (no README), then:
git remote add origin https://github.com/<you>/societify.git
git push -u origin main
```
(If you have the GitHub CLI: `gh repo create societify --private --source=. --push`.)

## 2. Deploy on Render
1. Sign up at **https://render.com** (free).
2. **New → Blueprint** → connect your GitHub → pick the `societify` repo.
3. Render reads `render.yaml` and shows the services it will create:
   - `societify-db` — Postgres (free)
   - `societify-redis` — Key Value / Redis (free)
   - `societify-api` — the API **+ dashboard** (free web service)
   - `societify-worker` — background jobs (**paid** type — see note below)
4. Click **Apply**. First build takes a few minutes (Docker build + migrate +
   RLS + seed run automatically via the pre-deploy step).
5. Open the `societify-api` URL, e.g. `https://societify-api.onrender.com`.

## 3. Log in
The deploy auto-seeds these (idempotent):
- **Super admin:** `superadmin@platform.local` / `ChangeMe123!` (leave slug blank)
- **Society admin:** slug `greenwood-heights`, `admin@greenwood.local` / `ChangeMe123!`

(Change these passwords after first login.)

## 4. Point the mobile app at it
Edit [`mobile/src/config.ts`](mobile/src/config.ts):
```ts
export const API_URL = 'https://societify-api.onrender.com/api/v1';
```
Then `cd mobile && npx expo start`.

## Optional integrations (set in Render → service → Environment)
- **Email:** `SMTP_URL` + `EMAIL_FROM` (real invite/notification emails)
- **Payments:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Push:** `FCM_SERVER_KEY`

## Free-tier caveats
- **Free web service spins down** after ~15 min idle → first request is a slow
  cold start (the URL stays stable — that's the point).
- **Free Postgres expires after ~30 days** — fine for testing; upgrade for real use.
- **Background worker is a paid instance** on Render. For a 100% free deploy,
  delete the `societify-worker` service from `render.yaml`; the app runs fine
  without it (only *scheduled* jobs — monthly invoicing, overdue/expiry sweeps —
  and async notification delivery pause). Or run it on another always-on host.

## Other hosts
The `Dockerfile` is standard, so the same image deploys to Railway, Fly.io, a
VPS, etc. Provide `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `COOKIE_SECRET`, `NODE_ENV=production`, and run
`prisma migrate deploy` + `enable-rls.sql` + `db:seed` once.
