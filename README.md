# CouncilConnect

**AI-Augmented Student Governance and Campus Operations Platform**

CouncilConnect is a campus-focused platform designed to connect students
with verified student representatives and centralize common campus
activities. It brings governance and communication together with event
management, hostel grievance reporting, lost-and-found, campus
navigation, analytics, and an archive.

The project is documented as a GECA-focused system. All seven modules
run on the web app against the live backend; the mobile app is not built
yet. `docs/PROJECT_PLAN.md` records what each module does and its known
gaps.

## Table of Contents

-   [Problem Statement](#problem-statement)
-   [Objectives](#objectives)
-   [Key Modules](#key-modules)
-   [Technology Stack](#technology-stack)
-   [Architecture Overview](#architecture-overview)
-   [Core Workflow](#core-workflow)
-   [Security and Data Handling](#security-and-data-handling)
-   [Getting Started](#getting-started)
-   [Configuration](#configuration)
-   [Testing Checklist](#testing-checklist)
-   [Project Status and Future Scope](#project-status-and-future-scope)
-   [Contributing](#contributing)
-   [License](#license)

## Problem Statement

Campus communication and service requests can be scattered across
informal channels, making it difficult for students to reach the
appropriate representative, track complaints, discover events, or find
useful campus information. CouncilConnect aims to provide a more
structured and role-aware place for these activities.

## Objectives

-   Provide a directory of council representatives and their profiles.
-   Support contact requests and representative-approved communication.
-   Organize campus events and registrations.
-   Provide a structured workflow for hostel grievances.
-   Help students publish and search lost-and-found reports.
-   Offer campus navigation and operational analytics.
-   Maintain an archive of relevant records.

## Key Modules

### 1. Governance and Communication

-   Council directory and representative profiles.
-   Role-aware access and a verification hierarchy.
-   Contact requests that representatives can approve or decline.
-   Moderated direct messaging that is available after approval.

### 2. Event Management

-   Event information such as title, description, venue, date, and time.
-   Event registration workflows.
-   Event-related records for monitoring and reporting.

### 3. Hostel Grievance Management

-   Complaint categories such as electrical, water, Wi-Fi, mess, and
    infrastructure.
-   Priority levels: low, medium, high, and critical.
-   Documented status flow: submitted, assigned, in progress, resolved,
    and escalated.

### 4. Lost and Found

-   Lost-item and found-item reports with descriptions, locations, and
    optional images.
-   A documented plan for matching potentially related reports.

### 5. Smart Campus Navigation

-   Campus map and location markers using Leaflet and OpenStreetMap.

### 6. Analytics and Monitoring

-   Dashboard views intended to summarize activity such as events,
    grievances, and platform usage.
-   Confirm that displayed figures are connected to live data before
    presenting them as production analytics.

### 7. Archive

-   A place to retain relevant records for later reference.
-   Archive permissions and verification metadata should be checked
    against the final database schema.

## Technology Stack

  Layer                        Technology
  ---------------------------- ----------------------------------------
  Web interface                React.js (Vite), React Router
  Mobile application           React Native, Expo
  Backend API                  Node.js, Express, REST APIs
  Authentication               JWT (bcrypt password hashing)
  Database                     PostgreSQL (embedded PGlite for local
                               development, Supabase when deployed)
  Server-side AI integration   Anthropic Claude API, keyword fallback
  Maps                         Leaflet, OpenStreetMap

> The original project report describes a Spring Boot backend. The
> implementation uses Node.js/Express; see `docs/PROJECT_PLAN.md` for
> the decisions and the current implementation status of each module.

## Repository Layout

``` text
web/        React web application
backend/    Express REST API
mobile/     Expo mobile application
database/   SQL migrations (legacy-mysql/ holds the earlier MySQL design)
docs/       Project plan and reports
```

## Architecture Overview

``` text
React Native / Expo mobile app     React.js web app
                 \                  /
                  \  REST API calls /
                   v               v
                    Express REST API ---- Claude API (server-side)
                            |
                        PostgreSQL

       Map: Leaflet + OpenStreetMap
```

The backend should enforce authentication, role permissions, and
business rules. Client-side checks alone are not sufficient for
authorization.

## Core Workflow

1.  A student signs in and browses the council directory.
2.  The student submits a contact request to a representative.
3.  The request is saved with a pending status; AI categorization can
    run asynchronously.
4.  The representative approves or declines the request.
5.  Direct messaging is available only when the request is approved.
6.  Events, grievances, lost-and-found reports, and other campus records
    are managed through their respective modules.

The documented verification hierarchy assigns verification
responsibilities to authorized roles. A representative should not be
able to verify their own account, and the backend/database policies must
enforce this rule.

## Security and Data Handling

Before deployment, verify that the project:

-   Validates Supabase JWTs on protected backend routes.
-   Enforces roles and permissions on the server and through database
    Row Level Security (RLS).
-   Prevents users from reading messages or contact requests outside
    their permitted scope.
-   Restricts representative verification to authorized roles.
-   Keeps LLM API keys and other secrets on the server side, not in the
    client application.
-   Validates uploaded files and user-provided data.
-   Uses database constraints to prevent duplicate event registrations
    and duplicate active contact requests where required.
-   Handles AI/API failures without losing the original user submission.
-   Uses migrations and backups for database changes.

## Getting Started

Prerequisites: Git and Node.js 20 or newer. No database install is
needed; local development uses an embedded PostgreSQL.

``` bash
git clone https://github.com/vishwaAMBERS/council-connect.git
cd council-connect
npm run setup
npm run dev
```

`npm run setup` installs dependencies, creates `backend/.env` and
`web/.env` from the examples, and applies database migrations.
`npm run dev` starts the API on http://localhost:4000 and the web app on
http://localhost:5173.

In development the backend seeds demo data on first start. Every demo
account uses the password `demo1234`:

  Account                 Role
  ----------------------- -------------------------------------------
  student@geca.ac.in      Student (IT, year 3)
  it_cr3@geca.ac.in       Class Representative, IT (verified)
  it_gs@geca.ac.in        General Secretary, IT (verifies IT reps)
  mech_gs@geca.ac.in      General Secretary, Mechanical (unverified)
  hod@geca.ac.in          Admin / HOD (verifies General Secretaries)

Invite codes for testing council sign-up: `IT-COTECH-2026`,
`CSE-SPORTS-2026`, `ADMIN-GECA-2026` (each works once; `npm run
db:reset` restores them).

Other commands:

-   `npm run migrate` applies pending migrations.
-   `npm run db:reset` wipes the local database and re-seeds the demo data.
-   `npm run build` builds the web app.
-   `npm test` runs the backend tests.
-   `npm run dev:mobile` starts Expo (run `npm install` in `mobile/`
    first).

To use a PostgreSQL server such as Supabase, set `DATABASE_URL` in
`backend/.env`. To enable AI categorisation, set `ANTHROPIC_API_KEY`
there; it is never sent to a client.

## Configuration

Keep configuration and secrets outside source control. A suitable
`.gitignore` should exclude items such as:

``` gitignore
.env
.env.*
!.env.example
node_modules/
dist/
build/
.expo/
target/
*.log
```

Only include ignore patterns that match the repository. Commit a
sanitized `.env.example` when useful, with placeholder values and no
real credentials.

## Testing Checklist

-   [ ] Login, logout, and session expiry
-   [ ] Role-based access and representative verification
-   [ ] Contact request approval and rejection
-   [ ] Messages inaccessible before approval
-   [ ] Duplicate request and event-registration handling
-   [ ] Event creation and registration
-   [ ] Grievance creation, status changes, and escalation behavior
-   [ ] Lost-and-found reports and matching behavior
-   [ ] Map markers and location accuracy
-   [ ] Analytics based on verified data sources
-   [ ] Archive access permissions and schema consistency
-   [ ] Behavior when the AI/LLM service is unavailable
-   [ ] Database Row Level Security (RLS) and API authorization

## Project Status and Future Scope

The project documents describe the major modules and several prototype
workflows. They also identify areas that may need implementation or
verification, including:

-   Confirming end-to-end backend behavior for every module.
-   Automated grievance escalation timers and escalation-chain rules.
-   Real-time messaging; the documented prototype uses polling, while
    WebSocket-based messaging is future scope.
-   Verifying that push notifications are fully wired to events and
    status changes.
-   Validating AI categorization and lost-and-found matching quality.
-   Ensuring analytics use live, correctly scoped data.
-   Reconciling archive verification fields and database migrations.
-   Potential future additions such as sentiment analysis, an in-house
    classifier, anti-ragging support, and multi-institution deployment.

## Contributing

1.  Create a branch for your change.
2.  Keep changes focused and document any new environment variables.
3.  Add or update tests where practical.
4.  Never commit API keys, tokens, service-role keys, or real user data.
5.  Open a pull request with a summary, testing notes, and screenshots
    when relevant.

## License

No license was specified in the project documentation. Add a `LICENSE`
file and update this section before making the repository public.
