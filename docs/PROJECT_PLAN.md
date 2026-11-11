# CouncilConnect — Project Plan

Single source of truth for what we are building, in what order, and what "done" means.
Derived from the Project Report, the Complete Project Documentation, the Phase 1 and Phase 2 PRDs,
and the database progress report (originals in `docs/reports/` and the team's docs archive).

## 1. Where the project stands

| Area | State |
| --- | --- |
| Web (`web/`) | Every module except admin analytics runs on the live API: governance, events, grievances, lost & found, map, notifications. Admin analytics still shows demo data (labelled). |
| Backend (`backend/`) | Express + PostgreSQL. Governance core and campus operations complete, with role checks and 19 API tests. |
| Database (`database/`) | Migrations 001 (identity, councils), 002 (governance) and 003 (campus operations), plus demo seed data. The earlier MySQL work is kept in `legacy-mysql/` as reference. |
| Mobile (`mobile/`) | Expo shell with login and home screens only. |
| AI | Contact-request categorisation and grievance category + priority: Claude API when `ANTHROPIC_API_KEY` is set, keyword rules otherwise. Lost & found matching is keyword similarity. |

## 2. Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Backend | Node.js + Express | Already exists; the Phase 2 PRD moves to Node + Express anyway. |
| Database | PostgreSQL. Embedded PGlite locally, `DATABASE_URL` (Supabase) when deployed | Matches the report's PostgreSQL/uuid design; nothing to install on dev machines. |
| Auth | Our own JWT + bcrypt in Express | Works offline; Supabase Auth can replace it later without touching the schema. |
| Access control | Enforced in Express middleware (the report's RLS becomes a deploy-time hardening item) | One place to reason about permissions while the app is being built. |
| AI | Anthropic Claude API, server-side only, with a keyword-rule fallback when no key or on failure | Report requires server-side calls that never block or lose the submission. |
| Files | Local `uploads/` folder first, Supabase Storage at deploy | Posters/photos are not needed for Checklist 1. |
| Real-time | Polling every 10–15 s | As specified for the prototype. |
| Report vs. code | The report says Spring Boot. The report's stack chapter must be updated to Node/Express before submission. | Keep documentation honest. |

Out of scope for this build (Phase 2 PRD "future"): Kafka/Spark, in-house ML classifier, sentiment analysis, anomaly detection, anti-ragging module, WebSockets, OAuth, multi-institution.

## 3. Deliverables

Final acceptance = the 12 evaluation criteria of the Project Report (ch. 10.2), demonstrated live.

| # | Deliverable | Acceptance |
| --- | --- | --- |
| D1 | Governance core on web | Criteria 1–7 (Checklist 1) |
| D2 | Campus operations on web: events, grievances, lost & found, map | Criteria 8–11 (Checklist 2) |
| D3 | Admin analytics, archive, audit log | Criterion 12 + live dashboard numbers (Checklist 3) |
| D4 | Mobile app (Expo) on the same API | Governance + operations flows on a phone (Checklist 4) |
| D5 | Deployed demo + updated report/README | Public URL, seeded demo accounts, docs match the code (Checklist 5) |

## 4. Approach

- **Vertical slices.** Each task goes database → API → web page, and ends with something clickable. No layer is built far ahead of the others.
- **Every checklist ends in a working app.** Pages not yet migrated keep their mock data and are labelled as demo data, so nothing is broken mid-way.
- **Schema by migration.** Every change is a numbered file in `database/migrations/`. `npm run db:reset` rebuilds the database from scratch with seed data.
- **Server decides.** Role checks, the one-request rule and the verification hierarchy live in the API; the web only hides buttons.
- **Tests on the rules that matter.** API tests (`node --test`) for auth, the request rules and the verification hierarchy.

## 5. Checklists

### Checklist 0 — Repo and environment (done)

- [x] One repo layout: `web/ backend/ mobile/ database/ docs/`
- [x] Root scripts: `npm run setup`, `npm run dev`, `npm run migrate`, `npm run db:reset`, `npm run build`, `npm test`
- [x] `.env.example` files and generated local `.env`
- [x] PostgreSQL layer (`backend/src/db`) with embedded PGlite and migration runner
- [x] Backend boots, `/health` reports the database, web builds

### Checklist 1 — Governance core on web (first working app) (done)

Done when Phase 1 criteria 1–7 pass in a live demo against the real database.

**1A. Data foundation**
- [x] `001_core.sql`: institutions, academic_units, users (uuid, password_hash, role enum), councils, council_profiles (position, parent_profile_id, term, is_verified, verified_by/at) — ported from `legacy-mysql/`
- [x] `002_governance.sql`: invite_codes, verification_logs, contact_requests (nullable category), messages
- [x] Seed script: GECA, 8 academic units, main + departmental councils, HOD admin, one GS per unit, branch reps (some unverified), students, invite codes
- [x] Delete `backend/src/data/users.js` and the in-memory seed

**1B. Auth (criterion 1, F-01)**
- [x] `POST /auth/register` (college-email check; representative/admin require a valid invite code), `POST /auth/login`, `GET /auth/me`
- [x] `requireAuth` and `requireRole` middleware; consistent error shape
- [x] Web: real API client with token header; remove the localStorage user store and login fallback; align `representative` / `fullName`
- [x] Web: route guards and role-based landing (student → directory, rep → inbox, admin → verification panel)

**1C. Directory and profiles (criteria 1–2, F-02, F-03)**
- [x] `GET /directory?search=&unit=&position=` and `GET /users/:id` (role-aware payload, "verified by X on date")
- [x] `PATCH /users/me` (about, max 200 chars)
- [x] Web: `CouncilDirectory`, `RepProfile`, `Profile` on live data with search and both filters

**1D. Contact requests and DM (criteria 3–5, F-04, F-06)**
- [x] `POST /contact-requests` (80/400 limits, one active per student–rep pair, 24 h cooldown after decline)
- [x] Categoriser service: Claude call after save, keyword fallback, never blocks or fails the request
- [x] `GET /contact-requests/inbox`, `GET /contact-requests/mine`, `POST /contact-requests/:id/approve|decline`
- [x] `GET/POST /contact-requests/:id/messages` (participants only, approved only, 1000 chars)
- [x] Web: request form and status on the rep profile; inbox with category tags (urgent first); DM thread with polling

**1E. Verification (criteria 6–7, F-05)**
- [x] `POST /council-profiles/:id/verify`: HOD admin verifies GS; GS verifies reps of their own unit only; irreversible; writes verification_logs
- [x] `GET /verification-logs` (HOD admin)
- [x] Web: "Verify this member" with confirmation; unverified list and log on the admin page; badge on card and profile

**1F. Close-out**
- [x] API tests: auth + invite code, one-request rule, DM gating, verification hierarchy
- [x] Unmigrated pages (events, grievances, lost & found, admin stats) show a "demo data" label
- [x] Run the 7-criteria demo script end to end; record results in this file

**Result (10 Nov 2026).** `npm test` passes 9 API tests. Live run in the browser against the seeded database:

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Student logs in, browses the directory, searches and filters by branch and position | Pass |
| 2 | Representative profile shows position, term and verification badge ("Verified by … on …") | Pass |
| 3 | Student submits a contact request with reason title and description | Pass |
| 4 | Request appears in the representative's inbox with a category tag | Pass (keyword rules; the Claude API path is untested because no API key is configured) |
| 5 | Representative approves, DM thread opens for both | Pass |
| 6 | Admin / GS verifies an unverified member and the badge appears | Pass |
| 7 | Hierarchy enforced: a GS cannot verify a GS or another branch's rep, the HOD cannot verify branch reps | Pass (UI hides the action and the API returns 403) |

Notes and known gaps:
- Demo accounts are seeded on first start in development; all use the password `demo1234` (see the README).
- The admin is institution-wide (one HOD-level role); per-department admins are not modelled.
- Admin analytics still shows demo data and is labelled as such.

### Checklist 2 — Campus operations on web (done)

- [x] `003_operations.sql`: campus_locations, events, event_registrations, grievances, grievance_history, lost_found_items, lost_found_matches, match_messages, notifications; demo seed data
- [x] Image uploads (`POST /uploads`, PNG/JPEG/WebP up to 5 MB, checked by content) and profile photo (carried over from F-03)
- [x] Events: verified representatives and admins create (branch scope, capacity, poster, optional map location); students register once and can cancel; organiser sees participants and marks attendance (criterion 8)
- [x] Grievances: submit with room and photo; AI category + priority; submitted → assigned → in progress → resolved; history timeline; timed escalation (12/24/48/72 h by priority) and manual escalation to the HOD (criterion 9)
- [x] Lost & found: post lost/found, automatic matching, notification to both parties, private match thread, mark resolved (criterion 10)
- [x] Campus map: locations table; department, hostel, office, venue and facility markers; upcoming events and open lost/found reports pinned to their place (criterion 11)
- [x] In-app notifications (header bell): contact requests and replies, messages, verification, grievance updates and escalations, lost & found matches

**Result (11 Nov 2026).** `npm test` passes 19 API tests. Live run in the browser against the seeded database:

| # | Criterion | Result |
| --- | --- | --- |
| 8 | Student registers for an event and appears in the event's participant list | Pass |
| 9 | Student submits a hostel complaint; it is categorised and appears in the tracker | Pass (keyword rules; Claude API path untested, no key configured) |
| 10 | A lost-item post generates a match notification when a similar found item exists | Pass |
| 11 | The map loads with department, hostel and event-venue markers | Pass |

Notes and known gaps:
- **Grievance handling model.** Any verified representative or admin can take an open complaint. After escalation (timed or by the student) only admins handle it. This is a two-level chain; the Phase 2 PRD's four-level chain (CR → Secretary → GS → HOD) and hostel staff roles (rector, warden) are not modelled.
- **Lost & found matching is keyword similarity** (word overlap on title and description, plus a same-place bonus), not an embedding or LLM model. The report calls this "semantic matching"; either describe it accurately in the report or upgrade it later.
- **Map coordinates are approximate** placements around the campus centre (`backend/src/db/seedOperations.js`). Replace with surveyed positions before a real deployment. Route guidance is not built.
- **Not built:** event reminder notifications, push notifications (in-app only), saving events.
- **Uploads are stored on local disk** (`backend/uploads/`), to move to Supabase Storage in Checklist 5.
- Not checked in the browser: the create-event form, photo upload, the notification dropdown, and visual layout (the checks read page content, not screenshots). They are covered by API tests where an API is involved.

### Checklist 3 — Analytics, archive, audit

- [ ] Event reminder notifications before an event starts
- [ ] Admin dashboard on live queries: council/verification counts, request volume and response time, category split, event registrations, grievance resolution and escalations
- [ ] Archive: admin "start new academic year" snapshots and deactivates council profiles; browser by year and unit (criterion 12)
- [ ] Audit log viewer

### Checklist 4 — Mobile app

- [ ] Shared API client, secure token storage, bottom tabs (Home, Directory, Events, Inbox, Profile)
- [ ] Governance flows: login, directory, profile, contact request, inbox, DM
- [ ] Operations flows: events, grievance submit/track, lost & found, map
- [ ] Fix Expo dependency versions; test on a physical device via Expo Go

### Checklist 5 — Ship

- [ ] Supabase project: run migrations, set `DATABASE_URL`, move uploads to Supabase Storage
- [ ] Deploy backend and web; restrict CORS; rate-limit auth; production JWT secret
- [ ] Demo accounts and reset script
- [ ] Update Project Report stack chapters, README, screenshots; final 12-criteria run-through
