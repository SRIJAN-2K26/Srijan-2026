// Ember background: rAF callback cost (avg/p95), frame pacing, console errors, reduced motion (no rAF, 0 animations), JS-off, screenshots.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-ember';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const hook = () => { window.__cb = []; window.__fr = []; let lastT = 0; const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); window.__cb.push(performance.now() - s); if (lastT) window.__fr.push(t - lastT); lastT = t; }); };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))] || 0; };
for (const [w, h, mobile] of [[390, 844, true], [1280, 800, false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 3 : 1, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage(); const errs = []; p.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(hook); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2800);
  await p.screenshot({ path: `${OUT}/hero-${w}x${h}-nopointer.png` });
  const cv = await p.evaluate(() => { const c = document.querySelector('canvas.ember'); const r = c.getBoundingClientRect(); const cs = getComputedStyle(c); return { w: c.width, h: c.height, css: [Math.round(r.width), Math.round(r.height)], pos: cs.position, z: cs.zIndex, pe: cs.pointerEvents, aria: c.getAttribute('aria-hidden') }; });
  console.log(w + 'x' + h, 'canvas', JSON.stringify(cv)); ok(cv.pos === 'fixed' && cv.z === '0' && cv.pe === 'none' && cv.aria === 'true', 'canvas style');
  await p.evaluate(() => { window.__cb.length = 0; window.__fr.length = 0; }); await p.waitForTimeout(8000);
  const m = await p.evaluate(() => ({ cb: window.__cb, fr: window.__fr }));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  console.log(w + 'x' + h, 'rAF callbacks', m.cb.length, 'cb ms avg', avg(m.cb).toFixed(2), 'p95', pct(m.cb, .95).toFixed(2), 'max', Math.max(...m.cb).toFixed(2), '| frame interval avg', avg(m.fr).toFixed(1), 'p95', pct(m.fr, .95).toFixed(1), 'fps~', (1000 / avg(m.fr)).toFixed(0));
  ok(m.cb.length > 60, 'loop running'); ok(pct(m.cb, .95) < 8, 'cb p95 < 8ms');
  // pointer near the sparks (centre-lower area), then screenshot; pull toward the pointer
  const x = Math.round(w * .5), y = Math.round(h * .62);
  if (mobile) { await p.touchscreen.tap(x, y); } await p.mouse.move(x - 150, y + 60); await p.mouse.move(x, y, { steps: 12 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/hero-${w}x${h}-pointer.png` });
  // scrolled mid-story
  await p.evaluate((F) => scrollTo({ top: Math.round(2.6 * F), behavior: 'instant' }), Math.round(.9 * h)); await p.waitForTimeout(900);
  await p.mouse.move(x + 30, y - 40, { steps: 6 }); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/story-${w}x${h}-pointer.png` });
  await p.evaluate(() => scrollTo({ top: 1.6 * innerHeight * 5, behavior: 'instant' })); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/about-${w}x${h}.png` });
  // hidden tab pauses the loop
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); window.__cb.length = 0; }); await p.waitForTimeout(1200);
  const paused = await p.evaluate(() => window.__cb.length); console.log(w + 'x' + h, 'callbacks while hidden', paused); ok(paused <= 1, 'pause when hidden');
  console.log(w + 'x' + h, 'console errors/warnings', errs.length, errs.slice(0, 2)); ok(!errs.length, 'console errors');
  await ctx.close();
}
for (const w of [360, 390, 820, 1280, 1920, 2560]) { const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 800 : 900 } }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1800);
  const o = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth > innerWidth, cw: document.querySelector('canvas.ember').getBoundingClientRect().width === innerWidth })); ok(!o.ov && o.cw, 'overflow ' + w); console.log('overflow', w, JSON.stringify(o)); await ctx.close(); }
// reduced motion: no rAF loop, 0 animations, canvas painted
for (const [w, h] of [[390, 844], [1280, 800]]) { const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.addInitScript(hook); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const c = document.querySelector('canvas.ember'); const d = c.getContext('2d').getImageData(0, 0, 40, 40).data; return { raf: window.__cb.length, anims: document.getAnimations().length, painted: c.width > 300 && d.some((v, i) => i % 4 === 0 && v > 12) }; });
  console.log('reduced', w + 'x' + h, JSON.stringify(r)); ok(r.raf === 0 && r.anims === 0 && r.painted, 'reduced motion'); await p.screenshot({ path: `${OUT}/reduced-${w}x${h}.png` }); await ctx.close(); }
// JS off
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ h1: !!document.querySelector('h1'), bg: getComputedStyle(document.querySelector('canvas.ember')).backgroundColor, ov: document.documentElement.scrollWidth > innerWidth })); console.log('js-off', JSON.stringify(r)); ok(r.h1 && !r.ov, 'js-off'); await p.screenshot({ path: `${OUT}/jsoff-390x844.png` }); await ctx.close(); }
await b.close(); process.exit(bad ? 1 : 0);
