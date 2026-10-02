// Critic P2 checks: (1) Tab-focused stepper Register must not sit under the dock; (4) f6 "See the FAQ" never covered by the dock while the frame is visible.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, h] of [[390, 844], [390, 667], [360, 640]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); const hit = await p.evaluate(() => document.activeElement?.closest('#how .cta') ? 1 : 0); if (hit) break; }
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => { const a = document.activeElement; const q = a.getBoundingClientRect(); const pts = [[.5, .5], [.1, .5], [.9, .5], [.5, .1], [.5, .9]].map(([x, y]) => { const e = document.elementFromPoint(q.left + q.width * x, q.top + q.height * y); return e && (e === a || a.contains(e)); }); return { on: a.textContent.trim().slice(0, 14), top: Math.round(q.top), bottom: Math.round(q.bottom), vh: innerHeight, hits: pts.filter(Boolean).length }; });
  const ok1 = r.hits === 5 && r.bottom <= h; if (!ok1) bad++; console.log(w + 'x' + h, 'stepper Register focus', JSON.stringify(r), ok1 ? 'OK' : 'FAIL');
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const F = Math.round(.9 * h); let covered = 0, n = 0;
  for (let k = 4.9; k <= 6.15; k += 0.025) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(k * F)); await p.waitForTimeout(60);
    const s = await p.evaluate(() => { const f = document.querySelector('.f6'); const cs = getComputedStyle(f); const a = document.querySelector('.f6 .faqlink a'); const q = a.getBoundingClientRect(); if (cs.visibility !== 'visible' || +cs.opacity < .3 || q.bottom < 0 || q.top > innerHeight) return null; const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return e === a || a.contains(e); });
    if (s !== null) { n++; if (!s) covered++; }
  }
  if (covered) bad++; console.log(w + 'x' + h, 'FAQ link samples', n, 'covered', covered, covered ? 'FAIL' : 'OK');
}
await b.close(); process.exit(bad ? 1 : 0);
