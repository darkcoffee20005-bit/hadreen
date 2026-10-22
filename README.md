# Hadreen (حاضرين)

Interactive 3D wedding invitations, Arabic-first. Seven bespoke templates open like a short film on the guest's phone (with a light 2D version for phones that can't), every household gets a personal link, and the couple follows the answers from their own dashboard. Orders come through Instagram ([@7adre.n](https://www.instagram.com/7adre.n/)).

- Plan, decisions and phase log: [PLAN.md](PLAN.md). Original brief: [docs/BRIEF.md](docs/BRIEF.md).
- Deploying (Vercel + Neon): [DEPLOY.md](DEPLOY.md). Third-party assets: [LICENSES.md](LICENSES.md).

## What's in it

| Surface | Route | Notes |
|---|---|---|
| Marketing site | `/` | 3D carousel of live template thumbnails, try-it phone, gallery with previews, price, FAQ. |
| Invitation | `/i/<slug>`, personal: `?g=<token>` | Gate → 3D opening → content (countdown, programme, venue, map, calendar, dress code, RSVP). |
| Couple dashboard | `/d/<slug>?k=<secret>` + 6-digit code | Answers and seats, messages, per-guest links and QR, CSV import/export. |
| Admin | `/admin` | Create, edit, preview, publish weddings; bulk guest import. |
| Lab (dev only) | `/lab`, `/lab/<template>` | Leva panel: tier, phase, opening scrubber, scene tweaks, r3f-perf. |

The seven templates: الحديقة المقدّسة `sacred-garden`, ورد وعود `blossom-oud`, دولتشي فيتا `dolce-vita`, الذهب الملكي `royal-gold`, الرومانسية الأبدية `eternal-romance`, حب بلا حدود `destination-love`, الأناقة الكلاسيكية `old-money`.

Venue-exclusive designs carry `exclusive` (the venue's name) in their meta: they're selectable in `/admin` but never appear on the public site (`PUBLIC_TEMPLATES`). Today: البيت الأبيض `white-house-hall`, made for قاعة البيت الأبيض (Mosul).

## Setup

Requirements: Node 22.13+, pnpm 10, PostgreSQL 16 (local binaries, or any Postgres URL), ffmpeg (only for recording previews).

```bash
pnpm install                 # also generates the Prisma client
cp .env.example .env         # then set ADMIN_PASSWORD and SESSION_SECRET (32+ chars)
pnpm db:up                   # throwaway local Postgres on :54329 (data in ./.pg)
pnpm db:deploy               # apply migrations
pnpm db:seed                 # one demo wedding per template (demo-<template>), prints dashboard links
pnpm dev                     # http://localhost:3000
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres. Production: Neon pooled connection string. |
| `DIRECT_DATABASE_URL` | Production only: Neon direct string for migrations and the seed. |
| `TEST_DATABASE_URL`, `E2E_DATABASE_URL` | Separate databases for Vitest integration tests and Playwright. |
| `SITE_URL` | Public origin used in guest links, share messages, OG images, sitemap. Read at runtime. |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | `/admin` login and its iron-session cookie. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limits shared across instances (optional; empty = per-instance in-memory limiter). |
| `LAB_ENABLED` | `/lab` pages outside development. Keep `false` in production. |

Secrets live only in `.env` (git-ignored); `.env.example` documents every key.

## Scripts

| Command | What it does |
|---|---|
| `pnpm lint` · `pnpm typecheck` | ESLint, TypeScript (strict). |
| `pnpm test` | Vitest: unit tests, plus integration tests against `TEST_DATABASE_URL`. |
| `pnpm e2e` | Playwright: builds into `.next-e2e`, starts on :3100 against `E2E_DATABASE_URL`, runs `e2e/` (2D path, 3D path on SwiftShader, RSVP, dashboard, admin, site). |
| `pnpm shots <phase>` | Screenshots at 390×844 and 1440×900 into `screenshots/<phase>/`, including each template's gate / mid-opening / content on both paths (needs the :3100 server). |
| `pnpm budget` | Bytes before the opening (3D and 2D), draw calls and triangles per template → `reports/budget.md`. Fails over 2.5 MB. |
| `pnpm previews [template…]` | Records each opening frame by frame and encodes MP4 + WebM + poster into `public/previews/` (needs ffmpeg and a production server). |
| `pnpm static` | Copies detect-gpu's benchmark tables into `public/detect-gpu/`. |
| `pnpm fonts` | Re-downloads the brand TTFs into `src/assets/fonts` (share images). |
| `pnpm tsx scripts/land-dots.ts` | Recomputes the globe land dots from Natural Earth. |

The dev server and a production build can run side by side: production builds use `NEXT_DIST_DIR` (`.next-e2e` for e2e) so they never touch the dev server's `.next`.

```bash
# A production server for shots, budget and previews
NEXT_DIST_DIR=.next-e2e pnpm build
DATABASE_URL=$E2E_DATABASE_URL SITE_URL=http://localhost:3100 NEXT_DIST_DIR=.next-e2e pnpm start --port 3100
```

## Creating a wedding

1. Sign in at `/admin` with `ADMIN_PASSWORD`.
2. **+ عرس جديد**: pick a template and colours, fill in the names, date (Baghdad time), venue, programme and dress code. The phone on the side previews unsaved changes.
3. **حفظ ونشر** publishes it at `/i/<slug>`.
4. Import guests from CSV (columns: name, seats, group, with Arabic or English headers). Each household gets a personal link `/i/<slug>?g=<token>`.
5. Send the couple their dashboard link (**لوحة العروسين**, `/d/<slug>?k=<secret>`) and, in a separate message, its 6-digit code (shown next to the link in `/admin`; **رمز جديد** replaces it and locks out browsers that had the old one). The link alone opens nothing: each browser asks for the code once. There they see answers, copy a ready Arabic message per guest, show QR codes, and export a CSV.

## How an invitation works

`src/lib/invite/` is the shared engine; each template only brings its scene and art.

- **Shell** (`shell/InviteShell.tsx`): decides the path once on the client (reduced motion, WebGL, software renderers and Save-Data → 2D; otherwise detect-gpu picks a tier), loads the template's scene chunk and the 3D stage in parallel behind a server-rendered gate, shows real loading progress, plays the opening, hands off to the content. The content is always in the DOM.
- **State machine** (`machine.ts`): `boot → loading → gate → opening → handoff → content`, readable from scenes through `useInviteStore()` / `useInvite()` (context-aware, so the marketing hero can host several).
- **Stage** (`stage/`): one canvas, our own frame loop (idle cap while reading), per-tier post-processing (`Grade`), camera tracks framed for phones and desktops (`CinematicCamera`), the opening as one GSAP timeline (`useIntro`), readiness milestones.
- **Kits**: `kit/` (sky, envelope, wax seal, arch, rays), `text3d/GoldText` (Arabic shaped by the browser onto a canvas texture), `audio/` (synthesized foley and placeholder music), `interaction/` (tilt, gyro, hold, scratch), `content/` (the readable page).
- **Quality tiers** (`quality/tiers.ts`): low / medium / high set DPR, AA, post, bloom, shadows, particles, reflections; the tier steps down live if frames drop.
- **Capture mode** (`?capture=gate|mid|content|video`): deterministic frames for screenshots, budgets and preview videos. `?tier=` pins the 3D path (QA on software GPUs), `?force2d=1` forces 2D.

## Adding a template

1. `src/lib/invite/types.ts`: add the id to `TEMPLATE_IDS`.
2. `src/templates/<id>/meta.ts`: names, tagline, palette (DOM tokens must pass AA, see `tests/unit/palette.test.ts`), music mood and placeholder, intro length, gate gesture and label, style tags, budget, and `exclusive` if it belongs to one venue. Register it in `src/templates/index.ts`.
3. `src/templates/<id>/Scene.tsx`: default export taking `SceneProps`. Follow the template contract (PLAN.md §4.4) and the finished templates (`royal-gold/` is a good model):
   - build the opening with `useIntro`; drive visuals from the opening's time so skip/seek land exactly;
   - read the store with `useInviteStore()` / `useInvite()`, never the `inviteStore` singleton;
   - report readiness (`AssetsReady`, `ShaderWarmup`, `useTextsReady`);
   - frame shots with `fit` so phones and desktops both compose; respect tiers and capture mode.
4. `src/templates/<id>/Fallback2D.tsx`: `Gate2D`, `Backdrop2D`, `OPENING_MS` (SVG/CSS only).
5. Optional: `content.css` (scoped under `[data-template='<id>']`), `Extras.tsx` (decoration after the hero).
6. Register the lazy loaders in `src/templates/scenes.ts`, `fallbacks.ts`, `content.css`, and `src/lib/invite/content/TemplateExtras.tsx`.
7. Seed a demo wedding (`prisma/seed.ts`), add it to the music placeholders if needed, then `pnpm shots`, `pnpm budget`, `pnpm previews <id>`.

Tune it at `/lab/<id>`: expose knobs with `useTweak('name', default, { min, max })` and they appear in the Leva panel (defaults everywhere else).

## Notes

- Dates are stored in UTC and always shown in Baghdad time, with Eastern Arabic digits and Gregorian month names (`الخميس ١٠ / ١٢ (ديسمبر) ٢٠٢٦`). Never use Intl's Arabic month names: `ar-IQ` returns Syriac ones.
- Share images can't use Satori's text rendering for Arabic (letters come out unjoined). Text is shaped with HarfBuzz into SVG paths instead (`src/lib/og/shape.ts`).
- Colours in scenes mix in sRGB (`stage/color.ts`): three's `Color.lerp` works in linear light and turns emerald + gold into olive.
- Contact is Instagram only, by design: no phone or WhatsApp number anywhere (a test checks the site).
