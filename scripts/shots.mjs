// Usage: serve dist on :4321 first (python3 -m http.server 4321 -d dist), then `npm run shots`.
import { chromium } from 'playwright';
const widths = [[390, 844, 'mobile-390'], [820, 1180, 'tablet-820'], [1280, 800, 'desktop-1280']];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [w, h, name] of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/${name}-hero.png` });
  // scroll through to trigger reveals
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += h * 0.6) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(250); }
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `shots/${name}-full.png`, fullPage: true });
  const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal],[data-stagger]')].filter((e) => !e.classList.contains('in')).length);
  console.log(name, 'overflowX:', overflow.sw > overflow.cw, overflow, 'unrevealed:', hidden, 'errors:', errs);
  await ctx.close();
}
await browser.close();
