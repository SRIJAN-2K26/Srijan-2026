// Registration countdown clock with a faked clock (Playwright clock API; visitor TZ deliberately not IST):
// 8 days before close, 1 hour before, 5 seconds before (ticks through the close), after close, plus reduced motion and JS off.
// Asserts the DD : HH : MM : SS digits against the real deadline, fixed width (no CLS, one row down to 320px), aria-hidden digits +
// one polite screen-reader line rewritten at most once a minute, never 00:00:00:00 / negatives, closed state (Register disabled),
// corner chip (same clock, compact, never over a Register button), reduced motion = plain digit changes + 0 animations, JS off = static line.
// Screenshots to $OUT (default /workspace/shots-countdown).
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-countdown';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } return c; };
const CLOSE = Date.parse('2026-10-11T12:00:00+05:30');
const STATIC = 'Registration closes 11 Oct 2026, 12:00 PM IST';
const lum = (c) => { const [r, g, b2] = c.match(/[\d.]+/g).map(Number).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b2; };
const cr = (a, b2) => { const x = lum(a), y = lum(b2); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const clockOf = (msLeft) => { const s = Math.ceil(msLeft / 1000); return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')); };
// layout-shift entries (CLS) collected from the start of the page
const clsHook = () => { window.__cls = 0; window.__shifts = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push(e.sources?.map((s) => s.node?.className || s.node?.nodeName).join(',')); } })).observe({ type: 'layout-shift', buffered: true }); } catch {} };

const readLine = (p, sel) => p.evaluate((sel) => { const l = document.querySelector(sel); const c = l.querySelector('.rl-clock'); const st = l.querySelector('.rl-static'); const sr = l.querySelector('[role=timer]'); const q = l.getBoundingClientRect(); const cq = c.getBoundingClientRect(); const reg = l.closest('.cta').querySelector('[data-reg-btn]'); const rq = reg.getBoundingClientRect();
  const nums = [...c.querySelectorAll('.rl-num')]; const tops = new Set(nums.map((n) => Math.round(n.getBoundingClientRect().top)));
  const hit = !(q.right <= rq.left || q.left >= rq.right || q.bottom <= rq.top || q.top >= rq.bottom);
  return { state: l.dataset.state, clockOn: !c.hidden && getComputedStyle(c).visibility === 'visible' && getComputedStyle(c).display !== 'none', nums: nums.map((n) => n.textContent), labels: [...c.querySelectorAll('.rl-lbl')].map((x) => x.textContent), clockAria: c.getAttribute('aria-hidden'), staticOn: !st.hidden && getComputedStyle(st).display !== 'none', staticText: st.textContent.trim(), staticAria: st.getAttribute('aria-hidden'),
    sr: sr && sr.textContent, srLive: sr && sr.getAttribute('aria-live'), srCount: l.querySelectorAll('[role=timer]').length, w: +cq.width.toFixed(2), h: Math.round(q.height), right: Math.round(cq.right), left: Math.round(cq.left), bottom: Math.round(q.bottom), oneRow: tops.size === 1, overReg: hit, regBottom: Math.round(rq.bottom), vw: document.documentElement.clientWidth, ovX: document.documentElement.scrollWidth > innerWidth }; }, sel);

