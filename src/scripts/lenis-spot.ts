// Lenis smooth scroll (self-hosted bundle) + damped pointer spotlight.
// Reduced motion: neither. Coarse/touch pointers: no spotlight. Native keyboard/anchors stay usable.
import Lenis from 'lenis';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

type LenisHandle = { scrollTo: (t: number | string | HTMLElement, o?: { immediate?: boolean; duration?: number; offset?: number; force?: boolean }) => void; raf: (t: number) => void; destroy: () => void; resize: () => void };

function padOffset() {
  const raw = getComputedStyle(document.documentElement).scrollPaddingTop;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? -n : -80;
}

function installScrollBridge(lenis: LenisHandle) {
  const native = window.scrollTo.bind(window);
  const patched = ((a?: ScrollToOptions | number, b?: number) => {
    if (typeof a === 'number') {
      lenis.scrollTo(typeof b === 'number' ? b : a, { immediate: true, force: true });
      return;
    }
    if (a && typeof a === 'object' && typeof a.top === 'number') {
      const instant = a.behavior === 'instant' || (a.behavior as string) === 'auto';
      lenis.scrollTo(a.top, { immediate: instant, force: true, duration: instant ? 0 : 1.05 });
      return;
    }
    native(a as ScrollToOptions);
  }) as typeof window.scrollTo;
  window.scrollTo = patched;
}

if (!reduce) {
  const lenis = new Lenis({
    autoRaf: true,
    anchors: { offset: padOffset(), duration: 1.05 },
    syncTouch: false,
    overscroll: true,
    allowNestedScroll: true,
  }) as unknown as LenisHandle;
  (window as Window & { __lenis?: LenisHandle }).__lenis = lenis;
  document.documentElement.classList.add('lenis');
  installScrollBridge(lenis);

  // Hash load (Skip / shared links): Lenis anchors cover clicks; initial hash uses the same offset.
  if (location.hash.length > 1) {
    const el = document.querySelector<HTMLElement>(location.hash);
    if (el) requestAnimationFrame(() => lenis.scrollTo(el, { immediate: true, offset: padOffset(), force: true }));
  }
}

if (!reduce && fine) {
  const root = document.documentElement;
  let tx = innerWidth * 0.5, ty = innerHeight * 0.35;
  let x = tx, y = ty, raf = 0;
  const tick = () => {
    x += (tx - x) * 0.14;
    y += (ty - y) * 0.14;
    root.style.setProperty('--mouse-x', `${x.toFixed(1)}px`);
    root.style.setProperty('--mouse-y', `${y.toFixed(1)}px`);
    if (Math.hypot(tx - x, ty - y) > 0.4) raf = requestAnimationFrame(tick);
    else raf = 0;
  };
  const bump = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    root.classList.add('spot-on');
    bump();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => root.classList.remove('spot-on'));
}
