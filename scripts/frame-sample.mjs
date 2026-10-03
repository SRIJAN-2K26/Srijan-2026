// Frame-time / long-task sample while scrolling the whole page with every effect on.
// desktop: real wheel events (Lenis smoothing active); mobile: touch context, programmatic rAF scroll (native scrolling), optional CPU throttle.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const run = async (label, w, h, mobile, throttle, wheel = !mobile, hide = '') => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.addInitScript(() => { window.__ft = []; window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch {} });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__ft = []; window.__lt.length = 0; let last = performance.now(); const t = (n) => { window.__ft.push(n - last); last = n; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (hide) await p.addStyleTag({ content: hide });
  if (wheel) { await p.mouse.move(w / 2, h / 2); let y = 0; while (y < total) { await p.mouse.wheel(0, 100); await p.waitForTimeout(16); y += 100; } await p.waitForTimeout(1500); }
  else { await p.evaluate(() => new Promise((res) => { const tot = document.documentElement.scrollHeight - innerHeight; const step = () => { scrollTo({ top: scrollY + (innerWidth > 800 ? 28 : 14), behavior: 'instant' }); if (scrollY < tot - 2) requestAnimationFrame(step); else res(); }; step(); })); await p.waitForTimeout(800); }
  const r = await p.evaluate(() => ({ ft: window.__ft.slice(1), lt: window.__lt, y: scrollY, tot: document.documentElement.scrollHeight - innerHeight }));
  const s = [...r.ft].sort((a, c) => a - c), q = (f) => +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(1);
  const jank = r.ft.filter((x) => x > 33.4).length;
  console.log(`${label}: frames ${r.ft.length}, p50 ${q(.5)} ms, p95 ${q(.95)} ms, p99 ${q(.99)} ms, max ${Math.max(...r.ft).toFixed(1)} ms, frames>33ms ${jank}, long tasks ${r.lt.length}${r.lt.length ? ' [' + r.lt.join(',') + ' ms]' : ''}, scrolled ${Math.round(r.y)}/${Math.round(r.tot)}`);
  await ctx.close();
};
await run('desktop 1280x800 (wheel+Lenis)', 1280, 800, false, 1);
await run('desktop 1280x800 (rAF scroll 28px/frame)', 1280, 800, false, 1, false);
await run('desktop 1280x800 (wheel+Lenis, ember canvas hidden — baseline)', 1280, 800, false, 1, true, 'canvas.ember{display:none!important}');


await run('mobile 390x844 (touch, native scroll)', 390, 844, true, 1);
await run('mobile 390x844 (touch, 4x CPU throttle)', 390, 844, true, 4);
await b.close();
