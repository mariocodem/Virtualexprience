import { stationsOf } from '@/data';
import type { Island, IslandId } from '@/types/domain';
import {
  BAND_SCALES,
  bandsForIsland,
  islandSeed,
  reliefOf,
  seededRandom,
  terraceTop,
  type Band,
  type Point,
} from './geography';
import { stationLayout, type StationSpot } from './layout';

/**
 * Construcciones de cada isla, según el lugar que representa (CLAUDE.md §2):
 * el puerto con imprenta y radio, el observatorio, la plaza del cabildo, el
 * astillero, el taller maker y el bosque con su huerta. Este módulo solo decide
 * qué va dónde, de forma determinista y lejos de las paradas del sendero; el
 * relieve 3D y la carta 2D dibujan lo mismo.
 */

export type LandmarkKind =
  | 'casa'
  | 'imprenta'
  | 'radio'
  | 'muelle'
  | 'observatorio'
  | 'puente'
  | 'solido'
  | 'plaza'
  | 'cabildo'
  | 'campanario'
  | 'casona'
  | 'astillero'
  | 'grua'
  | 'bodega'
  | 'puesto'
  | 'cajas'
  | 'taller'
  | 'aerogenerador'
  | 'domo'
  | 'panel'
  | 'bombilla'
  | 'arbol'
  | 'ceiba'
  | 'huerta'
  | 'maloca';

/** Radio de suelo que ocupa cada construcción, en unidades del mundo. */
export const FOOTPRINT: Record<LandmarkKind, number> = {
  casa: 0.17,
  imprenta: 0.34,
  radio: 0.2,
  muelle: 0.22,
  observatorio: 0.3,
  puente: 0.22,
  solido: 0.14,
  plaza: 0,
  cabildo: 0.42,
  campanario: 0.16,
  casona: 0.2,
  astillero: 0.3,
  grua: 0.2,
  bodega: 0.26,
  puesto: 0.17,
  cajas: 0.12,
  taller: 0.36,
  aerogenerador: 0.16,
  domo: 0.26,
  panel: 0.16,
  bombilla: 0.15,
  arbol: 0.12,
  ceiba: 0.4,
  huerta: 0.22,
  maloca: 0.28,
};

/** Se asoman al mar desde la costa: su base queda en el borde de la llanura. */
export const SEAWARD: ReadonlySet<LandmarkKind> = new Set(['muelle', 'puente', 'astillero']);

/** Cubren el suelo sin levantar volumen: no estorban a las paradas ni a otras construcciones. */
const GROUND: ReadonlySet<LandmarkKind> = new Set(['plaza']);

/** Distancia libre alrededor de cada parada, además de lo que ocupa la construcción. */
export const STOP_CLEARANCE = 0.42;

export interface Landmark {
  kind: LandmarkKind;
  /** Posición en el mundo: `y` es la superficie de la terraza. */
  position: readonly [x: number, y: number, z: number];
  /** Giro en Y: el frente local (+Z) mira hacia fuera de la isla. */
  rotation: number;
  scale: number;
  level: number;
  /** Variante (color, forma) para que las repetidas no sean idénticas. */
  variant: number;
}

type Range = number | readonly [min: number, max: number];

/**
 * Lote: dónde va una construcción o una fila de ellas. El ángulo es relativo
 * al frente de la isla (0 = de cara al mar abierto, donde empieza el sendero);
 * `t` va del borde de la terraza (0) al pie de la siguiente (1), o al centro de
 * la cumbre en la terraza más alta.
 */
interface Lot {
  kind: LandmarkKind;
  level: number;
  angle: Range;
  count?: number;
  t?: Range;
  scale?: Range;
}

const TOP = BAND_SCALES.length - 1;

/** Escala del kit frente a las paradas del sendero. */
const KIT_SCALE = 1.4;

/** La construcción que corona cada isla va detrás del desafío, en la cumbre. */
const CROWN = { level: TOP, angle: Math.PI, t: 0.55 } as const;

