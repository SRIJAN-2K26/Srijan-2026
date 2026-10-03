// Fee-block screenshots, JS-off render, reduced-motion (0 running animations), overflow + console errors across sizes.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-skyline';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
for (const [w, h] of [[360, 640], [1280, 800]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.querySelector('.fee').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/fee-${w}.png` });
  const r = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth > innerWidth, tiers: [...document.querySelectorAll('.fee-tiers li')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()) }));
  console.log(w, JSON.stringify(r)); ok(!r.ov, 'overflow ' + w);
}
for (const mode of ['js-off', 'reduced']) for (const [w, h] of [[360, 640], [390, 844], [820, 1180], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: mode !== 'js-off', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const vis = (s) => { const e = document.querySelector(s); if (!e) return false; const c = getComputedStyle(e); const q = e.getBoundingClientRect(); return c.visibility !== 'hidden' && +c.opacity > 0.9 && q.width > 0 && q.height > 0; };
    return { h1: vis('h1'), reg: vis('.f1 [data-register]'), logos: document.querySelectorAll('.f1 .sp-logos img').length, domains: document.querySelectorAll('.f3 .dom').length, dcards: document.querySelectorAll('.dcards, .plain-doms').length, faq: document.querySelectorAll('.faq details').length, steps: document.querySelectorAll('.stp').length, fee: vis('.fee-tiers'), anims: document.getAnimations().length, ov: document.documentElement.scrollWidth > innerWidth }; });
  if (mode === 'reduced') { await p.evaluate(() => window.scrollTo(0, 3000)); await p.waitForTimeout(300); r.animsAfterScroll = await p.evaluate(() => document.getAnimations().length); }
  console.log(mode, w + 'x' + h, JSON.stringify(r), 'errs', errs.length);
  ok(r.h1 && r.reg && r.logos === 3 && r.domains === 6 && r.dcards === 0 && r.steps === 5 && r.faq >= 8 && !r.ov && !errs.length, mode + ' ' + w);
  if (mode === 'reduced') ok(r.anims === 0 && r.animsAfterScroll === 0, 'running animations under reduced motion');
  await ctx.close();
}
await b.close(); process.exit(bad ? 1 : 0);
