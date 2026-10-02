// Scroll-linked SVG draw on [data-timeline]. Path is fully drawn without JS / reduced motion.
const lists = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline]'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Track = { root: HTMLElement; path: SVGPathElement; nodes: HTMLElement[]; len: number };
const tracks: Track[] = [];

const layout = (root: HTMLElement): Track | null => {
  const svg = root.querySelector<SVGSVGElement>('.tl-svg');
  const path = root.querySelector<SVGPathElement>('.tl-path');
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('.dot, .num'));
  if (!svg || !path || nodes.length < 2) return null;
  const rr = root.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${Math.max(1, rr.width)} ${Math.max(1, rr.height)}`);
  svg.setAttribute('width', String(rr.width));
  svg.setAttribute('height', String(rr.height));
  const pts = nodes.map((n) => {
    const b = n.getBoundingClientRect();
    return `${(b.left + b.width / 2 - rr.left).toFixed(1)},${(b.top + b.height / 2 - rr.top).toFixed(1)}`;
  });
  path.setAttribute('d', `M${pts.join(' L')}`);
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = reduce ? '0' : String(len);
  return { root, path, nodes, len };
};

const paint = () => {
  for (const t of tracks) {
    const rr = t.root.getBoundingClientRect();
    const vh = innerHeight || 1;
    const start = vh * 0.82;
    const end = vh * 0.22;
    const raw = (start - rr.top) / Math.max(1, rr.height + (start - end));
    const p = Math.max(0, Math.min(1, raw));
    if (!reduce) t.path.style.strokeDashoffset = String(t.len * (1 - p));
    t.nodes.forEach((n, i) => {
      const on = reduce || p >= (i + 0.15) / t.nodes.length;
      n.parentElement?.classList.toggle('tl-on', on);
    });
  }
};

let ticking = 0;
const req = () => { if (!ticking) ticking = requestAnimationFrame(() => { ticking = 0; paint(); }); };

for (const root of lists) {
  const t = layout(root);
  if (t) tracks.push(t);
}
if (tracks.length) {
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', () => {
    tracks.splice(0, tracks.length);
    for (const root of lists) {
      const t = layout(root);
      if (t) tracks.push(t);
    }
    paint();
  }, { passive: true });
  paint();
}
