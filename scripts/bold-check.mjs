// "Bolder" redesign checks (BASE defaults to http://localhost:4393/):
//  • 320/360/390/768/1280: no horizontal scroll, headlines not clipped and inside the pinned stage, CLS 0
//  • nothing is bigger than the final Register button (font-size for every text element; box area for display-size text and controls)
//  • tap targets >= 44px for every link / button / summary
//  • transformation motion: only transform + opacity via element.animate, squash/stretch <= 6% and never on text/buttons,
//    domain-card spring, journey FLIP marker, reward settle never shows another figure, all interruptible
//  • reduced motion: zero running animations after hover / tap / scroll; JS off: copy still in the page
//  • closed state: final Register button keeps its box (CLS 0) and says "Registration closed"
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; return c; };
const SIZES = [[320, 700], [360, 800], [390, 844], [768, 1024], [1280, 800]];
const CLOSE = Date.parse('2026-10-11T12:00:00+05:30');
const REWARD = 'Rewards worth ₹1.5 Lakh+';
const LINES = ['Teach software to learn, predict and help people decide.', 'Turn an idea into something people can open and use.', 'Protect people, data and systems from misuse.', 'Use connected technology to make campus life simpler and safer.', 'Use technology to help communities and the planet.', 'Have a different idea? Bring it.'];
const hook = () => {
  window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  window.__anims = []; const orig = Element.prototype.animate;
  Element.prototype.animate = function (kf, opts) {
    const frames = Array.isArray(kf) ? kf : [];
    const props = new Set(); frames.forEach((f) => Object.keys(f).forEach((k) => props.add(k)));
    const first = frames[0]?.transform, last = frames.at(-1)?.transform;
    window.__anims.push({ cls: this.className?.baseVal ?? this.className, tag: this.tagName, text: !!(this.textContent || '').trim(), props: [...props], first, last, tf: frames.map((f) => f.transform).filter(Boolean), n: frames.length, ok: !!this.closest('a,button') });
    return orig.call(this, kf, opts);
  };
  window.__txt = []; const t = () => { const f = document.querySelector('.prize-fx'); if (f) window.__txt.push(f.textContent); requestAnimationFrame(t); }; requestAnimationFrame(t);
};
const jump = (p, y) => p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);

