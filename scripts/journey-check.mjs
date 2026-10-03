// Journey node + RegLine + reviewer-fix assertions (BASE defaults to http://localhost:4393/).
//  #path has 4 nodes (Register / Shortlist · 12 Oct / Online screening 13 Oct / On-campus finale 14 Oct · SRMCEM), allowed wording only, readable with JS off and under reduced motion
//  RegLine under the #how and #contact CTAs (+ "₹50 per team member"), "Closes 11 Oct, 12:00 PM IST" in the dock, closed state consistent (lines hidden with space kept, fee hidden, dock hidden, buttons disabled, no wrap at 320)
//  About: no "Six domains" list, organisers line (existing footer copy) under the about text, no new "Organised by" · .rl-lbl/.rl-lead sizes · chip < 30rem · "Detailed times coming soon" never orphaned
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4393/';
const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const data = JSON.parse(fs.readFileSync(new URL('../src/data/event.json', import.meta.url), 'utf8'));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; return c; };
const CLOSE = Date.parse('2026-10-11T12:00:00+05:30');
const FORBID = /discord|individual prize|48 hours|top 75|upi|qr code|bank|organised by|organized by/i;

// ── data + built HTML (no JS needed)
const steps = data.story.path.steps;
ok(steps.length === 4 && steps.map((s) => s.title).join('|') === 'Register|Shortlist|Online screening|On-campus finale', 'event.json story.path has the 4 nodes in order');
ok(steps[0].note === 'Register by 11 Oct, 12:00 PM IST' && steps[1].sub === '12 Oct' && steps[1].note === 'Shortlisted teams are announced', 'step 1 deadline + shortlist 12 Oct / allowed wording');
ok(steps[2].sub === '13 Oct' && steps[3].sub === '14 Oct · SRMCEM' && steps[2].title === 'Online screening' && steps[3].title === 'On-campus finale', '13 Oct online and 14 Oct finale wording unchanged');
ok(data.event.venueFull === 'Shri Ramswaroop Memorial College of Engineering & Management, Lucknow', 'footer full college name unchanged');
ok(!FORBID.test(JSON.stringify(data)) && !FORBID.test(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')), 'no forbidden copy (Discord / prize amounts / UPI / QR / bank / 48 hours / top 75 / Organised by)');
ok((html.match(/class="regline[^"]*rl-cta/g) || []).length === 2, 'built HTML: RegLine under the #how and #contact CTAs');
ok((html.match(/class="regfee"[^>]*>₹50 per team member</g) || []).length === 2, 'built HTML: "₹50 per team member" next to both');
ok(/class="dock-close"[^>]*>Closes 11 Oct, 12:00 PM IST</.test(html), 'built HTML: dock says "Closes 11 Oct, 12:00 PM IST"');

const ctxs = [['motion', {}], ['reduced', { reducedMotion: 'reduce' }], ['js-off', { javaScriptEnabled: false }]];
for (const [mode, opts] of ctxs) for (const [w, h] of [[320, 640], [390, 844], [1280, 800]]) {
  const tag = `${mode} ${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...opts }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const t = (e) => e.textContent.replace(/\s+/g, ' ').trim();
    const st = [...document.querySelectorAll('.steps5 .st')].map((e) => ({ text: t(e.querySelector('.txt')), n: e.querySelector('.dot')?.textContent }));
    const rlcta = [...document.querySelectorAll('.rl-cta')].map((e) => ({ inCta: !!e.closest('#how .cta, #contact .cta'), vis: getComputedStyle(e).visibility, txt: t(e.querySelector('.rl-static')), staticVisible: getComputedStyle(e.querySelector('.rl-static')).visibility }));
    const fee = [...document.querySelectorAll('.regfee')].map((e) => ({ txt: t(e), vis: getComputedStyle(e).visibility, fs: parseFloat(getComputedStyle(e).fontSize) }));
    const lbl = document.querySelector('.f1 .rl-lbl'), lead = document.querySelector('.f1 .rl-lead'), px = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const about = document.querySelector('#about'); const org = document.querySelector('.about-org'), body = document.querySelector('#about [data-stagger]');
    const soon = document.querySelector('.soonnote'), fl = document.querySelector('.f4 .flink');
    return { st, rlcta, fee, dock: t(document.querySelector('.dock-close')), dockDisplay: getComputedStyle(document.querySelector('.dock')).display,
      lbl: parseFloat(getComputedStyle(lbl).fontSize) / px, lead: parseFloat(getComputedStyle(lead).fontSize) / px,
      six: /six domains/i.test(about.innerText) || !!document.querySelector('.dcards, .plain-doms, #domains'), org: org ? t(org) : null, orgBelow: !!(org && body && org.getBoundingClientRect().top >= body.getBoundingClientRect().bottom - 1),
      footerOrg: /CSI SRMCEM × D’CODERS in collaboration with GFG SRMCEM/.test(t(document.querySelector('footer'))), foot: t(document.querySelector('footer')).includes('Shri Ramswaroop Memorial College of Engineering & Management, Lucknow'),
      soon: soon ? { nowrap: getComputedStyle(soon).whiteSpace, h: Math.round(soon.getBoundingClientRect().height), lh: parseFloat(getComputedStyle(soon).lineHeight) } : null,
      ow: document.documentElement.scrollWidth > innerWidth, anims: document.getAnimations().filter((x) => x.playState === 'running').length };
  });
  ok(r.st.length === 4 && r.st.map((x) => x.n).join() === (opts.javaScriptEnabled === false ? '1,2,3,4' : '1,2,3,4'), `${tag}: 4 journey nodes numbered 1-4`);
  ok(r.st[0].text === 'Register Submit your idea Register by 11 Oct, 12:00 PM IST' && r.st[1].text === 'Shortlist 12 Oct Shortlisted teams are announced' && r.st[2].text === 'Online screening 13 Oct' && r.st[3].text === 'On-campus finale 14 Oct · SRMCEM', `${tag}: plain-text version of every node ${JSON.stringify(r.st.map((x) => x.text))}`);
  ok(r.rlcta.length === 2 && r.rlcta.every((x) => x.inCta && x.vis === 'visible'), `${tag}: RegLine in both #how and #contact CTAs`);
  if (mode === 'js-off') ok(r.rlcta.every((x) => x.txt === 'Registration closes 11 Oct 2026, 12:00 PM IST' && x.staticVisible === 'visible'), `${tag}: static IST deadline readable under both CTAs`);
  ok(r.fee.length === 2 && r.fee.every((x) => x.txt === '₹50 per team member' && x.vis === 'visible'), `${tag}: fee shown only as "₹50 per team member" under both CTAs`);
  ok(r.dock === 'Closes 11 Oct, 12:00 PM IST', `${tag}: dock line "${r.dock}"`);
  ok(Math.abs(r.lbl - 0.7) < 0.005 && Math.abs(r.lead - 0.72) < 0.005, `${tag}: .rl-lbl ${r.lbl.toFixed(3)}rem, .rl-lead ${r.lead.toFixed(3)}rem`);
  ok(!r.six, `${tag}: no duplicate "Six domains" list in #about`);
  ok(r.org === 'CSI SRMCEM × D’CODERS in collaboration with GFG SRMCEM' && r.orgBelow && r.footerOrg, `${tag}: organisers line (existing approved copy) under the about text: ${r.org}`);
  ok(r.foot, `${tag}: footer full college name kept`);
  ok(r.soon && r.soon.nowrap === 'nowrap' && r.soon.h <= r.soon.lh * 1.6, `${tag}: "Detailed times coming soon" does not wrap ${JSON.stringify(r.soon)}`);
  ok(!r.ow, `${tag}: no horizontal overflow`);
  if (mode === 'reduced') ok(r.anims === 0, `${tag}: 0 running animations`);
  ok(!errs.length, `${tag}: no page errors ${errs}`);
  await ctx.close();
}

// ── pinned story: all four nodes + both links fit above the dock, tap target >= 44, soonnote on one line, nothing hidden
for (const [w, h] of [[320, 640], [360, 640], [390, 667], [390, 844], [768, 1024], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1800);
  await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(3.55 * 0.9 * h)); await p.waitForTimeout(900);
  const r = await p.evaluate(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); const dock = getComputedStyle(document.querySelector('.dock')).display !== 'none' ? q('.dock-in').top : innerHeight; const sts = [...document.querySelectorAll('.steps5 .st')].map((e) => ({ op: +getComputedStyle(e).opacity, b: e.getBoundingClientRect().bottom, t: e.getBoundingClientRect().top }));
    return { dock, sts, flink: [q('.f4 .flink').top, q('.f4 .flink').bottom, q('.f4 .flink').height], soon: [q('.soonnote').top, q('.soonnote').bottom, q('.soonnote').height], stage: [q('.stage').top, q('.stage').bottom] }; });
  const lastB = r.soon[1];
  ok(r.sts.length === 4 && r.sts.every((s) => s.op === 1), `path ${w}x${h}: 4 nodes fully visible (opacity ${r.sts.map((s) => s.op)})`);
  ok(lastB <= r.dock + 0.5 && r.flink[2] >= 44 && r.flink[1] <= r.dock, `path ${w}x${h}: schedule link (${r.flink[2].toFixed(0)}px) + note end at ${lastB.toFixed(0)} above the dock at ${r.dock.toFixed(0)}`);
  ok(r.soon[2] < 30, `path ${w}x${h}: note is one line (${r.soon[2].toFixed(0)}px)`);
  await ctx.close();
}

