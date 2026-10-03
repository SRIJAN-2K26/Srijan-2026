// Count-up scramble on the prize figure. Overlay is aria-hidden; DOM/a11y text is the final value from the start.
// Layout never moves (CLS 0): each cell is locked to the width its final glyph occupies in the original text (kerning included,
// measured per character with a Range), the overlay box is locked for the run, and .prize-fx is nowrap (motion-fx.css).
const FINAL = '₹1.5 Lakh+';
const DIGITS = '0123456789';
const LETTERS = 'LAKH0123456789';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.querySelector<HTMLElement>('[data-prize]');
const scramble = root?.querySelector<HTMLElement>('.prize-scramble');
const fx = root?.querySelector<HTMLElement>('.prize-fx');
if (root && scramble && fx && !reduce) {
  const target = FINAL.split('');
  let done = false;
  const measure = () => {
    const node = scramble.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE || node.textContent !== FINAL) return null;
    const r = document.createRange();
    const x = (i: number) => { r.setStart(node, i); r.setEnd(node, i + 1); return r.getBoundingClientRect(); };
    const boxes = target.map((_, i) => x(i));
    return boxes.map((b, i) => (i < boxes.length - 1 && boxes[i + 1].top === b.top ? boxes[i + 1].left - b.left : b.width));
  };
  const run = async () => {
    if (done) return;
    done = true;
    await document.fonts?.ready;
    const widths = measure();
    if (!widths) return;
    const box = fx.getBoundingClientRect();
    fx.style.width = `${box.width}px`; fx.style.height = `${box.height}px`;
    const cells = target.map((c, i) => {
      const el = document.createElement('span');
      el.className = /\d/.test(c) ? 'pc d' : 'pc';
      el.style.width = `${widths[i]}px`;
      el.textContent = c;
      return el;
    });
    scramble.replaceChildren(...cells);
    const pool = (c: string) => (/\d/.test(c) ? DIGITS : /[a-z]/i.test(c) ? LETTERS : '');
    const start = performance.now();
    const DUR = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      cells.forEach((el, i) => {
        const g = pool(target[i]);
        const settle = Math.min(1, Math.max(0, (t - i * 0.045) / 0.35));
        el.textContent = settle >= 1 || !g ? target[i] : g[(Math.random() * g.length) | 0];
      });
      if (t < 1) requestAnimationFrame(tick);
      else { cells.forEach((el, i) => { el.textContent = target[i]; }); fx.style.width = ''; fx.style.height = ''; }
    };
    requestAnimationFrame(tick);
  };
  const frame = root.closest<HTMLElement>('.frame');
  if (frame && getComputedStyle(frame.parentElement as Element).position === 'sticky') {
    // pinned story: the frame is always "intersecting"; start when it is actually the active frame (opacity), checked on scroll
    // sampled in rAF: scroll-driven animations only update after the scroll event, before animation-frame callbacks
    let q = 0;
    // also require the scroll position to be inside the frame's window: before the scroll timeline attaches, opacity can read 1 at load
    const story = frame.closest<HTMLElement>('.story');
    const inWindow = () => {
      if (!story) return true;
      const F = (story.offsetHeight - (frame.parentElement as HTMLElement).offsetHeight) / 6;
      const fi = +(frame.style.getPropertyValue('--fi') || 0);
      return scrollY > story.getBoundingClientRect().top + scrollY + (fi + 0.1) * F;
    };
    const check = () => { q = 0; if (inWindow() && +getComputedStyle(frame).opacity > 0.7) { run(); removeEventListener('scroll', onScroll); } };
    const onScroll = () => { if (!q) q = requestAnimationFrame(check); };
    addEventListener('scroll', onScroll, { passive: true }); check();
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(root);
  } else run();
}