// ── open states: 8 days / 1 hour before (paused clock, deterministic digits) at several widths ──
const open = [['8d', CLOSE - (8 * 86400 + 8 * 3600 + 30 * 60) * 1000, 'Registration closes in 8 days 8 hours'], ['1h', CLOSE - 3600e3, 'Registration closes in 1 hour']];
for (const [name, t0, srWant] of open) for (const [w, h] of [[320, 640], [360, 640], [390, 844], [1280, 800], [1920, 1080]]) {
  const tag = `${name} ${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); await ctx.addInitScript(clsHook);
  const p = await ctx.newPage(); const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.clock.install({ time: t0 - 10e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2400);
  await p.clock.pauseAt(t0); await p.clock.runFor(1050); // now = t0 + 1.05 s (ticks land just after each second boundary)
  const r = await readLine(p, '.f1 .regline'); const want = clockOf(CLOSE - (t0 + 1050));
  console.log(tag, JSON.stringify({ nums: r.nums, sr: r.sr, w: r.w, h: r.h, right: r.right, vw: r.vw, regBottom: r.regBottom }));
  ok(r.state === 'open' && r.clockOn && !r.staticOn, `${tag}: clock shown, static line hidden`);
  ok(JSON.stringify(r.nums) === JSON.stringify(want), `${tag}: digits ${r.nums.join(' : ')} want ${want.join(' : ')}`);
  ok(JSON.stringify(r.labels) === '["Days","Hours","Min","Sec"]', `${tag}: labels ${r.labels}`);
  ok(r.clockAria === 'true' && r.staticAria === 'true' && r.srCount === 1 && r.srLive === 'polite' && r.sr === srWant, `${tag}: screen readers get one polite line "${r.sr}" (want "${srWant}"), digits aria-hidden`);
  ok(r.oneRow && !r.ovX && r.right <= r.vw - 8 && r.left >= 8 && !r.overReg, `${tag}: one row, inside the viewport, clear of Register ${JSON.stringify(r)}`);
  if (h <= 667) ok(r.regBottom <= h - 12 && r.bottom <= h, `${tag}: Register + clock above the fold`);
  // fixed width while ticking; seconds tick under motion with a transform/opacity-only digit animation
  const widths = new Set([r.w]); const secs = [r.nums[3]];
  for (let i = 0; i < 4; i++) { await p.clock.runFor(1000); const x = await readLine(p, '.f1 .regline'); widths.add(x.w); secs.push(x.nums[3]); }
  ok(widths.size === 1, `${tag}: clock width constant while ticking ${[...widths]}`); ok(new Set(secs).size === 5, `${tag}: seconds tick ${secs}`);
  const anim = await p.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.rl-clock')).map((a) => [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k))).flat());
  ok(anim.every((k) => k === 'transform' || k === 'opacity'), `${tag}: digit animation props ${[...new Set(anim)]}`);
  // frame 6 has the same clock (not announced: aria-live off)
  const f6 = await readLine(p, '.f6 .regline'); ok(f6.clockOn && JSON.stringify(f6.nums) === JSON.stringify((await readLine(p, '.f1 .regline')).nums) && f6.srLive === 'off', `${tag}: frame 6 clock matches, not live ${JSON.stringify(f6.nums)}`);
  const cls = await p.evaluate(() => [window.__cls, window.__shifts]); ok(cls[0] === 0, `${tag}: CLS ${cls[0]} ${JSON.stringify(cls[1])}`);
  const btns = await p.evaluate(() => [...document.querySelectorAll('a[data-reg-btn]')].map((a) => ({ dis: a.getAttribute('aria-disabled'), href: a.getAttribute('href') })));
  ok(btns.length === 6 && btns.every((x) => !x.dis && /forms\.gle/.test(x.href)), `${tag}: 6 live Register buttons`);
  ok(/closes on 11 Oct 2026 at 12:00 PM IST\.$/.test(await p.$eval('[data-reg-faq]', (e) => e.textContent.trim())), `${tag}: FAQ future tense`);
  ok(!errs.length, `${tag}: errors ${errs}`);
  if ([320, 390, 1280, 1920].includes(w)) await p.screenshot({ path: `${OUT}/${name}-${w}x${h}.png` });
  // screen-reader line: over 3 simulated minutes it changes at most once a minute while the seconds tick every second
  if (w === 390) {
    await p.evaluate(() => { window.__sr = []; window.__sec = 0; const l = document.querySelector('.f1 .regline'); new MutationObserver(() => window.__sr.push([Date.now(), l.querySelector('[role=timer]').textContent])).observe(l.querySelector('[role=timer]'), { childList: true, characterData: true, subtree: true });
      new MutationObserver(() => window.__sec++).observe(l.querySelectorAll('.rl-num')[3], { childList: true, characterData: true, subtree: true }); });
    for (let i = 0; i < 180; i++) await p.clock.runFor(1000);
    const m = await p.evaluate(() => ({ sr: window.__sr, sec: window.__sec })); const gaps = m.sr.map((x, i) => (i ? x[0] - m.sr[i - 1][0] : 60e3));
    console.log(tag, 'sr updates over 180 s:', JSON.stringify(m.sr.map((x) => x[1])), 'seconds-digit mutations', m.sec);
    ok(m.sr.length <= 3 && gaps.every((g) => g >= 60e3) && m.sec >= 150, `${tag}: SR line throttled to once a minute (${m.sr.length} updates), seconds ticking (${m.sec})`);
  }
  await ctx.close();
}

// ── 5 seconds before: tick through the close; never 00 : 00 : 00 : 00 or negative, then "Registration closed" ──
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const tag = `5s ${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Tokyo' }); await ctx.addInitScript(clsHook); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.clock.install({ time: CLOSE - 20e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2400);
  await p.clock.pauseAt(CLOSE - 5e3);
  await p.evaluate(() => { window.__seen = []; const l = document.querySelector('.f1 .regline'); const snap = () => window.__seen.push(l.dataset.state === 'closed' ? 'closed' : [...l.querySelectorAll('.rl-num')].map((n) => n.textContent).join(':')); new MutationObserver(snap).observe(l, { childList: true, characterData: true, subtree: true, attributes: true }); snap(); });
  await p.clock.runFor(10); const at5 = await readLine(p, '.f1 .regline');
  ok(at5.nums.join(':') === '00:00:00:05' && at5.sr === 'Registration closes in 1 min', `${tag}: 5 s before shows ${at5.nums.join(':')} / "${at5.sr}"`);
  await p.screenshot({ path: `${OUT}/5s-${w}x${h}.png` });
  for (let i = 0; i < 6; i++) await p.clock.runFor(1000);
  const seen = [...new Set(await p.evaluate(() => window.__seen))];
  console.log(tag, 'displayed:', JSON.stringify(seen));
  ok(!seen.includes('00:00:00:00') && seen.every((s) => s === 'closed' || /^\d\d:\d\d:\d\d:\d\d$/.test(s)) && seen.at(-1) === 'closed', `${tag}: never 00:00:00:00 / negative, ends closed`);
  ok(JSON.stringify(seen.filter((s) => s !== 'closed').map((s) => s.slice(-2))) === '["05","04","03","02","01"]', `${tag}: counts 05..01 ${seen}`);
  const c = await readLine(p, '.f1 .regline'); const btns = await p.evaluate(() => [...document.querySelectorAll('a[data-reg-btn]')].map((a) => ({ dis: a.getAttribute('aria-disabled'), href: a.getAttribute('href'), txt: a.textContent.trim() })));
  ok(c.state === 'closed' && !c.clockOn && c.staticText === 'Registration closed' && c.sr === 'Registration closed' && btns.length === 6 && btns.every((x) => x.dis === 'true' && !x.href && x.txt === 'Registration closed'), `${tag}: closed live — Register buttons disabled ${JSON.stringify(btns[0])}`);
  const cls = await p.evaluate(() => window.__cls); ok(cls === 0, `${tag}: CLS through the close ${cls}`);
  ok(!errs.length, `${tag}: errors ${errs}`); await p.screenshot({ path: `${OUT}/5s-closed-${w}x${h}.png` }); await ctx.close();
}

// ── after close (page loaded after the deadline): closed state, disabled Register buttons, past-tense FAQ ──
for (const [w, h] of [[360, 640], [390, 844], [1280, 800]]) {
  const tag = `closed ${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); await ctx.addInitScript(clsHook); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.clock.install({ time: CLOSE + 5 * 60e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2400); await p.clock.runFor(1500);
  const r = await readLine(p, '.f1 .regline');
  const s = await p.evaluate(() => ({ btns: [...document.querySelectorAll('a[data-reg-btn]')].map((a) => { const c = getComputedStyle(a); return { dis: a.getAttribute('aria-disabled'), href: a.getAttribute('href'), role: a.getAttribute('role'), txt: a.textContent.replace(/\s+/g, ' ').trim(), fg: c.color, bg: c.backgroundColor, h: Math.round(a.getBoundingClientRect().height) }; }), faq: document.querySelector('[data-reg-faq]').textContent.trim(), digits: /\d\d\s*:\s*\d\d/.test(document.body.innerText) }));
  console.log(tag, JSON.stringify({ state: r.state, text: r.staticText, sr: r.sr, faq: s.faq }));
  ok(r.state === 'closed' && !r.clockOn && r.staticText === 'Registration closed' && !s.digits, `${tag}: closed text, no clock digits`);
  ok(s.btns.length === 6 && s.btns.every((x) => x.dis === 'true' && !x.href && x.role === 'link' && x.txt === 'Registration closed' && (x.h === 0 || x.h >= 44) && cr(x.fg, x.bg) >= 4.5), `${tag}: 6 disabled buttons, label, h>=44, contrast ${JSON.stringify(s.btns.map((x) => [x.txt, x.h, +cr(x.fg, x.bg).toFixed(1)]))}`);
  ok(s.faq === 'Registration closed on 11 Oct 2026 at 12:00 PM IST.', `${tag}: FAQ past tense: ${s.faq}`);
  ok((await p.evaluate(() => window.__cls)) === 0, `${tag}: CLS`); ok(!errs.length, `${tag}: errors ${errs}`);
  if (w !== 390) await p.screenshot({ path: `${OUT}/closed-${w}x${h}.png` });
  await ctx.close();
}

// ── reduced motion: live clock, seconds change as plain digits, zero animations, no chip; after close: closed ──
for (const [w, h] of [[320, 640], [390, 844], [1280, 800]]) {
  const tag = `reduced ${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', timezoneId: 'Pacific/Auckland' }); await ctx.addInitScript(clsHook); const p = await ctx.newPage();
  const t0 = CLOSE - (8 * 86400 + 8 * 3600 + 30 * 60) * 1000;
  await p.clock.install({ time: t0 - 10e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1200); await p.clock.pauseAt(t0); await p.clock.runFor(1050);
  const secs = []; let maxAnims = 0;
  for (let i = 0; i < 4; i++) { const r = await readLine(p, '.f1 .regline'); secs.push(r.nums[3]); maxAnims = Math.max(maxAnims, await p.evaluate(() => document.getAnimations().length)); if (!i) { console.log(tag, JSON.stringify({ nums: r.nums, sr: r.sr })); ok(r.clockOn && JSON.stringify(r.nums) === JSON.stringify(clockOf(CLOSE - t0 - 1050)) && r.sr === 'Registration closes in 8 days 8 hours' && r.oneRow && !r.ovX, `${tag}: live clock ${r.nums}`); } await p.clock.runFor(1000); }
  ok(new Set(secs).size === 4 && maxAnims === 0, `${tag}: seconds tick as plain digit changes (${secs}), animations ${maxAnims}`);
  ok((await p.evaluate(() => document.querySelectorAll('.reg-chip').length)) === 0, `${tag}: no chip`); ok((await p.evaluate(() => window.__cls)) === 0, `${tag}: CLS`);
  if (w !== 320) await p.screenshot({ path: `${OUT}/reduced-${w}x${h}.png` });
  await ctx.close();
}
{ const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.clock.install({ time: CLOSE + 60e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(800); await p.clock.runFor(2000);
  const r = await readLine(p, '.f1 .regline'); ok(r.state === 'closed' && r.staticText === 'Registration closed' && (await p.evaluate(() => document.getAnimations().length)) === 0, 'reduced after close'); console.log('reduced-after', r.state, r.staticText); await ctx.close(); }

// ── JS off: the static IST deadline line, one line, no clock, no chip ──
for (const [w, h] of [[320, 640], [390, 844], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const t = await p.evaluate(() => { const l = document.querySelector('.f1 .regline'); const st = l.querySelector('.rl-static'); const q = st.getBoundingClientRect(); return { text: l.innerText.trim(), clock: getComputedStyle(l.querySelector('.rl-clock')).display, h: Math.round(q.height), right: Math.round(q.right), vw: innerWidth, reg: Math.round(document.querySelector('.f1 [data-reg-btn]').getBoundingClientRect().bottom), chip: document.querySelectorAll('.reg-chip').length, ovX: document.documentElement.scrollWidth > innerWidth }; });
  console.log('js-off', w + 'x' + h, JSON.stringify(t));
  ok(t.text === STATIC && t.clock === 'none' && t.h < 30 && t.right <= t.vw && !t.chip && !t.ovX, `js-off ${w}: static line ${JSON.stringify(t)}`);
  if (w !== 320) await p.screenshot({ path: `${OUT}/js-off-${w}x${h}.png` });
  await ctx.close();
}

// ── corner chip: hidden at the hero, compact clock when scrolled, never over a Register button / dock / header, hidden in the last frame ──
const chipStates = [['8d', '2026-10-03T03:30:00+05:30', /^Closes in 08:08:(29|30):\d\d$/], ['1h', '2026-10-11T11:00:00+05:30', /^Closes in 00:00:59:\d\d$/], ['closed', '2026-10-11T12:05:00+05:30', /^Registration closed$/]];
for (const [name, iso, want] of chipStates) for (const [w, h] of [[360, 640], [390, 844], [1280, 800], [2560, 1080]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.clock.install({ time: new Date(iso) }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200); await p.clock.runFor(1500);
  const at = async (y) => { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(y)); await p.clock.runFor(700); await p.waitForTimeout(500);
    return p.evaluate(() => { const c = document.querySelector('.reg-chip'); if (!c) return null; const cs = getComputedStyle(c); const q = c.getBoundingClientRect(); const dk = document.querySelector('.dock'); const dr = dk && getComputedStyle(dk).display !== 'none' ? dk.querySelector('.btn').getBoundingClientRect() : null; const hr = document.querySelector('.top').getBoundingClientRect();
      const hit = (r) => r && r.width > 0 && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom);
      const vis = (a) => { for (let x = a; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
      const regs = [...document.querySelectorAll('a[data-reg-btn]')].filter((a) => vis(a) && !a.closest('.dock')).filter((a) => hit(a.getBoundingClientRect())).map((a) => a.textContent.trim());
      return { text: c.textContent.trim(), op: +cs.opacity, rect: [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)], ovReg: regs, ovDock: hit(dr) && +getComputedStyle(dk).opacity > 0, headerBottom: Math.round(hr.bottom), inView: q.right <= innerWidth && q.left >= 0, aria: c.getAttribute('aria-hidden') }; }); };
  const F = .9 * h; const r0 = await at(0), r1 = await at(1.6 * F), r3 = await at(3.2 * F), r6 = await at(5.5 * F), r7 = await at(7.4 * F);
  console.log('chip', name, w + 'x' + h, JSON.stringify({ hero: r0 && r0.op, f2: r1 && [r1.text, r1.op, r1.rect], f6: r6 && r6.op, after: r7 && r7.op }));
  ok(r0 && r0.op === 0, `chip hidden in hero ${name} ${w}`); ok(r1 && r1.op === 1 && want.test(r1.text), `chip visible/text ${name} ${w}: ${r1 && r1.text}`); ok(r3 && r3.op === 1, 'chip visible f4');
  ok(r6 && r6.op === 0, `chip hidden in last frame ${name} ${w}`); ok(r7 && r7.op === 1, `chip back after the story ${name} ${w} ${r7 && r7.op}`);
  for (const r of [r1, r3, r7]) if (r) ok(!r.ovReg.length && !r.ovDock && r.inView && r.rect[1] >= r.headerBottom - 1 && r.aria === 'true', `chip placement ${name} ${w}: ${JSON.stringify(r)}`);
  // scroll the whole page: the visible chip never sits on a Register button
  if (name !== 'closed') { const tot = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); const over = []; for (let y = 0; y <= tot; y += Math.round(h * .3)) { const r = await at(y); if (r && r.op > .5 && r.ovReg.length) over.push([y, r.ovReg]); } ok(!over.length, `chip never over a Register button ${name} ${w}: ${JSON.stringify(over)}`); }
  if (name === 'closed') { const c = await p.evaluate(() => ({ dock: getComputedStyle(document.querySelector('.dock')).display, lead: document.querySelector('[data-reg-copy]').textContent, heroLine: getComputedStyle(document.querySelector('.f1 .regline')).visibility })); ok(c.dock === 'none' && /^Registration is closed\./.test(c.lead) && c.heroLine === 'hidden', 'closed: dock hidden, contact copy, hero duplicate hidden ' + JSON.stringify(c)); }
  ok(!errs.length, 'chip page errors');
  if ((w === 390 || w === 1280) && name !== '1h') { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(1.6 * F)); await p.clock.runFor(700); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/chip-${name}-${w}x${h}.png` }); }
  await ctx.close();
}
for (const opts of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...opts }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const n = await p.evaluate(() => document.querySelectorAll('.reg-chip').length); ok(n === 0, 'no chip ' + JSON.stringify(opts)); console.log('no-chip', JSON.stringify(opts), n); await ctx.close(); }
// focus jump only for keyboard focus: a mouse-modality script focus must not move the page
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.click('.menu summary'); await p.click('.menu summary'); await p.evaluate(() => document.querySelector('.f3 .flink').focus()); await p.waitForTimeout(400); const y1 = await p.evaluate(() => scrollY);
  await p.evaluate(() => document.activeElement.blur()); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(500); const y2 = await p.evaluate(() => scrollY);
  console.log('focus-jump mouse-modality scrollY', y1, '| keyboard Tab scrollY', y2); ok(y1 < 1000, 'no frame jump on non-focus-visible focus (native scroll only)'); ok(y2 > 100, 'keyboard focus jumps to frame'); await ctx.close(); }
await b.close(); console.log(bad ? `countdown-check FAILED (${bad})` : 'countdown-check ok'); process.exit(bad ? 1 : 0);
