// Procedural, deterministic stylised city skyline (no real landmark is depicted or named).
// Output: SVG path strings for 4 depth layers (far / mid / near / front) + window light groups.
// Art space is 3000 x 560; the centre cluster (x 1180-1820) is the "hero" group that phones always show.
export const W = 3000, H = 560, CX = 1500;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const n = (v: number) => Math.round(v);
const rect = (x: number, y: number, w: number, h: number) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${-n(w)}z`;
// onion-ish dome sitting on baseline y, radius r, rise h, with a finial
const dome = (cx: number, y: number, r: number, h: number) =>
  `M${n(cx - r)} ${n(y)}C${n(cx - r * 1.25)} ${n(y - h * .5)} ${n(cx - r * .3)} ${n(y - h * .72)} ${n(cx)} ${n(y - h)}C${n(cx + r * .3)} ${n(y - h * .72)} ${n(cx + r * 1.25)} ${n(y - h * .5)} ${n(cx + r)} ${n(y)}z` +
  rect(cx - 1.5, y - h - r * .55, 3, r * .55 + 2) + rect(cx - 3.5, y - h - r * .55 - 5, 7, 6);
// pointed arch cut-out (drawn inside an evenodd path => a hole)
const arch = (x: number, y: number, w: number, h: number) =>
  `M${n(x)} ${n(y + h)}V${n(y + w * .55)}Q${n(x)} ${n(y + w * .15)} ${n(x + w / 2)} ${n(y)}Q${n(x + w)} ${n(y + w * .15)} ${n(x + w)} ${n(y + w * .55)}V${n(y + h)}z`;
// chhatri: slab + 2 pillars + small dome
const chhatri = (cx: number, y: number, s: number) =>
  rect(cx - s, y - 3, s * 2, 3) + rect(cx - s + 1, y - s * 1.1 - 3, 2.2, s * 1.1) + rect(cx + s - 3.2, y - s * 1.1 - 3, 2.2, s * 1.1) + dome(cx, y - s * 1.1 - 3, s * .95, s * 1.15);
// minaret: tapered shaft, two balcony rings, chhatri cap
const minaret = (cx: number, y: number, w: number, h: number) =>
  `M${n(cx - w)} ${n(y)}L${n(cx - w * .72)} ${n(y - h)}H${n(cx + w * .72)}L${n(cx + w)} ${n(y)}z` +
  rect(cx - w * 1.5, y - h * .45, w * 3, 4) + rect(cx - w * 1.3, y - h * .8, w * 2.6, 4) + chhatri(cx, y - h, w * 1.1);

type Wins = [string[], string[], string[]]; // entries are "x y w h"
function windows(rnd: () => number, x: number, y: number, w: number, h: number, out: Wins, dens = .38, px = 13, py = 17) {
  for (let yy = y + 12; yy < y + h - 10; yy += py)
    for (let xx = x + 8; xx < x + w - 10; xx += px)
      if (rnd() < dens) out[Math.floor(rnd() * 3)].push(`${n(xx)} ${n(yy)} 5 7`);
}
const empty = (): Wins => [[], [], []];

export function buildSkyline() {
  /* ── FAR: hazy modern towers across the whole width ── */
  const rf = rng(11); let far = ''; let x = -30;
  while (x < W + 30) {
    const w = 46 + rf() * 70, c = Math.abs(x - CX) / CX, h = 80 + rf() * 120 + (1 - c) * 40;
    far += rect(x, H - h, w, h + 2);
    const k = rf();
    if (k < .25) far += rect(x + w * .3, H - h - 26, w * .4, 28);
    else if (k < .45) far += rect(x + w / 2 - 1.5, H - h - 42, 3, 44);
    else if (k < .6) far += `M${n(x + 4)} ${n(H - h)}L${n(x + w / 2)} ${n(H - h - 34)}L${n(x + w - 4)} ${n(H - h)}z`;
    x += w + rf() * 8;
  }

  /* ── MID: heritage arcades, domes and minarets, wide palace-like façade in the centre ── */
  const rm = rng(23); const mw = empty(); let mid = ''; let midCut = '';
  const palace = (x0: number, w: number, h: number) => {
    mid += rect(x0, H - h, w, h + 2);
    const n_ = Math.floor(w / 46);
    for (let i = 0; i < n_; i++) midCut += arch(x0 + 12 + i * (w - 24) / n_ + 6, H - h + 38, 22, h - 52);
    for (let i = 0; i <= 6; i++) mid += chhatri(x0 + 18 + i * (w - 36) / 6, H - h, 9);
  };
  palace(1040, 920, 118);
  mid += rect(1380, H - 190, 240, 74) + dome(1500, H - 190, 64, 96) + chhatri(1400, H - 190, 10) + chhatri(1600, H - 190, 10);
  midCut += arch(1478, H - 168, 44, 50);
  mid += minaret(1030, H, 11, 215) + minaret(1970, H, 11, 215);
  for (const side of [-1, 1]) {
    let xx = side < 0 ? 1000 : 2000;
    for (let i = 0; i < 9; i++) {
      const w = 90 + rm() * 150, h = 70 + rm() * 150, x0 = side < 0 ? xx - w : xx;
      const k = rm();
      if (k < .35) { mid += rect(x0, H - h, w, h + 2) + dome(x0 + w / 2, H - h, w * .34, w * .38); windows(rm, x0, H - h, w, h, mw, .2); }
      else if (k < .6) { mid += rect(x0, H - h, w, h + 2) + minaret(x0 + 14, H - h, 8, 90 + rm() * 50) + minaret(x0 + w - 14, H - h, 8, 90 + rm() * 50); windows(rm, x0, H - h, w, h, mw, .2); }
      else { mid += rect(x0, H - h, w, h + 2) + rect(x0 + w * .2, H - h - 22, w * .6, 24) + rect(x0 + w / 2 - 1.5, H - h - 52, 3, 32); windows(rm, x0, H - h, w, h, mw, .26); }
      xx += side * (w - 6 + rm() * 20);
      if (xx < -200 || xx > W + 200) break;
    }
  }

  /* ── NEAR: arched gateway cluster (centre) + faceted modern towers (wings) ── */
  const rn = rng(37); const nw = empty();
  let nearBody = ''; let nearCut = ''; let sideLit = ''; let topLit = '';
  // gateway block
  nearBody += rect(1330, H - 250, 340, 252) + rect(1318, H - 262, 364, 14) + rect(1322, H - 120, 356, 10);
  nearCut += arch(1456, H - 200, 88, 200) + arch(1371, H - 150, 52, 150) + arch(1577, H - 150, 52, 150);
  nearCut += arch(1346, H - 215, 16, 50) + arch(1638, H - 215, 16, 50);
  for (let i = 0; i < 9; i++) nearBody += chhatri(1338 + i * 40.5, H - 262, 8);
  nearBody += rect(1432, H - 330, 136, 70) + dome(1500, H - 330, 56, 118) + chhatri(1445, H - 330, 9) + chhatri(1555, H - 330, 9);
  nearCut += arch(1488, H - 305, 24, 40);
  // flanking wings + minarets
  nearBody += rect(1180, H - 150, 150, 152) + rect(1670, H - 150, 150, 152);
  for (const bx of [1180, 1670]) for (let i = 0; i < 3; i++) nearCut += arch(bx + 16 + i * 44, H - 112, 24, 70);
  nearBody += dome(1255, H - 150, 34, 54) + dome(1745, H - 150, 34, 54);
  nearBody += minaret(1298, H, 13, 300) + minaret(1702, H, 13, 300) + minaret(1196, H, 10, 220) + minaret(1804, H, 10, 220);
  windows(rn, 1330, H - 250, 340, 250, nw, .0);
  for (const [wx, wy] of [[1352, H - 142], [1398, H - 142], [1602, H - 142], [1648, H - 142]]) { nw[0].push(`${n(wx)} ${n(wy)} 6 9`); nw[1].push(`${n(wx)} ${n(wy + 30)} 6 9`); nw[2].push(`${n(wx + 14)} ${n(wy - 26)} 5 8`); }
  for (let i = 0; i < 14; i++) nw[i % 3].push(`${1340 + i * 23} ${H - 240} 4 6`);
  // faceted (isometric) towers: front face, lit side face toward the centre, top face
  const cuboid = (x0: number, w: number, h: number, side: number) => {
    const d = 22, s = side;
    const fx = s > 0 ? x0 : x0 + d; // front face origin shifts so the lit side faces the centre
    nearBody += rect(fx, H - h, w, h + 2);
    const sx = s > 0 ? fx + w : fx;
    sideLit += `M${n(sx)} ${n(H - h)}L${n(sx + s * d)} ${n(H - h - d * .5)}V${n(H - d * .5 + 2)}L${n(sx)} ${n(H + 2)}z`;
    topLit += `M${n(fx)} ${n(H - h)}L${n(fx + s * d)} ${n(H - h - d * .5)}H${n(fx + s * d + w)}L${n(fx + w)} ${n(H - h)}z`;
    if (rn() < .5) nearBody += rect(fx + w * .3, H - h - 20, w * .4, 20) + rect(fx + w / 2 - 1.5, H - h - 54, 3, 36);
    windows(rn, fx, H - h, w, h, nw, .3, 15, 20);
  };
  for (const side of [-1, 1]) {
    let xx = side < 0 ? 1160 : 1840;
    for (let i = 0; i < 14; i++) {
      const w = 54 + rn() * 50, h = 120 + rn() * 190 * (1 - i / 22);
      const x0 = side < 0 ? xx - w - 22 : xx;
      if (rn() < .22) {
        const hh = 110 + rn() * 70; // domed hall instead
        nearBody += rect(x0, H - hh, w + 20, hh + 2) + dome(x0 + (w + 20) / 2, H - hh, (w + 20) * .32, (w + 20) * .34);
        for (let k = 0; k < 2; k++) nearCut += arch(x0 + 10 + k * ((w + 20) / 2 - 4), H - hh + 30, 18, hh - 40);
      } else cuboid(x0, w, h, -side); // lit side faces the centre
      xx += side * (w + 34 + rn() * 26);
      if (xx < -250 || xx > W + 250) break;
    }
  }

  /* ── FRONT: low dark rooftops, water tanks, trees; frames the bottom edge ── */
  const rr = rng(53); let front = ''; let xf = -20;
  while (xf < W + 20) {
    const w = 40 + rr() * 120, h = 14 + rr() * 34;
    front += rect(xf, H - h, w, h + 2);
    const k = rr();
    if (k < .3) front += rect(xf + w * .3, H - h - 14, 18, 14) + rect(xf + w * .3 + 4, H - h - 18, 10, 4);
    else if (k < .55) front += `M${n(xf + w * .5 - 20)} ${n(H - h)}a20 18 0 0 1 40 0z` + rect(xf + w * .5 - 1.5, H - h - 6, 3, 8);
    xf += w + rr() * 10;
  }

  // relative-encoded rects: each subpath restarts at its own origin after z, so 'm' offsets chain from the previous window origin
  const j = (a: string[]) => { let px = 0, py = 0, out = ''; for (const e of a) { const [x, y, w, h] = e.split(' ').map(Number); out += `m${x - px} ${y - py}h${w}v${h}h${-w}z`; px = x; py = y; } return 'M0 0' + out; };
  return {
    far, mid, midCut, nearBody, nearCut, sideLit, topLit, front,
    midW: mw.map(j), nearW: nw.map(j),
  };
}
