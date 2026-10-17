import { world } from '@/data';
import { summitHeight } from '@/world/geography';
import type { LabelAnchor } from '@/world/scene/LabelProjector';

/** Dónde se ancla el rótulo de cada isla y del faro: sobre su cumbre. */
export const ISLAND_ANCHORS: LabelAnchor[] = [
  ...world.islands.map((i) => ({
    id: i.id,
    position: [i.position.x, summitHeight() + 0.4, i.position.z] as const,
  })),
  { id: 'faro', position: [0, summitHeight(3) + 2.6, 0] as const },
];

/** Nombres de agua de la carta (hidronimia del mundo, en itálica). */
export const WATER_NAMES = [
  { id: 'agua-mareas', name: 'Mar de las Mareas', position: [-6.5, 0, 15.5] as const },
  { id: 'agua-canal', name: 'Canal del Faro', position: [6.6, 0, 0.6] as const },
];

export const MAP_ANCHORS: LabelAnchor[] = [
  ...ISLAND_ANCHORS,
  ...WATER_NAMES.map(({ id, position }) => ({
    id,
    position,
    align: 'center' as const,
    yields: true,
  })),
];
