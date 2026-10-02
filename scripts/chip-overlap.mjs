// Corner chip must not sit on top of page text: for each size and scroll offset where the chip is shown, list text rects intersecting it.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, h] of [[360, 640], [375, 667], [390, 667], [390, 844], [820, 1180], [1024, 768], [1280, 720], [1280, 800], [1920, 1080], [2560, 1080]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
  const F = Math.round(.9 * h); const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); const hits = [];
  for (const y of [1, 2, 3, 4].map((i) => Math.round((i + .6) * F))) { // settled story frames only (text under a fixed chip while scrolling normal sections is transient, like the sticky header)
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const c = document.querySelector('.reg-chip'); if (!c || +getComputedStyle(c).opacity < .5) return null; const q = c.getBoundingClientRect(); const out = [];
      const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (wk.nextNode()) { const n = wk.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; if (e.closest('.reg-chip,.top,.dock,script,style,.sr,svg') ) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue; let f = e.closest('.frame'); if (f && +getComputedStyle(f).opacity < .3) continue; if (e.closest('details:not([open])') && !e.closest('summary')) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const t of rg.getClientRects()) { if (t.width < 2) continue; if (!(t.right <= q.left || t.left >= q.right || t.bottom <= q.top || t.top >= q.bottom)) out.push(n.textContent.trim().slice(0, 30)); } }
      return out; });
    if (r && r.length) hits.push([y, [...new Set(r)].slice(0, 3)]);
  }
  if (hits.length) bad++; console.log(w + 'x' + h, hits.length ? 'OVERLAP ' + JSON.stringify(hits.slice(0, 4)) : 'clear'); await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