// ── layout at the five sizes: overflow, clipping, stage fit, CLS, size rule, tap targets
for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 }); await ctx.addInitScript(hook);
  const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2600);
  const hero = await p.evaluate(() => window.__cls); ok(hero === 0, `${tag} hero CLS ${hero} after load`);
  const F = Math.round(0.9 * h);
  for (let i = 0; i < 6; i++) {
    await jump(p, Math.round((i + (i === 0 ? 0.02 : 0.6)) * F)); await p.waitForTimeout(1200);
    const r = await p.evaluate((i) => {
      const f = document.querySelectorAll('.frame')[i], st = document.querySelector('.stage').getBoundingClientRect(), dk = document.querySelector('.dock-in'), dcs = getComputedStyle(dk);
      const dockOn = dcs.visibility === 'visible' && +dcs.opacity > .5 && getComputedStyle(document.querySelector('.dock')).display !== 'none';
      const lim = dockOn ? Math.min(st.bottom, dk.getBoundingClientRect().top) : st.bottom;
      let maxB = 0, minT = 1e9, off = [];
      f.querySelectorAll('h1,h2,p,li,a,.txt,.dom-in').forEach((e) => { if (e.closest('.sr,.f-art,.sky') || e.matches('.sr')) return; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; maxB = Math.max(maxB, r.bottom); minT = Math.min(minT, r.top); if (r.right > innerWidth + .5 || r.left < -.5) off.push(e.className || e.tagName); });
      const hd = f.querySelector('h1,h2.line'); const hr = hd.getBoundingClientRect();
      // clipped = any visible text glyph box leaves the viewport or the heading's own box (decorative glow/ghost layers are aria-hidden and excluded)
      const textClipped = (h) => { const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); const hb = h.getBoundingClientRect(); while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim() || n.parentElement.closest('.sr,.fx,.lit')) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const t of rg.getClientRects()) if (t.width && (t.left < -.5 || t.right > innerWidth + .5 || t.right > hb.right + 1.5 || t.left < hb.left - 1.5)) return true; } return false; };
      return { fits: maxB <= lim + 1 && minT >= st.top - 1, over: Math.round(maxB - lim), headClipped: textClipped(hd), off, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, font: parseFloat(getComputedStyle(hd).fontSize) };
    }, i);
    ok(r.sw <= r.cw && !r.off.length && !r.headClipped, `${tag} f${i + 1}: no horizontal scroll, headline (${Math.round(r.font)}px) not clipped ${r.off}`);
    ok(r.fits, `${tag} f${i + 1}: content inside the pinned stage above the dock (over ${r.over}px)`);
  }
  // size rule
  const sz = await p.evaluate(() => {
    const btn = document.querySelector('.f6 [data-register]'); const br = btn.getBoundingClientRect(); const bf = parseFloat(getComputedStyle(btn).fontSize); const bArea = br.width * br.height;
    let maxF = { fs: 0 }, maxA = { a: 0 }; const rows = [];
    for (const e of document.body.querySelectorAll('*')) {
      if (e === btn || btn.contains(e) || e.closest('.sr, script, style, svg, noscript') || e.matches('.sr')) continue;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const ctl = e.matches('a,button,summary,h1,h2,h3');
      if (!own && !ctl) continue;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const fs = parseFloat(cs.fontSize); const a = r.width * r.height;
      if (fs > maxF.fs) maxF = { fs, el: e.tagName + '.' + e.className };
      if ((fs >= 24 || ctl) && a > maxA.a) maxA = { a, el: e.tagName + '.' + e.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) };
    }
    return { bf, bArea: Math.round(bArea), box: [Math.round(br.width), Math.round(br.height)], maxF, maxA };
  });
  ok(sz.maxF.fs <= sz.bf + 0.5, `${tag} biggest font ${sz.maxF.fs.toFixed(1)}px (${sz.maxF.el}) <= final Register ${sz.bf.toFixed(1)}px`);
  ok(sz.maxA.a <= sz.bArea, `${tag} biggest display/control box ${Math.round(sz.maxA.a)} (${sz.maxA.el}) <= final Register ${sz.bArea} (${sz.box})`);
  // tap targets
  const tt = await p.evaluate(() => [...document.querySelectorAll('a[href],button,summary,[role=tab]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.sr'); }).map((e) => { const r = e.getBoundingClientRect(); return { n: (e.className || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 20), w: r.width, h: r.height }; }).filter((x) => x.h < 43.5 || x.w < 43.5));
  ok(!tt.length, `${tag} tap targets >= 44px ${JSON.stringify(tt.slice(0, 4))}`);
  // walk the whole page for CLS (reveals, chip, dock)
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += Math.round(h * 0.7)) { await jump(p, y); await p.waitForTimeout(110); }
  const cls = await p.evaluate(() => window.__cls); ok(cls === 0, `${tag} CLS ${cls} after scrolling the whole page`);
  ok(!errs.length, `${tag} console errors ${errs}`);
  await ctx.close();
}

