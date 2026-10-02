// Mouse-following spotlight: a 600px orange radial glow behind the content, damped tracking, fine pointers only.
// The glow is a fixed element moved with transform (compositor only) via --mouse-x / --mouse-y.
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const el = document.createElement('div'); el.className = 'spot'; el.setAttribute('aria-hidden', 'true');
  const cv = document.querySelector('canvas.ember'); cv ? cv.after(el) : document.body.prepend(el);
  let tx = innerWidth / 2, ty = innerHeight / 3, x = tx, y = ty, raf = 0;
  const step = () => {
    x += (tx - x) * 0.14; y += (ty - y) * 0.14;
    el.style.setProperty('--mouse-x', x.toFixed(1) + 'px'); el.style.setProperty('--mouse-y', y.toFixed(1) + 'px');
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
  };
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; tx = e.clientX; ty = e.clientY; el.classList.add('on'); if (!raf && !document.hidden) raf = requestAnimationFrame(step); }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => el.classList.remove('on'));
}
