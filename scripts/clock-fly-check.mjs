// Hero countdown clock -> corner chip flight (scroll-linked FLIP). Checks, at 320 / 390 / 1280:
//  scrollY 0: hero clock in place (no transform, opacity 1), chip hidden · mid-scroll: transform between the two, chip crossfading in ·
//  past the threshold: chip only · back to 0: exactly restored (fast jump to bottom and back, wheel flicks through Lenis, anchor jumps, Home) ·
//  position/opacity are a pure function of scrollY (verified at many scroll stops, incl. right after jumps) · same digits in hero and chip ·
//  chip >= 44px tall, inside the viewport, never over a Register button or the focused control · CLS 0 · only transform/opacity inline ·
//  reduced motion (no chip, no flight, 0 running animations) · JS off (static IST text, no chip) · closed state (no flight, chip says closed).
// Screenshots (mid-scroll + corner state) to $OUT (default /workspace/shots-clockfly).
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-clockfly';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } return c; };
const clsHook = () => { window.__cls = 0; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch {} };
const FLY = 0.7, cl = (t) => Math.max(0, Math.min(1, t)), sm = (t) => { t = cl(t); return t * t * (3 - 2 * t); };
const jump = (p, y) => p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
const frame = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
// everything we need to know about the clock/chip right now
const read = (p) => p.evaluate(() => {
  const c = document.querySelector('.f1 .regline .rl-clock'), chip = document.querySelector('.reg-chip'), F = (document.querySelector('.story').offsetHeight - document.querySelector('.stage').offsetHeight) / 6;
  const r = c.getBoundingClientRect(), q = chip && chip.getBoundingClientRect(), cs = getComputedStyle(c);
  const regs = [...document.querySelectorAll('[data-reg-btn]')].filter((a) => !a.closest('.top, .dock, .story')).map((a) => a.getBoundingClientRect());
  const hit = (a, m) => q && a.width > 0 && !(a.right <= q.left - m || a.left >= q.right + m || a.bottom <= q.top - m || a.top >= q.bottom + m);
  const act = document.activeElement;
  return { y: scrollY, F, inlineT: c.style.transform, inlineO: c.style.opacity, inlineAll: c.getAttribute('style') || '', op: +cs.opacity, tr: cs.transform, rect: [r.left, r.top, r.width, r.height], chipOp: chip ? +getComputedStyle(chip).opacity : null, chipRect: q ? [q.left, q.top, q.width, q.height] : null, cf: chip ? chip.style.getPropertyValue('--cf') : null,
    chipTxt: chip ? chip.textContent.replace(/\s+/g, ' ').trim() : null, heroNums: [...c.querySelectorAll('.rl-num')].map((n) => n.textContent.replace(/\s+/g, '')), chipNums: chip ? [...chip.querySelectorAll('.rl-num')].map((n) => n.textContent.replace(/\s+/g, '')) : null,
    overReg: regs.some((a) => hit(a, 0)), overFocus: !!(act && act !== document.body && hit(act.getBoundingClientRect(), 0)), vw: innerWidth };
});
// pure-function invariant: given scrollY alone, opacity of the hero clock is 1 - cf(p) and the chip is hidden before the crossfade
const expectAt = (s) => { const p = cl(s.y / (FLY * s.F)), cf = sm((p - 0.8) / 0.2); return { p, cf, heroOp: 1 - cf }; };
const inv = (s, tag) => { const e = expectAt(s); ok(Math.abs(s.op - e.heroOp) < 0.03, `${tag}: hero clock opacity ${s.op} vs ${e.heroOp.toFixed(3)} at y=${Math.round(s.y)}`); if (e.p === 0) ok(s.inlineAll === '' && s.tr === 'none', `${tag}: y=${Math.round(s.y)} identity (style="${s.inlineAll}")`); if (s.chipOp !== null) ok(s.chipOp <= e.cf + 0.03, `${tag}: chip opacity ${s.chipOp} <= crossfade ${e.cf.toFixed(3)} at y=${Math.round(s.y)}`); };
const near = (a, b2, t = 0.6) => a.every((v, i) => Math.abs(v - b2[i]) <= t);

