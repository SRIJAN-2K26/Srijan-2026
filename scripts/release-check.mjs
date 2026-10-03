// Combined motion release checks (Lenis + hero parallax + timeline draw + tilt + prize scramble + magnetic buttons + FAQ + schedule tabs),
// plus reduced-motion / touch / JS-off behaviour. Also saves the six review screenshots per viewport into $OUT.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4393/', OUT = process.env.OUT || '/workspace/shots-motion';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const REWARD = 'Rewards worth ₹1.5 Lakh+';
const settle = (p) => p.waitForTimeout(2500);
const jump = (p, y) => p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);

// ── static: forbidden reward phrases in src + dist ──
{ const walk = (d, o = []) => { for (const e of readdirSync(d, { withFileTypes: true })) { const f = d + '/' + e.name; e.isDirectory() ? walk(f, o) : /\.(html|js|css|json|astro|ts)$/.test(e.name) && o.push(f); } return o; };
  const root = new URL('..', import.meta.url).pathname; const bad_ = /in rewards|\bcash\b|prize pool|goodies|voucher|discord/i;
  const hits = [...walk(root + 'dist'), ...walk(root + 'src')].filter((f) => bad_.test(readFileSync(f, 'utf8'))); console.log('forbidden-phrase files:', hits.length ? hits : 'none'); ok(!hits.length, 'forbidden phrases in dist/src: ' + hits.join(',')); }

