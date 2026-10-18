# برومبت حاضرين الشامل لـ Claude Code

Transcribed from `docs/brief.pdf` (Oct 19, 2026 · @Yosre). The PDF is the source of truth; this copy exists so every session can read the brief as text.

برومبت واحد يبني مشروع حاضرين كامل: الجانب البرمجي، وست دعوات ثلاثية الأبعاد برسومات مختلفة، وموقع يعرضها بالثلاثي الأبعاد.

## طريقة الاستخدام

البرومبت بالإنجليزي لأنه أدق بالبرمجة، وكل النصوص اللي يشوفها الضيوف بالعربي. Claude Code راح يكتب خطة أول، وينتظر موافقتك، وبعدين يشتغل خمس مراحل ويراجع شغله بصور بعد كل مرحلة.

1. سوّي مجلد جديد للمشروع، وحط بيه مجلد `reference/` بيه ملف `x-emerald3d.html` (دعوة الزمرّد) كمرجع تقني بس. ملفات التصاميم القديمة ما تحتاجها.
2. افتح Claude Code بهذا المجلد والصق البرومبت الشامل كامل.
3. راجع ملف `PLAN.md` اللي يكتبه، ورد عليه بـ «موافق، ابدي بالمرحلة ١».
4. بعد كل مرحلة شوف الصور بمجلد `screenshots/` واستخدم برومبتات المتابعة بآخر المستند.
5. تحتاج حساب Vercel للنشر وقاعدة بيانات Postgres ‏(Neon، مجانية للبداية)، وملفات موسيقى مرخّصة لما تكون جاهزة.

المشروع كبير، فتوقّع ياخذ أكثر من جلسة. إذا وقف بنص مرحلة، قلّه «كمّل من وين وقفت حسب PLAN.md».

## البرومبت الشامل

