# Performance report – SRIJAN 2K26 (branch `perf/optimize`)

Measured on top of `a0d6014` (feat/home-page incl. UX fixes + contact block). Lighthouse 12, **mobile preset, simulated 4G/4×CPU**,
headless Chrome, median of 3 runs, against a local static server that serves `dist/` with brotli and the exact headers from `public/_headers`.
Tooling lives outside the repo (`/workspace/perf-tools`: `serve.mjs`, `lh.sh`, `shots.mjs`).

## Before / after

| Metric (median of 3) | Before (a0d6014) | After |
|---|---|---|
| Lighthouse Performance | 100 (one run 99) | **100** |
| Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| FCP | 1.36 s | **0.90 s** |
| LCP | 1.58 s | **1.20 s** (1.05–1.20) |
| CLS | 0.0003 (font swap shifted the "2K26" brand span) | **0** |
| TBT | 0 ms | 0–24 ms (noise; one inline script, ~1 KB) |
| Speed Index | 1.36 s | **0.91 s** |
| Total transfer in the Lighthouse load (brotli, incl. lazy images it scrolls to) | 184.8 KB | **124.5 KB (−33 %)** |
| Requests | 7 | 6 |
| Render-blocking requests | 1 (CSS) | **0** |
| Font bytes (Anton + Inter) | 67.3 KB | **30.3 KB (−55 %)** |
| `dist/` size on disk | 700 KB (36 files) | **492 KB (−30 %)**, 25 files |
| Critical chain | HTML → CSS → fonts (3 levels) | HTML → fonts (Anton preloaded) |

Original v1 commit `85768c9` measured the same 100/100/100/100, 183.8 KB, FCP 1.36 s, LCP 1.58 s. There is no hero image: LCP is text, so
the wins come from removing the CSS round trip and shrinking/preloading fonts. Below-the-fold images are lazy and never delay LCP.

## What changed

**Fonts** – `Anton` 18.6 → 5.4 KB and `Inter Variable` 48.3 → 24.0 KB: subset to Basic Latin + the typographic punctuation the page uses
(– — ’ “ ” • · × … → ₹ nbsp), no hinting, woff2, `font-display: swap`, self-hosted from `src/assets/fonts/` (hashed into `/_astro/`).
Only Anton (h1, brand, section numbers) is `<link rel=preload crossorigin>`; Inter is intentionally not preloaded. Regenerate: `npm run fonts`
(`scripts/subset-fonts.sh`; fontsource packages moved to devDependencies as the source).
**CSS** – `inlineStylesheets: 'always'` (single page, 21 KB raw / ~4.5 KB brotli): no render-blocking request, no CSS→font waterfall.
No dead CSS found (coverage at 390 and 1280 shows only hover/focus/media/reduced-motion branches unused at load).
**Images** – new `src/components/Img.astro`: AVIF `srcset` + a single WebP fallback (Astro `<Picture>` emitted every width in both formats).
Width ladders match displayed sizes (poster 360/520/660/780, venue 400/560/768/1024, logos 160/320 – logo `sizes` kept at 160px so they render at exactly
the same size as before). Explicit `width`/`height` on all images, `loading=lazy decoding=async` (nothing is above the fold, so there is no eager/fetchpriority-high image;
the component supports `loading="eager" fetchpriority="high"` if a hero image is added later).
**Caching** – `vercel.json` and `public/_headers` (Netlify / Cloudflare Pages): `/_astro/*` → `public, max-age=31536000, immutable`;
HTML → `public, max-age=300, stale-while-revalidate=600`; `favicon.svg` → 1 day. Cache-Control is set on non-overlapping paths (these hosts merge duplicate headers).
**Security headers** – CSP (`default-src 'self'`; scripts allow-listed by SHA-256, no `unsafe-inline` for scripts; `connect-src 'self'`; `object-src 'none'`;
`frame-ancestors 'none'`; `form-action 'none'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS (1 year, no preload/subdomains).
`scripts/check-headers.mjs` runs as `postbuild` and **fails the build if the inline scripts change and the CSP hashes go stale** (a stale hash would block the reveal script and leave content hidden).
**Compression** – output is minified HTML/CSS/SVG; fonts/AVIF/WebP are already compressed. All three hosts brotli/gzip text automatically.
**Runtime calls** – verified with Playwright at 390 and 1280: only same-origin document, fonts, images and favicon; zero console/CSP errors; no fetch/XHR/analytics. Outbound links are plain `<a>` navigations.
**Untouched** – all copy/facts in `src/data/event.json` (dates, prizes, fees, Register link, sponsors), visual design, motion (transform/opacity only, reveal once, `prefers-reduced-motion`),
and the UX fixes from a0d6014 (mobile menu, scroll-padding, 44px targets, dock behavior, new-tab links).

## Visual check
`shots/perf-after-{mobile-390,desktop-1280}[-hero].png`. Pixel diff vs. the pre-optimisation build (same Chrome, same viewport): heroes 0.000 % pixels differ;
desktop full page 0.098 % (AVIF re-encode of images / font hinting); mobile full page is 1 px shorter (8303 vs 8304 px: the venue image's aspect ratio now comes from its attributes). Sponsor logos render at identical 160×50 / 160×160.

## Remaining recommendations
- Add `<link rel=canonical>`, `og:image` (absolute URL, ~1200×630), `og:url`, Twitter card, and `robots.txt` + sitemap once the production domain is known (no content/URL was invented here).
- Poster AVIF (780w = 73 KB) is the biggest asset: re-crop from the original at 2× the display size with a higher-effort AVIF (`avifenc -s 4 -q 45`) or ask for a cleaner source to save ~20–30 KB.
- Lighthouse still lists "image delivery" (~0.5, est. 25 KB) because it assumes a 1.75× device; a 1.5×-ish ladder would shave it but adds files.
- Optionally preload Inter as well (removes the last HTML→font hop; +24 KB eager) – skipped per "preload only the critical font".
- Use a custom domain on a CDN with HTTP/3; on Cloudflare Pages enable Brotli (default). Consider Vercel's `Cache-Control: s-maxage` for HTML if traffic spikes.
- If a hero image or third-party embed is ever added, extend CSP (`img-src`, `frame-src`) and re-run `npm run build` (the check script will tell you if hashes drift).
