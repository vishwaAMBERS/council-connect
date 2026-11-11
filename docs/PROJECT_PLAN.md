# CouncilConnect — Project Plan

Single source of truth for what we are building, in what order, and what "done" means.
Derived from the Project Report, the Complete Project Documentation, the Phase 1 and Phase 2 PRDs,
and the database progress report (originals in `docs/reports/` and the team's docs archive).

## 1. Where the project stands

| Area | State |
| --- | --- |
| Web (`web/`) | Every module runs on the live API: governance, events, grievances, lost & found, map, notifications, analytics, audit log, archive. No page uses demo data any more. |
| Backend (`backend/`) | Express + PostgreSQL. Governance, campus operations, analytics, audit and archive complete, with role checks and 26 API tests (also run on PostgreSQL 18). |
| Database (`database/`) | Migrations 001 (identity, councils), 002 (governance), 003 (campus operations) and 004 (archive, audit), plus demo seed data. The earlier MySQL work is kept in `legacy-mysql/` as reference. |
| Mobile (`mobile/`) | Expo SDK 58 app covering governance and campus operations on the same API. Checked in its browser build; not yet run on a phone. |
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
| D4 | Mobile app (Expo) on the same API | Governance + operations flows on a phone (Checklist 4: built, phone test pending) |
| D5 | Deployed demo + updated report/README | Public URL, seeded demo accounts, docs match the code (Checklist 5: prepared, deployment and report edit pending) |

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
- **Not built:** push notifications (in-app only), saving events. Event reminders were added in Checklist 3.
- **Uploads are stored on local disk** (`backend/uploads/`), to move to Supabase Storage in Checklist 5.
- Not checked in the browser: the create-event form, photo upload, the notification dropdown, and visual layout (the checks read page content, not screenshots). They are covered by API tests where an API is involved.

### Checklist 3 — Analytics, archive, audit (done)

- [x] `004_archive_audit.sql`: council_archive, audit_logs (existing verification and complaint history carried over), event reminder marker; demo archive for 2025-26
- [x] Admin analytics on live queries: council and verification counts, contact-request volume, response time and category split, per-representative load, event registrations, attendance and engagement rates, complaint volume, resolution time, escalations, lost & found, weekly active users
- [x] Archive: admin "close the academic year" snapshots every active council seat (term, verification record, events organised, requests handled, complaints resolved), closes the seats and returns their holders to student accounts; archive browser by year and branch, open to everyone (criterion 12)
- [x] Audit log viewer (admin), filterable by area: verifications, contact-request decisions, events published, complaint handling and escalations, invite-code registrations, archive runs
- [x] Event reminder notifications to registered students, once, within 24 hours of the start

**Result (11 Nov 2026).** `npm test` passes 24 API tests. Live run in the browser against the seeded database:

| # | Criterion | Result |
| --- | --- | --- |
| 12 | An archived council member record is visible in the archive browser by academic year and branch | Pass (2025-26 demo archive, filtered to IT) |

Also checked in the browser: analytics figures match the database, the audit log lists and filters entries, and the year-close dialog stays locked until the year is typed. The year-close action itself was exercised by API tests only, not run on the demo database, because it empties the directory.

Notes and known gaps:
- **Closing a year is irreversible.** It deactivates every council seat and sets former representatives back to the student role. Their existing conversations stay readable; new contact requests to them are refused. The next council registers with fresh invite codes.
- **Invite codes** were seed-only at this point; the management screen was added in Checklist 5.
- **The 2025-26 archive is demo data** (invented names, not linked to accounts). Remove it before real use.
- **Analytics are computed on request** from the transactional tables; there are no charts over time and no per-semester comparison. Kafka/Spark from the Phase 2 PRD are out of scope.
- **"Active in the last 7 days" counts people who created something** (request, message, registration, complaint, lost/found report); logins are not tracked.
- **The audit log starts from this release** for request decisions and events; only verifications and complaint history were carried over from before.

### Checklist 4 — Mobile app (done, not yet run on a phone)

- [x] Expo upgraded from SDK 52 to SDK 58 (the version the current Expo Go app opens); dependencies reinstalled
- [x] Shared API client that finds the backend by itself, token in the device keystore, bottom tabs (Home, Directory, Events, Inbox, Profile)
- [x] Governance flows: login, register (with invite code), directory with search and filters, profiles, contact request, inbox, approve / decline, message thread, member verification
- [x] Operations flows: events (register, cancel, participants, attendance), complaints (submit, track, take / start / resolve, escalate), lost & found (report, matches, match thread), campus map, notifications
- [ ] Test on a physical device via Expo Go

**Result (11 Nov 2026).** The app was run in its browser build (`npm run web` in `mobile/`) against the live backend:
login, home, directory filter, profile, sending a message in an approved thread, registering for an event,
submitting a complaint (categorised Mess / Medium), lost & found with its match thread, the map list with pinned
events and items, and notifications all worked, with no console errors. The Android bundle also compiles.

Notes and known gaps:
- **Not run on a phone or emulator.** The browser build shares all the screen and API code, but the phone-only parts are untested: the WebView map, the keyboard handling, the device keystore, and reaching the backend over Wi-Fi (Windows firewall may block port 4000; see `mobile/README.md`).
- **Web only for now:** creating events, photo uploads, admin analytics, audit log, invite codes, archive and closing the year.
- No push notifications; notifications are fetched while the app is open.

### Checklist 5 — Ship (prepared, not deployed)

- [x] Invite-code management: admins issue codes for any council seat or another admin; verified General Secretaries for their own council (never the GS seat); codes are single-use, expire, and can be revoked while unused
- [x] First-admin bootstrap for an empty production database (`npm run bootstrap`): institution, units, councils, one admin invite code; no demo data
- [x] Production hardening: API refuses to start in production without a strong `JWT_SECRET`; sign-in and sign-up rate limits; security headers; CORS limited to configured origins; demo seeding off in production
- [x] Database: TLS option (`DATABASE_SSL`), safe migration runner on pooled connections; full test suite passes on a real PostgreSQL 18.6 server as well as the embedded one
- [x] Hosting config (`render.yaml`) and `docs/DEPLOYMENT.md`
- [x] `docs/REPORT_UPDATES.md`: every place the project report no longer matches the build
- [ ] Create the Supabase project and deploy the API and web app (needs your accounts)
- [ ] Move uploads to object storage, or attach a persistent disk (local-disk uploads are lost on redeploy on most hosts)
- [ ] Edit the project report itself using `docs/REPORT_UPDATES.md`; add screenshots
- [ ] Run the Claude API path once with a real key (it has only ever run on the keyword fallback)
- [ ] Real campus coordinates for the map; remove the demo archive and demo accounts from any real deployment

**Result (11 Nov 2026).** `npm test` passes 26 API tests on both databases. Issuing and revoking an invite code
was checked in the browser as a General Secretary. Nothing has been deployed: there is no public URL yet.

## 6. Demo criteria: final status

All twelve criteria from the project report (ch. 10.2) pass on the web app against the seeded database.

| # | Criterion | Status |
| --- | --- | --- |
| 1–3 | Login, directory search and filter, role-aware profile, contact request | Pass |
| 4 | Request in the representative's inbox with an AI category tag | Pass on keyword rules; Claude API path not exercised |
| 5 | Approve, then message thread | Pass |
| 6–7 | Verification, and the hierarchy enforced | Pass |
| 8 | Event registration appears in the participant list | Pass |
| 9 | Complaint submitted, categorised, tracked | Pass on keyword rules; Claude API path not exercised |
| 10 | Lost item post produces a match notification | Pass (keyword similarity, not an AI model) |
| 11 | Map with department, hostel and venue markers | Pass (approximate coordinates) |
| 12 | Archived member visible by year and branch | Pass (demo records for 2025-26) |
