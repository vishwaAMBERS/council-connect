# CouncilConnect Backend

Express REST API on PostgreSQL. Run everything from the repository root (`npm run setup`, `npm run dev`); see the root README.

- `src/server.js` — entry: applies migrations, seeds demo data in development, starts the app
- `src/app.js` — Express app (used by the server and by tests)
- `src/config/env.js` — configuration from `backend/.env`
- `src/db/` — database access (`query`, `exec`), migration runner, demo seed, production bootstrap (`npm run bootstrap`)
- `src/lib/` — auth middleware, HTTP helpers, council positions
- `src/services/` — verification hierarchy, AI labelling (requests, grievances), lost-and-found matching, notifications, audit trail
- `src/routes/` — API routes
- `test/` — API tests (`npm test`, in-memory database); set `TEST_DATABASE_URL` to run a test file against an empty PostgreSQL database instead
- `uploads/` — uploaded images in local development (not committed)

## Endpoints

| Method | Path | Who |
| --- | --- | --- |
| GET | `/health` | public |
| GET | `/meta` | public (branches, position filters) |
| POST | `/auth/register`, `/auth/login` | public |
| GET | `/auth/me` | signed in |
| GET | `/directory?search=&unit=&position=` | signed in |
| GET | `/users/:id` | signed in |
| PATCH | `/users/me` | signed in (about) |
| POST | `/contact-requests` | student |
| GET | `/contact-requests/inbox`, `/contact-requests/mine`, `/contact-requests/:id` | participants |
| POST | `/contact-requests/:id/approve`, `/contact-requests/:id/decline` | addressed representative |
| GET, POST | `/contact-requests/:id/messages` | participants, approved requests only |
| POST | `/council-profiles/:id/verify` | admin (General Secretaries, main council) or verified GS (own branch) |
| GET | `/verification/pending` | anyone who can verify |
| GET | `/verification/logs` | admin |
| POST | `/uploads` | signed in (one image in the `file` field) |
| GET | `/events?when=past`, `/events/:id` | signed in (branch scope applies) |
| POST | `/events` | verified representative or admin |
| POST, DELETE | `/events/:id/register` | student |
| PATCH | `/events/:id/attendance` | organiser or admin |
| POST | `/grievances` | student |
| GET | `/grievances`, `/grievances/:id` | the student who raised it; verified representatives and admins see all |
| POST | `/grievances/:id/take`, `/start`, `/resolve` | verified representative or admin (admins only once escalated) |
| POST | `/grievances/:id/escalate` | the student who raised it |
| GET, POST | `/lost-found` | signed in |
| POST | `/lost-found/:id/resolve` | the person who posted it |
| GET | `/lost-found/matches` | signed in (own matches) |
| GET, POST | `/lost-found/matches/:id/messages` | the two matched parties |
| GET | `/locations`, `/map` | signed in |
| GET | `/notifications`; POST `/notifications/read` | signed in |
| GET | `/analytics` | admin |
| GET | `/audit-logs?entity=&limit=` | admin |
| GET | `/archive?year=&unit=` | signed in |
| GET | `/archive/preview` | admin |
| POST | `/archive/run` | admin (closes the academic year; irreversible) |
| GET | `/invite-codes`, `/invite-codes/options` | admin, or verified General Secretary (own council) |
| POST | `/invite-codes` | same; only an admin can issue an admin code |
| DELETE | `/invite-codes/:code` | same; unused codes only |

Errors are returned as `{ "error": "message" }` with a matching HTTP status.
