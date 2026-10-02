// Worst-case text contrast over art: hide text, sample brightest bg pixel behind each text element, compare to its colour.
import { chromium } from 'playwright';
import sharp from 'sharp';
const BASE = process.env.BASE || 'http://localhost:4393/';
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const parse = (s) => s.match(/[\d.]+/g).map(Number);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [w, h] of (process.env.SIZES ? JSON.parse(process.env.SIZES) : [[390, 844], [1280, 800]])) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(2800);
  const F = Math.round(.9 * h); let worst = [99, ''];
  for (let i = 0; i < 6; i++) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round((i + (i ? .6 : .02)) * F)); await p.waitForTimeout(300);
    const items = await p.evaluate((i) => {
      const f = document.querySelectorAll('.frame')[i]; const out = [];
      const wk = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (wk.nextNode()) { const n = wk.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; if (seen.has(e) || e.closest('.sr,svg')) continue; seen.add(e);
        const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width < 2) continue;
        out.push({ t: n.textContent.trim().slice(0, 24), c: getComputedStyle(e).color, x: Math.max(0, b.left), y: Math.max(0, b.top), w: Math.min(b.width, innerWidth - b.left), h: b.height }); }
      const st = document.createElement('style'); st.id = 'hide'; st.textContent = '.frame *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important} .bolt{display:none} .sp-logos{visibility:hidden}'; document.head.append(st);
      return out; }, i);
    for (const it of items) {
      if (it.w < 2 || it.h < 2) continue;
      const buf = await p.screenshot({ clip: { x: it.x, y: it.y, width: it.w, height: it.h } });
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      let mx = 0, mn = 9; for (let k = 0; k < data.length; k += info.channels) { const l = lum(data[k], data[k + 1], data[k + 2]); if (l > mx) mx = l; if (l < mn) mn = l; }
      const [r, g, bb] = parse(it.c); const tl = lum(r, g, bb);
      const cr = tl > mx ? (tl + .05) / (mx + .05) : (mx + .05) / (tl + .05); // vs brightest bg if text brighter... use worst-case:
      const crMin = tl >= mn ? (tl + .05) / (mx + .05) : 0; // text lighter than darkest; compare to brightest bg
      const val = tl > mx ? (tl + .05) / (mx + .05) : tl < mn ? (mn + .05) / (tl + .05) : Math.min((tl + .05) / (mx + .05), (mx + .05) / (tl + .05));
      if (val < worst[0]) worst = [val, `f${i + 1} "${it.t}" ${it.c}`];
      if (val < 4.5) console.log(JSON.stringify([it.x,it.y,it.w,it.h].map(Math.round)), w, `f${i + 1}`, JSON.stringify(it.t), it.c, 'worst-bg lum', mx.toFixed(3), 'ratio', val.toFixed(2));
    }
    await p.evaluate(() => document.getElementById('hide')?.remove());
  }
  console.log(w, 'WORST', worst[0].toFixed(2), worst[1]);
}
await b.close();
