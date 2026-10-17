import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

/**
 * Lleva a una sección y deja el foco en su título, para que teclado y lector
 * de pantalla continúen desde ahí. Con movimiento reducido salta sin animar.
 */
export function goToSection(id: string, reduced: boolean) {
  const target = document.getElementById(id);
  if (!target) return;
  const heading = target.querySelector<HTMLElement>('h2, h1') ?? target;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  if (lenis && !reduced) lenis.scrollTo(target, { duration: 1.2 });
  else target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}

/** Desplaza a una posición absoluta, con Lenis si está activo. */
export function scrollToY(y: number, reduced: boolean) {
  if (lenis && !reduced) lenis.scrollTo(y, { duration: 1 });
  else window.scrollTo({ top: y, behavior: reduced ? 'instant' : 'smooth' });
}
