// Count-up scramble on the prize figure. Overlay is aria-hidden; DOM/a11y text is the final value from the start.
const FINAL = '₹1.5 Lakh+';
const GLYPHS = '₹0123456789.Lakh+';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.querySelector<HTMLElement>('[data-prize]');
const scramble = root?.querySelector<HTMLElement>('.prize-scramble');
if (root && scramble && !reduce) {
  const target = FINAL.split('');
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    scramble.replaceChildren(...target.map((c) => {
      const el = document.createElement('span');
      el.className = /\d/.test(c) ? 'pc d' : 'pc';
      el.textContent = c;
      return el;
    }));
    const cells = Array.from(scramble.querySelectorAll<HTMLElement>('.pc'));
    const start = performance.now();
    const DUR = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      cells.forEach((el, i) => {
        const settle = Math.min(1, Math.max(0, (t - i * 0.045) / 0.35));
        el.textContent = settle >= 1 ? target[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      });
      if (t < 1) requestAnimationFrame(tick);
      else cells.forEach((el, i) => { el.textContent = target[i]; });
    };
    requestAnimationFrame(tick);
  };
  const frame = root.closest<HTMLElement>('.frame');
  if (frame && getComputedStyle(frame.parentElement as Element).position === 'sticky') {
    // pinned story: the frame is always "intersecting"; start when it is actually the active frame (opacity), checked on scroll
    // sampled in rAF: scroll-driven animations only update after the scroll event, before animation-frame callbacks
    let q = 0;
    const check = () => { q = 0; if (+getComputedStyle(frame).opacity > 0.7) { run(); removeEventListener('scroll', onScroll); } };
    const onScroll = () => { if (!q) q = requestAnimationFrame(check); };
    addEventListener('scroll', onScroll, { passive: true }); check();
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(root);
  } else run();
}
