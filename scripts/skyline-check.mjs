// Exactly ONE skyline in every mode: motion on (Chrome, pinned scroll story), reduced motion, no animation-timeline
// (emulated in Chrome: the page's @supports (animation-timeline: scroll()) blocks are rewritten to a false condition and
// CSS.supports reports false; real Firefox/WebKit are also run when Playwright has them installed), and JS off.
// Per mode x viewport: one rendered skyline for the whole page, never two on screen while scrolling, anchored to the hero
// (static) or the stage (pinned) bottom with no gap, clipped to the hero, hero text + Register uncovered and >= 4.5:1 over
// the art, one accessible skyline image, fallback drift = transform/opacity only, reduced motion = no running animations.
// Screenshots of the hero per mode/viewport go to $OUT.
import { chromium, firefox, webkit } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-skyline-check';
fs.mkdirSync(OUT, { recursive: true });
const sizes = [[1920, 1080], [1366, 768], [1280, 800], [390, 844]];
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } return c; };
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };

const SUPPORTS = /@supports\s*\(\s*animation-timeline\s*:\s*scroll\(\)\s*\)/g;
const noTimeline = async (ctx) => {
  let n = 0;
  await ctx.route(BASE, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(SUPPORTS, () => { n++; return '@supports (not-a-real-property: 1)'; }); await route.fulfill({ response: r, body }); });
  await ctx.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = (...a) => (/animation-timeline/.test(a.join(' ')) ? false : o(...a)); });
  return () => n;
};

const chrome = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const modes = [
  ['motion', chrome, {}],
  ['reduced', chrome, { reducedMotion: 'reduce' }],
  ['no-timeline', chrome, {}, noTimeline],
  ['js-off', chrome, { javaScriptEnabled: false }],
];
const extra = [];
for (const [name, type] of [['firefox', firefox], ['webkit', webkit]]) {
  try { const br = await type.launch(); extra.push(br); modes.push([name, br, {}]); } catch { console.log(`(${name} not installed: skipped)`); }
}

