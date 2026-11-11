# CouncilConnect Mobile

React Native app (Expo SDK 58) for Android and iOS. It uses the same backend API as the web app.

## Run it on a phone

1. Start the backend on your computer (from the repository root): `npm run dev:api`
2. In this folder: `npm install`, then `npx expo start`
3. Install **Expo Go** on the phone and scan the QR code. The phone and the computer must be on the same Wi-Fi.

The app finds the backend by itself: it uses the address of the computer running `expo start`, port 4000.
If the login screen says it cannot reach the server:

- allow Node.js through the Windows firewall for private networks (the phone has to reach port 4000);
- or set the address yourself: `EXPO_PUBLIC_API_URL=http://<your-computer-ip>:4000 npx expo start`.

For a deployed backend, set `EXPO_PUBLIC_API_URL` to its HTTPS address.

## Run it in a browser

`npm run web` opens the same app at http://localhost:8081. This is the quickest way to check a change.
The interactive map is phone-only (it needs a WebView); the browser build shows the list of places.

## What is in the app

| Tab | Screens |
| --- | --- |
| Home | Notifications, shortcuts to complaints, lost & found and the campus map, upcoming events |
| Directory | Council directory with search and filters, profiles, contact requests, member verification |
| Events | Event list and detail, register / cancel, participant list and attendance for organisers |
| Inbox | Contact requests (sent or received), approve / decline, message thread |
| Profile | Own profile, edit About, log out |

Also reachable from Home: hostel complaints (submit, track, handle, escalate), lost & found (report, matches, match conversation), campus map, notifications.

Web only for now: creating events, photo uploads, admin analytics, audit log, archive and closing the academic year.

## Layout

- `App.js` — navigation (tabs and stacks); signed-out users only see login and register
- `src/api.js` — API client, backend address, token storage (device keystore)
- `src/auth.js` — session
- `src/ui.js` — shared components and the `useApi` data hook
- `src/format.js` — dates and labels (kept in step with `web/src/lib/format.js`)
- `src/screens/` — one file per area
- `src/LeafletMap.native.js` / `.web.js` — map for phones / placeholder for the browser build
