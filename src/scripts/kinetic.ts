// Multi-layer skyline parallax for the static hero silhouette (pinned story uses CSS scroll-timeline).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) { /* no kinetic extras */ } else {
  const skies = Array.from(document.querySelectorAll<HTMLElement>('.sky.s-hero'));
  if (skies.length) {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = scrollY;
      const far = Math.round(y * 0.12);
      const near = Math.round(y * 0.32);
      for (const s of skies) {
        s.style.setProperty('--para-far', String(far));
        s.style.setProperty('--para-near', String(near));
      }
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
    apply();
  }
}
