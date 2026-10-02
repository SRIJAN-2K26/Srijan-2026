// Hero fit: Register fully visible in the first viewport (no scroll), sponsor row on one line, no horizontal overflow.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, h] of [[360, 640], [375, 667], [390, 667], [390, 844], [820, 800], [820, 1180], [1024, 768], [1280, 720], [1366, 768], [1280, 800], [1920, 1080]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(2200);
  const r = await p.evaluate(() => { const reg = document.querySelector('.f1 [data-register]').getBoundingClientRect(); const li = [...document.querySelectorAll('.f1 .sp-logos li')].map((e) => e.getBoundingClientRect()); const st = document.querySelector('.stage').getBoundingClientRect();
    return { regBottom: Math.round(reg.bottom), vh: innerHeight, stageBottom: Math.round(st.bottom), logoH: Math.round(li[0].height), oneRow: new Set(li.map((e) => Math.round(e.top))).size === 1, logosRight: Math.round(li.at(-1).right), ovX: document.documentElement.scrollWidth > innerWidth }; });
  const ok = r.regBottom <= r.stageBottom && r.regBottom <= h && r.oneRow && r.logosRight <= w - 12 && !r.ovX; if (!ok) bad++;
  console.log(w + 'x' + h, JSON.stringify(r), ok ? 'OK' : 'FAIL');
  await p.screenshot({ path: `/workspace/shots-skyline/hero-${w}x${h}.png` });
}
await b.close(); process.exit(bad ? 1 : 0);
