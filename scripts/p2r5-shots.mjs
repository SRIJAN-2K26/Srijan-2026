// Screenshots for the round-5 P2 fixes -> /workspace/shots-p2r5/
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-p2r5';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const open = async (w, h, iso) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); if (iso) await p.clock.install({ time: new Date(iso) }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2600); if (iso) await p.clock.runFor(1500); return p; };
for (const [w, h] of [[360, 640], [390, 667]]) { const p = await open(w, h); await p.screenshot({ path: `${OUT}/hero-${w}x${h}.png` }); await p.close(); }
for (const [w, h] of [[360, 640], [390, 844]]) { const p = await open(w, h); const q = await p.evaluate(() => { const r = document.querySelector('.sp-logos').getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; }); await p.screenshot({ path: `${OUT}/sponsors-row-${w}x${h}.png`, clip: { x: 0, y: Math.max(0, q.y - 40), width: w, height: q.h + 70 } }); await p.close(); }
for (const [w, h] of [[360, 640], [1280, 800]]) { const p = await open(w, h); await p.evaluate(() => document.querySelector('.fee-h').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/fee-tiles-${w}x${h}.png` }); await p.close(); }
for (const [w, h] of [[360, 640], [1280, 800]]) {
  const p = await open(w, h, '2026-10-10T12:00:00+05:30'); await p.screenshot({ path: `${OUT}/lastday-${w}x${h}.png` }); await p.close();
  const c = await open(w, h, '2026-10-11T12:05:00+05:30'); await c.screenshot({ path: `${OUT}/closed-hero-${w}x${h}.png` });
  await c.evaluate((F) => scrollTo({ top: Math.round(5.5 * F), behavior: 'instant' }), Math.round(.9 * h)); await c.waitForTimeout(800); await c.screenshot({ path: `${OUT}/closed-lastframe-${w}x${h}.png` });
  await c.evaluate(() => document.querySelector('#faq details:has([data-reg-faq])').open = true); await c.evaluate(() => document.querySelector('[data-reg-faq]').scrollIntoView({ block: 'center', behavior: 'instant' })); await c.waitForTimeout(700); await c.screenshot({ path: `${OUT}/closed-faq-${w}x${h}.png` });
  await c.close();
}
await b.close();
