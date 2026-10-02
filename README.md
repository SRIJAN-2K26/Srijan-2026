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
