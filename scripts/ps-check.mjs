// Problem-statements list checks (BASE defaults to http://localhost:4393/). Needs the built site served + the brief at MD.
//  • 15 rows, titles verbatim from the brief, descriptions = the softened lines, no scores / digits / banned words
//  • summary >= 44px at 320/360/390/1280, no horizontal scroll at 320 (also with every row open), visible focus ring
//  • Enter / Space toggle rows; JS off: all text in the page and rows still open; reduced motion: 0 running animations
//  • CLS 0 when a row opens (mouse and keyboard), a Register button stays on screen, nothing above the list moves
import fs from 'fs';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const MD = process.env.MD || '/workspace/srijan/brief/problem-statements-softened.md';
const want = fs.readFileSync(MD, 'utf8').split('\n').filter((l) => /^\d+\. /.test(l)).map((l) => { const m = l.match(/^\d+\. (.+?) — (.+)$/); return { title: m[1], text: m[2] }; });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; return c; };
const hook = () => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); };
const read = () => [...document.querySelectorAll('#problem-statements .ps-list > li')].map((li) => ({ title: li.querySelector('.ps-t')?.textContent.trim(), text: li.querySelector('.ps-d')?.textContent.trim() }));
ok(want.length === 15, `brief has ${want.length} statements`);

// ── content (JS on, 1280)
{
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); await p.goto(BASE, { waitUntil: 'load' });
  const got = await p.evaluate(read); ok(got.length === 15, `${got.length} rows`);
  ok(got.every((g, i) => g.title === want[i]?.title), 'titles match the brief verbatim, in order');
  ok(got.every((g, i) => g.text === want[i]?.text), 'descriptions match the softened lines verbatim');
  const sec = await p.evaluate(() => document.querySelector('#problem-statements').textContent.replace(/\s+/g, ' '));
  ok(/Problem statements/.test(sec) && sec.includes('Draft list, final list soon.'), 'heading "Problem statements" + note "Draft list, final list soon."');
  const body = got.map((g) => g.title + ' ' + g.text).join(' ');
  ok(!/\d/.test(body) && !/score/i.test(sec), 'no digits / "Score" in titles or descriptions');
  ok(!/\bprizes?\b|\bcash\b|\bpool\b|top 75|48 hours|\bwin(ner|ners|ning)?\b/i.test(sec), 'no banned words in the section');
  const all = await p.evaluate(() => document.body.innerText + ' ' + document.documentElement.innerHTML.replace(/<[^>]+>/g, ' '));
  ok(!/announced soon/i.test(all.replace(/Breakdown announced soon|The breakdown is announced soon/g, '')), 'no leftover "announced soon" besides the rewards breakdown');
  ok(!/Problem statements (are )?announced soon/i.test(all), 'old placeholder text gone');
  ok((await p.$$('#problem-statements details[open]')).length === 0, 'all rows collapsed by default');
  ok((await p.$$('#problem-statements details')).length === 15 && (await p.$$('#problem-statements script')).length === 0, 'native <details>, no inline script');
  ok(await p.evaluate(() => /Draft list, final list soon/.test(document.querySelector('.ps-note').textContent) && getComputedStyle(document.querySelector('.ps-note')).display !== 'none'), 'note visible');
  await p.context().close();
}