for (const [w, h] of [[320, 640], [390, 844], [1280, 800]]) {
  const tag = `${w}x${h}`, mobile = w < 800;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile }); await ctx.addInitScript(clsHook);
  const p = await ctx.newPage(); const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2600);
  const a0 = await read(p); console.log(tag, 'y=0 hero clock', JSON.stringify(a0.rect.map(Math.round)), 'chip op', a0.chipOp, 'state', await p.evaluate(() => document.querySelector('.f1 .regline').dataset.state));
  ok(a0.y === 0 && a0.inlineAll === '' && a0.tr === 'none' && a0.op === 1 && a0.chipOp === 0, tag + ': y=0 hero clock in place, chip hidden');
  const F = a0.F, base = a0.rect, vis0 = await p.evaluate(() => { const c = document.querySelector('.f1 .regline .rl-clock'); const r = c.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e; });
  ok(vis0, tag + ': hero clock on screen at y=0');
  // ── one logical clock
  ok(await p.evaluate(() => { const l = document.querySelector('.f1 .regline'); const c = l.querySelector('.rl-clock'), chip = document.querySelector('.reg-chip'); return c.getAttribute('aria-hidden') === 'true' && chip.getAttribute('aria-hidden') === 'true' && l.querySelectorAll('[role=timer]').length === 1 && document.querySelectorAll('.reg-chip').length === 1 && document.querySelectorAll('[role=timer][aria-live=polite]').length === 1 && [...document.querySelectorAll('[role=timer]')].every((t) => t.getAttribute('aria-live') === 'polite' || t.getAttribute('aria-live') === 'off') && !chip.querySelector('[role],[aria-live]'); }), tag + ': digits aria-hidden, one timer line per regline, chip aria-hidden');
  // ── scroll through the flight in small steps (also checks monotone travel + the pure-function invariant)
  const steps = []; for (let i = 0; i <= 14; i++) { await jump(p, Math.round(i / 14 * 0.8 * F)); await frame(p); steps.push(await read(p)); }
  steps.forEach((s) => inv(s, tag + ' sweep'));
  const cx = (s) => s.rect[0] + s.rect[2] / 2, cy = (s) => s.rect[1] + s.rect[3] / 2;
  const mid = steps[5], end = steps[14]; const e5 = expectAt(mid);
  console.log(tag, `mid y=${Math.round(mid.y)} p=${e5.p.toFixed(2)} transform=${mid.tr.slice(0, 60)} opacity=${mid.op}; end opacity=${end.op} chipOp=${end.chipOp}`);
  ok(mid.tr !== 'none' && mid.inlineT.includes('translate3d') && mid.inlineT.includes('scale'), tag + ': mid-scroll transform applied');
  const dTot = Math.hypot(cx(end) - (base[0] + base[2] / 2), cy(end) - (base[1] + base[3] / 2)), dMid = Math.hypot(cx(mid) - (base[0] + base[2] / 2), cy(mid) - (base[1] + base[3] / 2));
  ok(dMid > 4 && dMid < dTot, tag + `: mid position between start and corner (${dMid.toFixed(0)} of ${dTot.toFixed(0)}px)`);
  let mono = true; for (let i = 1; i < steps.length; i++) { const a = Math.hypot(cx(steps[i]) - (base[0] + base[2] / 2), cy(steps[i]) - (base[1] + base[3] / 2)), c2 = Math.hypot(cx(steps[i - 1]) - (base[0] + base[2] / 2), cy(steps[i - 1]) - (base[1] + base[3] / 2)); if (a + 0.5 < c2) mono = false; } ok(mono, tag + ': distance travelled grows monotonically with scroll');
  ok(end.op < 0.02 && end.chipOp > 0.97, tag + ': end of flight: chip only');
  const cc = end.chipRect; ok(Math.hypot(cx(end) - (cc[0] + cc[2] / 2), cy(end) - (cc[1] + cc[3] / 2)) < 3, tag + ': flight lands on the chip centre');
  ok(end.rect[2] <= cc[2] + 1, tag + `: hero clock scaled to chip width (${end.rect[2].toFixed(0)} vs ${cc[2].toFixed(0)})`);
  // crossfade frame: both partly visible
  await jump(p, Math.round(0.9 * FLY * F)); await frame(p); const xf = await read(p); ok(xf.op > 0.02 && xf.op < 0.98 && xf.chipOp > 0.02 && xf.chipOp < 0.98, tag + `: crossfade ${xf.op.toFixed(2)} / ${xf.chipOp.toFixed(2)}`); inv(xf, tag + ' xfade');
  await jump(p, Math.round(0.4 * FLY * F)); await frame(p); await p.screenshot({ path: `${OUT}/${tag}-1-mid-flight.png` });
  await jump(p, Math.round(0.9 * FLY * F)); await frame(p); await p.screenshot({ path: `${OUT}/${tag}-2-crossfade.png` });
  // ── past the threshold: chip only, same digits, geometry
  for (const k of [1.0, 1.5, 2.5, 3.5]) { await jump(p, Math.round(k * F)); await frame(p); const s = await read(p); inv(s, tag + ' past');
    ok(s.op < 0.02 && s.chipOp > 0.97, tag + ` @${k}F: chip only (hero ${s.op}, chip ${s.chipOp})`);
    ok(s.chipRect[3] >= 44 - 0.5, tag + ` @${k}F: chip >=44px tall (${s.chipRect[3].toFixed(1)})`); ok(s.chipRect[0] >= 0 && s.chipRect[0] + s.chipRect[2] <= s.vw + 0.5, tag + ` @${k}F: chip inside the viewport (${s.chipRect[0].toFixed(0)}..${(s.chipRect[0] + s.chipRect[2]).toFixed(0)} of ${s.vw})`);
    ok(JSON.stringify(s.heroNums) === JSON.stringify(s.chipNums), tag + ` @${k}F: same digits hero ${s.heroNums} / chip ${s.chipNums}`); ok(!s.overReg, tag + ` @${k}F: chip not over a Register button`); }
  await jump(p, Math.round(1.5 * F)); await frame(p); await p.screenshot({ path: `${OUT}/${tag}-3-corner.png` });
  // ── back to the top restores exactly
  await jump(p, 0); await frame(p); const back = await read(p);
  ok(back.inlineAll === '' && back.tr === 'none' && back.op === 1 && back.chipOp === 0 && near(back.rect, base, 0.01), tag + `: back at 0 restored exactly (${JSON.stringify(back.rect.map((v) => +v.toFixed(2)))} vs ${JSON.stringify(base.map((v) => +v.toFixed(2)))}, style="${back.inlineAll}")`);
  // ── fast jump to the bottom and straight back, same frame and next frame
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await p.evaluate((m) => { scrollTo({ top: m, behavior: 'instant' }); scrollTo({ top: 0, behavior: 'instant' }); }, max); await frame(p); await frame(p); let r2 = await read(p);
  ok(r2.inlineAll === '' && near(r2.rect, base, 0.01) && r2.chipOp === 0, tag + ': bottom-and-back in one frame restores exactly');
  await jump(p, max); await frame(p); const bot = await read(p); inv(bot, tag + ' bottom'); await jump(p, 0); await frame(p); r2 = await read(p); ok(r2.inlineAll === '' && near(r2.rect, base, 0.01) && r2.chipOp === 0, tag + ': bottom then top restores exactly');
  for (const k of [0.2, 0.5, 0.75, 0.95]) { await jump(p, Math.round(k * FLY * F)); await jump(p, 0); } await frame(p); await frame(p); r2 = await read(p); ok(r2.inlineAll === '' && near(r2.rect, base, 0.01), tag + ': repeated half-way flicks back to 0 leave no half-way state');
  // ── wheel flicks through Lenis (desktop wheel); touch contexts use native scroll
  if (!mobile) {
    await p.mouse.move(w / 2, h / 2); await p.mouse.wheel(0, 700); await p.waitForTimeout(160); const w1 = await read(p); inv(w1, tag + ' wheel'); await p.mouse.wheel(0, -2500); await p.waitForTimeout(2200); const w2 = await read(p);
    ok(w2.y === 0 && w2.inlineAll === '' && near(w2.rect, base, 0.01) && w2.chipOp === 0, tag + ': wheel down then hard flick up restores exactly (y=' + w2.y + ')');
    await p.mouse.wheel(0, 3000); await p.waitForTimeout(80); await p.mouse.wheel(0, -3000); await p.waitForTimeout(2200); const w3 = await read(p); ok(w3.y === 0 && w3.inlineAll === '' && near(w3.rect, base, 0.01), tag + ': wheel flick down+up restores exactly (y=' + w3.y + ')');
    await p.mouse.wheel(0, 260); for (let i = 0; i < 6; i++) { await p.waitForTimeout(120); inv(await read(p), tag + ' lenis mid-glide'); } await p.waitForTimeout(1500);
  }
  // ── anchor jumps (nav links via Lenis) and Home
  await jump(p, 0); await p.waitForTimeout(500);
  for (const label of ['Rewards', 'About', 'FAQ']) { const a = p.locator(`.top nav a:has-text("${label}")`).first(); if (!(await a.count()) || !(await a.isVisible())) continue; await a.click(); await p.waitForTimeout(2600); const s = await read(p); inv(s, tag + ' anchor ' + label); ok(s.op < 0.02, tag + ` anchor ${label}: hero clock settled (y=${Math.round(s.y)})`); }
  await p.keyboard.press('Home'); await p.waitForTimeout(2400); const hm = await read(p);
  ok(hm.y === 0 && hm.inlineAll === '' && near(hm.rect, base, 0.01) && hm.chipOp === 0, tag + `: anchor jumps then Home restore exactly (y=${hm.y})`);
  // ── chip never over a lower Register button / the focused control: sweep the whole page
  let overReg = 0, samples = 0, overFocus = 0; const total = max; for (let y = 0; y <= total; y += Math.round(h * 0.3)) { await jump(p, y); await frame(p); const s = await read(p); samples++; if (s.chipOp > 0.1 && s.overReg) overReg++; inv(s, tag + ' sweep2'); }
  ok(overReg === 0, tag + `: chip never over a Register button across ${samples} stops`);
  await p.evaluate(() => document.querySelector('#how .cta .btn, #how [data-reg-btn]')?.scrollIntoView({ block: 'center', behavior: 'instant' })); await frame(p);
  { const btn = await p.evaluate(() => { const a = document.querySelector('#how [data-reg-btn]'); if (!a) return null; const r = a.getBoundingClientRect(); return [r.top, r.bottom]; }); if (btn) for (const off of [-40, 0, 40, 100]) { await p.evaluate((o) => scrollBy(0, o), off); await frame(p); const s = await read(p); ok(!(s.chipOp > 0.1 && s.overReg), tag + ` Register button passing under the chip (offset ${off}): chip hidden/clear`); } }
  { await jump(p, Math.round(1.55 * F)); await frame(p); await p.evaluate(() => document.querySelector('.f3 a, .f3 .flink')?.focus({ focusVisible: true })); await p.waitForTimeout(500); for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); await frame(p); const s = await read(p); if (s.chipOp > 0.1 && s.overFocus) overFocus++; } ok(overFocus === 0, tag + ': chip never covers the focused control while tabbing'); }
  const cls = await p.evaluate(() => window.__cls); ok(cls === 0, tag + ' CLS ' + cls); ok(!errs.length, tag + ' console errors ' + errs.join('|'));
  await ctx.close();
}
// ── every inline style written to the clock is transform / opacity / will-change only
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200); const bad2 = new Set();
  for (let y = 0; y < 1500; y += 60) { await jump(p, y); await frame(p); (await p.evaluate(() => { const c = document.querySelector('.f1 .regline .rl-clock'); return [...c.style]; })).forEach((k) => !['transform', 'opacity', 'will-change'].includes(k) && bad2.add(k)); }
  ok(!bad2.size, 'only transform/opacity/will-change inline on the flying clock ' + [...bad2]); await ctx.close(); }
