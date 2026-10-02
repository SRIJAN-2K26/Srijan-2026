// Scroll-linked SVG beam on "Your path". JS-off / reduced-motion: full stroke, every node readable.
const wrap = document.querySelector<HTMLElement>('.path-wrap');
const svg = wrap?.querySelector<SVGSVGElement>('.path-svg');
const beam = svg?.querySelector<SVGPathElement>('.path-beam');
const track = svg?.querySelector<SVGPathElement>('.path-track');
const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-path-node]'));
if (!wrap || !svg || !beam || !track || !nodes.length) { /* no path */ } else {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setD = (d: string) => { beam.setAttribute('d', d); track.setAttribute('d', d); };

  const layout = () => {
    const wr = wrap.getBoundingClientRect();
    const w = Math.max(1, wr.width), h = Math.max(1, wr.height);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    const pts = nodes.map((n) => {
      const d = n.querySelector('.dot')?.getBoundingClientRect() || n.getBoundingClientRect();
      return [d.left + d.width / 2 - wr.left, d.top + d.height / 2 - wr.top] as const;
    });
    setD(pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '));
  };

  const paint = (p: number) => {
    const t = Math.min(1, Math.max(0, p));
    beam.style.strokeDasharray = '100';
    beam.style.strokeDashoffset = reduce ? '0' : String((1 - t) * 100);
    if (reduce) {
      for (const n of nodes) n.classList.add('lit');
      return;
    }
    const last = nodes.length - 1;
    nodes.forEach((n, i) => {
      const at = last === 0 ? 1 : i / last;
      const on = t >= at - 0.04;
      const was = n.classList.contains('lit');
      n.classList.toggle('lit', on);
      if (on && !was) n.classList.add('bloom');
    });
  };

  const progress = () => {
    const frame = document.querySelector('.f4');
    if (!frame) return;
    const stage = document.querySelector('.stage');
    const pinned = !!stage && getComputedStyle(stage).position === 'sticky';
    let p = 1;
    if (pinned) {
      const F = 0.9 * innerHeight;
      p = (scrollY / F - 3 - 0.08) / 0.72;
    } else {
      const r = frame.getBoundingClientRect();
      p = (innerHeight * 0.7 - r.top) / (r.height + innerHeight * 0.25);
    }
    paint(p);
  };

  layout();
  if (reduce) paint(1);
  else {
    addEventListener('scroll', progress, { passive: true });
    progress();
  }
  addEventListener('resize', () => { layout(); progress(); }, { passive: true });
}
