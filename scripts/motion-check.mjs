// Motion layer checks (Lenis, spotlight, anchors, keyboard, reduced motion). Sections are appended per feature.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const sy = (p) => p.evaluate(() => Math.round(scrollY));
// ── 1. Lenis + spotlight ──
for (const [w, h] of [[1280, 800], [1920, 1080]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => document.documentElement.classList.contains('lenis')), 'lenis active ' + w);
  await p.mouse.move(w / 2, h / 2); await p.mouse.wheel(0, 600); await p.waitForTimeout(120); const mid = await sy(p); await p.waitForTimeout(1500); const end = await sy(p);
  console.log(w + 'x' + h, 'wheel 600 -> after 120ms', mid, 'settled', end); ok(mid > 0 && mid < end && end > 450 && end < 750, 'inertial wheel scroll (eased, not instant)');
  // pinned story intact after smooth scroll: frame 3 active at 2.5F
  await p.evaluate((F) => scrollTo({ top: Math.round(2.55 * F), behavior: 'instant' }), Math.round(.9 * h)); await p.waitForTimeout(900);
  const f = await p.evaluate(() => [...document.querySelectorAll('.frame')].map((e) => +getComputedStyle(e).opacity)); console.log(' frame opacities at 2.55F', JSON.stringify(f)); ok(f[2] > .95 && f.filter((o) => o > .5).length === 1, 'pinned frame 3 active');
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(500);
  // nav anchors (data-f) land on the frame
  for (const [label, fi] of [['Prizes', 4], ['Sponsors', 5]]) { const a = p.locator(`.top nav a:has-text("${label}")`).first(); if (await a.count()) { await a.click(); await p.waitForTimeout(2200); const y = await sy(p), want = Math.round((fi + .5) * .9 * h); console.log(' nav', label, y, 'want', want); ok(Math.abs(y - want) < 6, 'nav anchor ' + label); } }
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(400);
  // skip link: scroll to About, focus lands on it
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200);
  await p.keyboard.press('Tab'); const skipFocus = await p.evaluate(() => document.activeElement.className); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const sk = await p.evaluate(() => ({ y: Math.round(scrollY), top: Math.round(document.getElementById('about').getBoundingClientRect().top), focus: document.activeElement.id, vh: innerHeight }));
  console.log(' skip', skipFocus, JSON.stringify(sk)); ok(skipFocus === 'skip' && sk.focus === 'about' && Math.abs(sk.top - 80) < 6, 'skip link scrolls to About with focus');
  const abt = await p.evaluate(() => { scrollTo({ top: 0, behavior: 'instant' }); return +(document.getElementById('about').getBoundingClientRect().top / innerHeight).toFixed(2); }); console.log(' About top at', abt, 'vh'); ok(abt > 6.3 && abt < 6.8, 'About ~6.5vh baseline');
  // keyboard: PageDown, Space, End, Home
  await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(300);
  await p.keyboard.press('PageDown'); await p.waitForTimeout(900); const a1 = await sy(p); await p.keyboard.press('Space'); await p.waitForTimeout(900); const a2 = await sy(p); await p.keyboard.press('End'); await p.waitForTimeout(1500); const a3 = await sy(p); const mx = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); await p.keyboard.press('Home'); await p.waitForTimeout(1500); const a4 = await sy(p);
  console.log(' keys PageDown', a1, 'Space', a2, 'End', a3, '/', mx, 'Home', a4); ok(a1 > 100 && a2 > a1 && a3 >= mx - 3 && a4 <= 2, 'keyboard scrolling');
  // spotlight
  const sp = await p.evaluate(() => { const s = document.querySelector('.spot'); return s ? { pe: getComputedStyle(s).pointerEvents, aria: s.getAttribute('aria-hidden') } : null; }); ok(sp && sp.pe === 'none' && sp.aria === 'true', 'spotlight present');
  await p.mouse.move(300, 300); await p.mouse.move(900, 500, { steps: 10 }); await p.waitForTimeout(2000); const spx = await p.evaluate(() => { const s = document.querySelector('.spot'); const r = s.getBoundingClientRect(); return { op: +getComputedStyle(s).opacity, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; }); console.log(' spotlight', JSON.stringify(spx)); ok(spx.op === 1 && Math.abs(spx.cx - 900) < 12 && Math.abs(spx.cy - 500) < 12, 'spotlight tracks pointer (damped)');
  ok(!errs.length, 'console errors ' + errs.join('|')); await ctx.close();
}
// touch: no spotlight, native momentum (no lenis smoothing of touch)
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const t = await p.evaluate(() => ({ spot: !!document.querySelector('.spot'), lenisSyncTouch: document.documentElement.className })); console.log('touch', JSON.stringify(t)); ok(!t.spot, 'no spotlight on touch'); await ctx.close(); }
// reduced motion: no Lenis, no spotlight, 0 animations, native anchor scrolling still works
for (const [w, h] of [[390, 844], [1280, 800]]) { const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const r = await p.evaluate(() => ({ lenis: document.documentElement.classList.contains('lenis'), spot: !!document.querySelector('.spot'), anims: document.getAnimations().length }));
  await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(800); r.skipY = await sy(p); console.log('reduced', w + 'x' + h, JSON.stringify(r)); ok(!r.lenis && !r.spot && r.anims === 0 && r.skipY > 300, 'reduced motion: no lenis/spotlight, native skip'); await ctx.close(); }
await b.close(); process.exit(bad ? 1 : 0);
