import type { FeedbackKind } from '@/data/contentSchemas';
import { ATLAS } from '@/world/palette';

export const BASKET_COLOR: Record<FeedbackKind, string> = {
  patron: ATLAS.sun,
  aislado: ATLAS.sea[1],
  fuera: ATLAS.route,
};

/** Posiciones de las personas, en arco detrás del banco, según cuántas sean. */
export function personSpots(n: number): [number, number][] {
  const spread = n > 3 ? 2.3 : 2.8;
  return Array.from({ length: n }, (_, i) => {
    const x = (i - (n - 1) / 2) * spread;
    return [x, -2.3 - 0.6 * (1 - Math.abs(x) / (spread * (n / 2)))];
  });
}
