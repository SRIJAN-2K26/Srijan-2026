// Count-up / brief scramble for the prize figure. Final value is in the DOM and the accessible name from the first paint.
const FINAL = '₹1.5 Lakh+';
const host = document.querySelector<HTMLElement>('[data-prize]');
const fig = host?.querySelector<HTMLElement>('[data-prize-fig]');
const fx = host?.querySelector<HTMLElement>('[data-prize-fx]');
if (!host || !fig || !fx) { /* no prize */ } else {
  fig.textContent = FINAL;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    fx.textContent = '';
  } else {
    const pool = '₹015Lakh+';
    const run = () => {
      if (host.dataset.done) return;
      host.dataset.done = '1';
      host.classList.add('scrambling');
      fx.textContent = FINAL;
      let step = 0;
      const id = setInterval(() => {
        step += 1;
        const lock = Math.max(0, step - 6);
        fx.textContent = FINAL.split('').map((ch, i) => {
          if (ch === ' ' || i < lock) return ch;
          return pool[(Math.random() * pool.length) | 0];
        }).join('');
        if (step >= FINAL.length + 8) {
          clearInterval(id);
          fx.textContent = FINAL;
          host.classList.remove('scrambling');
          host.classList.add('settled');
        }
      }, 42);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es[0]?.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(host);
    } else run();
  }
}
