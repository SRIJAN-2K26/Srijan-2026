// Skyline parallax for the hero silhouette (far slower than near). Pinned-story city uses CSS scroll-timeline.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduce) {
  const skies = Array.from(document.querySelectorAll<HTMLElement>('.sky.s-hero'));
  if (skies.length) {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = scrollY;
      const far = (y * 0.1).toFixed(1);
      const near = (y * 0.28).toFixed(1);
      for (const s of skies) {
        s.style.setProperty('--para-far', far);
        s.style.setProperty('--para-near', near);
      }
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
    apply();
  }
}