// ── reduced motion: no chip, no flight, nothing running
for (const [w, h] of [[320, 640], [390, 844], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); await ctx.addInitScript(clsHook); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  let maxAnim = 0, moved = 0, chips = 0; const tot = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; y <= tot; y += Math.round(h * 0.7)) { await jump(p, y); await p.waitForTimeout(120); const r = await p.evaluate(() => ({ a: document.getAnimations().filter((x) => x.playState === 'running').length, s: document.querySelector('.f1 .regline .rl-clock').getAttribute('style') || '', c: document.querySelectorAll('.reg-chip').length })); maxAnim = Math.max(maxAnim, r.a); if (r.s) moved++; chips += r.c; }
  const nums = await p.evaluate(() => [...document.querySelectorAll('.f1 .rl-num')].map((n) => n.textContent.replace(/\s+/g, '')));
  console.log('reduced', `${w}x${h}`, 'max running animations', maxAnim, 'flown', moved, 'chips', chips, 'digits', nums.join(':'));
  ok(maxAnim === 0 && moved === 0 && chips === 0 && nums.every((n) => /^\d\d$/.test(n)), `reduced motion ${w}x${h}: no flight, no chip, 0 running animations, clock digits present`); ok((await p.evaluate(() => window.__cls)) === 0, `reduced ${w}x${h} CLS 0`); await ctx.close(); }
