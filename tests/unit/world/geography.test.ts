import { describe, expect, it } from 'vitest';
import { world } from '@/data';
import {
  bandsForIsland,
  bandsForLighthouse,
  islandBands,
  seededRandom,
  type Point,
} from '@/world/geography';

function inside([x, z]: Point, polygon: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i] ?? [0, 0];
    const [xj, zj] = polygon[j] ?? [0, 0];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

describe('geografía del archipiélago', () => {
  it('es determinista: la misma semilla da la misma isla', () => {
    expect(islandBands({ x: 0, z: 0 }, 4, 11)).toEqual(islandBands({ x: 0, z: 0 }, 4, 11));
    expect(seededRandom(5)()).toBe(seededRandom(5)());
  });

  it('cada terraza queda dentro de la de abajo, en todas las islas', () => {
    const all = [...world.islands.map(bandsForIsland), bandsForLighthouse()];
    for (const bands of all) {
      for (let level = 1; level < bands.length; level++) {
        const outer = bands[level - 1]?.outline ?? [];
        for (const point of bands[level]?.outline ?? []) {
          expect(inside(point, outer)).toBe(true);
        }
      }
    }
  });

  it('ninguna isla toca a otra ni al faro', () => {
    const outlines = [
      ...world.islands.map((i) => bandsForIsland(i)[0]?.outline ?? []),
      bandsForLighthouse()[0]?.outline ?? [],
    ];
    outlines.forEach((a, i) => {
      outlines.forEach((b, j) => {
        if (i === j) return;
        for (const point of a) expect(inside(point, b)).toBe(false);
      });
    });
  });
});
