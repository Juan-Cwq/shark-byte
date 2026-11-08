# shark-byte 2026 — Cone of Uncertainty

MDC career pathway navigator. Catalog facts come from `data/Courses_data/mdc_pathways.json`; Swarms agents only personalize and tutor.

## Setup

```bash
npm install
```

Before opening the app, copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

- Add `SWARMS_API_KEY` and `SWARMS_MODEL` for live AI features.
- Create an Auth0 **Regular Web Application** and set `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` from its settings.
- Set `AUTH0_SECRET` to a new 32-byte (64-character hex) secret. Generate one with `openssl rand -hex 32` or Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- Keep `APP_BASE_URL=http://localhost:3000` for local development.
- In the Auth0 application settings, allow `http://localhost:3000/auth/callback` as a callback URL and `http://localhost:3000` as both a logout URL and web origin.

Sign-in is optional. Every page and feature, including the AI ones, works without an account; the header shows "Sign in" or the signed-in user with "Sign out". The service worker never caches `/auth/*` or `/login`. Without the Auth0 variables the site still works and the header hides the sign-in link.

`/login` links to Auth0's hosted sign-in and sign-up. `.env.local` is ignored by Git and should never be committed.

For a deployed site, set `APP_BASE_URL` to its public URL and add `<APP_BASE_URL>/auth/callback` (callback) and `<APP_BASE_URL>` (logout URL, web origin) in Auth0.

Run the app with:

```bash
npm run dev
```

Set `DEMO_MODE=true` to serve cached responses from `data/cache/` without calling Swarms.

## Scripts

- `npm run check-data` — validate the pathways JSON and sanitizer
- `npm run probe-swarms` — test the Swarms API connection
- `npm run seed-cache` — regenerate demo responses in `data/cache/`
- `npm run build` — production build (run before every PR)
