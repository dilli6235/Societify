# Societify — Web Admin Dashboard

React admin console for the Society & Community Management platform.
React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · React Query · Zustand.

## Run

```bash
cd web-dashboard
npm install
npm run dev        # http://localhost:5173  (proxies /api → http://localhost:4000)
```

The backend (`../backend`) must be running. Sign in with the seeded society
admin: slug `greenwood-heights`, email `admin@greenwood.local`, password
`ChangeMe123!`.

## How it's built

- **Auth** — access token kept in memory (Zustand, XSS-safe); the httpOnly
  refresh cookie restores the session on reload (`AuthBootstrap`) and the axios
  interceptor transparently refreshes on `401` and retries — a single shared
  refresh for concurrent requests.
- **RBAC** — `<RequireAuth roles={[…]}>` guards routes; the sidebar and action
  buttons hide what the role can't use (`useHasRole`).
- **Data layer** — React Query throughout via two helpers (`useList`,
  `useApiMutation`) that standardize pagination, cache invalidation, and
  success/error toasts.
- **UI kit** — `src/components/ui` (Button, Input, Table, Modal, Badge, Spinner,
  toasts) on Tailwind; Framer Motion drives page transitions, the modal, and the
  notification dropdown.
- **Feature-per-folder** — `src/features/*` mirrors the backend modules.

## Screens

| Route | What it does |
|---|---|
| `/login`, `/accept-invite` | Sign in; invitees set their password to activate |
| `/` Dashboard | KPI cards (units, people, overdue invoices, open complaints) |
| `/properties` | Blocks + Units (tabbed), with create modals |
| `/users` | Directory + invite flow (returns a shareable activation link) |
| `/billing` | Invoices: create with line items, issue, record payment |
| `/gate` | Visitor passes: create, approve/deny, check-in/out |
| `/amenities` | Facilities + slot booking |
| `/complaints` | Tickets: raise, status workflow, comments |
| `/notices` | Notice board with priority + pinning |
| `/polls` | Create polls, vote, live result bars |
| Top bar | Notification bell (in-app feed + unread badge, polled) |

## Structure

```
src/
├── app/            router, providers, AuthBootstrap
├── components/
│   ├── layout/     Sidebar, Topbar, AppLayout, NotificationsBell
│   └── ui/         design-system primitives
├── features/       auth, dashboard, properties, users, billing,
│                   gate, amenities, complaints, notices, polls, notifications
├── lib/            apiClient (axios + refresh), queryClient, hooks, types, cn
└── styles/
```

> Types in `src/lib/types.ts` are hand-mirrored from the API. In a larger setup
> they'd be generated from the backend's OpenAPI/zod schemas to stay in lockstep.
