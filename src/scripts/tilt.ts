// 3D tilt on track / battlefield cards. Fine pointer + hover only; none on touch or reduced motion.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (!reduce && fine) {
  const max = 8;
  for (const el of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
    const reset = () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--ta', '0 0 1');
      el.style.setProperty('--tg', '0deg');
      el.style.setProperty('--ts', '1');
      el.style.removeProperty('will-change');
    };
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      el.style.willChange = 'rotate';
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const rx = -py * max, ry = px * max;
      el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      // rotateX(rx) rotateY(ry) as one axis-angle `rotate` (individual property, so it stacks on transform animations)
      const g = Math.hypot(rx, ry);
      el.style.setProperty('--ta', g < 0.01 ? '0 0 1' : `${(rx / g).toFixed(4)} ${(ry / g).toFixed(4)} 0`);
      el.style.setProperty('--tg', `${g.toFixed(2)}deg`);
      el.style.setProperty('--ts', '1.02');
      el.style.setProperty('--glow-a', `${(Math.atan2(py, px) * 180) / Math.PI + 90}deg`);
    });
    el.addEventListener('pointerleave', reset);
    el.addEventListener('pointercancel', reset);
  }
}
