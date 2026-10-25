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

/** Altura de cada terraza en unidades del mundo (la del faro y la de referencia). */
export const TERRACE_HEIGHT = 0.42;

/** El Faro Minuto ocupa el origen: una isla pequeña de tres terrazas. */
export const LIGHTHOUSE_ISLAND = { position: { x: 0, z: 0 }, radius: 1.9, seed: 97 } as const;

/**
 * Carácter del relieve de una isla: todas tienen cinco terrazas, pero cada una
 * con su silueta, su pendiente y su costa, según el lugar que representa.
 */
export interface ReliefProfile {
  /** Escala de cada franja, de la costa a la cumbre. */
  scales: readonly [number, number, number, number, number];
  /** Altura de cada terraza. */
  height: number;
  /** Puntos del contorno: pocos dan facetas geométricas; muchos, costas suaves. */
  points: number;
  /** Frecuencias de las ondulaciones del contorno y su amplitud máxima. */
  harmonics: readonly number[];
  amplitude: number;
  /** Rugosidad de cada franja. */
  jitter: number;
  /** Giro de cada terraza respecto a la de abajo: escalinata facetada. */
  twist: number;
}

const DEFAULT_RELIEF: ReliefProfile = {
  scales: BAND_SCALES,
  height: TERRACE_HEIGHT,
  points: 26,
  harmonics: [2, 3, 5],
  amplitude: 0.12,
  jitter: 0.06,
  twist: 0,
};

/** Relieves del archipiélago: cada isla se lee distinta desde la carta. */
export const RELIEF: Record<IslandId, ReliefProfile> = {
  // Ciudad-puerto: llanura costera amplia para el pueblo y una bahía marcada.
  comunicarte: {
    ...DEFAULT_RELIEF,
    scales: [1, 0.68, 0.5, 0.36, 0.24],
    height: 0.4,
    harmonics: [1, 2, 5],
    amplitude: 0.13,
  },
  // Observatorio: cristal de siete caras que sube en espiral hasta un pico alto.
  neuromath: {
    ...DEFAULT_RELIEF,
    scales: [1, 0.78, 0.6, 0.44, 0.3],
    height: 0.6,
    points: 7,
    harmonics: [3],
    amplitude: 0.03,
    jitter: 0,
    twist: 0.14,
  },
  // Plaza pública: isla redonda y baja con una meseta ancha en la cima.
  voxcivitas: {
    ...DEFAULT_RELIEF,
    scales: [1, 0.81, 0.65, 0.52, 0.42],
    height: 0.34,
    points: 32,
    harmonics: [2, 4],
    amplitude: 0.05,
    jitter: 0.025,
  },
  // Astillero y mercado: isla alargada y llana, con costa ancha para varar barcos.
  gerencia: {
    ...DEFAULT_RELIEF,
    scales: [1, 0.64, 0.46, 0.32, 0.22],
    height: 0.3,
    harmonics: [2, 3],
    amplitude: 0.15,
    jitter: 0.04,
  },
  // Taller maker: costa quebrada y angulosa, de piedra cortada.
  activatuidea: {
    ...DEFAULT_RELIEF,
    scales: [1, 0.75, 0.57, 0.41, 0.28],
    height: 0.5,
    points: 13,
    harmonics: [3, 5],
    amplitude: 0.09,
    jitter: 0.09,
  },
  // Bosque comunitario: lomas suaves y lobuladas, como copas de árboles.
  latidosocial: {
    ...DEFAULT_RELIEF,
    scales: [1, 0.79, 0.61, 0.45, 0.31],
    height: 0.44,
    points: 36,
    harmonics: [3, 4, 7],
    amplitude: 0.1,
    jitter: 0.025,
  },
};

export function reliefOf(id: IslandId): ReliefProfile {
  return RELIEF[id];
}

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
  profile: ReliefProfile = DEFAULT_RELIEF,
): Band[] {
  const random = seededRandom(seed);
  const harmonics = profile.harmonics.map((frequency) => ({
    frequency,
    amplitude: profile.amplitude * (0.42 + random() * 0.58),
    phase: random() * Math.PI * 2,
  }));
  const peakAngle = random() * Math.PI * 2;
  const peakShift = radius * (0.08 + random() * 0.1);
  const { points } = profile;

  return profile.scales.slice(0, levels).map((scale, level) => {
    const bandRandom = seededRandom(seed * 31 + level * 7);
    const jitter = Array.from({ length: points }, () => (bandRandom() - 0.5) * profile.jitter);
    const shift = peakShift * (1 - scale);
    const cx = center.x + Math.cos(peakAngle) * shift;
    const cz = center.z + Math.sin(peakAngle) * shift;

    const outline: Point[] = jitter.map((j, i) => {
      const angle = (i / points) * Math.PI * 2 + level * profile.twist;
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
  return islandBands(
    island.position,
    island.radius,
    islandSeed(island.id),
    BAND_SCALES.length,
    reliefOf(island.id),
  );
}

/** Altura de la superficie de una terraza de la isla. */
export function terraceTop(island: Island, level: number): number {
  return (level + 1) * reliefOf(island.id).height;
}

/** Altura de la cumbre de la isla: dónde se ancla su rótulo. */
export function islandSummit(island: Island): number {
  return BAND_SCALES.length * reliefOf(island.id).height;
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

export interface PlateBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Caja que dibuja la plancha SVG: toda la carta, o un encuadre alrededor de un punto. */
export function plateBounds(
  islands: Island[],
  focus?: { x: number; z: number; span: number },
): PlateBounds {
  if (!focus) return archipelagoBounds(islands, 9);
  return {
    minX: focus.x - focus.span / 2,
    maxX: focus.x + focus.span / 2,
    minZ: focus.z - focus.span / 2,
    maxZ: focus.z + focus.span / 2,
  };
}

/** Posición en píxeles de un punto del mundo dentro de una plancha dibujada con `contain`. */
export function projectToPlate(
  point: { x: number; z: number },
  bounds: PlateBounds,
  width: number,
  height: number,
): { left: number; top: number } {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxZ - bounds.minZ;
  const scale = Math.min(width / w, height / h);
  return {
    left: (width - w * scale) / 2 + (point.x - bounds.minX) * scale,
    top: (height - h * scale) / 2 + (point.z - bounds.minZ) * scale,
  };
}
