import type { Island, IslandId } from '@/types/domain';

/**
 * Geografía del archipiélago, compartida por el mapa 3D y la plancha SVG.
 * Las islas son terrazas hipsométricas: contornos anidados, uno por franja de
 * altitud, generados con ruido determinista para que el 2D y el 3D coincidan.
 */

export type Point = readonly [x: number, z: number];

export interface Band {
  /** 0 = llanura costera; crece hacia la cumbre. */
  level: number;
  outline: Point[];
}

/** Escalas relativas de cada franja: llanura, oliva, amarillo, ocre, cumbre. */
export const BAND_SCALES = [1, 0.76, 0.55, 0.36, 0.17] as const;

/** Umbrales batimétricos (múltiplos del radio de la isla), compartidos por la plancha y el océano 3D. */
export const BATHYMETRY = [3.2, 2.5, 1.9, 1.45, 1.18] as const;

/** Altura de cada terraza en unidades del mundo. */
export const TERRACE_HEIGHT = 0.42;

/** El Faro Minuto ocupa el origen: una isla pequeña de tres terrazas. */
export const LIGHTHOUSE_ISLAND = { position: { x: 0, z: 0 }, radius: 1.9, seed: 97 } as const;

const POINTS = 26;

/** PRNG mulberry32: misma semilla, misma isla, en cualquier dispositivo. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ISLAND_SEEDS: Record<IslandId, number> = {
  comunicarte: 11,
  neuromath: 23,
  voxcivitas: 37,
  gerencia: 41,
  activatuidea: 53,
  latidosocial: 67,
};

export function islandSeed(id: IslandId): number {
  return ISLAND_SEEDS[id];
}

/**
 * Contornos anidados de una isla. El ruido de cada franja es pequeño frente a
 * la diferencia de escala entre franjas, así que ninguna terraza se sale de la
 * de abajo; la cumbre se desplaza un poco para que la isla no sea un cono.
 */
export function islandBands(
  center: { x: number; z: number },
  radius: number,
  seed: number,
  levels: number = BAND_SCALES.length,
): Band[] {
  const random = seededRandom(seed);
  const harmonics = [2, 3, 5].map((frequency) => ({
    frequency,
    amplitude: 0.05 + random() * 0.07,
    phase: random() * Math.PI * 2,
  }));
  const peakAngle = random() * Math.PI * 2;
  const peakShift = radius * (0.08 + random() * 0.1);

  return BAND_SCALES.slice(0, levels).map((scale, level) => {
    const bandRandom = seededRandom(seed * 31 + level * 7);
    const jitter = Array.from({ length: POINTS }, () => (bandRandom() - 0.5) * 0.06);
    const shift = peakShift * (1 - scale);
    const cx = center.x + Math.cos(peakAngle) * shift;
    const cz = center.z + Math.sin(peakAngle) * shift;

    const outline: Point[] = jitter.map((j, i) => {
      const angle = (i / POINTS) * Math.PI * 2;
      const shape = harmonics.reduce(
        (sum, h) => sum + h.amplitude * Math.sin(h.frequency * angle + h.phase),
        1,
      );
      const r = radius * scale * (shape + j);
      return [cx + Math.cos(angle) * r, cz + Math.sin(angle) * r * 0.86] as const;
    });
    return { level, outline };
  });
}

export function bandsForIsland(island: Island): Band[] {
  return islandBands(island.position, island.radius, islandSeed(island.id));
}

export function bandsForLighthouse(): Band[] {
  return islandBands(
    LIGHTHOUSE_ISLAND.position,
    LIGHTHOUSE_ISLAND.radius,
    LIGHTHOUSE_ISLAND.seed,
    3,
  );
}

/** Altura de la cumbre de una isla: dónde se ancla su rótulo. */
export function summitHeight(levels: number = BAND_SCALES.length): number {
  return levels * TERRACE_HEIGHT;
}

/** Caja que contiene todo el archipiélago, con margen de mar. */
export function archipelagoBounds(islands: Island[], margin = 6) {
  const xs = islands.flatMap((i) => [i.position.x - i.radius, i.position.x + i.radius]);
  const zs = islands.flatMap((i) => [i.position.z - i.radius, i.position.z + i.radius]);
  return {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minZ: Math.min(...zs) - margin,
    maxZ: Math.max(...zs) + margin,
  };
}
