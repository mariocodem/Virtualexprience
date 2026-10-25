import { describe, expect, it } from 'vitest';
import { stationsOf, world } from '@/data';
import type { IslandId } from '@/types/domain';
import { BAND_SCALES, bandsForIsland, terraceTop, type Point } from '@/world/geography';
import {
  FOOTPRINT,
  landmarksFor,
  LOTS,
  SEAWARD,
  STOP_CLEARANCE,
  type LandmarkKind,
} from '@/world/landmarks';
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

/** La construcción que identifica a cada isla, y solo a ella. */
const SIGNATURE: Record<IslandId, LandmarkKind[]> = {
  comunicarte: ['imprenta', 'radio', 'muelle'],
  neuromath: ['observatorio', 'puente', 'solido'],
  voxcivitas: ['cabildo', 'plaza', 'campanario'],
  gerencia: ['astillero', 'grua', 'puesto'],
  activatuidea: ['taller', 'aerogenerador', 'domo'],
  latidosocial: ['ceiba', 'maloca', 'huerta'],
};

const TOP = BAND_SCALES.length - 1;

describe('construcciones de las islas', () => {
  for (const island of world.islands) {
    const spots = stationLayout(island, stationsOf(island.id));
    const landmarks = landmarksFor(island, spots);
    const bands = bandsForIsland(island);

    it(`${island.name}: tiene sus construcciones insignia y ninguna de otra isla`, () => {
      const kinds = new Set(landmarks.map((l) => l.kind));
      for (const kind of SIGNATURE[island.id]) expect(kinds, kind).toContain(kind);
      for (const [other, signature] of Object.entries(SIGNATURE)) {
        if (other === island.id) continue;
        for (const kind of signature) expect(kinds, `${kind} de ${other}`).not.toContain(kind);
      }
    });

    it(`${island.name}: coloca casi todo lo previsto`, () => {
      const planned = LOTS[island.id].reduce((sum, lot) => sum + (lot.count ?? 1), 0);
      expect(landmarks.length).toBeGreaterThanOrEqual(Math.ceil(planned * 0.85));
    });

    it(`${island.name}: nada pisa las paradas del sendero`, () => {
      for (const l of landmarks) {
        if (l.kind === 'plaza') continue;
        for (const s of spots) {
          const d = Math.hypot(l.position[0] - s.position[0], l.position[2] - s.position[2]);
          expect(d, `${l.kind} junto a ${s.stationId}`).toBeGreaterThanOrEqual(
            STOP_CLEARANCE + FOOTPRINT[l.kind] * l.scale - 1e-9,
          );
        }
      }
    });

    it(`${island.name}: cada construcción se apoya en su terraza`, () => {
      for (const l of landmarks) {
        const point: Point = [l.position[0], l.position[2]];
        expect(l.position[1]).toBeCloseTo(terraceTop(island, l.level));
        expect(inside(point, bands[l.level]?.outline ?? []), l.kind).toBe(true);
        if (l.level < TOP && !SEAWARD.has(l.kind)) {
          expect(inside(point, bands[l.level + 1]?.outline ?? []), l.kind).toBe(false);
        }
      }
    });
  }

  it('es determinista', () => {
    const island = world.islands[0];
    if (!island) throw new Error('sin islas');
    const spots = stationLayout(island, stationsOf(island.id));
    expect(landmarksFor(island, spots)).toEqual(landmarksFor(island, spots));
  });
});
