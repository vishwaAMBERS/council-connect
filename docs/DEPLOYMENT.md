# Deploying CouncilConnect

The app has three parts: a PostgreSQL database, the API (`backend/`), and the web app (`web/`, static files).
The mobile app talks to the same API. Nothing below has been run against a live hosting account yet; the
backend itself is tested against a real PostgreSQL 18 server (see "What has been verified").

## 1. Database (Supabase or any PostgreSQL 13+)

1. Create a Supabase project and copy the **connection string** (Project Settings > Database). Use the
   "Session pooler" string if your host has no IPv6.
2. That string is `DATABASE_URL`. Keep it secret.
3. TLS: `DATABASE_SSL=require` verifies the server certificate. If the connection fails with a certificate
   error, the provider's CA is not in the system trust store; `DATABASE_SSL=no-verify` encrypts without
   verifying, which is weaker. Prefer `require`.

The API applies migrations by itself on every start, so there is no separate migration step.

## 2. API

Any Node 20+ host works. With Render, use the `render.yaml` blueprint in the repository root.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (turns off demo seeding; requires a real `JWT_SECRET`) |
| `JWT_SECRET` | Random, at least 32 characters. The API refuses to start in production without one. |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | `require` |
| `CORS_ORIGIN` | The web app's address. Several addresses are separated by commas. |
| `ANTHROPIC_API_KEY` | Optional. Enables Claude for request and complaint categorisation. |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-opus-5-5`; `claude-haiku-5-5` is much cheaper for this job. |
| `UPLOADS_DIR` | Folder for uploaded images (see "Uploaded files") |

Start command: `npm start` in `backend/`. Health check: `GET /health`.

### First administrator

A production database starts empty: no institution, no accounts, no demo data. Run once, with the same
environment variables as the API:

```bash
npm run bootstrap
```

It creates the institution, its academic units and councils, and prints a one-time **admin invite code**
(valid for 7 days). Register in the web app with a college email and that code. That first admin then
issues every other code from **Admin > Invite Codes**:

1. Admin issues a code per General Secretary and for main-council members, and verifies them after they register.
2. Each verified General Secretary issues codes for their own council and verifies those members.

The institution defaults to GECA (`geca.ac.in`). Override with `INSTITUTION_NAME`, `INSTITUTION_CODE`,
`INSTITUTION_EMAIL_DOMAIN` before running the command.

Campus map locations are not created by `bootstrap`. Insert rows into `campus_locations` with real coordinates.

## 3. Web app

Build with the API address baked in, then serve `web/dist` from any static host:

```bash
VITE_API_URL=https://your-api.example.com npm --prefix web run build
```

The host must serve `index.html` for unknown paths (single-page app). `render.yaml` already does this.
Demo account buttons on the login page are left out of production builds.

## 4. Mobile app

Set the API address and build with Expo's build service:

```bash
EXPO_PUBLIC_API_URL=https://your-api.example.com npx eas-cli build --platform android
```

This needs an Expo account and has not been run yet. For a demo, Expo Go against a laptop is enough
(see `mobile/README.md`).

## Uploaded files

Images (profile photos, posters, complaint and lost/found photos) are written to `UPLOADS_DIR` on the API
server's disk. On hosts with an ephemeral filesystem (Render without a disk, most free tiers) **they are
lost on every redeploy or restart**. Either attach a persistent disk and point `UPLOADS_DIR` at it, or move
uploads to object storage (Supabase Storage); the storage code is isolated in `backend/src/routes/uploads.js`.
This move is not done yet.

## Security already in place

- Passwords are hashed with bcrypt; sessions are signed JWTs (7 days).
- Every rule (roles, verification hierarchy, one-request rule, who may handle what) is enforced by the API.
- Sign-in is limited to 30 attempts per 15 minutes per address; sign-up to 20 per hour.
- Security headers via helmet; CORS restricted to `CORS_ORIGIN`.
- Uploads accept only PNG, JPEG and WebP up to 5 MB, checked by file content.
- The Claude API key stays on the server.

## Not in place

- Row Level Security in the database (the report mentions it; access control is in the API instead).
- Password reset and email verification. Anyone who can type an `@geca.ac.in` address can register as a
  student with it; nothing proves they own the mailbox.
- Backups, monitoring and error reporting. Use the database provider's backups at minimum.
- Push notifications (in-app only).

## What has been verified

- The full API test suite (26 tests) passes on the embedded database and on a real PostgreSQL 18.6 server.
- `NODE_ENV=production` with a weak or missing `JWT_SECRET` refuses to start.
- The web app builds; the mobile app bundles for Android and runs in the browser build.
- Not verified: an actual Supabase connection, the Render blueprint, an EAS build, a physical phone.
