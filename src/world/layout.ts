import type { Island, Station } from '@/types/domain';
import { BAND_SCALES, bandsForIsland, TERRACE_HEIGHT, type Point } from './geography';

/** Una parada colocada sobre el relieve de su isla. */
export interface StationSpot {
  stationId: string;
  /** Posición en el mundo: `y` es la superficie de la terraza. */
  position: readonly [x: number, y: number, z: number];
  /** Terraza sobre la que está (0 = costa). */
  level: number;
}

const TOP_LEVEL = BAND_SCALES.length - 1;
/** Ángulo entre paradas consecutivas: el sendero rodea la isla mientras sube. */
const STEP = 0.95;

function centroid(points: readonly Point[]): Point {
  const sum = points.reduce<[number, number]>((acc, [x, z]) => [acc[0] + x, acc[1] + z], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/**
 * Coloca las estaciones de una isla en su sendero: la primera en el puerto que
 * da a mar abierto (de frente a quien llega), y cada una más arriba hasta la cumbre, donde queda el
 * desafío. Cada parada se sitúa a mitad del anillo de su terraza, así nunca
 * cae al borde de un escalón. Determinista: el 3D y el mapa 2D coinciden.
 */
export function stationLayout(island: Island, stations: Station[]): StationSpot[] {
  const bands = bandsForIsland(island);
  const count = stations.length;
  const toSea = Math.atan2(island.position.z, island.position.x);

  return stations.map((station, i) => {
    const level = count === 1 ? TOP_LEVEL : Math.round((i * TOP_LEVEL) / (count - 1));
    const y = (level + 1) * TERRACE_HEIGHT;
    const band = bands[level]?.outline ?? [];

    if (level === TOP_LEVEL || band.length === 0) {
      const [x, z] = centroid(band.length > 0 ? band : [[island.position.x, island.position.z]]);
      return { stationId: station.id, position: [x, y, z] as const, level };
    }

    // Punto del contorno más cercano al ángulo de la parada, en esta terraza y en la de arriba.
    const angle = toSea + i * STEP;
    const index =
      ((Math.round((angle / (Math.PI * 2)) * band.length) % band.length) + band.length) %
      band.length;
    const outer = band[index] ?? [island.position.x, island.position.z];
    const inner = bands[level + 1]?.outline[index] ?? outer;
    const x = (outer[0] + inner[0]) / 2;
    const z = (outer[1] + inner[1]) / 2;
    return { stationId: station.id, position: [x, y, z] as const, level };
  });
}
