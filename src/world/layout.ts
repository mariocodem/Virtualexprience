import type { Island, Station } from '@/types/domain';
import { BAND_SCALES, bandsForIsland, terraceTop, type Point } from './geography';

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

/** En la cumbre, el desafío se adelanta hacia el mar: detrás queda la construcción que corona la isla. */
const SUMMIT_LEAD = 0.45;

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
    const y = terraceTop(island, level);
    const band = bands[level]?.outline ?? [];

    if (band.length === 0) {
      return {
        stationId: station.id,
        position: [island.position.x, y, island.position.z] as const,
        level,
      };
    }

    const nearest = (angle: number) =>
      ((Math.round((angle / (Math.PI * 2)) * band.length) % band.length) + band.length) %
      band.length;

    if (level === TOP_LEVEL) {
      const [cx, cz] = centroid(band);
      const [fx, fz] = band[nearest(toSea)] ?? [cx, cz];
      const x = cx + (fx - cx) * SUMMIT_LEAD;
      const z = cz + (fz - cz) * SUMMIT_LEAD;
      return { stationId: station.id, position: [x, y, z] as const, level };
    }

    // Punto del contorno más cercano al ángulo de la parada, en esta terraza y en la de arriba.
    const index = nearest(toSea + i * STEP);
    const outer = band[index] ?? [island.position.x, island.position.z];
    const inner = bands[level + 1]?.outline[index] ?? outer;
    const x = (outer[0] + inner[0]) / 2;
    const z = (outer[1] + inner[1]) / 2;
    return { stationId: station.id, position: [x, y, z] as const, level };
  });
}
