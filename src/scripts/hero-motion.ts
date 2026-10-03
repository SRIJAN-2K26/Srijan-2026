// Hero skyline drift for browsers without CSS scroll-timeline (Firefox, older Safari). Where scroll-timeline works the
// stage-level .city dollies in CSS instead and the hero skyline is display:none. Off under prefers-reduced-motion.
// Writes one custom property (--sk-p, 0..1 as the hero scrolls away); hero-cards-fx.css maps it to per-layer transforms + opacity.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pinned = !!window.CSS?.supports?.('animation-timeline: scroll()');
const sky = document.querySelector<HTMLElement>('.sky.s-hero');
const hero = sky?.closest<HTMLElement>('.f1');
if (!reduce && !pinned && sky && hero) {
  let raf = 0, last = '';
  const apply = () => {
    raf = 0;
    const p = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight)));
    const v = p.toFixed(3);
    if (v !== last) { last = v; sky.style.setProperty('--sk-p', v); }
  };
  sky.setAttribute('data-drift', '');
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(apply); });
  apply();
}
