# Project report: what to change before submission

The report (`docs/reports/CouncilConnect- Project Report.docx`) was written before the build. These are the
places where it no longer matches what was built. Each row gives the section, what it says now, and what is true.
The report itself has not been edited.

## Must change (the report states something that is not true)

| Section | Report says | What was built |
| --- | --- | --- |
| Abstract; 3.5; 6.1 (Tier 3); 6.4; 8.2.1; 13 | Backend is Spring Boot REST APIs | Node.js with Express. Structure is routes / services / database module, not controller-service-repository. |
| Abstract; 4.1.1; 6.4; 6.6; 8.2.2 | Authentication by Supabase Auth | Own implementation: bcrypt password hashes and signed JWT sessions (7 days), issued by the Express API. |
| 5.2.3; 5.5; 6.5; 8.2.2; 8.3.1; 8.4 | AI calls run in Supabase Edge Functions | They run inside the Express API, after the record is saved. The key still never reaches a client. |
| 3.4; 6.4; 6.6; 7.1; 7.3; 9.4 | Row Level Security enforces access in the database | Not used. Every access rule is enforced in the API and covered by tests. Remove section 7.3 or rewrite it as "Access control in the API". |
| 5.2.3; 9.4; 8.4 | If the AI call fails, the request is saved without a category | It falls back to keyword rules, so a request always gets a category. Same for complaints. |
| 5.4; 4.4.1; 10.2 (criterion 10) | Lost and found uses AI semantic similarity | Keyword overlap on title and description plus a same-place bonus. Call it "automatic matching" or "keyword similarity". |
| 6.5; 6.6 | File storage in Supabase Storage | Local disk on the API server for now (`backend/uploads`). |
| 6.1 (Tier 5); 6.5; 4.2.1 | Firebase Cloud Messaging push notifications | Not built. Notifications are in-app only (web bell, mobile Home). FCM is already listed under Future Scope in chapter 12; remove it from the architecture chapters. |
| 8.1.2 | Analytics charts use Recharts; directory has a data-table view | Analytics use stat tiles and bar lists built in plain CSS. There is no data-table view of the directory. |
| 7.2 (all tables) | Nine tables; `users.branch` as text; `council_profiles.id` references `users.id` | 21 tables. Branches are an `academic_units` table; councils are their own table and a profile belongs to a council; see `database/migrations/`. Regenerate the tables and the ER figure from the migrations. |
| 7.2.8; 4.7.4 | Archive stores `verified_by_name`, `events_count` | Also stores requests handled, complaints resolved, council name and type. Closing the year also returns former representatives to the student role. |
| 4.3.2; 4.3.3 | Complaints are routed to "the responsible authority"; escalation goes to "the next level" | Any verified representative or admin can take a complaint. Escalation is a single step to the HOD-level admin, automatic after 12 / 24 / 48 / 72 hours by priority, or by the student. Hostel staff (warden, rector) are not users. |
| 3.3 | "GS (for their branch)" is an Admin | A General Secretary is a Representative with extra rights: verify and issue invite codes for their own council. Only the HOD-level account has the Admin role. |
| 4.1.2 | Position filter lists GS, Secretary, CR, President, Anti-Ragging Rep | Same groups plus "Member / Other". Branch codes are CSE, IT, MECH, ENTC, ELEC, CIVIL, MCA, MTECH. |
| 4.5.1 | "Route guidance" on the map | Not built. Phones get a "Directions" button that opens the device's maps app. |
| 3.5; 6.2; 8.1.1 | Mobile app gives access to all seven modules | Mobile covers directory, profiles, requests, messaging, verification, events, complaints, lost and found, map, notifications. Creating events, photo uploads, analytics, audit log and archive are web only. |
| 6.2 | Mobile polls and stores Supabase tokens | It stores the API's JWT in the device keystore (expo-secure-store). |
| References | Spring Boot and Supabase RLS references | Replace with Express and PostgreSQL references. Keep Supabase only if the deployed database is Supabase. |

## Should add (built, but not in the report)

- Invite-code management: admins and General Secretaries issue and revoke single-use codes from the dashboard.
- Audit log of verifications, request decisions, events, complaint handling, invite codes and archive runs.
- In-app notifications and event reminders (24 hours before the start).
- Manual escalation by the student, and the complaint history timeline.
- A private message thread between the two parties of a lost-and-found match.
- Rate limiting on sign-in and sign-up, security headers, and the production check on the signing secret.
- Testing: 26 automated API tests, run on both the embedded database and PostgreSQL 18.

## Results chapter (10)

All twelve criteria in 10.2 were demonstrated on the web app; the record is in `docs/PROJECT_PLAN.md`.
Two caveats to state honestly in the report:

- Criteria 4 and 9 were demonstrated with the keyword-rule fallback. The Claude API path is implemented but
  was not exercised, because no API key was configured. Run it once with a key before claiming it as tested.
- Criterion 12 was demonstrated on seeded demo records for 2025-26. The year-close action that produces real
  archive records is covered by automated tests.

"The Analytics Dashboard is demonstrated with representative sample data" (10.1) is no longer true: the
dashboard now shows live figures.
