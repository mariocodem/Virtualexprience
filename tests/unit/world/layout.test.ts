import { describe, expect, it } from 'vitest';
import { stationsOf, world } from '@/data';
import { BAND_SCALES, bandsForIsland, TERRACE_HEIGHT, type Point } from '@/world/geography';
import { stationLayout } from '@/world/layout';

function inside([x, z]: Point, polygon: readonly Point[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i] ?? [0, 0];
    const [xj, zj] = polygon[j] ?? [0, 0];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

const TOP = BAND_SCALES.length - 1;

describe('sendero de estaciones', () => {
  for (const island of world.islands) {
    const stations = stationsOf(island.id);
    const spots = stationLayout(island, stations);
    const bands = bandsForIsland(island);

    it(`${island.name}: empieza en la costa, sube por terrazas y el desafío queda en la cumbre`, () => {
      expect(spots).toHaveLength(stations.length);
      expect(spots[0]?.level).toBe(0);
      expect(spots.at(-1)?.level).toBe(TOP);
      expect(stations.at(-1)?.type).toBe('desafio');
      const levels = spots.map((s) => s.level);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
    });

    it(`${island.name}: cada parada se apoya sobre su terraza, sin caer al borde de la de arriba`, () => {
      for (const spot of spots) {
        const point: Point = [spot.position[0], spot.position[2]];
        expect(spot.position[1]).toBeCloseTo((spot.level + 1) * TERRACE_HEIGHT);
        expect(inside(point, bands[spot.level]?.outline ?? [])).toBe(true);
        if (spot.level < TOP)
          expect(inside(point, bands[spot.level + 1]?.outline ?? [])).toBe(false);
      }
    });

    it(`${island.name}: no hay dos paradas en el mismo sitio`, () => {
      const keys = new Set(spots.map((s) => s.position.map((v) => v.toFixed(2)).join(',')));
      expect(keys.size).toBe(spots.length);
    });
  }

  it('es determinista', () => {
    const island = world.islands[0];
    if (!island) throw new Error('sin islas');
    expect(stationLayout(island, stationsOf(island.id))).toEqual(
      stationLayout(island, stationsOf(island.id)),
    );
  });
});
