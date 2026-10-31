# EMSIT web application

The EMSIT Navy Identity v1.4 website, packaged as a standalone GitHub → Vercel → Neon application. This follows the PrimeSphere pattern: vanilla HTML/CSS/JavaScript, Node API functions, PostgreSQL, and an admin interface. No Sites hosting or Cloudflare runtime is required.

## Included

- Brand-aligned Pearl/Navy homepage and complete-wordmark splash reveal, with reduced-motion support.
- Neumorphic surfaces, inset controls, staggered entrances, pointer depth, photo parallax and scroll progress. Styling is in `public/premium.css`; progressive animation behavior is in `public/motion.js`.
- `/contact`: message and discovery-call tabs with date, time and timezone selection.
- `/api/contact` and `/api/bookings`: validated submissions saved to Neon.
- `/admin`: password-protected inbox, type/status filters, pagination, status changes and email reply links.
- Signed, expiring HttpOnly admin sessions; same-origin mutation checks; shared database rate limits; duplicate-request protection; parameterized SQL.
- Database schema, local app server, integration tests and GitHub Actions checks.

Call submissions are **requests**, not instantly reserved appointments. The owner reviews them and contacts the visitor to agree a time. The app does not connect to a calendar or send automatic email notifications. Inbox replies open your email app. Merely setting a call to “confirmed” does not notify the visitor.

## 1. Create the GitHub repository

Extract the ZIP and upload its contents to your repository root. `package.json`, `vercel.json`, `api/`, `public/`, and `database/` should be at the root. Do not upload the older static archive, `node_modules`, `.env.local`, or `.openai` files.

If working from the parent EMSIT workspace instead, set Vercel's **Root Directory** to `emsit-webapp`.

## 2. Create the Neon database

1. Create a Neon project/database for EMSIT (a separate database avoids mixing it with PrimeSphere).
2. Open Neon SQL Editor and run the complete `database/schema.sql` file. It is safe to rerun; it does not delete data.
3. Copy the database connection string from Neon’s Connect dialog. Keep it private.

Alternatively, set `DATABASE_URL` locally and run `npm run db:migrate`. Schema creation is explicit and is not run automatically during production builds.

## 3. Deploy on Vercel

1. Import your GitHub repository into Vercel.
2. Framework Preset: **Other**. Node.js: **22.x**.
3. Build Command: `npm run build`. Output Directory: `dist`. The repository's `vercel.json` sets these. Vercel discovers the root `api/` Node functions separately.
4. Add the following environment variables in Vercel. Enable them for Production and, if needed, Preview. Use a separate Neon branch/database for Preview.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string, including SSL options |
| `ADMIN_PASSWORD` | A unique password, at least 16 characters, at most 256 |
| `SESSION_SECRET` | A random secret of at least 32 characters |

Generate a session secret locally:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Deploy. After changing environment variables, redeploy so the functions receive the changes.
6. Visit `/admin` and sign in using `ADMIN_PASSWORD`.
7. Submit a test message and call request from `/contact`; verify both appear in the admin inbox and in Neon. Mark the test records closed afterward.

Do not prefix secrets with `NEXT_PUBLIC_` or expose them in HTML. They are used only by the API. Rotating either admin password or session secret invalidates existing admin sessions after redeployment.

## Local development

Install Node.js 22, then:

```sh
npm ci
```

Copy `.env.example` to `.env.local` and replace the placeholders with your own Neon connection, admin password, and session secret. Do not commit `.env.local`.

```sh
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:4174`. The local server runs the same API handlers as Vercel. Without database configuration, the site is viewable, but submission/login endpoints return an error rather than pretending to save data. Do not use a static file server to test the API.

## Verify

```sh
npm test
npm run build
```

Tests use an isolated PostgreSQL engine (PGlite), including the actual schema and SQL. They cover saving records, duplicate retries, database failure, booking validation, status updates, rate limits, session tampering and unauthorized access. They do not require or modify your Neon database.

## Structure

```text
api/                    Vercel Node API endpoints
lib/                    Database, validation, auth, HTTP and storage logic
public/                 Website and admin assets (edit these)
public/brand.css         Brand tokens, typography and responsive layouts
public/assets/           Exact wordmark artwork and illustrative brand imagery
database/schema.sql     Neon schema
scripts/                Build, local server and migration commands
tests/                  PostgreSQL and API integration checks
.github/workflows/      CI checks
vercel.json             Deployment configuration
.env.example            Environment template (no real secrets)
```

Only `public/` is copied into the static deployment directory. Backend code, tests, schema, and secrets are not served as static assets. Visitor messages are rendered as text in the inbox, never as HTML. Rate limits are 10 submissions or login attempts per IP per 10 minutes; old limiter records are pruned on subsequent requests. Keep Neon backups/retention appropriate for your business and remove old records according to your retention policy.

## Scope and current deployment status

This is a ready-to-configure application repository. It has not been connected to your real Neon database or deployed to your Vercel account. The earlier `chatgpt.site` link remains a separate static design preview and does not run this backend. This package reproduces the relevant PrimeSphere architecture and contact pattern; it does not copy PrimeSphere's unrelated chat, client portal, content-management or store-gallery features.

Official references: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver).

Brand implementation details and asset provenance are in `BRAND-IMPLEMENTATION.md`.
