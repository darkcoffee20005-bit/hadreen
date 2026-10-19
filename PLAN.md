# Hadreen (حاضرين): Build Plan

> **Status:** Phase 1 (backend and platform) is done. Next: Phase 2, the shared invitation engine. See §17 for what Phase 1 changed in this plan.
> **Brief:** `docs/BRIEF.md` (text) and `docs/brief.pdf` (original).
> **Resuming:** a new session reads this file first, finds the first unchecked item in §0 and continues from there.

---

## 0. Progress tracker

- [x] **Phase 0**: study the inspiration and the reference, then write PLAN.md
- [x] **Phase 1**: backend and platform (data model, routes, couple dashboard, admin, seed, tests)
- [x] **Phase 2**: shared invitation engine (`src/lib/invite`) plus an engine test stage
- [ ] **Phase 3**: the six templates *(you asked me to carry on through every phase, so the 3a review checkpoint is folded in: all six are built together)*
- [ ] **Phase 4**: marketing website (`/`), preview videos, SEO
- [ ] **Phase 5**: polish, QA and docs

**Steps at the end of every phase:**
1. `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm e2e` (Playwright).
2. Start the app and run `pnpm shots <phase>`. It writes 390×844 and 1440×900 screenshots to `screenshots/<phase>/`.
3. Review the screenshots critically and fix what looks off.
4. Write a summary (done / next) and update this tracker.
5. Commit as `phase-N: …`, and push once a GitHub remote exists.

Ask before adding any paid service. Secrets go only in `.env`, documented in `.env.example`.

---

## 1. Decisions I need from you

| # | Question | What I'll do unless you say otherwise |
|---|---|---|
| 1 | **`reference/x-emerald3d.html` is not in this session.** Please upload it. | Phase 1 doesn't need it. Phase 2 reads it for the lighting rig, gobo shadows, opening timeline, fallbacks and audio. |
| 2 | **Where the code lives.** This container is temporary and the project will take several sessions. | Create an empty GitHub repo (e.g. `hadreen`) and connect it to Claude. I'll push at the end of every phase. |
| 3 | **Vercel plan.** Vercel's free Hobby plan only allows non-commercial use. Hadreen sells invitations, so production needs **Vercel Pro (paid)**. | Use Hobby for previews. Switch to Pro before the first real order. You decide when. |
| 4 | **Upstash Redis** for `@upstash/ratelimit`. It's an external account; a free tier exists. | Use an in-memory limiter in dev, and Upstash in production once you approve it. |
| 5 | **Neon region.** | Neon `eu-central-1` (Frankfurt) with Vercel functions in `fra1`, so the database and functions sit together, close to Iraq. |
| 6 | **FAQ facts.** The brief says accurate answers only, so I need: delivery time, number of edits, how long a link stays live after the wedding, payment methods, what can change after publishing, which occasions you cover. | The FAQ will only include questions you've answered. |
| 7 | **RSVP from the generic link** (a guest without a personal token types their name). Should it be allowed, and with how many seats? | Allowed, capped at 2 seats. The couple can set the cap to 0 to turn it off. |
| 8 | **Reduced-motion users** get the 2D version, as the brief says. Should they also see a small opt-in button «شغّلوا النسخة ثلاثية الأبعاد»? | Yes: 2D by default, with an opt-in button. |
| 9 | **Single-guest editing in the couple dashboard** (add, edit, delete, regenerate link), on top of CSV import. | Yes. |
| 10 | **Production domain**, used for canonical URLs, OG images and the sitemap. | Read from `SITE_URL` at runtime, with a placeholder until you choose. |
| 11 | **Next.js version.** The brief says 15; 16.4 is the current release. | Stay on 15.5.x as written. |
| 12 | **The couple in الذهب الملكي**, seen from behind. Procedural figures are hard to make beautiful. | Start with stylised, modest procedural silhouettes with rim light. If they miss the quality bar, I'll ask before using CC0 models. |
| 13 | **Music.** You'll supply licensed tracks for `/public/music`. | Until then, each template gets a synthesized placeholder with its own mood (§9). |

---

## 2. What I studied

### 2.1 Inspiration: Webgency's catalogue

**What I could access:** the sandbox's network policy blocks `webgencyinvitations.com` and `instagram.com`, so I could not open the site's previews or the reels. I worked from two sources:
- the search engine's index of their pages: [home](https://webgencyinvitations.com/), [order](https://webgencyinvitations.com/order), [price](https://webgencyinvitations.com/price), [old price](https://webgencyinvitations.com/priceold) and [terms](https://webgencyinvitations.com/termsconditions);
- the theme descriptions in the brief.

For a deeper visual study before Phase 3, either allow the domain in the environment's network settings, or drop screenshots into `reference/webgency/` (they're used for study only, never shipped).

**What the index shows** (summarised in my own words):
- **Catalogue:** The Sacred Garden (marked new), Blossom & Oud (new), Dolce Vita (popular), Vibrant Vows (new), Destination Love, Eternal Romance (client favourite), Royal Gold and Minimalist.
- **Product shape:**
  - one web link for every guest, with nothing to install;
  - an opening animation;
  - a scrolling page of sections the couple chooses;
  - RSVP tracking, a few couple photos and music;
  - the link stays live until shortly after the wedding.
  - An older price page sold personalised guest links as a paid add-on.
- **Ordering:** pick a design and pay, send details through a form, then review a first version.

**The interaction ideas we reinterpret** (from the catalogue and the brief): wax-seal envelopes, stage curtains, chandeliers, scratch-to-reveal dates, arches and lanterns, swans, falling petals, a programme timeline, RSVP.

**What we never take:**
- none of their images, illustrations, layouts or text;
- `reference/webgency/` doesn't exist, so no licensed Webgency files are used.

Vibrant Vows and Minimalist are unused, which makes them natural ideas for a 7th or 8th template.

**Where Hadreen differs.** We show these in the product itself and never as comparative marketing claims:
- real-time 3D scenes instead of video;
- Arabic-first typography and dates;
- a personal link and greeting for every household, included in the single price;
- a dashboard for the couple.

### 2.2 Technical baseline: `/reference/x-emerald3d.html`

**Missing.** When it arrives, Phase 2 extracts its lighting rig, gobo shadow technique, opening-timeline structure, fallbacks and audio handling. The engine design in §8 doesn't depend on it.

---

## 3. Product surfaces and routes

| Route | Rendering | Purpose |
|---|---|---|
| `/` | Static, with lazy 3D islands | Marketing site (Phase 4). |
| `/i/[slug]?g=<token>` | Dynamic SSR, `noindex` except demos | The invitation. With a token, it greets the household by name on the gate and in the scene, prefills the RSVP and caps seats at `maxSeats`. Without one, it shows a generic greeting and asks for a name. |
| `/i/[slug]/calendar.ics` | Route handler | iCalendar file with UTC times. Also a Google Calendar link. |
| `/i/[slug]/opengraph-image` | `next/og` (this is `@vercel/og`) | 1200×630 share card in the template's palette, with names and date. |
| `POST /api/rsvp` | Node route | Zod-validated and rate-limited by IP and by token. Idempotent upsert, editable until `rsvpDeadline`. |
| `POST /api/events` | Node route | Batched beacons sent with `navigator.sendBeacon`, falling back to `fetch(…, {keepalive:true})`. |
| `/d/[slug]?k=<coupleSecret>` | Dynamic SSR, `noindex`, `no-referrer` | Couple dashboard. |
| `/d/[slug]/export.csv` | Route handler | CSV export, UTF-8 with a BOM so Excel shows Arabic correctly. |
| `/admin/**` | iron-session, password from env | Create, edit and duplicate weddings; bulk-import guests; pick template and palette with a live preview; publish toggle. |
| `/lab/[template]` | Dev only (`LAB_ENABLED`) | Leva controls for lights, camera shots and the timeline, with an r3f-perf overlay. |
| `/sitemap.xml`, `/robots.txt` | Metadata routes | SEO. |

---

## 4. Architecture

### 4.1 Stack

Versions were checked against npm on 2026‑10‑18 and get pinned exactly at scaffold time.

| Area | Package | Pin | Why |
|---|---|---|---|
| Runtime | Node | 22 LTS | iron-session 9 needs ≥ 22.13; nanoid 6, Prisma 7 and Vitest 5 need ≥ 22.12. |
| Framework | next | **15.5.28** | Latest 15.x. 16.4.2 exists, but the brief says 15. |
| | react / react-dom | 19.3.1 | R3F 9.8 requires react `>=19 <19.4`. |
| | typescript | **5.9.3** | TS 7 is out, but Next 15's type-check expects the TS 5 API. |
| Styling | tailwindcss, @tailwindcss/postcss | 4.3.3 | Brand tokens in `@theme`; per-template CSS variables. |
| 3D | three, @types/three | **0.186.1**, 0.186.0 | The one pinned three. postprocessing 6.39.5 requires `< 0.187`. |
| | @react-three/fiber | 9.8.2 | |
| | @react-three/drei | 10.7.9 | Environment and Lightformer, MeshReflectorMaterial, MeshTransmissionMaterial, PerformanceMonitor, RenderTexture, useProgress. |
| | @react-three/postprocessing, postprocessing | 3.2.0, 6.39.5 | |
| | troika-three-text | 0.52.5 | Arabic shaping and bidi inside WebGL. |
| | detect-gpu | 5.0.70 | Benchmarks are self-hosted (by default the library downloads them from unpkg). |
| Motion | gsap | 3.15.0 | Includes ScrollTrigger. |
| | lenis | 1.3.27 | Driven from `gsap.ticker`, so there's a single scroll loop. |
| State | zustand | 5.0.15 | |
| Data | prisma, @prisma/client, @prisma/adapter-pg | 7.10.1 | Prisma 8 is still a release candidate. |
| | pg | 8.23.1 | One driver for both Neon's pooled URL and local Postgres. |
| Validation | zod | 4.6.7 | |
| Auth | iron-session | 9.0.1 | Admin session. |
| Rate limiting | @upstash/ratelimit, @upstash/redis | 2.2.0, 1.39.0 | Falls back to in-memory in dev. |
| Utilities | nanoid 6.0.2, qrcode 1.5.4, papaparse 5.7.0 | | |
| Tests | vitest 5.0.5, @playwright/test 1.56.1 | | 1.56.1 matches the sandbox's preinstalled Chromium build (1194). |
| Lint and format | eslint 9.39.5, eslint-config-next 15.5.28, prettier 3.9.10 | | |
| Dev and pipeline | leva 0.10.1, r3f-perf 7.2.3, @gltf-transform/cli 4.5.1, subset-font 2.9.0, world-atlas 2.0.2 | | |

