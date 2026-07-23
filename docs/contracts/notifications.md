# Notifications

- In-app `notifications` table + `notify.list` + Notifications screen.
- Browser Web Push:
  - Service worker at `/sw.js` (Vite `public/`, served by Nest).
  - `notify.vapidPublicKey` + `notify.subscribePush`.
  - Requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional `VAPID_SUBJECT`.
  - `notify.sendInApp` also fans out Web Push when VAPID is configured.
- No email in v0.
