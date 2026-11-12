import { world } from '@/data';
import { summitHeight, terraceTop } from '@/world/geography';
import { islandCrest } from '@/world/landmarks';
import type { LabelAnchor } from '@/world/scene/LabelProjector';

const FARO_ANCHOR: LabelAnchor = { id: 'faro', position: [0, summitHeight(3) + 2.6, 0] };

/**
 * Rótulos de las islas a una altura dada: `lift` es lo más que el rótulo se
 * despega de la cumbre (sin pasar de la cima del monumento).
 */
const islandAnchors = (lift = Infinity): LabelAnchor[] => [
  ...world.islands.map((i) => ({
    id: i.id,
    position: [
      i.position.x,
      Math.min(islandCrest(i), terraceTop(i, 4) + lift) + 0.35,
      i.position.z,
    ] as const,
  })),
  FARO_ANCHOR,
];

/**
 * En la plancha del hero las islas se ven lejos y los recuadros ocupan las
 * esquinas: el rótulo se ancla a media altura del monumento (su línea guía lo
 * cruza y el nombre queda a la altura de su cima) para no caer bajo un recuadro.
 */
export const ISLAND_ANCHORS: LabelAnchor[] = islandAnchors(2.2);

/** Nombres de agua de la carta (hidronimia del mundo, en itálica). */
export const WATER_NAMES = [
  { id: 'agua-mareas', name: 'Mar de las Mareas', position: [-6.5, 0, 15.5] as const },
  { id: 'agua-canal', name: 'Canal del Faro', position: [6.6, 0, 0.6] as const },
];

const WATER_ANCHORS: LabelAnchor[] = WATER_NAMES.map(({ id, position }) => ({
  id,
  position,
  align: 'center' as const,
  yields: true,
}));

/** La plancha del hero: islas, faro y aguas. */
export const MAP_ANCHORS: LabelAnchor[] = [...ISLAND_ANCHORS, ...WATER_ANCHORS];

/**
 * El recorrido isla por isla: la cámara llega cerca, así que el rótulo va sobre
 * la cima del monumento y no lo tapa.
 */
export const TOUR_ANCHORS: LabelAnchor[] = [...islandAnchors(), ...WATER_ANCHORS];