// ── JS off: static IST text, no chip, no clock
for (const [w, h] of [[320, 640], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ chip: document.querySelectorAll('.reg-chip').length, t: document.querySelector('.f1 .regline .rl-static')?.textContent.trim(), vis: getComputedStyle(document.querySelector('.f1 .regline .rl-static')).visibility, clockHidden: document.querySelector('.f1 .rl-clock').hidden, ow: document.documentElement.scrollWidth <= innerWidth }));
  console.log('js-off', `${w}x${h}`, JSON.stringify(r)); ok(r.chip === 0 && r.t === 'Registration closes 11 Oct 2026, 12:00 PM IST' && r.vis === 'visible' && r.clockHidden && r.ow, `JS off ${w}x${h}: static IST line, no chip`); await ctx.close(); }
// ── closed state (fake clock after the deadline): no flight, hero line hidden, chip says closed, Register disabled
{ const CLOSE = Date.parse('2026-10-11T12:00:00+05:30');
  for (const [w, h] of [[320, 640], [1280, 800]]) { const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); await ctx.addInitScript(clsHook); const p = await ctx.newPage(); await p.clock.install({ time: CLOSE + 3600e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2400);
    const Fp = await p.evaluate(() => 0.9 * innerHeight); const out = []; for (const k of [0, 0.4, 1.5]) { await jump(p, Math.round(k * Fp)); await frame(p); await p.waitForTimeout(450); out.push(await p.evaluate(() => { const c = document.querySelector('.f1 .regline .rl-clock'); const chip = document.querySelector('.reg-chip'); return { s: c.getAttribute('style') || '', chip: chip?.textContent.trim(), op: chip ? +getComputedStyle(chip).opacity : null, state: chip?.dataset.state, btn: document.querySelector('a[data-reg-btn]')?.getAttribute('aria-disabled') }; })); }
    console.log('closed', `${w}x${h}`, JSON.stringify(out)); ok(out.every((o) => o.s === '' && o.state === 'closed' && o.btn === 'true') && out[0].op === 0 && out[2].op > 0.9 && /closed/i.test(out[2].chip), `closed state ${w}x${h}: no flight, chip appears later with the closed text`); ok((await p.evaluate(() => window.__cls)) === 0, `closed ${w}x${h} CLS 0`); await ctx.close(); } }
await b.close(); console.log(bad ? 'clock-fly-check FAILED' : 'clock-fly-check ok'); process.exit(bad ? 1 : 0);
