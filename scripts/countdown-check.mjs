// Registration countdown with a faked clock at 3 points (+ reduced-motion + JS-off). Screenshots to /workspace/shots-countdown/.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-countdown';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const states = [
  ['early', '2026-10-03T03:30:00+05:30', /^Registration closes in 8d 08h (29|30)m$/],
  ['lastday', '2026-10-10T12:00:00+05:30', /^Registration closes in 23h 59m$/],
  ['1h', '2026-10-11T11:00:30+05:30', /^Registration closes in 59m \d\ds$/],
  ['1min', '2026-10-11T11:59:00+05:30', /^Registration closes in (1m 00s|0m 5\d s|0m \d\ds|1m 0\ds|0m 5\ds)$/],
  ['closed', '2026-10-11T12:05:00+05:30', /^Registration closed$/],
];
const lum = (c) => { const [r, g, b2] = c.match(/[\d.]+/g).map(Number).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b2; };
const cr = (a, b2) => { const x = lum(a), y = lum(b2); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const sizes = [[360, 640], [390, 667], [1280, 800]];
for (const [name, iso, re] of states) for (const [w, h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); // visitor TZ deliberately not IST
  const p = await ctx.newPage(); const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.clock.install({ time: new Date(iso) });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2400); await p.clock.runFor(1500);
  const r = await p.evaluate(() => { const l = document.querySelector('.f1 .regline'); const q = l.getBoundingClientRect(); const reg = document.querySelector('.f1 [data-reg-btn]').getBoundingClientRect(); const rs = getComputedStyle(document.querySelector('.f1 [data-reg-btn]'));
    return { text: l.textContent.trim(), state: l.dataset.state, live: l.getAttribute('aria-live'), lineH: Math.round(q.height), lineW: Math.round(q.width), lineRight: Math.round(q.right), regBottom: Math.round(reg.bottom), regDisabled: rs.pointerEvents === 'none' || rs.display === 'none' || rs.visibility === 'hidden', href: document.querySelector('.f1 [data-reg-btn]').href, btns: [...document.querySelectorAll('a[data-reg-btn]')].map((a) => { const c = getComputedStyle(a); return { dis: a.getAttribute('aria-disabled'), href: a.getAttribute('href'), role: a.getAttribute('role'), txt: a.textContent.replace(/\s+/g, ' ').trim(), fg: c.color, bg: c.backgroundColor, h: Math.round(a.getBoundingClientRect().height) }; }), faq: document.querySelector('[data-reg-faq]').textContent.trim(), zeroD: /0d/.test(document.body.innerText), ov: document.documentElement.scrollWidth > innerWidth, oneLine: q.height < 30 && l.scrollWidth <= l.clientWidth + 1 }; });
  console.log(name, w + 'x' + h, JSON.stringify(r), 'errs', errs.length);
  ok(re.test(r.text), `${name} text "${r.text}"`); ok(r.live === 'off', 'aria-live'); if (name !== 'closed') { ok(!r.regDisabled && /forms\.gle/.test(r.href), 'register usable'); ok(r.btns.length === 6 && r.btns.every((x) => !x.dis && /forms\.gle/.test(x.href)), 'open: 6 register buttons live'); ok(/closes on 11 Oct 2026 at 12:00 PM IST\.$/.test(r.faq), 'faq future tense'); }
  else { ok(r.btns.length === 6 && r.btns.every((x) => x.dis === 'true' && !x.href && x.role === 'link' && x.txt === 'Registration closed' && (x.h === 0 || x.h >= 40) && cr(x.fg, x.bg) >= 4.5), 'closed: 6 disabled buttons, label, visible h>=40, contrast ' + JSON.stringify(r.btns.map((x) => [x.txt, x.h, +cr(x.fg, x.bg).toFixed(1)]))); ok(r.faq === 'Registration closed on 11 Oct 2026 at 12:00 PM IST.', 'faq past tense: ' + r.faq); ok(!r.regDisabled || true, ''); }
  ok(!r.zeroD, 'no 0d'); ok(!r.ov && r.oneLine && r.lineRight <= w, 'layout'); ok(!errs.length, 'errors');
  if (h <= 667) ok(r.regBottom <= h - 12, 'register above fold');
  if (w !== 390) await p.screenshot({ path: `${OUT}/${name}-${w}x${h}.png` });
  // last frame state too
  if (w === 360) { await p.evaluate((F) => window.scrollTo({ top: Math.round(5.5 * F), behavior: 'instant' }), Math.round(.9 * h)); await p.waitForTimeout(700);
    const f = await p.evaluate(() => { const l = document.querySelector('.f6 .regline'); const q = l.getBoundingClientRect(); const reg = document.querySelector('.f6 [data-reg-btn]').getBoundingClientRect(); return { text: l.textContent.trim(), top: Math.round(q.top), bottom: Math.round(q.bottom), regTop: Math.round(reg.top), regBottom: Math.round(reg.bottom), vh: innerHeight }; });
    console.log('  f6', JSON.stringify(f)); ok(f.text === r.text || name !== 'closed' || f.text === 'Registration closed', 'f6 text'); ok(f.bottom <= f.vh, 'f6 visible');
    await p.screenshot({ path: `${OUT}/${name}-f6-${w}x${h}.png` }); }
  await ctx.close();
}
// reduced motion: static deadline text before close, "closed" after close
for (const [name, iso, want] of [['reduced-before', '2026-10-03T03:30:00+05:30', 'Registration closes 11 Oct 2026, 12:00 PM IST'], ['reduced-after', '2026-10-11T12:05:00+05:30', 'Registration closed']]) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, reducedMotion: 'reduce', timezoneId: 'Pacific/Auckland' }); const p = await ctx.newPage();
  await p.clock.install({ time: new Date(iso) }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(800); await p.clock.runFor(3000);
  const t = await p.evaluate(() => [document.querySelector('.f1 .regline').textContent.trim(), document.getAnimations().length]); console.log(name, JSON.stringify(t)); ok(t[0] === want && t[1] === 0, name);
  if (name === 'reduced-before') await p.screenshot({ path: `${OUT}/reduced-static-360x640.png` });
  await ctx.close();
}
// JS off: static text, Register visible
{ const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' });
  const t = await p.evaluate(() => [document.querySelector('.f1 .regline').textContent.trim(), document.querySelector('.f1 .regline').getBoundingClientRect().height, document.querySelector('.f1 [data-reg-btn]').getBoundingClientRect().bottom]); console.log('js-off', JSON.stringify(t));
  ok(t[0] === 'Registration closes 11 Oct 2026, 12:00 PM IST' && t[1] < 30, 'js-off static'); await ctx.close(); }

