# CouncilConnect Backend

Express REST API on PostgreSQL. Run everything from the repository root (`npm run setup`, `npm run dev`); see the root README.

- `src/server.js` — entry: applies migrations, seeds demo data in development, starts the app
- `src/app.js` — Express app (used by the server and by tests)
- `src/config/env.js` — configuration from `backend/.env`
- `src/db/` — database access (`query`, `exec`), migration runner, demo seed
- `src/lib/` — auth middleware, HTTP helpers, council positions
- `src/services/` — verification hierarchy, contact-request categoriser
- `src/routes/` — API routes
- `test/` — API tests (`npm test`, in-memory database)

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

Errors are returned as `{ "error": "message" }` with a matching HTTP status.
