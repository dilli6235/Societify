# Societify — Mobile App (Expo / React Native)

One codebase → **iOS and Android**. The app shows a **Resident** experience or a
**Security Guard** experience automatically based on the signed-in user's role.

## Run it

```bash
cd mobile
npm install
npx expo start         # press i (iOS sim), a (Android emulator), or scan the QR with Expo Go
```

- **On a physical phone:** install **Expo Go** (App Store / Play Store) and scan
  the QR code from `npx expo start`.
- **API connection:** the phone must be able to reach the API. Edit
  [`src/config.ts`](src/config.ts) → `API_URL`:
  - Physical phone → use the **public tunnel URL** (or your deployed API).
  - iOS simulator → `http://localhost:4000/api/v1` works.
  - Android emulator → `http://10.0.2.2:4000/api/v1`.

## What's inside

- **Auth** — society-scoped login; access token in memory + refresh token in
  **encrypted SecureStore**; transparent token refresh (mobile gets the refresh
  token in the response body via the `X-Client-Type: mobile` header).
- **Resident tabs:** Notice board · Visitors (pre-approve guests, get a gate OTP)
  · Complaints (raise & track) · Profile (SOS panic button + sign out).
- **Guard tabs:** Gate Desk (verify a visitor by OTP → check-in/out) · Staff
  Attendance (log daily-help in/out by gate code) · Profile.

## Structure

```
src/
├── config.ts            API_URL (edit per environment)
├── theme.ts             colors / spacing / status colors
├── lib/                 api client (+token refresh), tokens (SecureStore), types, useList
├── auth/                AuthContext (login/logout/session restore)
├── components/ui.tsx    Button, Field, Card, Badge, …
├── navigation/          RootNavigator + role-based Resident/Guard tab navigators
└── screens/             LoginScreen, resident/*, guard/*, ProfileScreen
```

## Logins to try
- Resident/admin: slug `greenwood-heights`, `admin@greenwood.local` / `ChangeMe123!`
- Create a `SECURITY_GUARD` user in the web dashboard (People → Invite) to see the Guard app.

> Built with Expo SDK 52 + React Navigation. Verified by `tsc` typecheck; not yet
> run on a simulator in this environment — `npx expo start` to launch.