```text
You are the lead creative engineer and art director for "Hadreen" (حاضرين),
an Iraqi brand of premium interactive digital wedding invitations. Build the
whole product in this repo: the backend, a shared invitation engine, SIX
advanced 3D invitation templates, and a marketing website whose hero and
gallery preview the templates in 3D.
Quality bar: award-level (Awwwards / FWA) art direction, motion and polish,
running smoothly on mid-range Android phones and iPhones, Arabic-first. Every
scene must feel like a film shot: deliberate composition, a light story,
depth, color grading, sound.

## Inspiration source
Study Webgency's template catalogue at https://webgencyinvitations.com (The
Sacred Garden, Blossom & Oud, Dolce Vita, Vibrant Vows, Destination Love,
Eternal Romance, Royal Gold, Minimalist, and their Instagram
@webgency_invitations reels). Learn their themes, moods, palettes and
interaction patterns: wax-seal envelopes that open, stage curtains,
chandeliers, scratch-to-reveal dates, arches and lanterns, swans, falling
petals, a programme timeline, RSVP.
Our six templates are inspired by those themes but rebuilt as ORIGINAL 3D art
with original Arabic copy and an Iraqi feel. Do not copy their images,
illustrations, layouts or text. Exception: if /reference/webgency/ contains
files Webgency has licensed to us, use them as provided.
Our old template designs are NOT part of this project. /reference/x-
emerald3d.html is only a technical baseline (lighting, gobo shadows, opening
timeline, fallbacks, audio), not a template to ship.

## Ground rules (never break these)
- Brand: emerald #0B3D2E, gold #C9A96E, ivory #F8F3E8; each template adds its
own palette. Fonts: Aref Ruqaa (display), Amiri (serif), Tajawal (UI);
English weddings: Cormorant Garamond, Pinyon Script, Jost.
- Arabic RTL first (<html lang="ar" dir="rtl">); English supported per
wedding. Arabic UI uses Eastern Arabic numerals.
- Dates: weekday, day, MONTH NUMBER plus the GREGORIAN month name, e.g.
"الخميس ١٠ / ١٢ (ديسمبر) ٢٠٢٦". Never Syriac month names (كانون، شباط...).
Store UTC, display Asia/Baghdad.
- Price: one plan, 49,000 IQD (٤٩ ألف دينار). Contact ONLY via Instagram DM
@7adre.n (https://www.instagram.com/7adre.n/). Never show a phone or WhatsApp
number anywhere.
- Never invent statistics, ratings, reviews, client counts or "first in Iraq"
claims. Demo names, dates and venues are clearly labelled as examples.
- Art is procedural geometry, shaders and canvas textures, or CC0 assets
listed in LICENSES.md with their sources.
- Content is always readable in the DOM; 3D is the stage, never the only
carrier of information.

## How to work
1. First study the inspiration site and /reference, then write PLAN.md:
architecture, folder tree, data model, the six scene breakdowns (which
Webgency theme inspired each, shots, timelines, assets, budgets), performance
budget, risks. Stop and wait for my approval.
2. Then work phase by phase. After EVERY phase: run lint, typecheck and
tests; start the app; capture Playwright screenshots at 390x844 and 1440x900
into /screenshots/<phase>; look at them critically and fix what looks off;
then summarize what is done and what is next. Commit at the end of each
phase.
3. Ask me before adding paid services. Keep secrets in .env (provide
.env.example).

## Stack
Next.js 15 (App Router, TypeScript strict), Tailwind CSS v4, React Three
Fiber + @react-three/drei + @react-three/postprocessing, three (pin one exact
version), troika-three-text for Arabic text inside WebGL (shaping + bidi;
bundle subsetted Aref Ruqaa / Amiri font files), GSAP + ScrollTrigger and
Lenis for DOM choreography, Zustand, Prisma + Postgres (Neon), Zod,
@upstash/ratelimit, @vercel/og, detect-gpu, Vitest, Playwright. Deploy on
Vercel.
Asset pipeline: glTF with meshopt or Draco, KTX2 textures via gltf-transform.
Budget per template: <= 2.5 MB compressed before the intro can start; lazy-
load the rest. Dynamic-import every 3D scene (ssr:false) so the page shell
paints first.

## Phase 1: Backend and platform
Prisma models:
- Wedding: id, slug, template, lang (ar|en), groomName, brideName, monogram,
dateTimeUtc, verse?, intro, venueName, venueArea, mapsUrl, dressCode, notes,
rsvpDeadline, schedule Json [{time,title,subtitle}], musicTrack,
paletteOverrides Json, originCity?, destinationCity? (for the travel
template), status (draft|live), coupleSecret.
- Guest: id, weddingId, displayName (e.g. "عائلة أبو حسين"), token (nanoid
10, unique), maxSeats, group?.
- Rsvp: guestId unique, attending, seats, message, createdAt, updatedAt.
- Event: weddingId, guestId?, type (opened | intro_completed | rsvp |
calendar | map), userAgent, createdAt.
Routes:
- /i/[slug]?g=<token>: renders the wedding's template; greets the guest by
name inside the scene and on the gate; RSVP prefilled, seats capped at
maxSeats. Without a token: generic greeting and a name field.
- POST /api/rsvp: Zod validation, rate limit by IP + token, idempotent
upsert, editable until rsvpDeadline.
- POST /api/events: batched beacons via navigator.sendBeacon.
- /i/[slug]/calendar.ics plus a Google Calendar link; /i/[slug]/opengraph-
image in the template palette with names and date.
- /d/[slug]?k=<coupleSecret>: couple dashboard. Totals (invited households,
confirmed seats, declined, no reply, opened but not answered), searchable
guest table, guest messages wall, CSV import and export, per-guest personal
link + QR code + a copy button with a ready Arabic message: "أهلاً {name}،
يسعدنا دعوتكم لحفل زفاف {groom} و{bride}. افتحوا الدعوة: {link}".
- /admin (password from env, iron-session): create/edit/duplicate weddings,
bulk-import guests, pick a template and palette with a live preview, publish
toggle.
- Seed one demo wedding per template (slug demo-<template>) with example
names.
Tests: Vitest for date formatting (numerals, month number + Gregorian name,
Baghdad time), RSVP validation and token access; Playwright e2e: open an
invite, RSVP, see the answer in the couple dashboard.

## Phase 2: Shared invitation engine (/lib/invite)
- InviteShell: branded loader with real progress, gate, intro sequence, hand-
off to the content page, a visible "تخطّي الحركة" skip button, a mute button,
render pause when the tab is hidden.
- Fallbacks: if WebGL fails, the 3D chunk fails to load, or prefers-reduced-
motion is set, show the template's own lightweight 2D version (CSS/SVG) of
the same look, with the same content.
- Quality tiers from detect-gpu: high / medium / low (pixel-ratio cap 2 / 1.5
/ 1, MSAA, shadow map size, bloom, particle counts, reflection resolution).
drei PerformanceMonitor degrades smoothly at runtime.
- Interaction kit: pointer and touch tilt with springs; optional gyro tilt
behind an explicit iOS permission button ("حرّكوا تلفونكم"); haptics via
navigator.vibrate when available; tap, hold, swipe and SCRATCH gestures (a
reusable scratch-to-reveal surface that works on DOM elements and on 3D
meshes via a render-target mask).
- Audio kit: WebAudio graph with convolution reverb, foley one-shots (paper,
wax crack, water, chimes, whoosh, cloth, plane), a music loop with
crossfades. Music files live in /public/music (I will supply licensed
tracks); until then use a tasteful synthesized placeholder. Audio starts only
on the first user gesture.
- Content page over a living 3D backdrop that reacts to scroll and pointer:
hero hand-off, flip-clock countdown (CSS 3D flip per digit), timeline whose
gold line draws with scroll, venue card with 3D tilt + glare + map and
calendar buttons, dress-code palette with notes for ladies and gentlemen,
RSVP card (spring segmented control, seats stepper, message, success wax-
stamp animation + a 3D particle burst + haptic), closing line, footer "دعوة
من حاضرين، للطلب راسلونا على انستكرام @7adre.n".
- Accessibility: focus states, labels, AA contrast, keyboard path through the
gate (Enter opens, Enter reveals scratch areas).

## Phase 3: Six 3D templates (inspired by Webgency's catalogue, original execution)
Each template = one R3F scene with: a gate (idle, inviting interaction), a
cinematic opening of 6-9 s (skippable), a seamless hand-off into the content
page, and an ambient mode behind the sections. For each, write in PLAN.md:
the Webgency theme it draws on, palette tokens, music mood, 3 key camera
shots, the intro timeline in seconds, ambient behaviour, low-tier
simplifications, the 2D fallback, and the size budget. Add /lab/[template]
(dev only) with Leva controls for light and camera tuning.

1) الحديقة المقدّسة (theme: The Sacred Garden). Gate: the whole screen is a
blush paper envelope with embossed florals and a wine-red wax seal held in
3D. Tap: the seal cracks, the flap lifts, the envelope drops away and reveals
a stone arch wrapped in rose garlands over a still pond at golden hour. Two
white swans glide in until their necks form a heart (planar reflection,
ripples, floating petals). "بسم الله الرحمن الرحيم" and the names float in
gold. Suits a nikkah.
2) ورد وعود (theme: Blossom & Oud). A blush envelope's flap lifts and rose-
satin curtains with gold tiebacks part on a crystal chandelier (transmission,
glints) that sways softly. Below, a palm-lined road leads through pink mist
to an Andalusian-Iraqi palace; scrolling dollies the camera down the avenue
toward the gate. Oud-led music.
3) دولتشي فيتا (theme: Dolce Vita). A rose-covered stone balcony over a lake
with mountains, villas and a sailing boat under a bright sky; clouds drift.
The date hides under three powder-blue foil tiles the guest scratches (day /
month number + name / year). A powder-blue envelope sits in the scene and its
letter rises out as the guest scrolls. The programme floats on pastel 3D
clouds.
4) الذهب الملكي (theme: Royal Gold). An ivory four-flap envelope with
embossed florals and an ivory seal bursts open in golden light (volumetric
beams + bloom) into a pointed Islamic arch with swinging brass lanterns,
white blossoms and a pale-gold mosque; the couple, seen from behind, walks
toward it. Timeline icons are gold line-art drawn as glowing 3D wire.
5) الرومانسية الأبدية (theme: Eternal Romance). A burgundy velvet stage
curtain (cloth shader) lifts while deep red petals fall; red roses and
candles on an ivory table; a gold-framed card carries the names; the venue
appears as a 3D line drawing that draws itself; burgundy and ivory sections
with soft wave edges.
6) حب بلا حدود (theme: Destination Love). A stylised ivory-and-gold 3D globe;
a plane flies an arc from originCity to the wedding city (default Baghdad)
leaving a gold trail; the camera follows and lands on the venue. The
invitation is a boarding-pass card (passenger = guest name, flight = the
couple, date and time, gate = venue) whose stub tears off when the guest
confirms attendance.

## Phase 4: Marketing website (/)
Arabic RTL, 3D-first, original copy in Iraqi-friendly Arabic, following the
same section flow as a premium invitation studio site.
- Hero: a full-bleed WebGL scene of the six invitations as floating 3D cards
in an emerald-and-gold space, each card a live low-tier mini render of its
template (render targets). Drag or scroll rotates the carousel; tapping a
card brings it forward with a short music sting. CTAs: "شوفوا الدعوة" (live
demo) and "اطلبوا على انستكرام".
- Occasions ticker (أعراس، عقد قران، خطوبة، حنّة، ملكة، احفظوا الموعد).
- A 3D phone that tilts with the pointer, its screen running the real demo
(iframe) so visitors can try it in place.
- Gallery of the six with style filters: each card shows a looping preview
video plus buttons to the live demo and to order.
- What's included, price (49 ألف دينار, one plan), how it works in 3 steps,
FAQ with accurate answers only, final CTA, footer.
- Scroll choreography with GSAP ScrollTrigger + Lenis; reduced motion
respected; 3D below the fold loads lazily.
- Preview videos: a Playwright script records each demo's intro at 390x844
and ffmpeg encodes MP4 + WebM into /public/previews.
- SEO: Arabic metadata, OG image, sitemap, robots. Mobile Lighthouse targets:
Performance >= 85, Accessibility >= 95.

## Phase 5: Polish and QA
- Visual QA per template at three moments (gate, mid-opening, content) on
phone and desktop; fix composition, color, timing.
- Performance: hold 50+ fps on the medium tier with CPU throttling; no layout
shift; first meaningful paint under 2.5 s on 4G.
- Browsers: iOS Safari 17+, Chrome Android, desktop Chrome, Safari, Firefox.
- Docs: README (setup, env vars, how to create a wedding, how to add a
template) and DEPLOY.md (Vercel + Neon).

Deliverables: running app, seeded demo weddings, screenshots per phase,
preview videos, docs. Start now by studying the inspiration site, then write
PLAN.md.
```