export const LOTS: Record<IslandId, readonly Lot[]> = {
  // Ciudad-puerto: la radio corona la isla; la imprenta y el pueblo, junto al muelle.
  comunicarte: [
    { kind: 'radio', ...CROWN },
    { kind: 'imprenta', level: 0, angle: -1.0 },
    { kind: 'muelle', level: 0, angle: -0.45, t: 0.04 },
    { kind: 'casa', level: 0, angle: [-2.7, -1.75], count: 5, t: [0.3, 0.7], scale: [0.85, 1.1] },
    { kind: 'casa', level: 0, angle: [0.5, 1.6], count: 4, t: [0.3, 0.7], scale: [0.85, 1.1] },
    { kind: 'casa', level: 1, angle: [-1.7, -0.3], count: 4, t: 0.5, scale: [0.85, 1] },
    { kind: 'arbol', level: 2, angle: [-1.6, 0.6], count: 3, t: 0.5, scale: [0.8, 1] },
  ],
  // Observatorio en la cumbre, puente geométrico hacia un islote y sólidos platónicos.
  neuromath: [
    { kind: 'observatorio', ...CROWN, t: 0.48, scale: 0.9 },
    { kind: 'puente', level: 0, angle: -0.6, t: 0.04 },
    { kind: 'solido', level: 0, angle: [-2.7, -1.7], count: 2, t: 0.5 },
    { kind: 'solido', level: 2, angle: [-1.3, 0.3], count: 2, t: 0.5 },
    { kind: 'solido', level: 1, angle: [2.0, 3.0], count: 2, t: 0.5 },
    { kind: 'arbol', level: 0, angle: [0.6, 1.6], count: 3, t: [0.3, 0.7], scale: [0.8, 1] },
  ],
  // Plaza del cabildo en la meseta, campanario, casonas coloniales en las laderas.
  voxcivitas: [
    { kind: 'plaza', level: TOP, angle: 0, t: 1 },
    { kind: 'cabildo', level: TOP, angle: Math.PI, t: 0.18 },
    { kind: 'campanario', level: TOP, angle: Math.PI - 1.05, t: 0.22 },
    { kind: 'casona', level: 0, angle: [-2.5, -0.6], count: 6, t: [0.35, 0.65], scale: [0.85, 1] },
    { kind: 'casona', level: 1, angle: [1.7, 3.4], count: 4, t: 0.5, scale: [0.85, 1] },
    { kind: 'arbol', level: 2, angle: [-2.2, 0.6], count: 5, t: [0.35, 0.65], scale: [0.8, 1] },
  ],
  // Astillero con grúa en la costa, bodegas y el mercado en la terraza de arriba.
  gerencia: [
    { kind: 'astillero', level: 0, angle: -0.6, t: 0.04 },
    { kind: 'grua', level: 0, angle: -1.45, t: 0.4 },
    { kind: 'bodega', level: 0, angle: [0.6, 1.7], count: 2, t: 0.5 },
    { kind: 'bodega', level: 0, angle: [-2.9, -2.4], count: 1, t: 0.5 },
    { kind: 'cajas', level: 0, angle: [2.1, 3.1], count: 3, t: [0.3, 0.7] },
    { kind: 'puesto', level: 1, angle: [-2.2, -0.2], count: 5, t: 0.5, scale: [0.9, 1] },
    { kind: 'cajas', level: TOP, angle: Math.PI, t: 0.5 },
    { kind: 'arbol', level: 2, angle: [-1.8, 0.4], count: 3, t: 0.5, scale: [0.8, 1] },
  ],
  // El aerogenerador corona el taller maker; domo geodésico, paneles y la bombilla de la idea.
  activatuidea: [
    { kind: 'aerogenerador', ...CROWN },
    { kind: 'taller', level: 0, angle: -0.9, scale: 0.9 },
    { kind: 'domo', level: 0, angle: -2.3, scale: 0.9 },
    { kind: 'bombilla', level: 1, angle: -0.7 },
    { kind: 'panel', level: 0, angle: [0.55, 1.7], count: 3, t: 0.5 },
    { kind: 'panel', level: 2, angle: [-1.6, -0.4], count: 2, t: 0.5, scale: 0.85 },
    { kind: 'arbol', level: 1, angle: [-2.8, -1.8], count: 2, t: 0.5, scale: [0.8, 1] },
  ],
  // Bosque comunitario coronado por la ceiba del encuentro, con su maloca y su huerta.
  latidosocial: [
    { kind: 'ceiba', level: TOP, angle: Math.PI, t: 0.5 },
    { kind: 'maloca', level: 0, angle: -0.85 },
    { kind: 'huerta', level: 1, angle: [-1.7, -0.4], count: 3, t: 0.5 },
    { kind: 'huerta', level: 0, angle: [-2.4, -1.9], count: 1, t: 0.5 },
    { kind: 'arbol', level: 0, angle: [0.6, 3.8], count: 12, t: [0.2, 0.8], scale: [0.8, 1.15] },
    { kind: 'arbol', level: 1, angle: [1.7, 4.3], count: 8, t: [0.25, 0.75], scale: [0.8, 1.1] },
    { kind: 'arbol', level: 2, angle: [-2.0, 1.3], count: 6, t: [0.3, 0.7], scale: [0.8, 1.05] },
    { kind: 'arbol', level: 3, angle: [-2.6, 1.1], count: 5, t: [0.3, 0.7], scale: [0.75, 1] },
  ],
};