### 4.2 Request and data flow

- **The DOM comes first.** Server components load the wedding (and the guest, if there's a token) and render all the content as HTML: names, date, programme, venue, dress code and the RSVP form. This page shell paints first and is the LCP element.
- **Caching.** The wedding and its guest list are cached per slug with `unstable_cache`, tagged `wedding:<slug>`. Admin and dashboard writes call `revalidateTag`, so a Neon cold start never slows down opening an invitation.
- **The 3D stage** is a client island. A client component calls `dynamic(() => import('@/templates/<id>/Scene'), { ssr: false })`, but only after the capability check (§8.2) picks the 3D path.
- **What the client receives.** The public payload never includes `coupleSecret`, other guests, or any token except the current one.
- **Runtime and regions.** Every database route runs on the Node runtime with the `pg` adapter. Vercel functions are in `fra1`, Neon is in `eu-central-1`.
- **Two root layouts.** `(site)` renders `<html lang="ar" dir="rtl">`. `(invite)/i/[slug]` has its own root layout that reads `lang` and `dir` from the wedding, so English weddings get correct `<html lang="en" dir="ltr">`.

### 4.3 Invitation state machine

The machine lives in `src/lib/invite/machine.ts` (a Zustand store).

```
boot ─► capability check (WebGL2/1 · detect-gpu tier · prefers-reduced-motion · ?force2d)
          │
          ├─ 3D path:  loading ─► gate ─► opening ─► handoff ─► content (ambient backdrop)
          │                                 └── skip ──┘
          └─ 2D path:  gate2d ─► opening2d ─► content

  3D chunk import fails / webglcontextlost / GPU tier 0  ──►  2D path, at the same phase
```

- **Opening.** Each template's opening is a GSAP master timeline of 6–9 s. Skipping calls `timeline.progress(1)`, then plays a 0.6 s eased move to the ambient shot (no hard cut).
- **Hidden tab.** On `visibilitychange`, the canvas switches to `frameloop="never"`, the AudioContext is suspended and `gsap.globalTimeline` pauses. All three resume when the tab is visible again.

### 4.4 Template contract

Defined in `src/lib/invite/types.ts`:

```ts
export type TemplateId =
  | 'sacred-garden' | 'blossom-oud' | 'dolce-vita'
  | 'royal-gold' | 'eternal-romance' | 'destination-love';

export interface TemplateMeta {            // light: imported by the registry, admin and marketing
  id: TemplateId;
  nameAr: string;                          // 'الذهب الملكي'
  nameEn: string;                          // 'Royal Gold'
  palette: PaletteTokens;                  // CSS variables + 3D colours, incl. a text-safe goldInk
  paletteVariants: PaletteVariant[];       // 2–3 curated alternatives for the admin picker
  music: { mood: string; bpm: number; placeholder: SynthPresetId };
  intro: { duration: number; beats: Beat[] };   // seconds; beats carry sfx + haptic cues
  gate: { gesture: 'tap' | 'hold' | 'scratch'; labelAr: string; labelEn: string };
  budgetKB: number;                        // enforced by scripts/budget.ts
}
// Loaded lazily, per template folder:
//   Scene.tsx      R3F scene: gate, opening and ambient, bound to the machine
//   Fallback2D.tsx CSS/SVG version of the same look, same content
//   lab.ts         Leva schema for /lab/[template]
```

### 4.5 Security and privacy

- **Guest tokens:** `nanoid(10)` from an alphabet without look-alike characters. A token must belong to the slug's wedding. A token that doesn't match is treated like no token, and the response never says whether it exists.
- **Couple dashboard:**
  - `?k=` is compared in constant time.
  - It's then stored in an httpOnly cookie scoped to `/d/<slug>`, and the browser is redirected to the clean URL so the secret doesn't stay in history or screenshots.
  - The dashboard sends `Referrer-Policy: no-referrer` and `noindex`.
  - The couple can rotate any guest's token.
- **Admin:**
  - one password from `ADMIN_PASSWORD`;
  - `SESSION_SECRET` of at least 32 characters;
  - login attempts are rate-limited.
- **RSVP and events endpoints:**
  - JSON only, and the `Origin` header must match the host.
  - Size caps: RSVP 2 KB; events 4 KB and at most 20 items.
  - Rate limits: 20/min per IP and 6/min per token.
- **Headers:**
  - CSP with a nonce (Phase 5 hardening; Phase 1 ships `frame-ancestors` only). It includes `worker-src 'self' blob:` because troika runs its worker from a blob URL.
  - `frame-ancestors 'self'` on `/i/*`, for the admin preview and the marketing phone; `'none'` everywhere else.
  - `nosniff`, plus a `Permissions-Policy` that allows device orientation only on `/i/*`.

### 4.6 Analytics events

| Event | When it's recorded |
|---|---|
| `opened` | The first time the invitation is visible, once per session. It's sent from the browser, never from the server, so WhatsApp and Instagram link-preview bots don't count as opens. Known bot user-agents are dropped. |
| `intro_completed` | When the hand-off is reached, whether or not the guest skipped. |
| `rsvp` | On RSVP submit. |
| `calendar` | On tapping either calendar button. |
| `map` | On tapping the map button. |

---

## 5. Folder tree

```
hadreen/
├── PLAN.md                         # this file: source of truth + progress tracker
├── README.md · DEPLOY.md · LICENSES.md · .env.example     # stubs in Phase 1, final in Phase 5
├── docs/BRIEF.md · docs/brief.pdf  # the original brief
├── package.json · pnpm-lock.yaml · tsconfig.json · next.config.ts
├── eslint.config.mjs · prettier.config.mjs · postcss.config.mjs
├── prisma.config.ts · vitest.config.ts · playwright.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                     # demo-<template> × 6 with example guests, all labelled as examples
├── public/
│   ├── fonts/webgl/                # subset WOFF for troika (Aref Ruqaa, Amiri; Cormorant + Jost for EN)
│   ├── detect-gpu/                 # self-hosted benchmark data
│   ├── music/                      # licensed tracks you supply + manifest.json
│   ├── previews/                   # <template>.mp4 / .webm / .jpg (generated in Phase 4)
│   └── geo/land-dots.bin           # globe land dots (generated)
├── scripts/
│   ├── db-local.sh                 # throwaway Postgres 16 in ./.pg for dev + e2e (initdb/pg_ctl)
│   ├── shots.ts                    # Playwright → screenshots/<phase>/<page>-<moment>-<w>x<h>.png
│   ├── budget.ts                   # bytes before the intro + renderer.info, per template → table
│   ├── perf.ts                     # fps / draw calls / triangles / texture memory (needs a real GPU)
│   ├── record-previews.ts          # deterministic frame capture → ffmpeg MP4 + WebM + poster
│   ├── subset-fonts.ts             # HarfBuzz subsetting that keeps Arabic GSUB/GPOS
│   └── build-globe.ts              # world-atlas (Natural Earth) → land dots
├── src/
│   ├── app/
│   │   ├── (site)/                 # root layout: <html lang="ar" dir="rtl">
│   │   │   ├── layout.tsx · page.tsx                 # marketing (Phase 4)
│   │   │   ├── d/[slug]/page.tsx · d/[slug]/export.csv/route.ts
│   │   │   ├── admin/login/page.tsx · admin/page.tsx
│   │   │   ├── admin/weddings/[id]/page.tsx          # editor + live preview
│   │   │   ├── admin/preview/page.tsx                # iframe target, fed by postMessage
│   │   │   └── lab/[template]/page.tsx               # dev only
│   │   ├── (invite)/i/[slug]/      # own root layout: lang/dir from the wedding
│   │   │   ├── layout.tsx · page.tsx
│   │   │   ├── calendar.ics/route.ts
│   │   │   └── opengraph-image.tsx
│   │   ├── api/rsvp/route.ts · api/events/route.ts
│   │   └── sitemap.ts · robots.ts
│   ├── lib/
│   │   ├── invite/                 # the shared engine (Phase 2)
│   │   │   ├── machine.ts · capability.ts · capture.ts · types.ts
│   │   │   ├── shell/              # InviteShell, Loader, Gate, SkipButton, MuteButton, Handoff, DemoRibbon
│   │   │   ├── quality/            # tiers, PerformanceMonitor wiring, DPR caps
│   │   │   ├── stage/              # Stage (Canvas), CinematicCamera, Grade (post + LUT), LightformerEnv, Gobo
│   │   │   ├── kit/                # shared art: Envelope, WaxSeal, Petals, Water, Cloth, Sparkles, GoldMaterial
│   │   │   ├── text3d/             # ArabicText (troika), CanvasText fallback, font registry
│   │   │   ├── interaction/        # useTilt, GyroButton, haptics, gestures, scratch/ (DOM + 3D)
│   │   │   ├── audio/              # AudioEngine, foley synth, music loop + crossfade, procedural IR
│   │   │   ├── content/            # Hero, Countdown, Programme, Venue, DressCode, Rsvp, Closing, Footer
│   │   │   └── fallback/           # Fallback2D contract + shared SVG/CSS pieces
│   │   ├── date/                   # format.ts (ar/en), numerals.ts, tz.ts
│   │   ├── i18n/                   # ar.ts / en.ts strings for the invitation UI
│   │   ├── validation/             # zod: wedding, guest, rsvp, events, csv
│   │   ├── db.ts · env.ts · session.ts · ratelimit.ts · tokens.ts
│   │   └── csv.ts · ics.ts · gcal.ts · qr.ts · share.ts · geo.ts · palette.ts
│   ├── templates/
│   │   ├── index.ts                # registry: metadata only, scenes are dynamic imports
│   │   └── <id>/                   # sacred-garden · blossom-oud · dolce-vita · royal-gold · eternal-romance · destination-love
│   │       ├── meta.ts · palette.ts · intro.ts
│   │       ├── Scene.tsx · Ambient.tsx · Fallback2D.tsx · lab.ts
│   │       └── parts/ · shaders/
│   ├── marketing/                  # Phase 4 sections, hero carousel, 3D phone
│   └── components/                 # shared DOM UI: Button, Field, Segmented, Stepper, Toast, Dialog
├── tests/unit/ · tests/integration/   # Vitest (integration runs against local Postgres)
├── e2e/                            # Playwright
├── screenshots/<phase>/            # committed every phase
└── reference/                      # x-emerald3d.html, webgency/ (licensed files only); never shipped
```

---

## 6. Data model

Prisma 7 style: the connection URL lives in `prisma.config.ts`, and the client uses `@prisma/adapter-pg`. Every field from the brief is kept. Fields marked **(+)** are my additions and need your approval.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Lang          { ar en }
enum WeddingStatus { draft live }
enum GuestSource   { invited open }                  // (+) open = RSVP'd through the generic link
enum EventType     { opened intro_completed rsvp calendar map }

model Wedding {
  id               String        @id @default(cuid())
  slug             String        @unique              // [a-z0-9-], e.g. demo-royal-gold
  template         String                             // registry id, validated by Zod
  lang             Lang          @default(ar)
  groomName        String
  brideName        String
  monogram         String                             // default: initials, editable
  dateTimeUtc      DateTime      @db.Timestamptz(3)
  verse            String?
  intro            String        @default("")
  venueName        String
  venueArea        String
  mapsUrl          String        @default("")
  dressCode        Json          @default("{}")       // { label, swatches: hex[], ladies?, gentlemen? }
  notes            String        @default("")
  rsvpDeadline     DateTime      @db.Timestamptz(3)   // admin default: 7 days before the wedding
  schedule         Json          @default("[]")       // [{ time: "19:30", title, subtitle? }]
  musicTrack       String                             // key in /public/music/manifest.json or a placeholder id
  paletteOverrides Json          @default("{}")       // partial PaletteTokens, contrast-checked on save
  originCity       String?
  destinationCity  String?                            // destination-love; defaults to Baghdad
  status           WeddingStatus @default(draft)
  coupleSecret     String        @unique              // nanoid(24)
  isDemo           Boolean       @default(false)      // (+) demo ribbon + rolling demo date
  openRsvpMaxSeats Int           @default(2)          // (+) seat cap for the generic link; 0 = off
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  guests Guest[]
  events Event[]
}

model Guest {
  id          String      @id @default(cuid())
  weddingId   String
  displayName String                                  // e.g. "عائلة أبو حسين"
  token       String      @unique                     // nanoid(10), no look-alike characters
  maxSeats    Int         @default(2)
  group       String?
  source      GuestSource @default(invited)           // (+)
  createdAt   DateTime    @default(now())

  wedding Wedding @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  rsvp    Rsvp?
  events  Event[]

  @@index([weddingId])
}

model Rsvp {
  id        String   @id @default(cuid())
  guestId   String   @unique
  attending Boolean
  seats     Int                                       // 0 when not attending; 1..maxSeats otherwise
  message   String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guest Guest @relation(fields: [guestId], references: [id], onDelete: Cascade)
}

model Event {
  id        BigInt    @id @default(autoincrement())
  weddingId String
  guestId   String?
  type      EventType
  userAgent String    @default("")
  createdAt DateTime  @default(now())

  wedding Wedding @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  guest   Guest?  @relation(fields: [guestId], references: [id], onDelete: SetNull)

  @@index([weddingId, type, createdAt])
  @@index([guestId])
}
```

**RSVP from the generic link.** The guest types a name. The server creates a `Guest` (with `source = open` and `maxSeats = openRsvpMaxSeats`), stores the RSVP, and returns the new token. The browser keeps that token, so the guest can edit their answer later and the dashboard shows them like any other guest.

**Dashboard totals**, all computed in SQL:

| Total | How it's counted |
|---|---|
| Invited households | Guests with `source = invited`. |
| Confirmed seats | Sum of `seats` over RSVPs where `attending` is true. |
| Declined | RSVPs where `attending` is false. |
| No reply | Invited guests without an RSVP. |
| Opened but not answered | Guests with at least one `opened` event and no RSVP. |

**Demo weddings.** The slugs are `demo-<template>` and the names are clearly examples (e.g. آدم وليلى, كريم ونور). Venues read «قاعة الاحتفالات (مثال)», and a ribbon «دعوة تجريبية، الأسماء والتواريخ أمثلة» runs across the page. The demo date rolls forward on every render (the next Thursday at 20:00 Baghdad time, at least 45 days away), so the countdown never runs out. Each demo has about 12 example guests with a few RSVPs, so its dashboard has something to show. Those numbers are labelled as demo data and never appear in marketing.

---

## 7. Content and formatting rules

These are enforced in code and covered by tests.

### Numerals
- Arabic UI uses Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩) everywhere: dates, times, seats, countdown, prices («٤٩ ألف دينار»).
- English weddings use Western digits.
- Inputs and CSV accept Eastern Arabic, Persian and Western digits, and normalise them.

### Date line
- Pattern: `{weekday} {day} / {month} ({monthName}) {year}`.
- Example: `الخميس ١٠ / ١٢ (ديسمبر) ٢٠٢٦`.
- Time: `٨:٠٠ مساءً` (صباحاً or مساءً).

### Month and weekday names
- Months come from our own fixed table: يناير، فبراير، مارس، أبريل، مايو، يونيو، يوليو، أغسطس، سبتمبر، أكتوبر، نوفمبر، ديسمبر.
- Weekdays: الأحد … السبت.
- Never use Intl's Arabic month names. I verified on Node 22 that `ar-IQ` returns «كانون الأول», which is exactly the Syriac name the brief forbids.

### Time zone
- Store UTC.
- To display, `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Baghdad' }).formatToParts()` supplies only the numbers, and our own composer builds the string.
- Test case: `2026‑12‑10T22:30Z` is Friday 11 / 12 at 01:30 in Baghdad.

### Copy
- No statistics, ratings, reviews, client counts, or claims like «الأول بالعراق».
- Demo content is always labelled as an example.
- The only contact is Instagram [@7adre.n](https://www.instagram.com/7adre.n/). No phone or WhatsApp number appears anywhere.
- Price: «٤٩ ألف دينار», one plan.

### Contrast
- Every palette includes a text-safe `goldInk` next to the decorative `gold`.
- A unit test checks every text/background pair in every palette: AA ≥ 4.5:1 for body text, ≥ 3:1 for display text of 24 px or more.
- `paletteOverrides` go through the same check when saved.

### Share message
`أهلاً {name}، يسعدنا دعوتكم لحفل زفاف {groom} و{bride}. افتحوا الدعوة: {link}`

---

## 8. Shared invitation engine (Phase 2)

### 8.1 InviteShell

**Loader**
- Shows the Hadreen mark in Aref Ruqaa with a ring that reports real progress, weighted across five milestones:

  | Milestone | Weight |
  |---|---|
  | 3D chunk loaded | 25% |
  | Fonts ready (`document.fonts` + troika preload) | 15% |
  | Textures and models (`useProgress`) | 40% |
  | Shaders compiled (`gl.compileAsync`) | 10% |
  | Foley rendered | 10% |

- The ring never moves ahead of what has actually loaded.

**Gate**
- The template's idle scene, with a DOM layer on top:
  - a greeting: «أهلاً {displayName}», or «أهلاً وسهلاً» without a token;
  - the action label;
  - Enter as the keyboard trigger;
  - a "skip to content" link for screen readers.

**Opening**
- The template's GSAP timeline, built from `intro.ts`.
- Each beat fires its sound and haptic cue.

**Skip**
- A visible «تخطّي الحركة» button in the thumb zone during the opening. Esc also skips.

**Mute**
- A persistent button. The choice is remembered in `localStorage`, guarded by try/catch.

**Hand-off**
- The camera eases into the ambient shot.
- The canvas becomes a fixed backdrop and the content fades in.
- Focus moves to the content heading.

**Demo ribbon**
- Shown on demo weddings (`isDemo`).

### 8.2 Capability check and quality tiers

**Choosing the path** (`capability.ts`), checked in this order:
1. WebGL2, else WebGL1, else none (go 2D).
2. `prefers-reduced-motion` means 2D, with an opt-in button (decision #8).
3. `?force2d=1` and `?tier=` overrides, for QA.
4. detect-gpu, using the self-hosted benchmarks: tier 0 means 2D, 1 low, 2 medium, 3 high.
5. Save-Data or a 2G connection forces low.

**Adjusting at runtime** with drei's `PerformanceMonitor`:
- When frame rate declines, step down in this order: DPR, then post-processing, then particles, then reflections.
- When it recovers, step back up, with hysteresis.
- After 3 flip-flops, lock at the lower tier.

**Avoiding jank.** All shaders are compiled with `gl.compileAsync` while the loader is showing, so the opening never stutters on its first frame.

The tier values are in §12.

### 8.3 Stage conventions (the "film look")

**Canvas**
- One `<Canvas>` per page, with AA controlled by the tier.
- sRGB output and **AgX tone mapping**.

**Colour grading**
- Each template gets a 3D LUT **generated in code** from lift/gamma/gain, saturation and split-tone settings, applied with `LUT3DEffect`. No LUT files to download.

**Light**
- Image-based light comes from drei `<Environment frames={1}>` built out of `<Lightformer>`s, so no HDR downloads.
- Plus one key light.
- Gobo patterns use `SpotLight.map` with procedural canvas cookies (foliage, mashrabiya, lantern piercings, window bars) on high and medium; on low they're baked into textures.

**Camera**
- `CinematicCamera` stores shots as data: position, target, FOV and focus distance. GSAP drives the transitions.
- Framing is **aspect-aware**: each shot defines a subject box that must fit at both 390×844 and 1440×900, so phones are framed deliberately, not cropped from desktop.
- Damped pointer and gyro offsets are layered on top.

**Post-processing**
- Bloom (mipmap blur), SMAA or MSAA, vignette, a touch of film grain, LUT.
- Depth of field only during openings, and only on high.

**Text in 3D**
- troika `<Text>` with subset fonts, using a metallic gold material lit by the environment.
- Every 3D string also exists in the DOM (`sr-only` when it would show twice).

**Shared art kit** (`kit/`), reused across templates to keep six scenes within reach:
- paper envelope with a curl shader and procedural emboss normals;
- wax seal with a monogram height map and a Voronoi crack;
- instanced petals with GPU fall and flutter;
- still water: planar reflection, ripples and glints;
- cloth folds and velvet sheen;
- sparkles and dust;
- gold materials.

**Determinism and capture**
- Randomness is seeded per template (mulberry32), so screenshots and videos are reproducible.
- `?capture=gate|mid|content|frames` switches to a manual clock and exposes `window.__hadreen.ready`. The screenshot, budget and video scripts wait on that flag.

### 8.4 Interaction kit

- **Tilt:** `useTilt` uses springs (stiffness ≈120, damping ≈14) to map pointer or touch to camera offsets of ±2–4°.
- **Gyro:**
  - On iOS, it sits behind an explicit «حرّكوا تلفونكم» button that calls `DeviceOrientationEvent.requestPermission()`.
  - On Android, it's enabled automatically at a gentle amplitude.
  - Nothing ever depends on the gyro.
- **Haptics:** `navigator.vibrate`, with a tap of 10 ms and a success pattern of `[12, 40, 18]`. On iOS, where the API doesn't exist, it does nothing.
- **Gestures:**
  - tap;
  - hold (with a progress ring, at least 600 ms);
  - swipe (velocity threshold);
  - scratch.
  - Each has a keyboard equivalent.
- **Scratch surface:**
  - On the DOM: a canvas overlay erased with `destination-out`, estimating the cleared percentage.
  - In 3D: brush splats painted into a render-target mask at the UVs hit by the raycast; the material blends foil and content through that mask.
  - Either way, a tile auto-completes at ≥ 55% scratched, and Enter reveals the tiles in order.

### 8.5 Audio kit

**Mixing graph**
- Three buses (music, sfx, ambience) feed a master with a compressor.
- The sfx and ambience buses also send to a `ConvolverNode` reverb.
- The impulse response is generated procedurally (2.2 s stereo decaying noise with a 20 ms pre-delay), so there's no file to download.

**Foley**
- Paper, wax crack, water, chimes, whoosh, cloth and plane are **synthesized** once with `OfflineAudioContext` while the loader runs:
  - shaped noise bursts for paper and cloth;
  - an impulse through resonant filters for the wax crack;
  - inharmonic FM for chimes;
  - filtered noise with a Doppler sweep for the plane.
- Zero downloads and zero licensing risk.

**Music**
- Each template has a placeholder synth preset in its mood (§9). For example, Karplus-Strong plucks give an oud-like line.
- Licensed tracks stream through an `<audio>` element feeding a `MediaElementAudioSourceNode`, so they never count against the before-intro budget.
- Equal-power crossfades handle intro sting → loop and gate → ambient.

**Unlock**
- The AudioContext starts suspended and is resumed on the first gesture, which is the tap on the gate.
- On iOS, WebAudio respects the silent switch, and we leave it that way: it's polite, and the mute button still reflects the state.

### 8.6 Content page

Default order. The copy below is a draft and gets finalised in Phase 2.

1. **Hero hand-off**
   - Names in Aref Ruqaa and the optional verse in Amiri.
   - The date line, then the household greeting.
2. **Countdown**
   - A flip clock with a CSS 3D flip per digit, in Eastern Arabic digits.
   - Labels: «يوم · ساعة · دقيقة · ثانية».
   - It isn't announced every second to screen readers.
3. **Intro text**
4. **Programme**
   - A timeline whose gold line draws with scroll (SVG `stroke-dashoffset` driven by ScrollTrigger).
   - Each item gets an icon matched by keyword or picked in the admin.
5. **Venue card**
   - 3D tilt and glare.
   - «افتحوا الموقع» opens `mapsUrl`.
   - «أضيفوا للتقويم» offers ICS and Google Calendar.
6. **Dress code**
   - Colour swatches with notes «للسيدات» and «للرجال».
7. **Notes**
8. **RSVP card**
   - A spring segmented control with two options: **«حاضرين»** (the brand name doubling as "we'll be there") and «نعتذر».
   - A seats stepper limited to 1…maxSeats.
   - «كلمة للعروسين (اختياري)».
   - Submit button «أرسلوا الرد».
   - Success: a wax-stamp animation, a 3D particle burst and a haptic tick.
   - A note «تقدرون تعدّلون ردّكم لغاية {date}».
9. **Closing line**, written per template (e.g. «بحضوركم تكتمل فرحتنا»).
10. **Footer**: «دعوة من حاضرين، للطلب راسلونا على انستكرام @7adre.n», linking to Instagram.

The ambient backdrop reacts to scroll progress and pointer position as described for each template in §9.

### 8.7 2D fallbacks

Every template ships a `Fallback2D` that uses **the same content components**; only the stage changes:
- a CSS/SVG gate;
- an opening of 3 s or less (a static cross-fade under reduced motion);
- a CSS/SVG backdrop in the template's palette.

The scratch surface works there too, because it's a DOM component.

### 8.8 Accessibility

- Visible focus states everywhere, with real labels on all controls.
- AA contrast (tested, see §7).
- The canvas is `aria-hidden`, and its content is mirrored in the DOM.
- Keyboard path:
  - Enter opens the gate.
  - Enter reveals scratch tiles.
  - Esc skips the opening.
  - Tab order runs through the content.
- `aria-live="polite"` for the RSVP result.
- Target: Lighthouse accessibility ≥ 95 on `/i/demo-*`.

### 8.9 Engine test stage

A neutral emerald-and-gold scene (an envelope, a seal and a soft backdrop) that exercises everything in Phase 2: loader, gate, opening, skip, mute, hand-off, fallback, tiers, scratch, audio and capture mode.

It validates the engine before any template exists, and later becomes the default `/lab` page.

---

## 9. The six templates (Phase 3)

### What every template ships

- `meta.ts`, `palette.ts`, `intro.ts`, `Scene.tsx`, `Ambient.tsx`, `Fallback2D.tsx`, `lab.ts`
- A seeded demo wedding.
- Screenshots of the gate, mid-opening and content at both sizes.
- A row in the budget table.

### Shared numbers

**Size budget per template.** The hard cap is 2.5 MB compressed transferred before the intro can start. The target is ≤ 1.6 MB. Estimate, to be measured in Phase 2:

| Item | Estimate |
|---|---|
| Next.js runtime + page shell + DOM fonts (woff2, Arabic subsets) | ~180 KB |
| Shared 3D runtime (three, R3F, drei, postprocessing, troika + worker, GSAP) | ~520 KB |
| WebGL fonts: Aref Ruqaa + Amiri subset WOFF | ~250 KB |
| detect-gpu benchmark file (one GPU family) | ~20–60 KB |
| Template scene chunk (code + shaders) | 60–150 KB |
| Template data | 0–40 KB |
| Foley (synthesized) | 0 |
| Music (streamed after start) | 0 |
| **Total before the intro** | **~1.1–1.3 MB** |

**Particle counts** are written high / medium / low. Medium is roughly half of high and low roughly a quarter (§12).

**Gate labels** below are drafts.

---

### 9.1 الحديقة المقدّسة: `sacred-garden`

**Inspired by:** The Sacred Garden.
**Our take:** a nikkah at golden hour in an Iraqi garden. A stone arch wrapped in roses over a still pond, two swans, and the basmala.

**Palette**

| Token | Hex |
|---|---|
| paper | `#F2DED6` |
| seal | `#6B1626` |
| stone | `#DCCDB9` |
| rose | `#D98A97` |
| leaf | `#5E7A55` |
| pond | `#2E4B47` |
| sun | `#FFC98A` |
| sky (gradient) | `#F6D2A2` → `#E8A79E` |
| gold | `#C9A96E` |
| goldInk | `#7A5C26` |
| ink | `#3A2723` |
| bg | `#FBF5EF` |

**Music mood:** serene and devotional-romantic. Harp or qanun with soft strings, around 66 bpm, in Nahawand colours.
**Placeholder:** harp-like plucked arpeggios over a warm pad.

**Gate**
- The whole screen is a blush envelope with an embossed floral border (procedural normal map).
- A wine-red wax seal carries the couple's monogram.
- Idle: a glint sweeps the seal every ~3 s, the envelope breathes with tilt, and dust motes float in warm light.
- Label: «اضغطوا على الختم لفتح الدعوة».

**Key shots**

| Shot | Lens | Framing |
|---|---|---|
| S1 · Seal | 50 mm | Macro, 0.6 m away, 10° top-down, shallow focus on high. |
| S2 · Arch at golden hour | 28 mm | Low over the water (0.4 m), sun back-right rimming the roses, the reflection filling the lower third. |
| S3 · Heart (hero / ambient frame) | 40 mm | Swans' heart centred under the arch, basmala and names above. |

**Intro timeline (8.0 s)**

| Time (s) | Beat | Sound |
|---|---|---|
| 0.00 | Tap: the seal cracks into 4 shards (Voronoi mask). | Wax crack, low thump |
| 0.45 | The shards fall and fade. | |
| 0.60–1.70 | The flap lifts on its hinge with a paper-curl shader. | Paper |
| 1.70–2.80 | The envelope drops out of frame; the camera pulls back and tilts up, S1 → S2. | Soft whoosh |
| 2.80–4.80 | S2: slow dolly-in, petals drifting on the pond, sun glints. | Water lap |
| 4.80–6.80 | Two swans glide in from either side, ripple trails behind them; their necks meet in a heart at 6.8 s. | Water |
| 6.80–7.40 | «بسم الله الرحمن الرحيم» fades up in gold (Amiri). | Chimes |
| 7.40–8.00 | The names shimmer in (Aref Ruqaa); settle on S3; hand-off. | Music swells |

**Ambient and scroll**
- The pond ripples, the swans bob gently and petals float.
- The sun glints and leaves sway.
- Scrolling cranes the camera up the arch into the sky. The pointer adds ±3° of parallax.

**Low tier**
- No planar reflection: an environment map plus a painted gradient instead.
- Petals 240 / 120 / 60.
- No bloom; the gold glow is faked in the material.
- Swans at 1.5k triangles instead of 6k.
- A single contact shadow rendered once.

**2D fallback**
- An SVG envelope whose CSS seal splits into two halves while the flap turns on `rotateX`.
- Then an SVG arch, a gradient pond and two swan silhouettes forming the heart.
- CSS petals, switched off under reduced motion.

**Assets and budget**
- 100% procedural: no textures or models to download.
- Target 1.2 MB before the intro.

---

### 9.2 ورد وعود: `blossom-oud`

**Inspired by:** Blossom & Oud.
**Our take:** a blush and rose-satin interior with a crystal chandelier, opening onto an Andalusian-Iraqi palace avenue through pink mist. Oud-led.

**Palette**

| Token | Hex |
|---|---|
| satin | `#E7B9BC` |
| satinDeep | `#B86A7A` |
| tieback | `#C9A96E` |
| crystal | `#FFF4EE` |
| mist | `#F4C6CD` |
| palm | `#46624F` |
| palace | `#EBDCCB` |
| dusk (gradient) | `#3A2638` → `#E6A9A6` |
| oudWood | `#5A3A2E` |
| goldInk | `#7A5C26` |
| ink | `#3B2230` |
| bg | `#FAF1EF` |

**Music mood:** oud-led, warm and intimate. Hijaz or Bayati, around 80 bpm, with a soft daf.
**Placeholder:** Karplus-Strong "oud" plucks with slight bends, plus frame-drum hits made from noise.

**Gate**
- A blush envelope with a rounded flap edged in rose-gold foil, a pressed rose sprig and an oud-brown seal.
- Idle: a shimmer travels along the foil edge.
- Label: «اضغطوا لفتح الظرف».

**Key shots**

| Shot | Lens | Framing |
|---|---|---|
| S1 · Curtains | 35 mm | Frontal medium on the rose-satin curtains with gold tiebacks; the chandelier glints through the gap. |
| S2 · Chandelier | 24 mm | Low angle looking up, with a slow 15° orbit; crystal glints and caustic sparkles. |
| S3 · Avenue | 35 mm | Eye level down the palm avenue through pink mist to the palace gate, which is where scrolling ends. |

**Intro timeline (8.5 s)**

| Time (s) | Beat | Sound |
|---|---|---|
| 0.00–1.10 | The flap lifts; the envelope slides down and out. | Paper |
| 1.10–1.60 | A bloom of light into S1; the curtains are closed and breathing. | Cloth rustle |
| 1.60–3.60 | The curtains part, their folds gathering to the tiebacks, revealing the chandelier. | Cloth, crystal chimes |
| 3.60–5.40 | S2: the chandelier sways and glints; the camera tilts down past it. | Crystal tinkles |
| 5.40–7.60 | Through the archway to S3, the palm avenue in mist; dolly forward. | Soft whoosh |
| 7.60–8.50 | The names appear in gold above the palace gate; hand-off. | Oud swell |

**Ambient and scroll**
- The chandelier swings as a slow pendulum and the mist drifts on noise planes.
- The palms move in the wind and the lanterns along the avenue flicker.
- **Scrolling dollies the camera down the avenue** along a Catmull-Rom path. Each section reveals on the approach, and the RSVP arrives at the palace gate.

**Low tier**
- Crystals 300 / 140 / 48. No transmission on medium or low: an environment map fakes the refraction, and real transmission is high only.
- Palms 36 / 20 / 10.
- Mist planes 6 / 4 / 2.
- Sparkle sprites instead of bloom.
- No shadows.

**2D fallback**
- CSS curtains (gradient folds) that draw back to the tiebacks.
- An SVG chandelier with CSS twinkles.
- A layered SVG avenue (palms and palace silhouette) with parallax on scroll.

**Assets and budget**
- Procedural: lathe and instanced crystals, extruded arches, palms built from tubes plus alpha fronds drawn on a canvas.
- Target 1.4 MB.

---

### 9.3 دولتشي فيتا: `dolce-vita`

**Inspired by:** Dolce Vita.
**Our take:** a bright Mediterranean-lake daydream. Scratch-to-reveal date tiles, a letter that rises with scroll, and the programme on pastel clouds.

**Palette**

| Token | Hex |
|---|---|
| powder | `#A9C7E4` |
| powderDeep | `#6F97C2` |
| sky (gradient) | `#BFDDF5` → `#EAF4FB` |
| lake | `#4F86B0` |
| mountain | `#8098AE` |
| villa | `#EAD2B0` |
| terracotta | `#C8714F` |
| rose | `#E8A3B4` |
| stone | `#EFE7DC` |
| foil | `#B9CFE6` (metallic) |
| ink | `#1F3657` |
| bg | `#F6FAFD` |

**Music mood:** sunny light acoustic, mandolin or guitar with strings, around 96 bpm, major key.
**Placeholder:** bright plucked arpeggios with a soft shaker.

**Gate (scratch)**
- A card on the stone balustrade holds three powder-blue foil tiles: **day | month number + name | year**.
- They're scratched in 3D through a render-target mask. Each tile auto-completes at 55% with a shimmer and a chime.
- Enter reveals them in order.
- Label: «امسحوا البطاقات حتى يبين الموعد».
- The opening starts after the third tile.

**Key shots**

| Shot | Lens | Framing |
|---|---|---|
| S1 · Scratch card | 45 mm | Close, 35° top-down, framed by roses. |
| S2 · The lake | 24 mm | Crane up from the balcony to reveal the lake, mountains, villas and a sailboat under a bright sky. |
| S3 · Envelope | 40 mm | The powder-blue envelope on the balcony table with the lake behind. This is the ambient frame. |

**Intro timeline (7.5 s)**

| Time (s) | Beat | Sound |
|---|---|---|
| 0.00–0.60 | A sparkle burst on the revealed date; foil dust falls. | Chimes |
| 0.60–3.20 | S1 → S2: crane up and back over the roses; the lake appears; clouds drift. | Whoosh, breeze |
| 3.20–5.20 | The sailboat glides across; glitter on the water. | Water |
| 5.20–6.80 | S2 → S3: the camera arcs to the table and the envelope. | Paper |
| 6.80–7.50 | The names float above the envelope in navy and gold; hand-off. | Music |

**Ambient and scroll**
- The clouds drift and the boat bobs as it crosses slowly.
- **The letter rises out of the envelope as the guest scrolls.**
- The programme section places each item on a pastel 3D cloud, mirrored as DOM cards.

**Low tier**
- Water is a scrolling normal map with environment reflection; no planar reflection.
- Cloud sprites 24 / 12 / 6.
- Roses as two-layer billboards.
- Mountains as three silhouette layers with fog.

**2D fallback**
- A layered SVG landscape: sky, mountains, lake, villa and boat.
- **DOM scratch tiles**, using the same kit.
- The letter rises with CSS scroll-driven animation, with a JS fallback.

**Assets and budget**
- Procedural: noise-texture clouds, a layered rose generator, lake shader, mountains from noise heightfields.
- Target 1.3 MB.

---

### 9.4 الذهب الملكي: `royal-gold`

**Inspired by:** Royal Gold.
**Our take:** ivory and gold majesty. A four-flap envelope bursts into golden light, revealing a pointed Islamic arch with brass lanterns, white blossoms and a pale-gold mosque, with the couple walking toward it.

**Palette**

| Token | Hex |
|---|---|
| ivory | `#F8F3E8` (brand) |
| ivoryWarm | `#EFE3CC` |
| gold | `#C9A96E` (brand) |
| goldDeep | `#9F7B3C` |
| goldPale | `#E8D6A6` |
| brass | `#B38B4D` |
| blossom | `#FFFDF7` |
| sky (gradient) | `#F3E3BC` → `#FBF4E2` |
| emerald | `#0B3D2E` (brand accent, used in the star-pattern tiles) |
| goldInk | `#7A5C26` |
| ink | `#3D3020` |
| bg | `#FBF8F1` |

**Music mood:** majestic and warm. Strings and qanun around 70 bpm, building to a crescendo at the light burst.
**Placeholder:** sustained pads, bright qanun-like plucks and a soft timpani swell.

**Gate**
- An ivory four-flap envelope (pochette) with embossed florals and an ivory seal edged in gold leaf.
- Idle: light sweeps along the gold edge.
- Label: «اضغطوا على الختم».

**Key shots**

| Shot | Lens | Framing |
|---|---|---|
| S1 · Pochette | 50 mm | Top-down frontal; the envelope fills the frame. |
| S2 · Arch and lanterns | 28 mm | Out of the light into a medium-wide on the pointed arch. Brass lanterns swing and cast star-shaped gobo shadows on the walls; blossoms in the foreground. |
| S3 · Walk to the mosque | 85 mm | A long lens through the arch compresses the pale-gold mosque in haze. The couple, seen from behind, walks toward it. Names above the arch. |

**Intro timeline (8.0 s)**

| Time (s) | Beat | Sound |
|---|---|---|
| 0.00–0.40 | The seal bursts into shards and gold dust. | Wax crack, shimmer |
| 0.40–1.60 | The four flaps unfold, 0.15 s apart. | Paper × 4 |
| 1.60–2.60 | Golden light floods out: volumetric beams, a bloom spike, exposure ramping to white-gold. | Swell |
| 2.60–4.80 | Through the light into S2; the lanterns start to swing and blossoms drift. | Lantern-chain chimes |
| 4.80–7.20 | S3: push through the arch; the couple walks; dust motes hang in the beams. | Music rises |
| 7.20–8.00 | The names settle in gold; hand-off. | |

**Content special:** programme icons (rings, dinner, cake, زفة) are **gold line-art drawn as glowing 3D wire** (Line2 with a dashed draw-on driven by scroll).

**Ambient and scroll**
- The lanterns swing as damped pendulums, and their gobo shadows move with them.
- Blossoms fall and dust motes drift in the light beams.
- The couple waits at the gate.
- Scrolling pushes slowly toward the mosque.

**Low tier**
- Beams become 3 additive gradient cards.
- The lantern gobo is baked into the wall texture (no moving shadows).
- One dynamic light.
- Blossoms 200 / 100 / 50.
- The couple is a silhouette pair.
- No bloom; the emissive glow is tuned in the material instead.

**2D fallback**
- An SVG pochette whose four triangles unfold in CSS 3D.
- A radial CSS burst of gold light.
- An SVG arch with CSS-swinging lanterns and a mosque silhouette.
- The line-art icons draw with `stroke-dashoffset`.

**Assets and budget**
- Procedural:
  - a pointed-arch profile extruded into the arch;
  - girih star patterns from a shader;
  - lathe lanterns with pierced emissive patterns;
  - silhouettes for the dome and minarets;
  - stylised couple figures (decision #12).
- Target 1.4 MB.

---

### 9.5 الرومانسية الأبدية: `eternal-romance`

**Inspired by:** Eternal Romance.
**Our take:** theatre and candlelight. A velvet curtain, falling red petals, a candlelit ivory table, a gold-framed name card, and the venue as a living line drawing.

**Palette**

| Token | Hex |
|---|---|
| velvet | `#6A1A2B` |
| velvetDeep | `#3A0D17` |
| velvetHi | `#9C2D40` |
| rose | `#A4142C` |
| ivory | `#F8F3E8` |
| linen | `#F2EADF` |
| candle | `#FFB867` |
| gold | `#C9A96E` |
| inkOnDark | `#F8F3E8` |
| inkOnLight | `#3A0D17` |

Content sections alternate burgundy `#6A1A2B` and ivory `#F8F3E8`, joined by **soft wave edges**.

**Music mood:** romantic, piano and cello in a slow 3/4 waltz, around 84 bpm.
**Placeholder:** an FM-piano waltz over a bowed pad.

**Gate (hold)**
- A burgundy velvet stage curtain fills the screen: deep folds, velvet sheen, a gold fringe and a soft spotlight.
- Label: «اضغطوا مطوّلاً لرفع الستارة». Tap and Enter also work.

**Key shots**

| Shot | Lens | Framing |
|---|---|---|
| S1 · Curtain | 35 mm | Frontal, with the curtain filling the frame and a spotlight from above. |
| S2 · Table | 50 mm | 45° high angle on the ivory table: red roses, flickering candles and the gold-framed name card, with shallow focus. |
| S3 · Venue sketch | 35 mm | Wide: the venue façade drawn in gold lines on burgundy darkness, drawing itself. |

**Intro timeline (8.5 s)**

| Time (s) | Beat | Sound |
|---|---|---|
| 0.00–2.20 | The curtain lifts, gathering into swags (shader); petals begin to fall. | Cloth |
| 2.20–2.60 | The spotlight swings to the table. | |
| 2.60–5.20 | S2: candles flicker; dolly to the gold frame with the names. | Faint candle crackle |
| 5.20–7.60 | S3: pull back; the venue line drawing draws itself. | Shimmer |
| 7.60–8.50 | The names and date settle; hand-off to the burgundy and ivory sections. | Music |

**Ambient and scroll**
- Petals keep falling slowly and the candles flicker.
- Bokeh dust drifts and the curtain hem moves.
- Scrolling drifts through the table scene with depth of field (high tier).

**Low tier**
- Petals 400 / 200 / 80.
- Flames as sprites with a single light.
- A matcap velvet instead of the sheen shader.
- No depth of field.

**2D fallback**
- A CSS velvet curtain (gradients) that rises.
- SVG roses and candles with a CSS flicker.
- CSS petals, switched off under reduced motion.
- The venue line drawing in SVG with `stroke-dashoffset`.

**Assets and budget**
- Procedural: velvet fold displacement, rose and candle generators, line paths for the venue built from a simple parametric façade.
- Target 1.3 MB.

---

### 9.6 حب بلا حدود: `destination-love`

**Inspired by:** Destination Love.
**Our take:** an ivory-and-gold globe. A plane draws a gold arc from `originCity` to the wedding city (default Baghdad), and the invitation is a boarding pass whose stub tears off on «حاضرين».

**Palette**

| Token | Hex |
|---|---|
| night (gradient) | `#0F2D29` → `#184239` (emerald night) |
| globe | `#F3EBDC` |
| landGold | `#C9A96E` |
| trail | `#E8CC8C` |
| atmosphere | `#FFF1D0` |
| pass | `#FBF7EF` |
| passInk | `#1E2B29` |
| passAccent | `#0B3D2E` |
| inkOnDark | `#F8F3E8` |
| bg | `#F6F1E7` |

**Music mood:** uplifting and airy. Piano and strings with light percussion, around 100 bpm.
**Placeholder:** an arpeggiated synth over a soft pulse.

**Gate**
- The globe turns slowly, with the origin city's pin pulsing and the corner of a boarding pass peeking out.
- Label: «اضغطوا للإقلاع».

**Key shots**

| Shot | Lens | Framing |
|---|---|---|
| S1 · Globe | 35 mm | Medium orbit, with the origin city facing the camera. |
| S2 · Chase | 28 mm | Behind and above the plane, the globe curving beneath, the gold trail growing. |
| S3 · Landing | 50 mm | A top-down descent onto Baghdad (or `destinationCity`). City glow blooms, and the venue pin opens into the boarding pass. |

**Intro timeline (9.0 s)**

| Time (s) | Beat | Sound |
|---|---|---|
| 0.00–1.00 | The plane takes off from the origin pin. | Soft engine whoosh |
| 1.00–6.00 | The great-circle arc, with the trail growing; chase camera; the globe rotates; wisps of cloud pass. | Plane drone with Doppler |
| 6.00–7.60 | Descent to the wedding city; city lights bloom; landing on the venue pin. | Downward whoosh |
| 7.60–9.00 | The boarding pass rises to face the camera; hand-off. | Paper |

**The boarding pass**
- Passenger: the guest's name.
- Flight: the couple.
- Date and time.
- Gate: the venue.

**Ambient and RSVP**
- The globe idles, the trail shimmers and scrolling orbits the camera.
- The boarding pass is the hero card of the content page.
- **«حاضرين» tears the stub off along the perforation**: the mesh splits and the stub tumbles away, with a paper-tear sound and a haptic tick. In 2D, a CSS tear plays instead.

**Cities**
- `originCity` and `destinationCity` are resolved through a bundled gazetteer of about 150 entries: Iraqi cities plus common diaspora cities.
- The admin can also enter `lat,lon`.
- With no origin set, the arc starts just over the horizon.

**Low tier**
- Land dots 12k / 6k / 3k.
- A sprite halo instead of the atmosphere shader.
- The trail is a plain line without glow.
- No clouds.

**2D fallback**
- An SVG orthographic globe from the precomputed dots.
- The plane follows a dashed arc with CSS `offset-path`.
- A DOM boarding pass with a CSS tear.

**Assets and budget**
- Land dots come from `world-atlas` (Natural Earth, public domain) and are precomputed as about 25 KB of Int16.
- The rest is procedural.
- Target 1.3 MB.

---

## 10. Marketing website (Phase 4)

The copy is original Iraqi-friendly Arabic: warm and short, with no hype and no numbers we can't prove.

The section flow follows a premium studio site:

### Hero
- A full-bleed WebGL scene: the six invitations as floating cards in an emerald-and-gold space.
- Each card is a **live low-tier mini render** of its template, through drei `<RenderTexture>`:
  - rendered at 256×512;
  - updated round-robin at 10–15 fps;
  - frozen when off-screen.
- On low tier, the cards use the preview posters as static textures instead.
- Dragging or scrolling rotates the carousel (direction respects RTL). Tapping a card brings it forward with a short music sting.
- CTAs: «شوفوا الدعوة», which opens the live demo, and «اطلبوا على انستكرام».

### Occasions ticker
«أعراس · عقد قران · خطوبة · حنّة · ملكة · احفظوا الموعد»

### 3D phone
- A phone model that tilts with the pointer, its screen running the real demo in an iframe.
- On phones and low tier, the screen plays the preview video instead, because a second WebGL context inside an iframe is too heavy there.

### Gallery
- The six templates with style filters (e.g. كلاسيكي · رومانسي · طبيعة · ملكي · سفر).
- Each card has a looping, muted, lazy preview video and two buttons: «شوفوا الدعوة» and «اطلبوا».

### Included, price and steps
- **What's included:** only features that exist in the product:
  - the 3D opening;
  - Arabic or English;
  - a personal link and QR code for every household;
  - RSVP with seat counts;
  - the couple dashboard;
  - countdown, programme, map and calendar, dress code, music;
  - a share preview image.
- **Price:** «٤٩ ألف دينار», one plan.
- **How it works in 3 steps** (to confirm with you): pick a design, message us on Instagram with the details, receive your link and guest dashboard.

### FAQ, final CTA, footer
- The FAQ contains only answers you confirm (decision #6).

### Motion and loading
- Choreography uses ScrollTrigger and Lenis, and respects reduced motion.
- 3D below the fold loads lazily.
- The LCP is the DOM headline plus a poster image. The 3D starts after first paint and idle.

### Preview videos
- `scripts/record-previews.ts` captures each demo intro **frame by frame at 390×844**, using the deterministic capture clock so headless software rendering can't make it stutter.
- ffmpeg then encodes:
  - an MP4 (H.264, yuv420p, faststart);
  - a WebM (VP9);
  - a poster image.
- Target under 1.2 MB per MP4.

### SEO
- Arabic metadata, an OG image, sitemap and robots.
- Lighthouse (mobile) targets: Performance ≥ 85, Accessibility ≥ 95.

---

## 11. Asset pipeline and licences

### Procedural by default
- Geometry, shaders and canvas textures are generated at runtime with seeded randomness.
- Most templates download **no textures or models at all**.

### Fonts (all SIL OFL 1.1)
- Aref Ruqaa, Amiri, Tajawal, Cormorant Garamond, Pinyon Script, Jost.
- DOM: `next/font/google`, self-hosted at build with Arabic and Latin subsets and size-adjusted fallbacks, so there's no layout shift.
- WebGL: `scripts/subset-fonts.ts` produces WOFF files (troika can't read WOFF2) covering Arabic, Latin, digits and punctuation, keeping the GSUB/GPOS tables Arabic shaping needs.

### glTF and KTX2
Only if a model is ever needed:
- `gltf-transform` with meshopt compression.
- KTX2 needs KTX-Software's `toktx`, which isn't installed here. Install it locally or in CI if we ever ship baked textures.

### Other sources
- **Globe:** `world-atlas` (ISC licence; Natural Earth data, public domain).
- **detect-gpu benchmarks:** copied from the npm package (MIT) into `/public/detect-gpu`.
- **Foley:** synthesized. Any sampled sound must be CC0 and listed in LICENSES.md.
- **Music:** your licensed tracks, with each licence referenced in LICENSES.md.

### LICENSES.md
Lists every third-party font, library asset, dataset and sound with its source URL, licence and where it's used.

---

## 12. Performance budget

### Per tier

| | High | Medium | Low |
|---|---|---|---|
| DPR cap | 2 | 1.5 | 1 |
| Anti-aliasing | MSAA 4× (WebGL2) | SMAA | FXAA or none |
| Shadow map | 2048, 1 caster | 1024 | Contact shadow, baked once |
| Bloom | Mipmap blur, full resolution | Half resolution | Off (glow faked in materials) |
| Reflection render target | 1024 | 512 | None (environment map or gradient) |
| Particles | 100% | ~50% | ~25% |
| Depth of field | Openings only | Off | Off |
| Draw calls | ≤ 180 | ≤ 120 | ≤ 70 |
| Triangles | ≤ 750k | ≤ 400k | ≤ 150k |
| Texture memory | ≤ 128 MB | ≤ 80 MB | ≤ 40 MB |
| Frame rate | 60 | **≥ 50 with 4× CPU throttling** | ≥ 30 |

### Per page

| Metric | Target |
|---|---|
| Transferred before the intro can start | ≤ 2.5 MB compressed (target ≤ 1.6 MB; estimate in §9) |
| First meaningful paint on 4G | < 2.5 s (the DOM shell is server-rendered; 3D comes after) |
| CLS | 0 (fixed canvas, size-adjusted fonts) |
| Long tasks during the opening | None over 200 ms (shaders precompiled, foley pre-rendered) |
| Marketing `/` (Lighthouse mobile) | Performance ≥ 85, Accessibility ≥ 95 |

### How it's measured
- `scripts/budget.ts` runs in this sandbox. It counts the encoded network bytes until `introReady` and reads `renderer.info`. It's deterministic and **fails the run** if a template goes over budget.
- `scripts/perf.ts` measures fps and **needs a real GPU**: your computer, or an Android phone over remote debugging. This container has no GPU (§16).

---

## 13. Testing and QA

### Vitest, unit
- **Dates:** numerals; month number with the Gregorian name; the Baghdad time zone, including the case where the date flips at midnight; never Syriac names.
- **RSVP schema:** seat cap; `attending=false` forces 0 seats; message length; the deadline.
- **Tokens:** a token from another wedding is treated as no token; couple-secret checks.
- **CSV:** Arabic and English headers, BOM, Eastern Arabic digits, duplicates.
- **Other output:** the ICS file, the Google Calendar link, the share message.
- **Palettes:** AA contrast for every template.

### Vitest, integration (against local Postgres)
- RSVP upsert is idempotent.
- Deadline enforcement.
- Open-link RSVP creates a guest.
- Dashboard totals.

### Playwright e2e
- **The brief's flow:** open an invite, RSVP, see the answer in the couple dashboard.
- **Admin:** log in, create a wedding, import a CSV, publish.
- **Fallbacks:** the 2D path (`?force2d=1`, plus `emulateMedia({ reducedMotion: 'reduce' })`).
- **Keyboard:** the gate path.

### Every phase
Screenshots (§0).

### Phase 5
- Visual QA per template at gate, mid-opening and content, on phone and desktop.
- The budget table.
- The perf table on real hardware.
- The browser matrix on real devices: iOS Safari 17+, Chrome Android, desktop Chrome, Safari and Firefox.
- The Instagram and WhatsApp in-app browsers, since that's where guests will open their links.

---

## 14. Phase deliverables and exit criteria

**Phase 1: backend and platform**
- Scaffold: TS strict, Tailwind v4 tokens, fonts, two root layouts.
- Prisma schema, migration and seed.
- `lib/date`, `validation`, `tokens`, `ratelimit`, `csv`, `ics`, `share`, `qr`.
- Routes:
  - `/i/[slug]` with DOM content only and simple brand styling; the RSVP works;
  - `/api/rsvp` and `/api/events`;
  - `calendar.ics`, the Google Calendar link and the OG image (including a spike on Arabic shaping);
  - `/d/[slug]` and the CSV export;
  - `/admin` with login, list, editor, duplicate, import, preview and publish.
- Tests, `scripts/shots.ts`, stubs for README, `.env.example` and LICENSES.md.

**Exit:** all checks green; demos seeded; screenshots in `screenshots/phase-1/`.

**Phase 2: shared engine**
- The whole of `src/lib/invite`.
- The engine test stage.
- A troika vs canvas-text spike on Aref Ruqaa names.
- The budget script.
- Self-hosted detect-gpu.
- The audio kit with placeholder synths.

**Exit:** the full flow (loader → gate → opening → skip → hand-off → content → RSVP success) works on both the 3D and 2D paths; Lighthouse accessibility ≥ 95 on the demo invitation; screenshots.

**Phase 3a: pilot**
- الحديقة المقدّسة complete, with its `/lab` page.

**Exit:** within budget; screenshots of gate, mid-opening and content at both sizes. Then I **stop for your review**.

**Phase 3b: the other five templates**
- Same exit criteria for each.
- Plus a budget table covering all six.

**Phase 4: marketing website**
- Hero carousel, ticker, phone, gallery with filters, included / price / steps / FAQ.
- Preview videos, SEO.

**Exit:** Lighthouse mobile Performance ≥ 85 and Accessibility ≥ 95; screenshots.

**Phase 5: polish and QA**
- Visual fixes.
- The performance table.
- Browser fixes.
- README and DEPLOY.md (Vercel + Neon).

**Exit:** a final summary and a deployment once you've decided on Vercel (decision #3).

---

## 15. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Real-device frame rates can't be measured here.** The container has no GPU, so headless WebGL runs on CPU. | Budgets and `renderer.info` are checked here, and they're deterministic. fps is measured with `scripts/perf.ts` on your machine or phone. The tiers are conservative from day one. |
| 2 | **Arabic calligraphy in WebGL.** troika handles Arabic joining and bidi, but some of Aref Ruqaa's contextual alternates and ligatures may not apply. | A Phase 2 spike in `/lab`. Fallback: render the names on a canvas with the browser's own shaper and use that as a gold-masked texture. |
| 3 | **Arabic in OG images.** Satori (behind `@vercel/og`) has historically lacked full RTL and Arabic shaping. | A Phase 1 spike. Fallback: shape the text with `harfbuzzjs` into SVG paths and embed those in the image. |
| 4 | **Scope.** Six bespoke cinematic scenes are most of the work. | A shared art kit (§8.3); a pilot checkpoint (3a) so the art direction is right before it's multiplied by six; tight per-scene shot lists. |
| 5 | **Procedural organic forms** (swans, the couple, roses, palms) could look cheap. | A stylised direction built on silhouette, rim light and grading. CC0 models only with your approval (decision #12). |
| 6 | **In-app browsers.** Guests will open links inside Instagram and WhatsApp webviews. | Test early. Never depend on gyro or vibrate. `sendBeacon` falls back to `fetch` with keepalive. 2D fallback on any WebGL failure. |
| 7 | **iOS Safari memory pressure and WebGL context loss.** | One canvas per page, texture budgets, disposal on unmount, and `webglcontextlost` switching to the 2D path at the same phase. |
| 8 | **The 2.5 MB budget versus music.** | Foley is synthesized; music streams after the opening starts; budget checks fail the run. |
| 9 | **The inspiration site is blocked in this sandbox.** | We worked from the theme descriptions and the indexed pages. Allow the domain or add screenshots for a deeper study. Nothing is copied either way. |
| 10 | **Hosting terms and paid services** (Vercel Pro, Upstash). | Your decisions #3 and #4. Dev runs without them. |
| 11 | **Toolchain drift** (Next 15 vs 16, TS 7, Prisma 8 RC). | Exact pins plus a committed lockfile. |
| 12 | **Locale pitfalls** (Syriac month names from `ar-IQ`, mixed digits). | Our own formatter and normaliser, covered by tests. |
| 13 | **Analytics noise from link-preview bots.** | `opened` is recorded only from the browser after the page is visible; bot user-agents are filtered out. |
| 14 | **Privacy** (guest names, tokens, the couple secret). | `noindex`, the secret moves into a cookie, `no-referrer`, token rotation, no other guests' data in public payloads. |
| 15 | **Neon cold starts.** | Wedding data is cached per slug, so invitation TTFB never waits on the database. |
| 16 | **Lighthouse ≥ 85 with a 3D-first hero.** | The LCP is the DOM headline plus a poster; 3D loads after idle; the iframe phone is desktop-only. |
| 17 | **This container is temporary.** | Push every phase to GitHub (decision #2). |

---

## 16. Sandbox notes (this cloud environment)

**Network**
- Reachable: the npm registry, Google Fonts and GitHub.
- Blocked: `webgencyinvitations.com`, `instagram.com`, unpkg and jsDelivr, Poly Haven, Freesound, and the vercel.com, neon.tech and upstash.com websites.

**Database**
- PostgreSQL 16 server binaries are installed, so dev and e2e can run against a local database (`scripts/db-local.sh`) without Neon.

**Browsers**
- Only Chromium is installed for Playwright. WebKit and Firefox checks happen on your real devices, or on a paid device cloud only if you approve it.

**No GPU**
- Headless WebGL runs on SwiftShader (CPU). Screenshots and budgets are valid here; frame rates are not (risk #1).

**Not installed**
- `toktx` and `basisu`, which KTX2 encoding needs.

**Deployment**
- A Vercel connector is attached to this session, so Phase 5 deployment can run from here once you approve it.

---

## 17. Phase log

### Phase 1: backend and platform (done)

**Delivered**
- Next.js 15.5 app with two root layouts (`(site)` Arabic RTL; `(invite)/i/[slug]` takes lang/dir from the wedding) and a global 404.
- Prisma 7 schema and first migration; local Postgres via `pnpm db:up`; seed with six demo weddings (`demo-<template>`, rolling demo dates, example guests and answers).
- `/i/[slug]`: full invitation content in the DOM (greeting by household, names, date line, countdown, programme, venue with map and calendar, dress code, notes, RSVP, closing, footer). No 3D yet. Beacons for `opened`, `map` and `calendar`.
- `POST /api/rsvp` (personal link and generic link, idempotent, seat cap, deadline, rate limits, same-origin check) and `POST /api/events` (batched, bots ignored, opens de-duplicated).
- `calendar.ics` (RFC 5545 folding for Arabic), Google Calendar link, and share images in each template's palette.
- `/d/[slug]`: couple dashboard with totals, search with Arabic normalisation, filters, per-guest message copy, QR, new link, edit and delete, message wall, CSV import with preview, and CSV export (BOM).
- `/admin`: login, wedding list, editor with live phone preview, duplicate, publish, delete, bulk CSV import.
- Tests: 64 unit and 6 integration (Vitest), 7 end-to-end (Playwright). Screenshots in `screenshots/phase-1/`.

**Changes to this plan**
- **Share images:** the Phase 1 spike confirmed Satori draws Arabic as unjoined letters. Text is shaped with HarfBuzz (`harfbuzzjs`) into SVG paths (`src/lib/og/shape.ts`), with a small bidi pass so numbers read left-to-right.
- **Generic-link RSVPs:** the browser keeps a random key, stored as `Guest.clientKey` (+), so retries and later edits update one guest instead of creating duplicates.
- **Personal links** look the guest up by slug and token, so a cached wedding never points at a stale id after a re-seed.
- **`SITE_URL`** (runtime) replaces `NEXT_PUBLIC_SITE_URL`, so one build can serve any origin.
- **E2E database** is migrated with `prisma migrate deploy` (non-destructive) and tests create their own uniquely named data. Prisma refuses `migrate reset` from an AI agent, and a reset isn't needed.
- **Server modules** live in `src/lib` as `rsvp.ts`, `events.ts`, `dashboard.ts`, `weddings.ts`, `wedding-cache.ts` and `og/`, next to the pure helpers listed in §5.

**Known gaps (later phases)**
- The invitation has no gate, opening or 3D yet; "افتحوا الدعوة" just scrolls to the details (Phase 2).
- One production build failed once while downloading Google Fonts and passed on retry. If it recurs, switch to self-hosted font files.
- Full nonce-based CSP is deferred to Phase 5.


### Phase 2: shared invitation engine (done)

**Delivered**
- **State machine** (`machine.ts`, zustand): boot → loading → gate → opening → hand-off → content, path 3D/2D (drops to 2D at any phase on chunk failure, timeout or lost WebGL context), tier with live step-down, weighted real loading milestones, capture moments, RSVP announcements, lab actions (pin tier, scrub, replay).
- **Capability check** (`capability.ts`): `?force2d=1`, `?tier=` (QA), reduced motion with an opt-in to 3D, WebGL probe, software rasterisers (SwiftShader/llvmpipe) → 2D, detect-gpu with self-hosted benchmarks and a 2.5 s timeout, Save-Data → low.
- **Stage** (`stage/`): one canvas, frames driven by our own loop (full rate in gate/opening and while interacting, idle cap while reading, nothing when hidden), per-tier DPR/MSAA/SMAA/shadows, `Grade` (bloom, neutral tone mapping, baked LUT grade, vignette, grain), `CinematicCamera` (camera tracks with aspect-aware framing, ambient shot following scroll, tilt parallax), `useIntro` (one GSAP timeline the shell plays, skips and seeks), readiness milestones and shader warm-up, particle burst.
- **Kit**: sky dome, envelope (embossed border, fold lines, gold-edged flap, liner), wax seal (cracks in two, gilded monogram relief), gold arch, light rays, gold 3D text (`GoldText`), procedural textures (normal maps from height, monograms, gobos), sRGB colour mixing.
- **Audio**: synthesized foley and placeholder music per template (Karplus–Strong, quarter-tone Rast), WebAudio graph with reverb, unlock on the opening tap, mute remembered, silence when hidden; licensed tracks plug in via `public/music/manifest.json`.
- **Interaction kit**: springs, haptics, pointer/gyro tilt (iOS permission button), hold gesture, scratch surface with coverage — all keyboard-operable.
- **Shell**: server-rendered gate (names and date always readable), real progress ring, tap/hold/scratch gestures, skip, Esc, focus to the hero after hand-off, content inert behind the gate, `<noscript>` shows the content.
- **Content page** over the living backdrop: panels, flip countdown, programme line that draws on scroll, tilt venue card, dress swatches, RSVP with spring segmented control, wax stamp, particle burst and haptics.
- **Lab**: `/lab` and `/lab/<template>` (dev or `LAB_ENABLED=true`): Leva panel (tier, phase buttons, opening scrubber, scene tweaks via `useTweak`), r3f-perf. Not in guests' bundles.
- **Tooling**: capture mode (`?capture=gate|mid|content`) for screenshots and videos, `pnpm budget` (bytes before intro for 3D and 2D, draw calls/triangles), `scripts/peek.mjs`, production builds in their own folder (`NEXT_DIST_DIR`) so the dev server can keep running.
- **Phase 3 extension points**: per template `Scene.tsx`, `Fallback2D.tsx` (2D gate + backdrop + opening length), `content.css` (scoped), `Extras.tsx` (decorative slot after the hero), `gate.header` option.
- Tests: 104 Vitest (unit + integration), 13 Playwright (2D path, 3D path on SwiftShader, skip/Esc, reduced motion, keyboard hold/scratch, RSVP flows, dashboard, admin).

**Changes to this plan**
- **3D text: canvas, not troika.** The spike (`screenshots/phase-2/spike-troika-vs-canvas-text-1200x900.png`) showed troika-three-text mis-joining Aref Ruqaa and Amiri even with full TTFs. `GoldText` shapes with the browser's own text engine onto a canvas texture (gold PBR plane with alpha). troika is removed.
- **Tone mapping: Neutral (Khronos PBR Neutral), not AgX.** AgX desaturated the brand emerald and gold; Neutral keeps them true.
- **Bloom**: mipmap blur with fewer levels on medium; postprocessing's deprecated `resolutionScale` corrupted the image at half size and is never passed.
- **Colour mixing in sRGB** (`stage/color.ts`): three's `Color.lerp` mixes in linear light, which turned "10 % gold over emerald" into olive.
- **Gobo floor**: projected light patterns keep ≥ 60 % light in their dark parts; at 0 the wax seal sat in a black hole.
- **Music stays off the loading path**: foley is synthesized before the gate; music renders in the background and starts when ready.
- **Convolver reverb** gets its impulse resampled to the context's rate (browsers reject a mismatched buffer); the opening never waits on audio.
- **Playwright 1.56.1** (matches the sandbox's Chromium build).

**Known gaps (later phases)**
- Every template still plays the engine test stage; bespoke scenes and 2D fallbacks arrive in Phase 3.
- Placeholder music is synthesized; licensed tracks are a drop-in (`public/music/manifest.json`) once you choose them.
