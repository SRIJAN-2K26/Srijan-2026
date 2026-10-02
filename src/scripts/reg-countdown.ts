// Registration countdown. Bundled by Astro as an external module (no inline script, CSP unchanged).
// Source of truth: registration.closes in event.json, an ISO string with an explicit +05:30 offset, so Date.parse is timezone-proof.
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reg-closes]'));
const closes = els.length ? Date.parse(els[0].dataset.regCloses || '') : NaN;

// After the close: Register buttons become an honest, disabled-looking "Registration closed" (no navigation) and the FAQ answer goes past tense.
function markClosed() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-reg-btn]').forEach((a) => {
    if (a.getAttribute('aria-disabled') === 'true') return;
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('role', 'link');
    a.removeAttribute('href'); a.removeAttribute('target'); a.removeAttribute('rel'); a.removeAttribute('data-register');
    a.textContent = 'Registration closed';
  });
  document.querySelectorAll<HTMLElement>('[data-reg-faq]').forEach((p) => { if (p.dataset.closedText) p.textContent = p.dataset.closedText; });
}

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
      text = s < 3600 ? `Registration closes in ${m}m ${pad(s % 60)}s` : d > 0 ? `Registration closes in ${d}d ${pad(h)}h ${pad(m)}m` : `Registration closes in ${h}h ${pad(m)}m`;
      state = 'open';
    }
    if (text === last) return;
    last = text;
    for (const e of els) { const t = e.firstElementChild; if (t) t.textContent = text; e.dataset.state = state; }
    if (state === 'closed') { clearInterval(timer); markClosed(); }
  };
  render();
  if (last !== 'Registration closed') timer = window.setInterval(render, 1000);
}

// Keyboard: in the pinned story, frames 3, 4 and 6 are opacity-0 (still focusable) until scrolled to.
// Focusing a link inside one scrolls the page to that frame, so the focused control is always on screen.
if (window.CSS?.supports?.('animation-timeline: scroll()') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.addEventListener('focusin', (e) => {
    const f = (e.target as Element | null)?.closest?.('.frame') as HTMLElement | null;
    if (!f || getComputedStyle(f.parentElement as Element).position !== 'sticky') return;
    const i = Number(f.style.getPropertyValue('--fi'));
    const F = 0.9 * innerHeight, y = scrollY;
    if (y >= (i + 0.12) * F && y <= (i + 0.88) * F) return; // frame already active
    scrollTo({ top: Math.round((i + (i === 0 ? 0.02 : 0.55)) * F), behavior: 'instant' });
  });
}
