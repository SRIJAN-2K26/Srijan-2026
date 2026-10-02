// Screenshots through the pinned story at 6 sizes. Usage: BASE=http://localhost:4393/ OUT=/workspace/shots-skyline node scripts/story-shots.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || 'shots-story';
fs.mkdirSync(OUT, { recursive: true });
const sizes = [[360, 640], [390, 844], [820, 1180], [1280, 800], [1920, 1080], [2560, 1080]];
const pts = [0.02, 0.5, 1.55, 2.55, 3.55, 4.55, 5.5];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [w, h] of sizes) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
  const F = Math.round(0.9 * h);
  for (let k = 0; k < pts.length; k++) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(pts[k] * F)); await p.waitForTimeout(450);
    await p.screenshot({ path: `${OUT}/${w}x${h}-s${k}.png` });
  }
  const ov = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  console.log(w + 'x' + h, 'overflowX', ov[0] > ov[1], 'errs', errs);
  await p.context().close();
}
await b.close();