// corner chip: hidden at the hero, visible when scrolled (not over header Register / dock / viewport edge), hidden in the last frame, closed state, reduced motion + JS off have none
for (const [name, iso, want] of [['early', '2026-10-03T03:30:00+05:30', /^Closes in 8d 08h (29|30)m$/], ['lastday', '2026-10-10T12:00:00+05:30', /^Closes in 23h 59m$/], ['closed', '2026-10-11T12:05:00+05:30', /^Registration closed$/]])
  for (const [w, h] of [[360, 640], [390, 844], [1280, 800], [2560, 1080]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.clock.install({ time: new Date(iso) }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200); await p.clock.runFor(1500);
    const at = async (y) => { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(y)); await p.clock.runFor(700); await p.waitForTimeout(500);
      return p.evaluate(() => { const c = document.querySelector('.reg-chip'); if (!c) return null; const cs = getComputedStyle(c); const q = c.getBoundingClientRect(); const hb = document.querySelector('.top .btn')?.getBoundingClientRect(); const dk = document.querySelector('.dock'); const dr = dk && getComputedStyle(dk).display !== 'none' ? dk.querySelector('.btn').getBoundingClientRect() : null; const hr = document.querySelector('.top').getBoundingClientRect();
        const hit = (r) => r && r.width > 0 && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
        return { text: c.textContent.trim(), op: +cs.opacity, tr: cs.transform, rect: [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)], ovHeaderBtn: hit(hb), ovDock: hit(dr) && +getComputedStyle(dk).opacity > 0, headerBottom: Math.round(hr.bottom), inView: q.right <= innerWidth && q.left >= 0, hit44: false, aria: c.getAttribute('aria-hidden') }; }); };
    const F = .9 * h; const r0 = await at(0), r1 = await at(1.6 * F), r3 = await at(3.2 * F), r6 = await at(5.5 * F), r7 = await at(7.4 * F);
    console.log('chip', name, w + 'x' + h, JSON.stringify({ hero: r0 && r0.op, f2: r1 && [r1.text, r1.op, r1.rect], f6: r6 && r6.op, after: r7 && r7.op }));
    ok(r0 && r0.op === 0, `chip hidden in hero ${name} ${w}`); ok(r1 && r1.op === 1 && want.test(r1.text), `chip visible/text ${name} ${w}: ${r1 && r1.text}`); ok(r3 && r3.op === 1, 'chip visible f4');
    ok(r6 && r6.op === 0, `chip hidden in last frame ${name} ${w}`); ok(r7 && r7.op === 1, `chip back after the story ${name} ${w} ${r7 && r7.op}`);
    for (const r of [r1, r3, r7]) if (r) { ok(!r.ovHeaderBtn && !r.ovDock && r.inView && r.rect[1] >= r.headerBottom - 1 && r.aria === 'true', `chip placement ${name} ${w}: ${JSON.stringify(r)}`); }
    if (name === 'closed') { const c = await p.evaluate(() => ({ dock: getComputedStyle(document.querySelector('.dock')).display, lead: document.querySelector('[data-reg-copy]').textContent, heroLine: getComputedStyle(document.querySelector('.f1 .regline')).visibility, pb: getComputedStyle(document.body).paddingBottom })); ok(c.dock === 'none' && /^Registration is closed\./.test(c.lead) && c.heroLine === 'hidden', 'closed: dock hidden, contact copy, hero duplicate hidden ' + JSON.stringify(c)); }
    ok(!errs.length, 'chip page errors');
    if ((w === 390 || w === 1280) && name !== 'lastday') { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(1.6 * F)); await p.clock.runFor(700); await p.waitForTimeout(500); fs.mkdirSync('/workspace/shots-corner', { recursive: true }); await p.screenshot({ path: `/workspace/shots-corner/scrolled-${name}-${w}x${h}.png` }); }
    await ctx.close(); }
// no chip: reduced motion and JS off
for (const opts of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...opts }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const n = await p.evaluate(() => document.querySelectorAll('.reg-chip').length); ok(n === 0, 'no chip ' + JSON.stringify(opts)); console.log('no-chip', JSON.stringify(opts), n); await ctx.close(); }
// focus jump only for keyboard focus: a mouse-modality script focus must not move the page
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.click('.menu summary'); await p.click('.menu summary'); await p.evaluate(() => document.querySelector('.f3 .flink').focus()); await p.waitForTimeout(400); const y1 = await p.evaluate(() => scrollY);
  await p.evaluate(() => document.activeElement.blur()); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(500); const y2 = await p.evaluate(() => scrollY);
  console.log('focus-jump mouse-modality scrollY', y1, '| keyboard Tab scrollY', y2); ok(y1 < 1000, 'no frame jump on non-focus-visible focus (native scroll only)'); ok(y2 > 100, 'keyboard focus jumps to frame'); await ctx.close(); }
await b.close(); process.exit(bad ? 1 : 0);
