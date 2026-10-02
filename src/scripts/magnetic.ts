// Magnetic primary buttons, FAQ/schedule a11y + height transitions helpers.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!reduce && fine) {
  const R = 40, MAX = 8;
  const btns = Array.from(document.querySelectorAll<HTMLElement>('.btn-primary'));
  const frozen = new WeakSet<HTMLElement>();
  const nearRect = (r: DOMRect, x: number, y: number) => {
    const cx = Math.min(Math.max(x, r.left), r.right);
    const cy = Math.min(Math.max(y, r.top), r.bottom);
    return { d: Math.hypot(x - cx, y - cy), mx: x - (r.left + r.width / 2), my: y - (r.top + r.height / 2) };
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    for (const b of btns) {
      if (frozen.has(b) || b.getAttribute('aria-disabled') === 'true') {
        b.style.removeProperty('--mx'); b.style.removeProperty('--my');
        continue;
      }
      const r = b.getBoundingClientRect();
      const q = nearRect(r, e.clientX, e.clientY);
      if (q.d > R) { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); continue; }
      const k = (1 - q.d / R) * 0.28;
      const x = Math.max(-MAX, Math.min(MAX, q.mx * k));
      const y = Math.max(-MAX, Math.min(MAX, q.my * k));
      b.style.setProperty('--mx', `${x.toFixed(1)}px`);
      b.style.setProperty('--my', `${y.toFixed(1)}px`);
    }
  }, { passive: true });
  for (const b of btns) {
    b.addEventListener('pointerdown', () => {
      frozen.add(b);
      b.style.setProperty('--mx', '0px');
      b.style.setProperty('--my', '0px');
    });
    b.addEventListener('pointerup', () => frozen.delete(b));
    b.addEventListener('pointercancel', () => frozen.delete(b));
    b.addEventListener('pointerleave', () => { if (!frozen.has(b)) { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); } });
  }
}

const syncDetails = (root: ParentNode) => {
  root.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => {
    const sum = d.querySelector('summary');
    const panel = d.querySelector<HTMLElement>('.faq-panel, .day-panel');
    if (sum) sum.setAttribute('aria-expanded', d.open ? 'true' : 'false');
    if (panel) {
      if (d.open) panel.removeAttribute('inert');
      else panel.setAttribute('inert', '');
    }
  });
};
syncDetails(document);
document.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => syncDetails(d.parentElement || document)));

const grid = document.querySelector('.days-grid');
if (grid) {
  grid.addEventListener('keydown', (e) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const sums = Array.from(grid.querySelectorAll<HTMLElement>('.day summary'));
    const i = sums.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    let n = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % sums.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + sums.length) % sums.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = sums.length - 1;
    sums[n].focus();
  });
}
