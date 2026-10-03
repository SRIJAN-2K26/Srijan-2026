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
- `src/components/Story.astro` + `src/styles/story.css`: 6 frames (Spark, Ground [skyline + "Every big thing starts small"], Battlefield, Path, Reward, Your move). Inline SVG only. The skyline is now a procedural, stylised city (see below); `scripts/trace-story-art.py` and `art.json` (old poster trace) are retired.
- Pinned scroll story = CSS `animation-timeline: scroll()` inside `@supports`, only when `prefers-reduced-motion: no-preference`. Otherwise (no support, reduced motion, no JS) the frames stack as finished static sections.
- Only transform/opacity (plus visibility for hiding) are animated. No JS animation, no libraries.
- Checks: `node scripts/check.mjs`, `node scripts/story-check.mjs` (per-frame fit, Register, console), `node scripts/contrast-check.mjs`.
- `₹` comes from a 1 KB Anton glyph subset (`src/assets/fonts/anton-rupee.woff`) because the latin subsets lack it.

## feat/skyline-3d: layered 3D skyline
- `src/lib/skyline.ts` generates (deterministic, seeded) four depth layers: far haze towers, mid heritage arcades/domes/minarets, near arched gateway + faceted modern towers (lit side faces), front rooftops. Windows are 3 groups that twinkle with opacity only. `src/components/Skyline.astro` emits the shapes once as `<g>` defs and instances them with `<use>`.
- `src/styles/skyline.css`: exactly one skyline is rendered in every mode. The pinned story shows ONE stage-level `.city` (CSS 3D: `perspective` + per-layer `translate3d(x, 0, z)` dolly tied to `scroll(root)`) behind a darkening `.scrim`; when motion is reduced or scroll-timeline is unsupported, the one skyline is the hero's `.sky.s-hero`, anchored to the hero's bottom edge and clipped to it (frame 2 has no art of its own). Without scroll-timeline (Firefox, older Safari) `src/scripts/hero-motion.ts` drifts its layers with transform/opacity; reduced motion keeps it still. Art is anchored `xMidYMax slice` on a 3000x560 viewBox: phones always see the centre gateway cluster, ultrawide sees the full width.
- The skyline is a stylised design suggestion; no real landmark is named in copy or alt text.
- Extra checks: `scripts/skyline-check.mjs` (one visible skyline at 1920x1080 / 1366x768 / 1280x800 / 390x844 with motion on, reduced motion, no animation-timeline (emulated in Chrome, plus real Firefox/WebKit when `npx playwright install firefox webkit` has been run) and JS off; hero text contrast over the art), `scripts/story-shots.mjs` (6 sizes x 7 scroll points), `scripts/hero-check.mjs` (Register above the fold, one-row sponsors), `scripts/focus-dock-check.mjs` (Tab focus vs dock, FAQ link vs dock).
- Sponsor logos (`src/assets/sponsors/*.webp`): ready-made cut-outs supplied by the owner (MacroVision AI, .xyz, Paytm), shown unrecoloured in one row in the hero and in the last frame. Not links.

## feat/bold-redesign: "bolder" home page
- One huge line per frame with small supporting text: hero `SRIJAN 2K26` + `Build • Create • Impact`, `Every big thing starts small.`, `Pick your battlefield.` (six one-liners from `tracks.lines` in `event.json`), `Register. Shortlist. Build. Finale.` with date badges 11 / 12 / 13 / 14 Oct, `Rewards worth ₹1.5 Lakh+`, `Your move.`
- Size rule (`src/styles/bold.css`): `--big` is the largest type size on the page; the hero title and the final Register button (`.btn-xl`) are both exactly `--big`, every other headline is smaller. The button may wrap to two lines below 64rem and always reserves its box, so `Registration closed` swaps in with CLS 0.
- Transformation motion (bundled modules, `element.animate`, transform + opacity only, interruptible, off under reduced motion, pointer effects only with `(hover: hover) and (pointer: fine)`): `src/scripts/transform.ts` (domain-card hover/tap spring, icon squash-and-stretch <= 5%, journey FLIP marker) and `src/scripts/counters.ts` (reward text settles in place; digits are never cycled, so no other figure is ever shown). The old 3D tilt (`tilt.ts`) was removed.
- Checks: `node scripts/bold-check.mjs` (320/360/390/768/1280 overflow + clipping + stage fit, size rule, tap targets, motion rules, reduced motion, JS off, closed-state box). `journey-check` and `release-check` were updated for the date badges and the settle animation.
