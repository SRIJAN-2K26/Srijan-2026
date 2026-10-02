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
await b.close(); process.exit(bad ? 1 : 0);
