// Path frame (frame 4) on very short phones: the schedule link and the "Detailed times coming soon" footnote must sit above the sticky Register dock.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } else console.log('ok  ', m); };
for (const [w, h] of [[320, 520], [320, 568], [320, 640], [360, 640], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  for (const k of [3.45, 3.55, 3.7]) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(k * 0.9 * h)); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); const d = document.querySelector('.dock .btn').getBoundingClientRect(); const dk = getComputedStyle(document.querySelector('.dock')); const f = q('.f4 .flink'), n = q('.f4 .soonnote'); const frame = q('.f4'); const items = [...document.querySelectorAll('.f4 .st, .f4 .top')].map((e) => e.getBoundingClientRect()); const hit = document.elementFromPoint(f.left + f.width / 2, f.top + f.height / 2); return { dockTop: Math.round(d.top), dockOn: dk.visibility !== 'hidden' && dk.display !== 'none', link: [Math.round(f.top), Math.round(f.bottom)], note: [Math.round(n.top), Math.round(n.bottom)], linkHit: hit?.closest('a')?.className, firstTop: Math.round(Math.min(...items.map((i) => i.top))), vw: document.documentElement.scrollWidth <= innerWidth, noteRight: Math.round(n.right) }; });
    console.log(`${w}x${h} @${k}F`, JSON.stringify(r));
    ok(r.link[1] <= r.dockTop && r.note[1] <= r.dockTop && r.linkHit === 'flink' && r.vw && r.noteRight <= w, `${w}x${h} @${k}F: schedule link + footnote above the dock, link tappable, no overflow`);
  }
  await ctx.close();
}
await b.close(); process.exit(bad ? 1 : 0);
