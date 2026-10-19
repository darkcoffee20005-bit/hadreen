# Hadreen (حاضرين)

Interactive 3D wedding invitations, Arabic-first. The build plan and progress tracker live in [PLAN.md](PLAN.md); the original brief is in [docs/BRIEF.md](docs/BRIEF.md).

> Status: Phase 1 (backend and platform) done. The 3D engine and templates come in Phases 2–3.

## Setup

Requirements: Node 22.13+, pnpm 10, PostgreSQL 16 (local binaries, or any Postgres URL).

```bash
pnpm install                 # also generates the Prisma client
cp .env.example .env         # then set ADMIN_PASSWORD and SESSION_SECRET (32+ chars)
pnpm db:up                   # throwaway local Postgres on :54329 (data in ./.pg)
pnpm prisma migrate deploy   # apply migrations
pnpm db:seed                 # six demo weddings (demo-<template>), prints dashboard links
pnpm dev                     # http://localhost:3000
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres. Production: Neon pooled connection string. |
| `TEST_DATABASE_URL`, `E2E_DATABASE_URL` | Separate databases for Vitest integration tests and Playwright. |
| `SITE_URL` | Public origin used in guest links, share messages, OG images. Read at runtime. |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | `/admin` login and its iron-session cookie. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting in production. Empty = in-memory limiter (dev only). |
| `LAB_ENABLED` | `/lab/[template]` tuning pages (Phase 2+). Keep `false` in production. |

## Scripts

| Command | What it does |
|---|---|
| `pnpm lint` · `pnpm typecheck` | ESLint, TypeScript (strict). |
| `pnpm test` | Vitest: unit tests, plus integration tests against `TEST_DATABASE_URL`. |
| `pnpm e2e` | Playwright: builds, starts on :3100 against `E2E_DATABASE_URL`, runs `e2e/`. |
| `pnpm shots <phase>` | Screenshots at 390×844 and 1440×900 into `screenshots/<phase>/` (needs the :3100 server). |
| `pnpm fonts` | Re-downloads the brand TTFs into `src/assets/fonts` (used for share images). |

## Creating a wedding

1. Sign in at `/admin` with `ADMIN_PASSWORD`.
2. **+ عرس جديد**: pick a template and colours, fill in the names, date (Baghdad time), venue, programme and dress code. The phone on the side previews unsaved changes.
3. **حفظ ونشر** publishes it at `/i/<slug>`.
4. Import guests from CSV (columns: name, seats, group, with Arabic or English headers). Each household gets a personal link `/i/<slug>?g=<token>`.
5. Send the couple their dashboard link (**لوحة العروسين**, `/d/<slug>?k=<secret>`). There they see answers, copy a ready Arabic message per guest, show QR codes, and export a CSV.

## Notes

- Dates are stored in UTC and always shown in Baghdad time, with Eastern Arabic digits and Gregorian month names (`الخميس ١٠ / ١٢ (ديسمبر) ٢٠٢٦`). Never use Intl's Arabic month names: `ar-IQ` returns Syriac ones.
- Share images can't use Satori's text rendering for Arabic (letters come out unjoined). Text is shaped with HarfBuzz into SVG paths instead (`src/lib/og/shape.ts`).
