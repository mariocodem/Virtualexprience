import type { TestOutcome } from '@/minigames/puentes-de-fractal/engine';
import { fallTime } from './debris';

/**
 * Medidas del cañón del reto y guion de cada prueba con la vagoneta: dónde
 * rueda, cuándo cede el puente y cuándo se conoce el veredicto. Puro, para
 * probarlo sin navegador; la escena solo lo dibuja.
 */
export const CANYON = {
  /** Estribos: el hueco va de `left` a `right` y siempre se dibuja igual de ancho. */
  left: -4,
  right: 4,
  /** Altura de la calzada y del agua del fondo. */
  deck: 0,
  water: -4.6,
  /** Donde espera la vagoneta y donde se estaciona al cruzar. */
  cartStart: -6.4,
  cartPark: 6.4,
} as const;

/** Ancho del hueco en unidades del mundo. */
export const SPAN_WORLD = CANYON.right - CANYON.left;

/** Unidades del mundo por metro del puente actual: el hueco siempre ocupa lo mismo. */
export function worldPerMeter(gap: number): number {
  return SPAN_WORLD / gap;
}

/** Velocidad de la vagoneta al llegar al borde. */
const ROLL_SPEED = 3.4;
/** Lo que tarda en arquearse un puente que no encaja. */
const ARCH_TIME = 0.9;
/** Pausa tras el chapuzón antes del veredicto. */
const AFTER_SPLASH = 0.6;

export interface TestScript {
  outcome: TestOutcome;
  /** X donde empieza a rodar y donde se detiene (o desde donde cae). */
  from: number;
  to: number;
  /** Segundo en que la vagoneta llega a `to`. */
  arrive: number;
  /** Segundo en que el puente cede; nulo si resiste. */
  collapseAt: number | null;
  /** Segundo en que termina la prueba y se dice el veredicto. */
  doneAt: number;
}

/**
 * Guion de una prueba. `end` es la X donde acaba el último tramo. Con
 * movimiento reducido todo pasa en el instante 0: se muestra el final.
 */
export function testScript(outcome: TestOutcome, end: number, still: boolean): TestScript {
  const from = CANYON.cartStart;
  const fall = fallTime(CANYON.deck - CANYON.water);
  if (outcome === 'resiste') {
    const to = CANYON.cartPark;
    const arrive = still ? 0 : ((to - from) / ROLL_SPEED) * 1.3;
    return { outcome, from, to, arrive, collapseAt: null, doneAt: still ? 0 : arrive + 0.35 };
  }
  if (outcome === 'corto') {
    const to = Math.max(CANYON.left, end);
    const arrive = still ? 0 : ((to - from) / ROLL_SPEED) * 1.5;
    return {
      outcome,
      from,
      to,
      arrive,
      collapseAt: arrive,
      doneAt: still ? 0 : arrive + fall + AFTER_SPLASH,
    };
  }
  // No encaja: la vagoneta se detiene en el estribo, el puente se arquea y salta.
  const to = CANYON.left - 0.5;
  const arrive = still ? 0 : ((to - from) / ROLL_SPEED) * 1.3;
  const collapseAt = still ? 0 : arrive + ARCH_TIME;
  return { outcome, from, to, arrive, collapseAt, doneAt: still ? 0 : collapseAt + fall + 0.9 };
}

/** Posición de la vagoneta sobre los rieles mientras rueda. */
export function cartX(script: TestScript, t: number): number {
  if (script.arrive <= 0 || t >= script.arrive) return script.to;
  const k = Math.max(0, t / script.arrive);
  // Llega al borde con impulso si va a caer; si no, frena suave.
  const eased = script.outcome === 'corto' ? Math.pow(k, 1.5) : k * k * (3 - 2 * k);
  return script.from + (script.to - script.from) * eased;
}

/** Velocidad con la que la vagoneta sale del borde cuando el puente queda corto. */
export function cartLaunchSpeed(script: TestScript): number {
  return script.outcome === 'corto' && script.arrive > 0 ? ROLL_SPEED : 0;
}

/** Cuánto se arquea un puente que no encaja (0 a 1), hasta que salta. */
export function archAt(script: TestScript, t: number): number {
  if (script.outcome !== 'largo' || script.collapseAt === null) return 0;
  if (script.collapseAt <= script.arrive) return 0;
  return Math.min(1, Math.max(0, (t - script.arrive) / (script.collapseAt - script.arrive)));
}

export function hasCollapsed(script: TestScript, t: number): boolean {
  return script.collapseAt !== null && t >= script.collapseAt;
}