const TAU = Math.PI * 2;

/** Punto del contorno en la dirección dada, interpolando entre sus vértices. */
function pointOn(band: Band, angle: number, twist: number): Point {
  const n = band.outline.length;
  const at = (((((angle - band.level * twist) / TAU) * n) % n) + n) % n;
  const i = Math.floor(at);
  const a = band.outline[i % n] ?? [0, 0];
  const b = band.outline[(i + 1) % n] ?? a;
  const f = at - i;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

function centroid(band: Band): Point {
  const n = Math.max(1, band.outline.length);
  const [x, z] = band.outline.reduce<[number, number]>(
    (s, [px, pz]) => [s[0] + px, s[1] + pz],
    [0, 0],
  );
  return [x / n, z / n];
}

const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

const pick = (range: Range, random: () => number) =>
  typeof range === 'number' ? range : range[0] + (range[1] - range[0]) * random();

/** Construcciones de una isla, colocadas sobre sus terrazas sin pisar el sendero. */
export function landmarksFor(island: Island, spots: readonly StationSpot[]): Landmark[] {
  const bands = bandsForIsland(island);
  const { twist } = reliefOf(island.id);
  const front = Math.atan2(island.position.z, island.position.x);
  const placed: Landmark[] = [];

  const ground = (level: number, angle: number, t: number): Point => {
    const band = bands[level];
    if (!band) return [island.position.x, island.position.z];
    const edge = pointOn(band, angle, twist);
    const above = bands[level + 1];
    return lerp(edge, level >= TOP || !above ? centroid(band) : pointOn(above, angle, twist), t);
  };

  const fits = (kind: LandmarkKind, p: Point, scale: number) => {
    if (GROUND.has(kind)) return true;
    const r = FOOTPRINT[kind] * scale;
    const far = (q: readonly [number, number, number], need: number) =>
      Math.hypot(q[0] - p[0], q[2] - p[1]) >= need;
    return (
      spots.every((s) => far(s.position, STOP_CLEARANCE + r)) &&
      placed.every(
        (l) => GROUND.has(l.kind) || far(l.position, (FOOTPRINT[l.kind] * l.scale + r) * 0.92),
      )
    );
  };

  LOTS[island.id].forEach((lot, lotIndex) => {
    const random = seededRandom(islandSeed(island.id) * 131 + lotIndex * 17);
    const count = lot.count ?? 1;
    for (let k = 0; k < count; k++) {
      const base =
        typeof lot.angle === 'number'
          ? lot.angle
          : lot.angle[0] + ((k + 0.5) / count) * (lot.angle[1] - lot.angle[0]);
      const t = pick(lot.t ?? 0.5, random);
      const scale = pick(lot.scale ?? 1, random) * KIT_SCALE;
      const variant = Math.floor(random() * 4);
      // Si choca, se corre por la terraza en pasos crecientes a uno y otro lado.
      for (let step = 0; step <= 12; step++) {
        const offset = step === 0 ? 0 : Math.ceil(step / 2) * 0.12 * (step % 2 ? 1 : -1);
        const angle = front + base + offset;
        const p = ground(lot.level, angle, t);
        if (!fits(lot.kind, p, scale)) continue;
        placed.push({
          kind: lot.kind,
          position: [p[0], terraceTop(island, lot.level), p[1]],
          rotation: Math.PI / 2 - angle,
          scale,
          level: lot.level,
          variant,
        });
        break;
      }
    }
  });
  return placed;
}

const cache = new Map<IslandId, Landmark[]>();

/** Construcciones de la isla con su sendero real, calculadas una vez para el 3D y el 2D. */
export function islandLandmarks(island: Island): Landmark[] {
  let landmarks = cache.get(island.id);
  if (!landmarks) {
    landmarks = landmarksFor(island, stationLayout(island, stationsOf(island.id)));
    cache.set(island.id, landmarks);
  }
  return landmarks;
}