## النماذج الستة باختصار

النماذج الستة مأخوذة من أجواء نماذج Webgency، بس برسومات ثلاثية الأبعاد ونصوص عربية مالتنا. النماذج القديمة ما داخلة بالمشروع.

| النموذج | مقتبس من | المشهد | لحظة الفتح |
|---|---|---|---|
| الحديقة المقدّسة | The Sacred Garden | قوس ورد على بركة بالغروب | الختم ينكسر والبجعتين يسوّن قلب |
| ورد وعود | Blossom & Oud | ستائر وردية وثريا وطريق نخل لقصر | الغطاء يرتفع والستائر تنفتح |
| دولتشي فيتا | Dolce Vita | شرفة ورد على بحيرة وجبال | التاريخ يتمسح والرسالة تطلع من الظرف |
| الذهب الملكي | Royal Gold | قوس إسلامي وفوانيس وجامع | الظرف العاجي ينفتح بوهج ذهبي |
| الرومانسية الأبدية | Eternal Romance | مخمل خمري وورد أحمر وشموع | الستارة ترتفع والورد يتساقط |
| حب بلا حدود | Destination Love | كرة أرضية بالعاجي والذهبي | طيارة تطير لبغداد والدعوة تذكرة طيران |

إذا وصلتك ملفاتهم الأصلية بموافقتهم، حطها بمجلد `reference/webgency/` وClaude Code يستخدمها مثل ما هي.

