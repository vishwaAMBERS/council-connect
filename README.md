# CouncilConnect

**AI-Augmented Student Governance and Campus Operations Platform**

CouncilConnect is a campus-focused platform designed to connect students
with verified student representatives and centralize common campus
activities. It brings governance and communication together with event
management, hostel grievance reporting, lost-and-found, campus
navigation, analytics, and an archive.

The project is documented as a GECA-focused system. Feature descriptions
in this README reflect the project documentation; implementation status
may vary by module.

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

The project documentation describes the following stack:

  Layer                        Technology
  ---------------------------- ----------------------------------------
  Mobile application           React Native, Expo
  Web interface                React.js
  Backend API                  Java, Spring Boot, REST APIs
  Authentication               Supabase Auth, JWT
  Database                     PostgreSQL through Supabase
  File storage                 Supabase Storage
  Server-side AI integration   Supabase Edge Functions and an LLM API
  Notifications                Firebase Cloud Messaging (FCM)
  Maps                         Leaflet, OpenStreetMap

> Check the actual repository and deployment configuration before
> assuming every listed integration is fully implemented or enabled.

## Architecture Overview

``` text
React Native / Expo mobile app     React.js web app
                 \                  /
                  \  REST API calls /
                   v               v
                     Spring Boot API
                            |
             +--------------+---------------+
             |              |               |
         Supabase Auth   PostgreSQL    Supabase Storage
             |              |
             +------ Supabase Edge Functions
                            |
                         LLM API

       Map: Leaflet + OpenStreetMap
       Notifications: Firebase Cloud Messaging (FCM)
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

The exact commands depend on how the repository is organized. The
project documentation describes separate mobile/web clients and a Spring
Boot backend, so first identify the relevant folders.

### Prerequisites

Install the tools required by the components present in your repository:

-   Git
-   Java 17 or the Java version configured by the backend project
-   Maven, if the backend uses Maven
-   Node.js and npm
-   Expo CLI workflow for the React Native app
-   Access to the configured Supabase project
-   Required environment variables and service credentials

### 1. Clone the repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd <REPOSITORY_FOLDER>
```

Replace the placeholders with your repository URL and folder name.

### 2. Configure environment variables

Create local environment files according to the conventions used by each
application. Do not commit secrets.

Typical configuration values may include:

-   Supabase project URL
-   Supabase public/anonymous key for client-side use
-   Backend Supabase/JWT configuration
-   LLM API key for server-side Edge Functions
-   Firebase/FCM configuration if push notifications are enabled

Use the variable names expected by the source code. Do not copy private
service-role keys or LLM secrets into a mobile or web client.

### 3. Run the backend

Open a terminal in the Spring Boot backend directory. If the repository
contains a Maven wrapper, use it:

``` bash
# Windows
mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```

If there is no Maven wrapper but Maven is installed, use:

``` bash
mvn spring-boot:run
```

The backend port and profile depend on the project configuration. Check
`application.properties` or `application.yml`.

### 4. Run the web application

Open a terminal in the web client directory:

``` bash
npm install
npm run
```

Review the scripts printed by `npm run` and start the script defined by
that application's `package.json` (commonly `dev`).

### 5. Run the mobile application

Open a terminal in the React Native/Expo app directory:

``` bash
npm install
npx expo start
```

Follow the Expo terminal instructions to open the app in an emulator or
on a supported device.

### 6. Verify the setup

-   Confirm that authentication works.
-   Confirm that the clients can reach the backend.
-   Confirm that database tables, migrations, and RLS policies are
    configured.
-   Test each role with a separate account.
-   Confirm that AI integrations fail gracefully when credentials are
    missing or a service is unavailable.

> These are setup guidelines, not a guarantee that the current
> repository will run without configuration. Adjust paths and commands
> to match the actual folder structure and scripts.

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