// ── per size: tap target, overflow, open row keeps Register on screen, CLS 0
for (const [w, h] of [[320, 700], [360, 800], [390, 844], [1280, 800]]) {
  const tag = `${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 }); await ctx.addInitScript(hook);
  const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const hs = await p.evaluate(() => [...document.querySelectorAll('.ps-list summary')].map((s) => s.getBoundingClientRect().height));
  ok(hs.length === 15 && Math.min(...hs) >= 44, `${tag}: summary heights min ${Math.min(...hs).toFixed(1)} max ${Math.max(...hs).toFixed(1)} (>=44)`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${tag}: no horizontal scroll (collapsed)`);
  await p.evaluate(() => document.querySelector('#problem-statements').scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(800);
  const cls0 = await p.evaluate(() => window.__cls);
  const first = p.locator('.ps-list summary').nth(2);
  const before = await p.evaluate(() => ({ y: document.querySelector('#problem-statements h2').getBoundingClientRect().top + scrollY, f: document.querySelector('.ps-list li:nth-child(3)').getBoundingClientRect().top + scrollY }));
  if (w < 800) await first.tap(); else await first.click();
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const d = document.querySelectorAll('.ps-list details')[2]; const vis = [...document.querySelectorAll('[data-reg-btn]')].filter((a) => { const s = getComputedStyle(a); const r = a.getBoundingClientRect(); const hidden = s.visibility === 'hidden' || s.display === 'none' || +s.opacity < .5 || !r.width || a.closest('.menu:not([open]) ul'); return !hidden && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }).length;
    const dr = d.querySelector('.ps-d').getBoundingClientRect();
    return { open: d.open, descVisible: dr.height > 0 && dr.bottom <= innerHeight + 1, cls: window.__cls, reg: vis, y: document.querySelector('#problem-statements h2').getBoundingClientRect().top + scrollY, f: document.querySelector('.ps-list li:nth-child(3)').getBoundingClientRect().top + scrollY, sw: document.documentElement.scrollWidth <= document.documentElement.clientWidth };
  });
  ok(r.open && r.descVisible, `${tag}: row opens, description visible on screen`);
  ok(r.cls === cls0 && r.cls === 0, `${tag}: CLS ${r.cls} after opening a row (0)`);
  ok(r.reg >= 1, `${tag}: ${r.reg} Register button(s) still fully on screen after opening`);
  ok(Math.abs(r.y - before.y) < 1 && Math.abs(r.f - before.f) < 1, `${tag}: nothing above/at the opened row moved`);
  ok(r.sw, `${tag}: no horizontal scroll with a row open`);
  await p.evaluate(() => document.querySelectorAll('.ps-list details').forEach((d) => (d.open = true))); await p.waitForTimeout(300);
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, [...document.querySelectorAll('.ps-list *')].filter((e) => e.getBoundingClientRect().right > innerWidth + .5).length]);
  ok(sw[0] <= sw[1] && sw[2] === 0, `${tag}: all 15 open: no horizontal scroll (${sw})`);
  await ctx.close();
}

// ── keyboard: Tab to a summary, visible focus ring, Enter and Space toggle
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await (await ctx).newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.locator('.ps-list summary').first().focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); // focus-visible via keyboard
  const ring = await p.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { isSum: a.matches('.ps-list summary'), w: parseFloat(s.outlineWidth), st: s.outlineStyle }; });
  ok(ring.isSum && ring.w >= 2 && ring.st !== 'none', `keyboard focus ring on summary ${JSON.stringify(ring)}`);
  const st = () => p.evaluate(() => document.querySelector('.ps-list details').open);
  await p.keyboard.press('Enter'); ok(await st(), 'Enter opens'); await p.keyboard.press('Enter'); ok(!(await st()), 'Enter closes');
  await p.keyboard.press('Space'); ok(await st(), 'Space opens'); await p.keyboard.press('Space'); ok(!(await st()), 'Space closes');
  await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.activeElement === document.querySelectorAll('.ps-list summary')[1]), 'Tab moves to the next row');
  await ctx.close();
}

// ── JS off: every title + description in the page, rows still open natively
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' });
  const html = await p.content();
  ok(want.every((g) => html.includes(g.title.replace(/&/g, '&amp;')) && html.includes(g.text)), 'JS off: all 15 titles + descriptions are in the HTML');
  await p.locator('.ps-list summary').nth(4).click(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const d = document.querySelectorAll('.ps-list details')[4]; return d.open && d.querySelector('.ps-d').getBoundingClientRect().height > 0; }), 'JS off: clicking a row reveals its description');
  await ctx.close();
}

// ── reduced motion: 0 running animations/transitions (whole page and the list) before and after opening a row
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('#problem-statements').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(800);
  const n = () => p.evaluate(() => ({ page: document.getAnimations().filter((a) => a.playState === 'running').length, list: document.querySelector('#problem-statements').getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length }));
  const a0 = await n(); await p.locator('.ps-list summary').nth(1).tap(); await p.waitForTimeout(100); const a1 = await n(); await p.waitForTimeout(800); const a2 = await n();
  ok(a0.list === 0 && a1.list === 0 && a2.list === 0, `reduced motion: running animations in the list ${JSON.stringify([a0.list, a1.list, a2.list])} (0)`);
  ok(a0.page === 0 && a1.page === 0 && a2.page === 0, `reduced motion: running animations on the whole page ${JSON.stringify([a0.page, a1.page, a2.page])} (0)`);
  await ctx.close();
}
// normal motion: the list itself has no animation/transition of its own (only static toggling)
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('#problem-statements').scrollIntoView({ behavior: 'instant' })); await p.locator('.ps-list summary').first().click(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.querySelector('#problem-statements').getAnimations({ subtree: true }).length) === 0, 'normal motion: list runs no animations/transitions');
  await ctx.close();
}
await b.close(); console.log(bad ? `\n${bad} FAILED` : '\nall ps checks passed'); process.exit(bad ? 1 : 0);
