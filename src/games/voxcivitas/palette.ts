import { ATLAS } from '@/world/palette';

/**
 * Colores de la plaza de Voxcivitas. Cada grupo del cabildo lleva la tinta que
 * tiene en la versión accesible (pescadores, jóvenes, comercio, mayores).
 */
export const GROUP_INK = [ATLAS.sea[2], ATLAS.land[0], ATLAS.land[3], ATLAS.land[1]] as const;

export function groupInk(index: number): string {
  return GROUP_INK[((index % GROUP_INK.length) + GROUP_INK.length) % GROUP_INK.length] ?? ATLAS.ink;
}

/** Gris de quien la indiferencia apagó. */
export const ASHEN = '#8b939b';

/** Tonos de piel de la multitud. */
export const SKINS = ['#d9a77c', '#b9825a', '#8d5a3b', '#e8c09a'] as const;

/** Pergamino del acta. */
export const PARCHMENT = '#f1e2bd';

/** Aura fría (confianza bajo el umbral) y cálida (respalda). */
export const AURA_COLD = ATLAS.sea[1];
export const AURA_WARM = ATLAS.sun;
