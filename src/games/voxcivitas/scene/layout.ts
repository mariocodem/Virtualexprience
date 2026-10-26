import type { Vec2 } from '@/games/shared/arena/core';

/**
 * Colocación pura de la escenografía de Voxcivitas (público, edificios y
 * árboles). Es determinista: la plaza se ve igual en cada partida y se prueba.
 */

export interface Placed extends Vec2 {
  /** Giro en Y para que el frente (+Z local) mire al centro de la plaza. */
  rotY: number;
}

export const faceCenter = (x: number, z: number): number => Math.atan2(-x, -z);

/**
 * El público del cabildo: filas de vecinos en arco detrás de la mesa
 * (hacia −Z, lejos de la cámara), de más cerca a más lejos.
 */
export function audienceLayout(count: number, innerRadius = 4.4): Placed[] {
  const out: Placed[] = [];
  let row = 0;
  while (out.length < count) {
    const radius = innerRadius + row * 0.95;
    const perRow = 7 + row * 2;
    for (let i = 0; i < perRow && out.length < count; i++) {
      // Entre −160° y −20° vistos desde la mesa: el fondo, no el frente.
      const t = i / (perRow - 1);
      const a = (-160 + 140 * t + (row % 2 ? 6 : 0)) * (Math.PI / 180);
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      out.push({ x, z, rotY: faceCenter(x, z) });
    }
    row += 1;
  }
  return out;
}

/** Cuántos del público alzan su farol según la proporción que respalda. */
export function raisedCount(total: number, support: number): number {
  return Math.round(total * Math.min(1, Math.max(0, support)));
}

export type BackdropKind = 'cabildo' | 'campanario' | 'casona' | 'arbol';

export interface BackdropItem extends Placed {
  kind: BackdropKind;
  scale: number;
  variant: number;
}

/**
 * Edificios y árboles que enmarcan la plaza: el cabildo al fondo, el campanario
 * a su lado y casonas y árboles a los costados. El frente (hacia la cámara)
 * queda libre para que nada tape el juego.
 */
export function backdropLayout(radius: number): BackdropItem[] {
  const items: BackdropItem[] = [];
  const at = (kind: BackdropKind, angleDeg: number, r: number, scale: number, variant = 0) => {
    const a = (angleDeg * Math.PI) / 180;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    items.push({ kind, x, z, rotY: faceCenter(x, z), scale, variant });
  };
  at('cabildo', -90, radius, 6.4);
  at('campanario', -122, radius - 0.2, 5.6);
  [-158, -58, -32, 188, -10, 12].forEach((deg, i) => {
    at('casona', deg, radius + 0.1, 5.2, i);
  });
  [-140, -105, -75, -45, -20, 5, 175, 200].forEach((deg, i) => {
    at('arbol', deg, radius + 1.9 + (i % 3) * 0.4, 5 + (i % 2), i);
  });
  return items;
}
