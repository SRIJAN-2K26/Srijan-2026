// Registration countdown with a faked clock at 3 points (+ reduced-motion + JS-off). Screenshots to /workspace/shots-countdown/.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-countdown';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const states = [
  ['early', '2026-10-03T03:30:00+05:30', /^Registration closes in 8d 08h (29|30)m$/],
  ['1min', '2026-10-11T11:59:00+05:30', /^Registration closes in (1m 00s|0m 5\d s|0m \d\ds|1m 0\ds|0m 5\ds)$/],
  ['closed', '2026-10-11T12:05:00+05:30', /^Registration closed$/],
];
const sizes = [[360, 640], [390, 667], [1280, 800]];
for (const [name, iso, re] of states) for (const [w, h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); // visitor TZ deliberately not IST
  const p = await ctx.newPage(); const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.clock.install({ time: new Date(iso) });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2400); await p.clock.runFor(1500);
  const r = await p.evaluate(() => { const l = document.querySelector('.f1 .regline'); const q = l.getBoundingClientRect(); const reg = document.querySelector('.f1 [data-register]').getBoundingClientRect(); const rs = getComputedStyle(document.querySelector('.f1 [data-register]'));
    return { text: l.textContent.trim(), state: l.dataset.state, live: l.getAttribute('aria-live'), lineH: Math.round(q.height), lineW: Math.round(q.width), lineRight: Math.round(q.right), regBottom: Math.round(reg.bottom), regDisabled: rs.pointerEvents === 'none' || rs.display === 'none' || rs.visibility === 'hidden', href: document.querySelector('.f1 [data-register]').href, ov: document.documentElement.scrollWidth > innerWidth, oneLine: q.height < 30 && l.scrollWidth <= l.clientWidth + 1 }; });
  console.log(name, w + 'x' + h, JSON.stringify(r), 'errs', errs.length);
  ok(re.test(r.text), `${name} text "${r.text}"`); ok(r.live === 'off', 'aria-live'); ok(!r.regDisabled && /forms\.gle/.test(r.href), 'register usable'); ok(!r.ov && r.oneLine && r.lineRight <= w, 'layout'); ok(!errs.length, 'errors');
  if (h <= 667) ok(r.regBottom <= h - 12, 'register above fold');
  if (w !== 390) await p.screenshot({ path: `${OUT}/${name}-${w}x${h}.png` });
  // last frame state too
  if (w === 360) { await p.evaluate((F) => window.scrollTo({ top: Math.round(5.5 * F), behavior: 'instant' }), Math.round(.9 * h)); await p.waitForTimeout(700);
    const f = await p.evaluate(() => { const l = document.querySelector('.f6 .regline'); const q = l.getBoundingClientRect(); const reg = document.querySelector('.f6 [data-register]').getBoundingClientRect(); return { text: l.textContent.trim(), top: Math.round(q.top), bottom: Math.round(q.bottom), regTop: Math.round(reg.top), regBottom: Math.round(reg.bottom), vh: innerHeight }; });
    console.log('  f6', JSON.stringify(f)); ok(f.text === r.text || name !== 'closed' || f.text === 'Registration closed', 'f6 text'); ok(f.bottom <= f.vh, 'f6 visible');
    await p.screenshot({ path: `${OUT}/${name}-f6-${w}x${h}.png` }); }
  await ctx.close();
}
// reduced motion: static deadline text before close, "closed" after close
for (const [name, iso, want] of [['reduced-before', '2026-10-03T03:30:00+05:30', 'Registration closes 11 Oct 2026, 12:00 PM IST'], ['reduced-after', '2026-10-11T12:05:00+05:30', 'Registration closed']]) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, reducedMotion: 'reduce', timezoneId: 'Pacific/Auckland' }); const p = await ctx.newPage();
  await p.clock.install({ time: new Date(iso) }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(800); await p.clock.runFor(3000);
  const t = await p.evaluate(() => [document.querySelector('.f1 .regline').textContent.trim(), document.getAnimations().length]); console.log(name, JSON.stringify(t)); ok(t[0] === want && t[1] === 0, name);
  if (name === 'reduced-before') await p.screenshot({ path: `${OUT}/reduced-static-360x640.png` });
  await ctx.close();
}
// JS off: static text, Register visible
{ const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' });
  const t = await p.evaluate(() => [document.querySelector('.f1 .regline').textContent.trim(), document.querySelector('.f1 .regline').getBoundingClientRect().height, document.querySelector('.f1 [data-register]').getBoundingClientRect().bottom]); console.log('js-off', JSON.stringify(t));
  ok(t[0] === 'Registration closes 11 Oct 2026, 12:00 PM IST' && t[1] < 30, 'js-off static'); await ctx.close(); }
await b.close(); process.exit(bad ? 1 : 0);