// Rendered skylines: laid out, visible, effective opacity > .05. `inView` additionally requires intersecting the viewport.
const probe = () => {
  const eff = (e) => { let o = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none') return 0; o *= +c.opacity; } return o; };
  const skies = [...document.querySelectorAll('.sky')].map((e) => { const q = e.getBoundingClientRect(); const c = getComputedStyle(e); const o = eff(e);
    return { cls: e.className, rendered: q.width > 0 && q.height > 0 && c.visibility === 'visible' && o > .05, inView: q.bottom > 0 && q.top < innerHeight && q.right > 0 && q.left < innerWidth, op: +o.toFixed(2), top: q.top, bottom: q.bottom, ov: c.overflow, role: e.getAttribute('role'), label: e.getAttribute('aria-label') }; });
  return skies.filter((s) => s.rendered);
};

for (const [mode, browser, opts, setup] of modes) for (const [w, h] of sizes) {
  const tag = `${mode} ${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...opts });
  const swapped = setup ? await setup(ctx) : null;
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2600);
  const env = await p.evaluate(() => ({ supports: !!window.CSS?.supports?.('animation-timeline: scroll()'), pinned: getComputedStyle(document.querySelector('.stage')).position === 'sticky' }));
  if (swapped) ok(swapped() >= 1 && !env.supports && !env.pinned, `${tag}: emulation active (${swapped()} @supports blocks rewritten, supports=${env.supports}, pinned=${env.pinned})`);
  if (mode === 'motion') ok(env.pinned, `${tag}: Chrome with motion should run the pinned story`);
  if (mode === 'reduced' || mode === 'no-timeline') ok(!env.pinned, `${tag}: static layout expected`);

  // 1. hero: exactly one skyline on screen, and exactly one rendered on the whole page
  const s0 = await p.evaluate(probe);
  const want = env.pinned ? 'city' : 's-hero';
  ok(s0.length === 1 && s0[0].cls.includes(want) && s0[0].inView, `${tag}: one rendered skyline (.${want}) — got ${JSON.stringify(s0.map((s) => s.cls))}`);
  // 2. anchored, no gap, clipped
  const geo = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const sky = document.querySelector('.sky.s-hero'), city = document.querySelector('.sky.city');
    return { f1: r('.f1').bottom, f2top: r('.f2').top, stage: r('.stage').bottom, hero: sky.getBoundingClientRect().bottom, heroTop: sky.getBoundingClientRect().top, f1top: r('.f1').top, city: city.getBoundingClientRect().bottom, heroOv: getComputedStyle(sky).overflow }; });
  if (env.pinned) ok(Math.abs(geo.city - geo.stage) <= 1, `${tag}: city anchored to the stage bottom ${JSON.stringify(geo)}`);
  else ok(Math.abs(geo.hero - geo.f1) <= 1 && Math.abs(geo.f2top - geo.f1) <= 1 && geo.heroTop >= geo.f1top - 1 && geo.heroOv === 'hidden', `${tag}: hero skyline anchored to the hero bottom, frame 2 follows with no gap, clipped ${JSON.stringify(geo)}`);
  // 3. one accessible skyline image
  ok(s0.filter((s) => s.role === 'img' && s.label).length === 1, `${tag}: one labelled skyline image`);

  // 4. hero text + Register: not covered by the art, contrast >= 4.5 against the brightest pixel behind each text run
  const cover = await p.evaluate(() => [...document.querySelectorAll('.f1 h1, .f1 .tag, .f1 .when, .f1 [data-register], .f1 .regline')].map((e) => { const q = e.getBoundingClientRect(); const x = q.left + Math.min(q.width / 2, 40), y = q.top + q.height / 2; const hit = document.elementFromPoint(x, y); return { s: e.className || e.tagName, onScreen: q.bottom <= innerHeight, ok: !!hit && !hit.closest('.sky') && (e.contains(hit) || hit.contains(e) || hit.closest('.f1 .in') !== null) }; }));
  ok(cover.every((c) => c.ok), `${tag}: hero text / Register uncovered ${JSON.stringify(cover.filter((c) => !c.ok))}`);
  const items = await p.evaluate(() => { const out = []; const wk = document.createTreeWalker(document.querySelector('.f1 .in'), NodeFilter.SHOW_TEXT); const seen = new Set();
    while (wk.nextNode()) { const n = wk.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; if (seen.has(e) || e.closest('.sr,svg,[hidden]')) continue; seen.add(e); const c = getComputedStyle(e); if (c.visibility !== 'visible' || +c.opacity < .5) continue;
      const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width < 2 || b.height < 2 || b.bottom > innerHeight || b.top < 0) continue;
      out.push({ t: n.textContent.trim().slice(0, 24), c: c.color, x: Math.max(0, b.left), y: b.top, w: Math.min(b.width, innerWidth - Math.max(0, b.left)), h: b.height }); }
    const st = document.createElement('style'); st.id = 'sk-hide'; st.textContent = '.f1 *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important} .bolt{display:none} .sp-logos{visibility:hidden} .reg-chip{visibility:hidden} canvas.ember{visibility:hidden} .f1 .in *{animation:none!important}'; document.head.append(st); return out; });
  let worst = [99, ''];
  for (const it of items) { const buf = await p.screenshot({ clip: { x: it.x, y: it.y, width: it.w, height: it.h } }); const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    let mx = 0, mn = 9; for (let k = 0; k < data.length; k += info.channels) { const l = lum(data[k], data[k + 1], data[k + 2]); mx = Math.max(mx, l); mn = Math.min(mn, l); }
    const tl = lum(...it.c.match(/[\d.]+/g).slice(0, 3).map(Number)); const v = tl > mx ? (tl + .05) / (mx + .05) : tl < mn ? (mn + .05) / (tl + .05) : Math.min((tl + .05) / (mx + .05), (mx + .05) / (tl + .05));
    if (v < worst[0]) worst = [v, it.t]; }
  await p.evaluate(() => document.getElementById('sk-hide')?.remove());
  ok(worst[0] >= 4.5, `${tag}: hero text contrast over the art ${worst[0].toFixed(2)} "${worst[1]}"`);
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${mode}-${w}x${h}.png` });

  // 5. scroll sweep through the story: never two skylines on screen; static skyline never leaves the hero
  const steps = await p.evaluate(() => { const s = document.querySelector('.story'); return Math.ceil((s.offsetTop + s.offsetHeight) / (innerHeight * .25)) + 2; });
  let maxOn = 0, leak = 0, drifted = false, styleOk = true;
  for (let i = 0; i <= steps; i++) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(i * h * .25)); await p.waitForTimeout(mode === 'js-off' ? 60 : 140);
    const r = await p.evaluate((probeSrc) => { const probe = eval(probeSrc); const on = probe().filter((s) => s.inView); const sky = document.querySelector('.sky.s-hero'), f1 = document.querySelector('.f1').getBoundingClientRect(), q = sky.getBoundingClientRect();
      const lys = [...sky.querySelectorAll('.ly')].map((l) => getComputedStyle(l).transform);
      return { on: on.length, inHero: getComputedStyle(sky).display === 'none' || (q.bottom <= f1.bottom + 1 && q.top >= f1.top - 1 && getComputedStyle(sky).overflow === 'hidden'), drift: lys.some((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'), inline: sky.getAttribute('style') || '' }; }, `(${probe})`);
    maxOn = Math.max(maxOn, r.on); if (!r.inHero) leak++; if (r.drift) drifted = true; if (r.inline && !/^\s*--sk-p:\s*[\d.]+;?\s*$/.test(r.inline)) styleOk = false;
  }
  ok(maxOn === 1 && !leak, `${tag}: scroll sweep — max skylines on screen ${maxOn}, hero skyline outside the hero at ${leak} stops`);
  ok(styleOk, `${tag}: fallback script writes only --sk-p`);
  if (mode === 'no-timeline' || ((mode === 'firefox' || mode === 'webkit') && !env.pinned)) ok(drifted, `${tag}: fallback drift moves the hero skyline layers on scroll`);
  if (mode === 'reduced' || mode === 'js-off') ok(!drifted, `${tag}: static skyline (no layer transforms)`);
  if (mode === 'motion') { const city = await p.evaluate(async () => { const t = () => getComputedStyle(document.querySelector('.city .ly-front')).transform; scrollTo({ top: 0, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 200)); const a = t(); scrollTo({ top: innerHeight * 1.5, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 300)); return [a, t()]; }); ok(city[0] !== city[1], `${tag}: pinned city dollies with scroll ${JSON.stringify(city)}`); }

  // 6. skyline animations: transform / opacity only; none running under reduced motion
  const anims = await p.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.sky')).map((a) => ({ run: a.playState === 'running', props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)) })));
  ok(anims.every((a) => a.props.every((k) => k === 'transform' || k === 'opacity')), `${tag}: skyline animations use transform/opacity only ${JSON.stringify([...new Set(anims.flatMap((a) => a.props))])}`);
  if (mode === 'reduced') { const run = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length); ok(run === 0, `${tag}: ${run} running animations under reduced motion`); }
  ok(!errs.length, `${tag}: page errors ${errs.join(' | ')}`);
  console.log(tag.padEnd(24), JSON.stringify({ pinned: env.pinned, skyline: s0.map((s) => s.cls.trim()), maxOnScreen: maxOn, drift: drifted, contrast: +worst[0].toFixed(2), skyAnims: anims.length }));
  await ctx.close();
}
await chrome.close(); for (const br of extra) await br.close();
console.log(bad ? `skyline-check FAILED (${bad})` : 'skyline-check ok'); process.exit(bad ? 1 : 0);
