# SRIJAN 2K26 – home page (v1)

Static Astro site. All copy lives in `src/data/event.json` (Register link: `register.href`).

```bash
npm install
npm run build            # → dist/ (fully static)
npm run preview          # or: python3 -m http.server 4321 -d dist
npm run shots            # screenshots at 390/820/1280 into shots/ (needs playwright + Chrome, server on :4321)
node scripts/prepare-assets.mjs   # re-crop poster/venue/logos from the raw folder (RAW=/path)
```

Images are optimised at build by `astro:assets` (sharp) to AVIF/WebP at fixed sizes. Fonts (Anton + Inter Variable, latin subset) are self-hosted from fontsource. JS: one inline snippet (~1 KB) for scroll-reveal and the days-to-go label. See `CONTENT_GAPS.md` for open items.

## feat/story: scroll story
- `src/components/Story.astro` + `src/styles/story.css`: 7 frames (Spark, Ground, City, Battlefield, Path, Reward, Your move). Inline SVG only; skyline and campus silhouettes are coarse traces from the poster (`scripts/trace-story-art.py` -> `src/data/art.json`); the lion statue is a stylised drawing, not a trace.
- Pinned scroll story = CSS `animation-timeline: scroll()` inside `@supports`, only when `prefers-reduced-motion: no-preference`. Otherwise (no support, reduced motion, no JS) the frames stack as finished static sections.
- Only transform/opacity (plus visibility for hiding) are animated. No JS animation, no libraries.
- Checks: `node scripts/check.mjs`, `node scripts/story-check.mjs` (per-frame fit, Register, console), `node scripts/contrast-check.mjs`.
- `₹` comes from a 1 KB Anton glyph subset (`src/assets/fonts/anton-rupee.woff`) because the latin subsets lack it.
