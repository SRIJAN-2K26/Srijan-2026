// The three "transformation" moments (all element.animate, transform only, interruptible, off under reduced motion):
//  (a) domain cards: hover / press spring (uniform scale) + a small squash-and-stretch on the icon (an SVG, never text or buttons)
//  (b) journey: one shared marker ring moves between steps with a FLIP (measure first, move in the DOM, measure last, animate the inverse)
// Every animation starts from the element's current value (read from computed style), so a new hover/tap simply redirects the old one.
// Squash/stretch keeps scaleX * scaleY = 1 and stays within 5%; card scale stays within 2%.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fineHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

/** damped-spring samples from 0 (start) to 1 (rest); overshoots for zeta < 1 */
const spring = (n = 26, zeta = 0.42, w = 13) => {
  const wd = w * Math.sqrt(1 - zeta * zeta), out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 1.1; // seconds
    out.push(1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t)));
  }
  out[n] = 1;
  return out;
};
const S = spring();
const SPRING_MS = 620;

const cur = (el: Element) => {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return { sx: m.a || 1, sy: m.d || 1, x: m.e, y: m.f };
};

/** run a spring on el.transform from its current value to `to` (uniform scale) */
const springScale = (el: HTMLElement, to: number) => {
  const from = cur(el).sx;
  el.getAnimations().forEach((a) => a.cancel());
  if (Math.abs(from - to) < 0.0005) return;
  el.animate(S.map((p) => ({ transform: `scale(${(from + (to - from) * p).toFixed(4)})` })), { duration: SPRING_MS, easing: 'linear' });
};
/** squash and stretch kick on a non-text element: scaleX = k, scaleY = 1 / k, settling back to 1 */
const kick = (el: Element, k: number) => {
  const c = cur(el), from = c.sx / c.sy; // current stretch ratio (interruptible)
  el.getAnimations().forEach((a) => a.cancel());
  const start = Math.abs(from - 1) > 0.005 ? from : k;
  (el as HTMLElement).animate(S.map((p) => { const v = start + (1 - start) * p; return { transform: `scale(${v.toFixed(4)}, ${(1 / v).toFixed(4)})` }; }), { duration: SPRING_MS, easing: 'linear' });
};

if (!reduce) {
  // (a) domain cards
  for (const li of document.querySelectorAll<HTMLElement>('[data-spring]')) {
    const card = li.querySelector<HTMLElement>('.dom-in'), icon = li.querySelector<SVGElement>('.dom-ic');
    if (!card) continue;
    let hover = false;
    li.addEventListener('pointerenter', (e) => {
      if (!fineHover || e.pointerType !== 'mouse') return;
      hover = true; springScale(card, 1.02); if (icon) kick(icon, 1.05);
    });
    li.addEventListener('pointerleave', () => { hover = false; springScale(card, 1); });
    li.addEventListener('pointerdown', () => { springScale(card, 0.98); if (icon) kick(icon, 0.95); });
    const up = () => springScale(card, hover ? 1.02 : 1);
    li.addEventListener('pointerup', up);
    li.addEventListener('pointercancel', () => { hover = false; springScale(card, 1); });
  }
}

// (b) journey marker: FLIP between steps
const mark = document.querySelector<HTMLElement>('.st-mark');
const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-step]'));
if (mark && steps.length) {
  const home = steps[0];
  const go = (to: HTMLElement) => {
    if (mark.parentElement === to) return;
    const first = mark.getBoundingClientRect(); // includes any transform still running
    mark.getAnimations().forEach((a) => a.cancel());
    to.prepend(mark);
    if (reduce) return;
    const last = mark.getBoundingClientRect();
    if (!first.width || !last.width) return;
    const dx = first.left - last.left, dy = first.top - last.top;
    const sx = first.width / last.width, sy = first.height / last.height;
    const horiz = Math.abs(dx) > Math.abs(dy);
    const k = 1.04; // mid-flight stretch along the travel axis, scaleX * scaleY = 1
    const mid = horiz ? `translate(${dx / 2}px, ${dy / 2}px) scale(${k}, ${1 / k})` : `translate(${dx / 2}px, ${dy / 2}px) scale(${1 / k}, ${k})`;
    mark.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: mid, offset: 0.45 },
      { transform: 'none' },
    ], { duration: 460, easing: 'cubic-bezier(.2,.9,.25,1)' });
  };
  for (const st of steps) {
    st.addEventListener('pointerenter', (e) => { if (fineHover && e.pointerType === 'mouse') go(st); });
    st.addEventListener('pointerdown', () => go(st));
  }
  const list = steps[0].parentElement;
  list?.addEventListener('pointerleave', (e) => { if (fineHover && (e as PointerEvent).pointerType === 'mouse') go(home); });
}
