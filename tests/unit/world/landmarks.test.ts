import { describe, expect, it } from 'vitest';
import { stationsOf, world } from '@/data';
import type { IslandId } from '@/types/domain';
import { BAND_SCALES, bandsForIsland, terraceTop, type Point } from '@/world/geography';
import {
  FOOTPRINT,
  landmarksFor,
  LOTS,
  SEAWARD,
  STATUES,
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
  comunicarte: ['imprenta', 'radio', 'muelle', 'cerebro'],
  neuromath: ['observatorio', 'puente', 'solido', 'libro'],
  voxcivitas: ['cabildo', 'plaza', 'campanario', 'balanza'],
  gerencia: ['astillero', 'grua', 'puesto', 'timon'],
  activatuidea: ['taller', 'aerogenerador', 'domo', 'cohete'],
  latidosocial: ['ceiba', 'maloca', 'huerta', 'corazon'],
};

/** El monumento de cada isla: su estatua gigante. */
const MONUMENT: Record<IslandId, LandmarkKind> = {
  comunicarte: 'cerebro',
  neuromath: 'libro',
  voxcivitas: 'balanza',
  gerencia: 'timon',
  activatuidea: 'cohete',
  latidosocial: 'corazon',
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

    it(`${island.name}: alza su monumento en el centro de la cumbre, de cara al mar abierto`, () => {
      const monuments = landmarks.filter((l) => STATUES.has(l.kind));
      expect(monuments.map((l) => l.kind)).toEqual([MONUMENT[island.id]]);
      const [monument] = monuments;
      if (!monument) throw new Error('sin monumento');
      // En la cumbre y cerca de su centro: a menos de un tercio de su radio.
      const summit = bands[TOP]?.outline ?? [];
      const [cx, cz] = summit
        .reduce<[number, number]>((s, [x, z]) => [s[0] + x, s[1] + z], [0, 0])
        .map((v) => v / summit.length) as [number, number];
      const reach = Math.min(...summit.map(([x, z]) => Math.hypot(x - cx, z - cz)));
      expect(monument.level).toBe(TOP);
      expect(Math.hypot(monument.position[0] - cx, monument.position[2] - cz)).toBeLessThan(
        reach / 3,
      );
      // Su frente (+Z) mira hacia mar abierto, donde llega la cámara (a lo sumo 40° de giro).
      const facing = { x: Math.sin(monument.rotation), z: Math.cos(monument.rotation) };
      const toSea = Math.hypot(island.position.x, island.position.z);
      expect((facing.x * island.position.x + facing.z * island.position.z) / toSea).toBeGreaterThan(
        Math.cos((40 * Math.PI) / 180),
      );
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
