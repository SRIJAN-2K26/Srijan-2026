// Polish checks: hidden skip link, organiser logo row in the footer, "Rewards" wording (no "rize" in visible text), CLS 0, no overflow.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4393/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } else console.log('ok  ', m); };
const ALTS = [['SRMCEM', 128, 128], ['CSI SRMCEM', 256, 256], ['GFG SRMCEM', 189, 148]];
for (const [w, h] of [[1280, 800], [1024, 768], [1024, 640], [768, 1024], [767, 1024], [390, 844], [320, 640]]) {
  const mobile = w <= 767; // <=767px: always-visible orange strip; >=768px: hidden until keyboard focus
  const tag = `${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  // ── skip link: present, off-screen when idle, first in tab order, visible + inside viewport on focus, no layout space ──
  const idle = await p.evaluate(() => { const s = document.querySelectorAll('.skip'); const r = s[0]?.getBoundingClientRect(); const cs = s[0] && getComputedStyle(s[0]); const f1 = document.querySelector('.f1'); const hd = document.querySelector('.top').getBoundingClientRect(); const h1 = document.querySelector('.f1 h1').getBoundingClientRect(); return { n: s.length, href: s[0]?.getAttribute('href'), text: s[0]?.textContent, top: r && r.top, bottom: r && r.bottom, h: r && r.height, left: r && r.left, right: r && r.right, pos: cs?.position, bg: cs?.backgroundColor, main: !!document.querySelector('main#main'), pb: parseFloat(getComputedStyle(f1).paddingBottom), headerTop: hd.top, h1Top: h1.top, docW: document.documentElement.scrollWidth }; });
  ok(idle.n === 1 && idle.href === '#about' && idle.text === 'Skip to details' && idle.main, `${tag} skip link exists (one, #about) and <main> landmark present`);
  if (mobile) {
    ok(idle.top >= 0 && idle.bottom <= h && idle.right <= w && idle.h >= 44 && idle.pos === 'relative' && idle.bg === 'rgb(255, 106, 0)', `${tag} mobile: orange strip visible, ${Math.round(idle.h)}px tall (>=44), in flow`);
    ok(idle.headerTop >= idle.bottom - 1 && idle.h1Top >= idle.bottom, `${tag} mobile: strip covers neither nav/header nor hero text (header top ${Math.round(idle.headerTop)}, h1 top ${Math.round(idle.h1Top)}, strip bottom ${Math.round(idle.bottom)})`);
    ok(Math.abs(idle.pb - (h <= 700 ? 52.4 : 16)) < 1, `${tag} mobile: hero keeps its +46px bottom compensation where it applies (short screens .4rem+46px; pinned layout 1rem) (padding-bottom ${idle.pb})`);
  } else {
    ok(idle.bottom <= 0 && idle.pos === 'fixed', `${tag} desktop: skip link off-screen when unfocused (bottom ${idle.bottom}, ${idle.pos}: takes no layout space)`);
    ok(Math.abs(idle.pb - (h <= 700 ? 9.6 : 16)) < 1, `${tag} desktop: no hero compensation (padding-bottom ${idle.pb})`);
  }
  const hero0 = await p.evaluate(() => Math.round(document.querySelector('.f1').getBoundingClientRect().top));
  await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  const foc = await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { cls: a.className, l: r.left, t: r.top, r: r.right, b: r.bottom, h: r.height, bg: getComputedStyle(a).backgroundColor, color: getComputedStyle(a).color, z: getComputedStyle(a).zIndex, firstFocusable: a === [...document.querySelectorAll('a[href],button,summary,input,[tabindex]')].find((e) => e.tabIndex >= 0 && e.getClientRects().length) }; });
  ok(foc.cls === 'skip' && foc.firstFocusable, `${tag} skip link is first in tab order`);
  ok(foc.t >= 0 && foc.l >= 0 && foc.r <= w && foc.b <= h && foc.h >= 44 && foc.bg === 'rgb(255, 106, 0)' && foc.color === 'rgb(0, 0, 0)', `${tag} skip link visible inside viewport on focus (h ${Math.round(foc.h)}, ${foc.bg}, text ${foc.color}, z ${foc.z})`);
  ok(await p.evaluate(() => Math.round(document.querySelector('.f1').getBoundingClientRect().top)) === hero0, `${tag} focusing the skip link does not move the hero`);
  await p.keyboard.press('Shift+Tab'); await p.evaluate(() => document.activeElement.blur());
  // ── logos ──
  const logos = await p.evaluate(() => [...document.querySelectorAll('footer .orgs img')].map((i) => ({ alt: i.alt, nw: i.naturalWidth, nh: i.naturalHeight, w: i.getAttribute('width'), h: i.getAttribute('height'), lazy: i.loading, dec: i.decoding, rh: 0, linked: !!i.closest('a') })));
  ok(logos.length === 3 && ALTS.every(([a, nw, nh], i) => logos[i]?.alt === a), `${tag} three footer logos with exact alts: ${logos.map((l) => l.alt)}`);
  await p.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await p.waitForTimeout(1200);
  const L = await p.evaluate(() => [...document.querySelectorAll('footer .orgs img')].map((i) => { const r = i.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const t = document.elementFromPoint(cx, cy); const tile = i.closest('li').getBoundingClientRect(); return { alt: i.alt, nw: i.naturalWidth, nh: i.naturalHeight, aw: i.getAttribute('width'), ah: i.getAttribute('height'), lazy: i.loading, dec: i.decoding, h: r.height, top: r.top, bottom: r.bottom, left: tile.left, right: tile.right, bg: getComputedStyle(i.closest('li')).backgroundColor, linked: !!i.closest('a'), top_ok: t === i, dockShown: !!document.querySelector('.dock.show') }; }));
  console.log(tag, JSON.stringify(L));
  ok(L.every((l, i) => l.nw === ALTS[i][1] && l.nh === ALTS[i][2] && +l.aw === l.nw && +l.ah === l.nh), `${tag} natural sizes 128x128, 256x256, 189x148 and explicit width/height attrs match`);
  ok(L.every((l) => l.h >= 44 && Math.round(l.h) === 56 && l.lazy === 'lazy' && l.dec === 'async' && !l.linked), `${tag} rendered height 56px (>=44), lazy, async decode, not linked`);
  ok(L.every((l) => l.top_ok && l.top >= 0 && l.bottom <= h), `${tag} logos fully in view and not covered by dock/fixed UI at bottom (dock shown: ${L[0]?.dockShown})`);
  ok(L.every((l) => l.left >= 0 && l.right <= w) && L[1].bg === 'rgb(255, 255, 255)' && L[2].bg === 'rgb(255, 255, 255)' && L[0].bg === 'rgba(0, 0, 0, 0)', `${tag} tiles inside viewport; CSI/GFG on white tiles, SRMCEM bare`);
  const dock = await p.evaluate(() => { const d = document.querySelector('.dock'); const r = d && getComputedStyle(d).display !== 'none' ? d.querySelector('.dock-in').getBoundingClientRect().top : innerHeight; const last = [...document.querySelectorAll('footer p, footer li, footer a')].pop().getBoundingClientRect().bottom; return { dockTop: Math.round(r), lastBottom: Math.round(last) }; });
  ok(dock.lastBottom <= dock.dockTop + 1, `${tag} footer content ends above the dock (${JSON.stringify(dock)})`);
  // ── layout ──
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  ok(ov.sw <= ov.cw && ov.bw <= ov.cw, `${tag} no horizontal overflow ${JSON.stringify(ov)}`);
  // ── wording ──
  const txt = await p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style,noscript').forEach((e) => e.remove()); const attrs = [...c.querySelectorAll('[alt],[aria-label],[title]')].map((e) => [e.getAttribute('alt'), e.getAttribute('aria-label'), e.getAttribute('title')].join(' ')).join(' '); return c.textContent + ' ' + attrs + ' ' + document.title + ' ' + [...document.querySelectorAll('meta[content]')].map((m) => m.content).join(' '); });
  ok(!/rize/i.test(txt), `${tag} no "rize" in visible/accessible text or meta`);
  ok(/Rewards/.test(await p.evaluate(() => document.querySelector('.top nav').textContent)), `${tag} nav says Rewards`);
  const cls = await p.evaluate(() => window.__cls); ok(cls === 0, `${tag} CLS ${cls}`);
  ok(!errs.length, `${tag} console errors: ${errs}`);
  await ctx.close();
}
// 320: the corner chip never sits on fee labels / partner + contact links / FAQ rows while scrolling (gate() avoid list)
for (const [w, h] of [[320, 640], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const total = await p.evaluate(() => document.documentElement.scrollHeight); let hits = [], shown = 0, n = 0;
  for (let y = 0; y < total; y += 40) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(70); n++;
    const r = await p.evaluate(() => { const c = document.querySelector('.reg-chip'); if (!c || !c.classList.contains('on')) return null; const cr = c.getBoundingClientRect(); if (!cr.width) return null; const bad = [...document.querySelectorAll('.fee li, .sp-row a, .faq-more a, details>summary')].filter((e) => !e.closest('.top')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > cr.top && r.top < cr.bottom && r.right > cr.left && r.left < cr.right; }).map((e) => e.className || e.tagName); return bad; });
    if (r) { shown++; if (r.length) hits.push([y, r]); }
  }
  ok(!hits.length && shown > 0, `${w}x${h} chip visible in ${shown}/${n} scroll steps and never over fee/partner/contact/FAQ elements ${JSON.stringify(hits.slice(0, 3))}`);
  await ctx.close();
}
// JS off: skip link + logos + wording still there
{ const ctx = await b.newContext({ viewport: { width: 320, height: 640 }, javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' });
  const r = await p.evaluate(() => ({ skip: document.querySelectorAll('.skip').length, logos: document.querySelectorAll('footer .orgs img').length, ov: document.documentElement.scrollWidth <= document.documentElement.clientWidth }));
  ok(r.skip === 1 && r.logos === 3 && r.ov, 'JS off 320: skip link, 3 logos, no overflow ' + JSON.stringify(r)); await ctx.close(); }
// reduced motion: still no running animations from the new bits (skip/logos are static)
{ const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => document.getAnimations().length) === 0, 'reduced motion: 0 running animations'); await ctx.close(); }
await b.close(); process.exit(bad ? 1 : 0);