## برومبتات المتابعة

استخدمهن بعد ما يخلص Claude Code المرحلة ويرسل الصور.

**مراجعة نموذج بعين مخرج:**

```text
Review template <name> like a demanding film director and an Iraqi bride
seeing it on her phone. Open /screenshots for gate, mid-opening and content
at 390x844. List the 10 weakest things (composition, light, color, timing,
text legibility, Arabic typography, sound, smoothness), fix them in order,
then re-capture and show me before/after.
```

**فحص الأداء على التلفونات:**

```text
Profile every template on the medium and low tiers with 4x CPU throttling.
Report fps, draw calls, triangles, texture memory and download size per
template in a table. Anything under 50 fps on medium or over the 2.5 MB
budget: fix it (instancing, merged geometry, smaller textures, cheaper post)
without visibly hurting the look.
```

**تجربة عرس حقيقي من البداية للنهاية:**

```text
Run a full rehearsal: in /admin create a wedding on the Royal Gold template
with 30 guests from a CSV, open three guest links, RSVP yes, no and yes with
4 seats, then open the couple dashboard and check totals, messages and the
CSV export. Fix anything that breaks or reads unclearly in Arabic.
```

**إضافة نموذج سابع بعدين:**

```text
Add a seventh 3D template called <name>: <scene idea>. Follow the same
engine, tiers, fallbacks, budget and PLAN.md format; add it to the seed, the
website carousel and the gallery with a preview video.
```
