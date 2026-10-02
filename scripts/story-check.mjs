// Story checks: per-frame fit inside the pinned stage, Register reachability, console errors, screenshots per frame.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/';
fs.mkdirSync('shots', { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const sizes = [[390, 844], [390, 667], [820, 1180], [1280, 720], [1280, 800]];
for (const reduce of [false, true]) for (const [w, h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1600);
  const tag = `${reduce ? 'rm-' : ''}${w}x${h}`;
  if (reduce) {
    const r = await p.evaluate(() => ({ docH: document.documentElement.scrollHeight, frames: [...document.querySelectorAll('.frame')].map((f) => { const c = getComputedStyle(f); return [c.opacity, c.visibility, c.position, Math.round(f.getBoundingClientRect().height)].join('/'); }), anims: document.getAnimations().length, ovX: document.documentElement.scrollWidth > innerWidth }));
    console.log(tag, JSON.stringify(r), 'errs', errs.length);
    if (h === 844 || h === 720) await p.screenshot({ path: `shots/${tag}-full.png`, fullPage: true });
  } else {
    const info = await p.evaluate(() => { const s = document.querySelector('.stage').getBoundingClientRect(); return { stageH: Math.round(s.height), F: Math.round(0.9 * innerHeight), pinned: getComputedStyle(document.querySelector('.stage')).position }; });
    const rows = [];
    for (let i = 0; i < 6; i++) {
      const y = Math.round((i + (i === 0 ? 0.02 : 0.55)) * info.F);
      await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(250);
      const r = await p.evaluate((i) => {
        const st = document.querySelector('.stage').getBoundingClientRect(); const f = document.querySelectorAll('.frame')[i];
        const cs = getComputedStyle(f); const kids = [...f.querySelectorAll('.in,.f-copy,.doms,.steps5,.f-art,.sub')].filter((e) => !e.closest('.f-art') || e.classList.contains('f-art'));
        let maxB = 0, minT = 1e9; kids.forEach((k) => { const r = k.getBoundingClientRect(); maxB = Math.max(maxB, r.bottom); minT = Math.min(minT, r.top); });
        const reg = f.querySelector('[data-register]')?.getBoundingClientRect();
        const dock = getComputedStyle(document.querySelector('.dock-in'));
        const vis = [...document.querySelectorAll('.frame')].filter((x) => getComputedStyle(x).visibility === 'visible' && +getComputedStyle(x).opacity > 0.5).length;
        return { op: cs.opacity, visFrames: vis, fitsStage: maxB <= st.bottom + 1 && minT >= st.top - 1, over: Math.round(maxB - st.bottom), reg: reg && [Math.round(reg.top), Math.round(reg.bottom)], dockVisible: dock.visibility === 'visible' && +dock.opacity > 0.5, ovX: document.documentElement.scrollWidth > innerWidth };
      }, i);
      rows.push(r);
      await p.screenshot({ path: `shots/${tag}-f${i + 1}.png` });
    }
    console.log(tag, JSON.stringify(info)); rows.forEach((r, i) => console.log('  f' + (i + 1), JSON.stringify(r))); console.log('  errs', errs.length, errs.slice(0, 2));
  }
  await ctx.close();
}
await b.close();