for (const [w, h, mobile] of [[1280, 800, false], [390, 844, true]]) {
  const tag = `${w}x${h}`, F = Math.round(.9 * h);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile }); const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' }); await settle(p);
  await p.screenshot({ path: `${OUT}/${tag}-1-hero.png` });
  ok(await p.evaluate(() => !document.querySelectorAll('.pc').length), tag + ' prize scramble has NOT fired at page load');
  // ── hero: kinetic title has an accessible name once; parallax follows scroll under Lenis
  const hero = await p.evaluate(() => { const t = document.querySelector('.tag.kin'); return { label: t.getAttribute('aria-label'), sr: t.querySelector('.sr')?.textContent, vis: [...t.querySelectorAll('[aria-hidden=true]')].length }; }); console.log(tag, 'hero tagline', JSON.stringify(hero)); ok(!hero.label && /BUILD/i.test(hero.sr || '') && hero.vis >= 3, 'tagline: sr copy + aria-hidden visual (no aria-label on <p>)');
  if (!mobile) { await p.mouse.move(w / 2, h / 2); const par0 = await p.evaluate(() => getComputedStyle(document.querySelector('.sky.s-hero')).getPropertyValue('--para-near') || '0'); await p.mouse.wheel(0, 400); await p.waitForTimeout(1600); const par1 = await p.evaluate(() => getComputedStyle(document.querySelector('.sky.s-hero')).getPropertyValue('--para-near')); const y = await p.evaluate(() => scrollY); console.log(tag, 'parallax --para-near', par0, '->', par1, 'at scrollY', y); ok(Math.abs(+par1 - y * .28) < 1 && y > 300, 'hero parallax tracks Lenis scroll'); await jump(p, 0); await p.waitForTimeout(400); }
  // ── frame 3: domain cards (+ tilt on the pinned tiles)
  await jump(p, Math.round(2.55 * F)); await p.waitForTimeout(900);
  if (!mobile) { const box = await p.locator('.dom').nth(1).boundingBox(); await p.mouse.move(box.x + box.width * .85, box.y + box.height * .2, { steps: 8 }); await p.waitForTimeout(600);
    const t = await p.evaluate(() => { const e = document.querySelectorAll('.dom')[1]; return { tr: getComputedStyle(e).rotate, rx: e.style.getPropertyValue('--rx'), glow: +getComputedStyle(e.querySelector('.tilt-glow')).opacity, op: +getComputedStyle(e).opacity }; }); console.log(tag, 'f3 .dom tilt', JSON.stringify(t));
    ok(t.rx && t.rx !== '0deg' && t.op === 1, 'tilt vars set on pinned domain tile'); ok(t.tr !== 'none', 'pinned domain tile rotate applies on top of the flip timeline: ' + t.tr); ok(t.glow > .5, 'tilt border glow on hover'); }
  await p.screenshot({ path: `${OUT}/${tag}-2-domain-cards.png` }); await p.mouse.move(2, 2);
  // ── frame 4: pinned timeline draws as you scroll
  { const rd = []; for (const k of [3.1, 3.25, 3.4, 3.6, 3.8]) { await jump(p, Math.round(k * F)); await p.waitForTimeout(200); rd.push(await p.evaluate(() => { const t = document.querySelector('.steps5 .tl-path'); return +(parseFloat(t.style.strokeDashoffset) / parseFloat(t.style.strokeDasharray)).toFixed(2); })); }
    console.log(tag, 'pinned timeline undrawn-fraction at 3.1F..3.8F', JSON.stringify(rd)); ok(rd[0] > .9 && rd[4] === 0 && rd.every((v, i) => !i || v <= rd[i - 1]) && rd[2] > 0 && rd[2] < 1, 'pinned timeline draws monotonically with scroll'); }
  await jump(p, Math.round(3.6 * F)); await p.waitForTimeout(500);
  { const a = await p.evaluate(() => { const r = document.querySelector('.steps5'), d = r.querySelector('.tl-path').getAttribute('d'), pts = d.slice(1).split(' L').map((s) => s.split(',').map(Number)); const rr = r.getBoundingClientRect(); const dots = [...r.querySelectorAll('.dot')].map((n) => { const q = n.getBoundingClientRect(); return [q.left + q.width / 2 - rr.left, q.top + q.height / 2 - rr.top]; }); return pts.map((q, i) => Math.hypot(q[0] - dots[i][0], q[1] - dots[i][1])); }); console.log(tag, 'pinned path→dot offsets px', a.map((x) => x.toFixed(1)).join(',')); ok(a.every((x) => x < 2), 'pinned path endpoints sit on the dots'); }
  await p.screenshot({ path: `${OUT}/${tag}-4-schedule-timeline-story.png` });
  // ── frame 5: reward counter
  await jump(p, Math.round(4.55 * F)); await p.waitForTimeout(250); const mid = await p.evaluate(() => document.querySelector('.prize-scramble').textContent); await p.waitForTimeout(1500);
  const pr = await p.evaluate(() => { const r = document.querySelector('[data-prize]'), sr = r.querySelector('.sr'); const q = r.getBoundingClientRect(); const fx = r.querySelector('.prize-fx').getBoundingClientRect(); return { sr: sr.textContent, nodes: sr.childNodes.length, fx: r.querySelector('.prize-fx').textContent.trim(), aria: r.querySelector('.prize-fx').getAttribute('aria-hidden'), fig: r.querySelector('.prize-scramble').textContent, h: Math.round(q.height), fxh: Math.round(fx.height), vw: innerWidth, right: Math.round(fx.right) }; });
  console.log(tag, 'prize mid-scramble', JSON.stringify(mid), 'final', JSON.stringify(pr));
  ok(pr.sr === REWARD && pr.nodes === 1 && pr.fx === REWARD && pr.fig === '₹1.5 Lakh+' && pr.aria === 'true', 'prize: one sr text node = "' + REWARD + '", overlay settles on "₹1.5 Lakh+"'); ok(pr.right <= pr.vw, 'prize heading inside viewport');
  await p.screenshot({ path: `${OUT}/${tag}-3-reward-frame.png` });
  // ── magnetic buttons (frame 6): only with a fine pointer; frozen on press; closed state inert
  await jump(p, Math.round(5.6 * F)); await p.waitForTimeout(900);
  const mag = await p.evaluate(() => ({ laser: document.querySelectorAll('.btn-laser').length, mq: matchMedia('(hover:hover) and (pointer:fine)').matches }));
  if (!mobile) { const bt = p.locator('.f6 [data-reg-btn]'); const bb = await bt.boundingBox(); ok(bb.height >= 44, 'register button >= 44px tall: ' + bb.height);
    await p.mouse.move(bb.x - 120, bb.y + bb.height / 2); await p.mouse.move(bb.x - 14, bb.y + bb.height / 2, { steps: 6 }); await p.waitForTimeout(100); const tr = await bt.evaluate((e) => e.style.transform); console.log(tag, 'magnetic transform near button', tr); ok(/translate3d/.test(tr) && mag.laser >= 2, 'magnetic pull near the Register button');
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 4 }); await p.mouse.down(); const r1 = await bt.evaluate((e) => e.style.transform); await p.mouse.move(bb.x + bb.width / 2 + 6, bb.y + bb.height / 2 + 4); const r2 = await bt.evaluate((e) => e.style.transform); await p.mouse.up(); ok(r1 === r2, 'button frozen while pressed: ' + r1 + ' vs ' + r2);
    await p.mouse.move(w - 5, 5, { steps: 3 }); const clr = await bt.evaluate((e) => e.style.transform); ok(clr === '', 'magnetic resets away from button');
    await bt.evaluate((e) => { e.removeAttribute('href'); e.setAttribute('aria-disabled', 'true'); }); await p.mouse.move(bb.x - 14, bb.y + bb.height / 2, { steps: 4 }); ok(await bt.evaluate((e) => e.style.transform) === '', 'closed (no href / aria-disabled) button gets no magnetic effect'); }
  else ok(mag.laser === 0 && !mag.mq, 'touch: no magnetic buttons / no fine pointer');
  await p.screenshot({ path: `${OUT}/${tag}-6-register-area.png` });
  // ── About domain cards tilt + reveal (non-pinned)
  await p.evaluate(() => document.querySelector('.dcards').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(1600);
  const dc = await p.evaluate(() => [...document.querySelectorAll('.dcards li')].map((e) => +getComputedStyle(e).opacity)); ok(dc.every((o) => o === 1), 'about domain cards revealed: ' + dc);
  if (!mobile) { const bx = await p.locator('.dcards li').nth(1).boundingBox(); await p.mouse.move(bx.x + bx.width * .7, bx.y + bx.height * .3, { steps: 6 }); await p.waitForTimeout(500); const tr = await p.evaluate(() => getComputedStyle(document.querySelectorAll('.dcards li')[1]).rotate); ok(tr !== 'none', 'about domain card tilts: ' + tr); await p.mouse.move(2, 2); }
  await p.screenshot({ path: `${OUT}/${tag}-2b-about-domain-cards.png` });
  // ── How-it-works timeline (document flow): draws as you wheel-scroll with Lenis running
  await jump(p, 0); await p.waitForTimeout(300);
  const st = await p.evaluate(() => Math.round(document.querySelector('#how .stepper').getBoundingClientRect().top + scrollY - innerHeight * .9)); await jump(p, st); await p.waitForTimeout(1200);
  { const rd = []; await p.mouse.move(w / 2, h / 2); for (let i = 0; i < 9; i++) { await p.mouse.wheel(0, 110); await p.waitForTimeout(700); rd.push(await p.evaluate(() => { const t = document.querySelector('#how .tl-path'); return +(parseFloat(t.style.strokeDashoffset) / parseFloat(t.style.strokeDasharray)).toFixed(2); })); }
    console.log(tag, 'stepper undrawn-fraction per 110px wheel notch', JSON.stringify(rd)); ok(rd[0] > .85 && rd.every((v, i) => !i || v <= rd[i - 1]) && rd[8] < rd[0] - .3 && await p.evaluate(() => document.documentElement.classList.contains('lenis')), 'stepper timeline draws as you wheel-scroll (Lenis on)'); }
  await p.evaluate(() => document.querySelector('#how .stepper').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(1600);
  { const a = await p.evaluate(() => { const r = document.querySelector('#how .stepper'), pts = r.querySelector('.tl-path').getAttribute('d').slice(1).split(' L').map((s) => s.split(',').map(Number)); const rr = r.getBoundingClientRect(); const ns = [...r.querySelectorAll('.num')].map((n) => { const q = n.getBoundingClientRect(); return [q.left + q.width / 2 - rr.left, q.top + q.height / 2 - rr.top]; }); return pts.map((q, i) => Math.hypot(q[0] - ns[i][0], q[1] - ns[i][1])); }); console.log(tag, 'stepper path→node offsets px', a.map((x) => x.toFixed(1)).join(',')); ok(a.every((x) => x < 2), 'stepper path endpoints sit on the number discs (after reveal)'); }
  await p.screenshot({ path: `${OUT}/${tag}-4b-timeline-how.png` });
  // ── schedule tabs
  await p.evaluate(() => document.querySelector('[data-schedule-tabs]').scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(1500);
  { const labels = await p.$$eval('.day-tab', (a) => a.map((x) => x.textContent)); ok(JSON.stringify(labels) === '["13 Oct","14 Oct"]', 'schedule tabs: ' + labels); const tb = await p.$$eval('.day-tab', (a) => a.map((x) => Math.round(x.getBoundingClientRect().height))); ok(tb.every((x) => x >= 44), 'tab targets >=44px ' + tb);
    await p.focus('.day-tab'); await p.keyboard.press('ArrowRight'); const s1 = await p.evaluate(() => [...document.querySelectorAll('.day')].map((d) => d.hidden)); await p.keyboard.press('Home'); const s2 = await p.evaluate(() => [...document.querySelectorAll('.day')].map((d) => d.hidden)); await p.keyboard.press('End'); const s3 = await p.evaluate(() => ({ h: [...document.querySelectorAll('.day')].map((d) => d.hidden), foc: document.activeElement.textContent }));
    ok(JSON.stringify(s1) === '[true,false]' && JSON.stringify(s2) === '[false,true]' && JSON.stringify(s3.h) === '[true,false]' && s3.foc === '14 Oct', 'schedule tab keyboard (Arrow/Home/End): ' + JSON.stringify([s1, s2, s3])); await p.keyboard.press('Home'); }
  await p.screenshot({ path: `${OUT}/${tag}-4c-schedule-tabs.png` });
  // ── FAQ
  await p.evaluate(() => document.querySelector('#faq .faq').scrollIntoView({ block: 'start', behavior: 'instant' })); await p.waitForTimeout(1200);
  { const sum = p.locator('#faq summary').first(); const q = async () => p.evaluate(() => { const d = document.querySelector('[data-faq]'); const pn = d.querySelector('.faq-panel'); return { exp: d.querySelector('summary').getAttribute('aria-expanded'), inert: pn.hasAttribute('inert'), h: Math.round(pn.getBoundingClientRect().height), op: +getComputedStyle(pn).opacity, open: d.open }; });
    const c = await q(); ok(c.exp === 'false' && c.inert && c.h === 0, 'FAQ closed: aria-expanded=false, inert, 0 height ' + JSON.stringify(c)); const sb = await sum.boundingBox(); ok(sb.height >= 44, 'faq summary >=44px: ' + sb.height);
    await sum.click(); await p.waitForTimeout(700); const o = await q(); ok(o.exp === 'true' && !o.inert && o.h > 20 && o.op === 1, 'FAQ open ' + JSON.stringify(o));
    await p.screenshot({ path: `${OUT}/${tag}-5-faq-open.png` }); await p.keyboard.press('Enter'); await p.waitForTimeout(800); const c2 = await q(); ok(c2.exp === 'false' && c2.inert && c2.h === 0, 'FAQ keyboard close ' + JSON.stringify(c2));
    const regFaq = await p.$eval('[data-reg-faq]', (e) => e.textContent); console.log(tag, 'reg faq text:', regFaq.slice(0, 60)); }
  ok(!errs.length, tag + ' console errors: ' + errs.join('|'));
  await ctx.close();
}
// ── reduced motion: 0 animations at every scroll stop, content fully visible, no pointer effects
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await settle(p);
  const tot = await p.evaluate(() => document.documentElement.scrollHeight); let maxAnim = 0; for (let y = 0; y <= tot; y += Math.round(h * .8)) { await jump(p, y); await p.waitForTimeout(120); maxAnim = Math.max(maxAnim, await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)); }
  const r = await p.evaluate(() => ({ laser: document.querySelectorAll('.btn-laser').length, tilt: [...document.querySelectorAll('[data-tilt]')].filter((e) => e.style.getPropertyValue('--rx')).length, frames: [...document.querySelectorAll('.frame')].map((e) => +getComputedStyle(e).opacity), path: parseFloat(document.querySelector('#how .tl-path').style.strokeDashoffset), scr: document.querySelector('.prize-scramble').textContent, pcs: document.querySelectorAll('.pc').length, fx: document.querySelector('.prize-fx').textContent.trim(), days: [...document.querySelectorAll('.day')].map((d) => !d.hidden), lenis: document.documentElement.classList.contains('lenis') }));
  console.log('reduced', w + 'x' + h, 'max running animations', maxAnim, JSON.stringify(r)); ok(maxAnim === 0 && r.laser === 0 && r.tilt === 0 && r.frames.every((o) => o === 1) && r.path === 0 && r.pcs === 0 && r.fx === REWARD && !r.lenis, 'reduced motion: 0 animations, static, fully visible'); await ctx.close();
}
// ── JS off: all text readable
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ text: document.body.innerText, days: [...document.querySelectorAll('.day')].map((d) => !d.hidden), tabs: document.querySelectorAll('.day-tab').length, faq: [...document.querySelectorAll('.faq .a')].length, frames: [...document.querySelectorAll('.frame')].map((e) => +getComputedStyle(e).opacity) }));
  const must = [REWARD, 'BUILD', '13 Oct', '14 Oct']; const miss = must.filter((m) => !new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(r.text)); console.log('js-off', JSON.stringify({ days: r.days, tabs: r.tabs, faq: r.faq, frames: r.frames, miss })); ok(!miss.length && r.days.every(Boolean) && r.tabs === 0 && !r.text.includes('Rewards worth ₹1.5 Lakh+Rewards'), 'JS off: text readable, both days visible, no duplicate overlay text ' + miss); await ctx.close(); }
await b.close(); console.log(bad ? 'release-check FAILED' : 'release-check ok'); process.exit(bad ? 1 : 0);
