# Third-party assets

Every font, image, model, dataset or sound that ships with Hadreen is listed here with its source and licence. Art in the templates is procedural unless listed.

## Fonts

All from Google Fonts, licensed under the [SIL Open Font License 1.1](https://openfontlicense.org). DOM text loads them through `next/font/google` (self-hosted at build). TTF copies in `src/assets/fonts/` are used to render share images.

| Font | Use | Source |
|---|---|---|
| Aref Ruqaa | Arabic display (names) | https://fonts.google.com/specimen/Aref+Ruqaa |
| Amiri | Arabic serif (dates, verses) | https://fonts.google.com/specimen/Amiri |
| Tajawal | Arabic UI | https://fonts.google.com/specimen/Tajawal |
| Cormorant Garamond | English serif | https://fonts.google.com/specimen/Cormorant+Garamond |
| Pinyon Script | English display | https://fonts.google.com/specimen/Pinyon+Script |
| Jost | English UI | https://fonts.google.com/specimen/Jost |

## Data

| Asset | Use | Licence |
|---|---|---|
| City coordinates in `src/lib/geo.ts` | حب بلا حدود flight arcs | Public geographic facts, compiled for this project |
| Globe land dots (`src/lib/land-dots.data.ts`), precomputed by `scripts/land-dots.ts` from [world-atlas](https://github.com/topojson/world-atlas) `land-110m` | Globes (حب بلا حدود) | Natural Earth, **public domain**; world-atlas packaging ISC |
| GPU benchmark tables in `public/detect-gpu/` from [detect-gpu](https://github.com/pmndrs/detect-gpu) | Choosing a quality tier | MIT |

## Sounds and music

- **Foley** (paper, wax crack, water, chimes, whoosh, cloth, plane, stamp, tick) is synthesized in the browser (`src/lib/invite/audio/`). No recordings.
- **Music**: each template plays a synthesized placeholder until licensed tracks are added to `public/music/` (listed in `public/music/manifest.json`). Add each track here with its licence and proof of purchase when it arrives.
- **Marketing-site sting**: synthesized (`src/site/sting.ts`).

## Art

All 3D art, textures and 2D fallback art are procedural or hand-written SVG/CSS in this repository: geometry built in code, canvas-drawn textures (embossing, monograms, gobos, posters), shaders. No third-party images or models.

Preview videos and posters in `public/previews/` are recordings of our own demo invitations (`scripts/record-previews.ts`); the names, dates and venues in them are examples.
