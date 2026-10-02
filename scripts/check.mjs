import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const w of [390, 820, 1280]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 800 } })).newPage();
  await p.goto((process.env.BASE || 'http://localhost:4321/'), { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth, out = [];
    document.querySelectorAll('main *, header *, footer *').forEach((e) => {
      if (e.closest('.ticker, .wipes, .streak, .f-art, .lit, .frame, .sky')) return; // decorative, clipped by overflow:hidden
      const r = e.getBoundingClientRect();
      if (r.width && (r.right > vw + 1 || r.left < -1)) out.push(e.tagName + '.' + e.className + ' ' + Math.round(r.left) + '-' + Math.round(r.right));
    });
    const btn = document.querySelector('.dock .btn'), top = document.querySelector('.top .btn');
    const vis = (e) => e && getComputedStyle(e.closest('.dock,.top')).display !== 'none' && getComputedStyle(e).display !== 'none';
    const h1 = document.querySelector('h1').getBoundingClientRect();
    const reg = document.querySelector('[data-register]').getBoundingClientRect();
    const imgs = [...document.images].map((i) => [i.getAttribute('width'), i.getAttribute('height'), i.loading].join('/'));
    return { out, dockVisible: vis(btn), topBtnVisible: vis(top), h1: [Math.round(h1.left), Math.round(h1.right)], regBtnInFirstViewport: reg.bottom <= innerHeight, imgs };
  });
  console.log(w, JSON.stringify(r));
}
await b.close();
