// P1 check: on short phones, the "See all domains" link in the domains frame must not sit under the sticky Register dock.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, h] of [[390, 667], [375, 667], [360, 640], [390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  for (const [name, sel, frame] of [['path', '.f4 .flink', 3]]) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round((frame + 0.55) * 0.9 * h)); await p.waitForTimeout(400);
    const r = await p.evaluate((sel) => { const a = document.querySelector(sel).getBoundingClientRect(); const x = a.left + a.width / 2, y = a.top + a.height / 2; const el = document.elementFromPoint(x, y); return { y: Math.round(y), hit: el && (el.closest('a')?.className || el.tagName), ok: !!el && el.closest(sel.split(' ')[1]) === document.querySelector(sel) }; }, sel);
    console.log(w + 'x' + h, name, JSON.stringify(r)); if (!r.ok) bad++;
  }
}
await b.close(); process.exit(bad ? 1 : 0);