// ── chip below 30rem: compact digits-only chip, >= 44px tall, inside the viewport; wide screens keep "Closes in"
for (const [w, h] of [[320, 640], [390, 844], [480, 800], [520, 800], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1800);
  await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(1.5 * 0.9 * h)); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const c = document.querySelector('.reg-chip'), q = c.getBoundingClientRect(); return { op: +getComputedStyle(c).opacity, w: q.width, h: q.height, l: q.left, r: q.right, lead: getComputedStyle(c.querySelector('.rc-lead')).display, vw: innerWidth }; });
  const narrow = w <= 480;
  ok(r.op > 0.97 && r.h >= 44 - 0.5 && r.l >= 0 && r.r <= r.vw + 0.5, `chip ${w}x${h}: shown, ${r.h.toFixed(0)}px tall, inside viewport (${r.l.toFixed(0)}-${r.r.toFixed(0)})`);
  ok(narrow ? r.lead === 'none' && r.w < 130 : r.lead !== 'none', `chip ${w}x${h}: ${narrow ? 'compact (' + r.w.toFixed(0) + 'px, digits only)' : 'full'}`);
  await ctx.close();
}

// ── closed state (after 11 Oct 12:00 IST)
for (const [w, h] of [[320, 640], [390, 844], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); const p = await ctx.newPage();
  await p.clock.install({ time: CLOSE + 3600e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2200); await p.clock.runFor(1500);
  const r = await p.evaluate(() => { const t = (e) => e.textContent.replace(/\s+/g, ' ').trim(); const btns = [...document.querySelectorAll('a[data-reg-btn]')];
    return { btns: btns.map((a) => ({ txt: t(a), dis: a.getAttribute('aria-disabled'), h: Math.round(a.getBoundingClientRect().height), lines: Math.round(a.getBoundingClientRect().height / parseFloat(getComputedStyle(a).lineHeight || 20)), ws: getComputedStyle(a).whiteSpace })),
      cta: [...document.querySelectorAll('.rl-cta')].map((e) => ({ state: e.dataset.state, vis: getComputedStyle(e).visibility, st: t(e.querySelector('.rl-static')) })), fee: [...document.querySelectorAll('.regfee')].map((e) => getComputedStyle(e).visibility), feeBlock: (() => { const c = getComputedStyle(document.querySelector('.fee')); return c.display === 'none' || (c.visibility === 'hidden' && +c.opacity === 0) ? 'none' : c.display; })(), faqCost: document.querySelector('[data-reg-past]').textContent.trim(), dock: getComputedStyle(document.querySelector('.dock')).display, ow: document.documentElement.scrollWidth > innerWidth }; });
  ok(r.btns.length === 6 && r.btns.every((x) => x.dis === 'true' && x.txt === 'Registration closed'), `closed ${w}x${h}: 6 disabled "Registration closed" buttons`);
  ok(r.btns.filter((x) => x.h).every((x) => x.ws === 'nowrap' || w > 416) && r.btns.filter((x) => x.h && x.ws === 'nowrap').every((x) => x.h < 80), `closed ${w}x${h}: closed button on one line ${JSON.stringify(r.btns.filter((x) => x.h).map((x) => [x.h, x.ws]))}`);
  ok(r.cta.length === 2 && r.cta.every((x) => x.state === 'closed' && x.vis === 'hidden' && x.st === 'Registration closed') && r.fee.every((v) => v === 'hidden'), `closed ${w}x${h}: #how/#contact RegLines + fee line hidden (space kept) like the hero ones`);
  ok(r.faqCost === 'Registration is closed. The fee was ₹50 per team member: ₹50 for 1, ₹100 for 2, ₹150 for 3, ₹200 for 4.', `closed ${w}x${h}: cost FAQ is past tense: ${r.faqCost}`);
  ok(r.dock === 'none' && r.feeBlock === 'none' && !r.ow, `closed ${w}x${h}: dock + fee block hidden, no overflow`);
  await ctx.close();
}
// ── fee block on screen at the close moment: nothing moves, CLS 0 (1280, 390, 320)
const clsHook = () => { window.__cls = 0; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch {} };
for (const [w, h] of [[1280, 800], [390, 844], [320, 640]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles' }); await ctx.addInitScript(clsHook); const p = await ctx.newPage();
  await p.clock.install({ time: CLOSE - 20e3 }); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('.fee').scrollIntoView({ block: 'center', behavior: 'instant' })); await p.clock.runFor(800); await p.waitForTimeout(500);
  const geo = () => p.evaluate(() => { const f = document.querySelector('.fee'), q = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }; const c = getComputedStyle(f); return { fee: q(f), after: q(document.querySelector('#how .cta')), next: q(document.querySelector('#schedule')), op: +c.opacity, vis: c.visibility, disp: c.display, y: scrollY, onscreen: f.getBoundingClientRect().bottom > 0 && f.getBoundingClientRect().top < innerHeight, closed: document.documentElement.classList.contains('reg-closed') }; });
  const before = await geo(); await p.clock.runFor(25e3); await p.waitForTimeout(700); const mid = await geo(); await p.clock.runFor(1000); await p.waitForTimeout(500);
  ok(!before.closed && before.onscreen && before.op === 1, `fee close ${w}x${h}: fee on screen and visible before the close`);
  ok(mid.closed && mid.disp !== 'none' && mid.fee[1] === before.fee[1] && mid.after[0] === before.after[0] && mid.next[0] === before.next[0] && mid.y === before.y, `fee close ${w}x${h}: closed, fee height kept, content below did not move (${JSON.stringify(before.fee)} / CTA ${before.after[0]}→${mid.after[0]})`);
  const end = await geo(); ok(end.op === 0 && end.vis === 'hidden', `fee close ${w}x${h}: fee faded out (opacity ${end.op}, ${end.vis})`);
  ok((await p.evaluate(() => window.__cls)) === 0, `fee close ${w}x${h}: CLS 0 (${await p.evaluate(() => window.__cls)})`);
  // scrolling it fully above the viewport keeps it (no collapse that would shift visible content); fully below -> collapses
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(500); ok((await geo()).disp === 'none', `fee close ${w}x${h}: collapsed once it was below the viewport`);
  ok((await p.evaluate(() => window.__cls)) === 0, `fee close ${w}x${h}: CLS still 0 after collapse`);
  await ctx.close();
}
// ── nav labels 1024-1119: one line, one row, nothing overlapping, header height constant
for (const w of [1024, 1040, 1060, 1080, 1100, 1119, 1120, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } }); const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const a = [...document.querySelectorAll('.nav a')].map((e) => e.getBoundingClientRect()); const br = document.querySelector('.brand').getBoundingClientRect(), bt = document.querySelector('.top .btn').getBoundingClientRect(), n = document.querySelector('.nav').getBoundingClientRect();
    return { hs: [...new Set(a.map((x) => Math.round(x.height)))], tops: [...new Set(a.map((x) => Math.round(x.top)))], gapBrand: n.left - br.right, gapBtn: bt.left - n.right, header: Math.round(document.querySelector('.top').getBoundingClientRect().height), ow: document.documentElement.scrollWidth > innerWidth, ws: [...new Set([...document.querySelectorAll('.nav a')].map((e) => getComputedStyle(e).whiteSpace))] }; });
  ok(r.hs.length === 1 && r.hs[0] === 44 && r.tops.length === 1 && r.gapBrand >= 8 && r.gapBtn >= 8 && r.header === 65 && !r.ow && r.ws[0] === 'nowrap', `nav ${w}px: one row, one line each, header ${r.header}px, gaps ${r.gapBrand.toFixed(0)}/${r.gapBtn.toFixed(0)} ${JSON.stringify(r)}`);
  await ctx.close();
}
await b.close(); console.log(bad ? 'journey-check FAILED' : 'journey-check ok'); process.exit(bad ? 1 : 0);