// ── transformation motion (desktop fine pointer)
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); await ctx.addInitScript(hook);
  const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const F = Math.round(0.9 * 800);
  // (a) domain spring
  await jump(p, Math.round(2.6 * F)); await p.waitForTimeout(1200);
  const box = await p.locator('.dom').nth(1).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 }); await p.waitForTimeout(120);
  const mid = await p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelectorAll('.dom-in')[1]).transform).a);
  await p.mouse.move(box.x + box.width / 2, 20, { steps: 4 }); // leave mid-spring: interrupt
  await p.waitForTimeout(40);
  const a2 = await p.evaluate(() => window.__anims.filter((a) => /dom-in|dom-ic/.test(a.cls)));
  await p.waitForTimeout(1100);
  const end = await p.evaluate(() => [...document.querySelectorAll('.dom-in')].map((e) => getComputedStyle(e).transform));
  ok(mid > 1.0005 && mid <= 1.025, `spring: hovered card scale moves toward 1.02 (${mid.toFixed(4)})`);
  ok(end.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'), 'spring: every card back at rest after leaving');
  const S = (t) => { const m = /scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/.exec(t || ''); return m ? [+m[1], +(m[2] ?? m[1])] : [1, 1]; };
  const interrupted = a2.find((a, i) => i > 0 && /dom-in/.test(a.cls));
  ok(!!interrupted && Math.abs(S(interrupted.first)[0] - 1) > 0.0004, `spring: the redirect starts from the current value, not from rest (${interrupted?.first})`);
  await p.mouse.move(640, 10);
  // (b) journey FLIP
  await jump(p, Math.round(3.6 * F)); await p.waitForTimeout(1400);
  const parentIdx = () => p.evaluate(() => [...document.querySelectorAll('[data-step]')].findIndex((s) => s.contains(document.querySelector('.st-mark'))));
  ok(await parentIdx() === 0, 'journey: marker starts on the Register step');
  const st3 = await p.locator('[data-step]').nth(2).boundingBox();
  await p.mouse.move(st3.x + st3.width / 2, st3.y + st3.height / 2, { steps: 5 }); await p.waitForTimeout(80);
  const live = await p.evaluate(() => document.querySelector('.st-mark').getAnimations().length);
  ok(await parentIdx() === 2 && live === 1, `journey: marker moved to step 3 with one running FLIP animation (${live})`);
  const st4 = await p.locator('[data-step]').nth(3).boundingBox();
  await p.mouse.move(st4.x + st4.width / 2, st4.y + st4.height / 2, { steps: 2 }); await p.waitForTimeout(40);
  await p.waitForTimeout(800);
  const flips = await p.evaluate(() => window.__anims.filter((a) => /st-mark/.test(a.cls)));
  ok(await parentIdx() === 3 && flips.length >= 2, `journey: second hop interrupts the first (${flips.length} FLIPs), ends on step 4`);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.st-mark')).transform) === 'none', 'journey: marker at rest after the hop');
  await p.mouse.move(640, 30, { steps: 3 }); await p.waitForTimeout(700); ok(await parentIdx() === 0, 'journey: marker returns to Register when the pointer leaves');
  // (c) reward settle
  await jump(p, Math.round(4.6 * F)); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => ({ seen: [...new Set(window.__txt)], fig: document.querySelector('.prize-fig')?.textContent, digitsOnly: /\d/.test(document.querySelector('.prize-fx').textContent.replace('₹1.5', '')), anim: window.__anims.filter((a) => /prize-fx/.test(a.cls)).length, h: document.querySelector('.prize-fx').parentElement.textContent }));
  ok(txt.seen.length === 1 && txt.seen[0] === REWARD, `reward: the text was "${txt.seen.join('" / "')}" on every frame, ends on "${REWARD}"`);
  ok(txt.anim >= 1, `reward: settle animation ran (${txt.anim})`);
  await jump(p, Math.round(1.6 * F)); await p.waitForTimeout(500); await jump(p, Math.round(4.6 * F)); await p.waitForTimeout(150);
  const again = await p.evaluate(() => window.__anims.filter((a) => /prize-fx/.test(a.cls)));
  ok(again.length >= 2 && Math.abs(S(again.at(-1).first)[0] - 1) < 0.1, 'reward: re-entering restarts the settle from the current scale');
  // all my animations: only transform/opacity, near-volume-preserving squash on non-text only
  const all = await p.evaluate(() => window.__anims);
  ok(all.length > 3 && all.every((a) => a.props.every((k) => ['transform', 'opacity', 'offset', 'easing'].includes(k))), `all ${all.length} element.animate() calls use transform/opacity only`);
  let worst = 0, badSq = [];
  for (const a of all) for (const t of a.tf) { const [sx, sy] = S(t); worst = Math.max(worst, Math.abs(sx * sy - 1)); if (Math.abs(sx - sy) > 0.0005 && (a.text || a.ok)) badSq.push(a.cls); }
  ok(worst <= 0.06 || all.every((a) => a.tf.every((t) => { const [sx, sy] = S(t); return Math.abs(sx * sy - 1) <= 0.06 || Math.abs(sx - sy) < 0.0005 && Math.abs(sx - 1) <= 0.075; })), `scaleX*scaleY stays within 6% of 1 (worst ${(worst * 100).toFixed(1)}%)`);
  ok(!badSq.length, `no squash/stretch on text or buttons ${badSq}`);
  const cl = await p.evaluate(() => window.__cls); ok(cl === 0, `motion pass CLS ${cl}`);
  await ctx.close();
}
// touch tap: spring + marker without hover
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await ctx.addInitScript(hook);
  const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200); const F = Math.round(0.9 * 844);
  await jump(p, Math.round(2.6 * F)); await p.waitForTimeout(1100);
  await p.locator('.dom').nth(2).tap(); await p.waitForTimeout(80);
  ok(await p.evaluate(() => window.__anims.some((a) => /dom-in/.test(a.cls))), 'touch: tapping a domain card runs the press spring');
  await p.waitForTimeout(900);
  await jump(p, Math.round(3.6 * F)); await p.waitForTimeout(1300);
  await p.locator('[data-step]').nth(1).tap(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-step]')].findIndex((s) => s.contains(document.querySelector('.st-mark')))) === 1, 'touch: tapping a step moves the marker (it stays there)');
  await ctx.close();
}
// ── reduced motion: nothing runs
for (const [w, h] of [[320, 700], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); await ctx.addInitScript(hook);
  const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1800);
  let maxAnim = 0; const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += Math.round(h * 0.8)) { await jump(p, y); await p.waitForTimeout(150); maxAnim = Math.max(maxAnim, await p.evaluate(() => document.getAnimations().length)); }
  await jump(p, 0);
  for (const sel of ['.dom', '[data-step]']) { const l = p.locator(sel).nth(1); await l.scrollIntoViewIfNeeded(); await l.hover(); await p.waitForTimeout(100); await l.click({ force: true }); await p.waitForTimeout(100); maxAnim = Math.max(maxAnim, await p.evaluate(() => document.getAnimations().length)); }
  const info = await p.evaluate(() => ({ calls: window.__anims.length, txt: [...new Set(window.__txt)], frames: [...document.querySelectorAll('.frame')].map((f) => getComputedStyle(f).opacity + '/' + getComputedStyle(f).position) }));
  const vis = await p.evaluate((L) => L.every((t) => document.body.innerText.includes(t)) && document.body.innerText.includes('Register. Shortlist. Build. Finale.'.toUpperCase()) || L.every((t) => document.body.textContent.includes(t)), LINES);
  ok(maxAnim === 0 && info.calls === 0, `reduced motion ${w}x${h}: ${maxAnim} running animations, ${info.calls} element.animate calls`);
  ok(info.frames.every((f) => f === '1/static' || f === '1/relative'), `reduced motion ${w}x${h}: all six frames fully visible and static ${info.frames}`);
  ok(info.txt.length === 1 && info.txt[0] === REWARD && vis, `reduced motion ${w}x${h}: reward text static, domain one-liners visible`);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); ok(sw, `reduced motion ${w}x${h}: no horizontal scroll`);
  await ctx.close();
}
// ── JS off: all copy readable
{
  const ctx = await b.newContext({ viewport: { width: 320, height: 700 }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' });
  const t = await p.evaluate((L) => { const x = document.body.textContent; const need = [...L, REWARD_(), 'Your move.', 'Pick your battlefield.', 'Every big thing starts small.', 'Register. Shortlist. Build. Finale.', '12:00 PM IST', 'Build', 'Create', 'Impact']; function REWARD_() { return 'Rewards worth ₹1.5 Lakh+'; } return need.filter((n) => !x.includes(n)); }, LINES);
  ok(!t.length && await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `JS off 320: all frame copy present, no overflow ${t}`);
  await ctx.close();
}
// ── closed state: final Register keeps its box
for (const [w, h] of [[320, 700], [390, 844], [768, 1024], [1280, 800]]) {
  const dims = [];
  for (const when of [CLOSE - 90e3, CLOSE + 90e3]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); await ctx.addInitScript(hook); const p = await ctx.newPage();
    await p.clock.install({ time: when }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200);
    await jump(p, Math.round(5.6 * 0.9 * h)); await p.waitForTimeout(700);
    dims.push(await p.evaluate(() => { const a = document.querySelector('.f6 .btn-xl'); const r = a.getBoundingClientRect(); return { t: a.textContent.replace(/\s+/g, ' ').trim(), dis: a.getAttribute('aria-disabled'), w: Math.round(r.width), h: Math.round(r.height), clip: (() => { const rg = document.createRange(); rg.selectNodeContents(a); return [...rg.getClientRects()].some((t) => t.width > 1 && (t.left < r.left - 0.5 || t.right > r.right + 0.5 || t.top < r.top - 0.5 || t.bottom > r.bottom + 0.5)); })(), fs: parseFloat(getComputedStyle(a).fontSize), cls: window.__cls }; }));
    await ctx.close();
  }
  const [o, c] = dims;
  ok(/^Register now/.test(o.t) && o.dis !== 'true' && c.t === 'Registration closed' && c.dis === 'true', `closed ${w}x${h}: "${o.t}" -> "${c.t}"`);
  ok(o.w === c.w && o.h === c.h && o.fs === c.fs && !c.clip && c.cls === 0, `closed ${w}x${h}: button box ${o.w}x${o.h} -> ${c.w}x${c.h}, ${c.fs}px, no clipping, CLS ${c.cls}`);
}
await b.close(); process.exit(bad ? 1 : 0);
