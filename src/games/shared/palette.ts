import type { IslandId } from '@/types/domain';
import { ISLE } from '@/world/palette';

/** Mezcla un color con otro en proporción `k` (0 = el primero, 1 = el segundo). */
export function mixHex(a: string, b: string, k: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const ca = parse(a);
  const cb = parse(b);
  return `#${ca
    .map((v, i) =>
      Math.round(v + ((cb[i] ?? v) - v) * k)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Tinte de la Bruma de cada isla: la niebla fría teñida por el acento de la isla. */
export function brumaTint(island: IslandId | 'corazon'): string {
  if (island === 'corazon') return '#a59ad8';
  return mixHex('#c4d2e0', ISLE[island], 0.38);
}
