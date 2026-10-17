import Lenis from 'lenis';
import { useEffect } from 'react';
import { gsap, ScrollTrigger, setLenis } from './motion';

/** Scroll suave con Lenis sincronizado con GSAP; desactivado con movimiento reducido. */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.12 });
    setLenis(lenis);
    lenis.on('scroll', () => {
      ScrollTrigger.update();
    });
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, [enabled]);
}
