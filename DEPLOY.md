# Deploying Hadreen (Vercel + Neon)

Nothing here has been run for you: each step creates or changes an external account, and some cost money. Read the cost notes first.

## Costs and decisions

| Service | Plan | Why |
|---|---|---|
| **Vercel** | **Pro (paid) for production.** Hobby is free but for non-commercial use only, and Hadreen sells invitations. Use Hobby for private previews if you like. | Hosting, serverless functions, image (OG) rendering. |
| **Neon** | Free tier is enough to start (0.5 GB). | Postgres. Region **eu-central-1 (Frankfurt)**, next to Vercel's `fra1`, the closest pair to Iraq. |
| **Upstash Redis** | Optional, free tier. | Rate limits that hold across serverless instances. Without it each instance limits on its own (still safe, less strict). |

No other service is used. Music tracks you license go in `public/music/` (see `LICENSES.md`).

## 1. Database (Neon)

1. Create a project in **AWS eu-central-1 (Frankfurt)**, Postgres 16 or newer.
2. Copy two connection strings from **Connection Details**:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL` (the app, many short connections).
   - **Direct** (no `-pooler`) → `DIRECT_DATABASE_URL` (migrations and the seed; PgBouncer can't hold migration locks).
   Both need `?sslmode=require`.

## 2. Vercel project

1. Push this repository to GitHub, then **Add New → Project** in Vercel and import it. Framework: Next.js (detected). Package manager: pnpm (from `pnpm-lock.yaml`).
2. `vercel.json` already sets the function region to `fra1` and the build command to `pnpm prisma migrate deploy && pnpm build`, so every deploy applies pending migrations first (non-destructive: `migrate deploy` never resets data).
3. **Environment variables** (Production, and Preview if you use previews):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled string |
| `DIRECT_DATABASE_URL` | Neon direct string |
| `SITE_URL` | Your public origin, e.g. `https://hadreen.example` (no trailing slash). Used in guest links, share messages, OG images and the sitemap. |
| `ADMIN_PASSWORD` | A long password for `/admin` |
| `SESSION_SECRET` | 32+ random characters (`openssl rand -base64 48`) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional (Upstash console → your database → REST API) |
| `LAB_ENABLED` | `false` (or leave unset) |

4. Deploy. The first build creates the tables.

## 3. Demo weddings

The marketing site and the gallery link to `/i/demo-<template>`. Seed them once from your machine against the **direct** URL:

```bash
DATABASE_URL="<direct string>" pnpm db:seed
```

The seed only replaces demo weddings (`isDemo = true`); real weddings are never touched. Re-run it whenever you want fresh demo data. Demo dates roll forward automatically.

## 4. Domain

Vercel → Project → **Settings → Domains**: add your domain and follow the DNS instructions. Then set `SITE_URL` to it and redeploy (links and share images use it).

## 5. After the first deploy

- Open `/admin`, sign in, and create a test wedding; open its guest link on a phone.
- Share a demo link in a chat app and check the preview image.
- `/robots.txt` and `/sitemap.xml` should list the site and the six demos; `/admin`, `/d/`, `/api/` are disallowed.
- Lighthouse (mobile) on `/` and one invitation.

## Updating

Push to the main branch: Vercel builds, migrates, and deploys. Preview videos and posters in `public/previews/` are committed files; re-record them with `pnpm previews` (against a production build, see README) when a template changes.

## Rolling back

Vercel → Deployments → pick the previous one → **Promote to Production**. Migrations are additive in this project; if one ever isn't, roll the database forward with a new migration rather than resetting it.
