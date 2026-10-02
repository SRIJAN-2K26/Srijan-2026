// Registration countdown. Bundled by Astro as an external module (no inline script, CSP unchanged).
// Source of truth: registration.closes in event.json, an ISO string with an explicit +05:30 offset, so Date.parse is timezone-proof.
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reg-closes]'));
const closes = els.length ? Date.parse(els[0].dataset.regCloses || '') : NaN;
if (els.length && !Number.isNaN(closes)) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n: number) => String(n).padStart(2, '0');
  let last = '';
  let timer = 0;
  const render = () => {
    const ms = closes - Date.now();
    let text: string, state: string;
    if (ms <= 0) { text = 'Registration closed'; state = 'closed'; }
    else if (reduce) return; // reduced motion: keep the static, always-correct deadline text until it closes
    else {
      const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
      text = s < 3600 ? `Registration closes in ${m}m ${pad(s % 60)}s` : `Registration closes in ${d}d ${pad(h)}h ${pad(m)}m`;
      state = 'open';
    }
    if (text === last) return;
    last = text;
    for (const e of els) { const t = e.firstElementChild; if (t) t.textContent = text; e.dataset.state = state; }
    if (state === 'closed') clearInterval(timer);
  };
  render();
  if (last !== 'Registration closed') timer = window.setInterval(render, 1000);
}
