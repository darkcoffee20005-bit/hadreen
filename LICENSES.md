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

## Sounds and music

None yet. Foley will be synthesized in the browser (Phase 2). Licensed music tracks will be listed here with proof of licence when they are added to `public/music/`.
