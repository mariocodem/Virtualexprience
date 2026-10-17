import { world } from '@/data';
import * as t from '@/progress/transitions';
import { initialProgress, type Progress } from '@/progress/types';

export const DAY_1 = new Date(2026, 9, 17, 10, 0, 0);
export const DAY_2 = new Date(2026, 9, 18, 10, 0, 0);
export const DAY_3 = new Date(2026, 9, 20, 10, 0, 0);

/** Completa estaciones en orden, como lo haría un estudiante. */
export function completeAll(
  ids: string[],
  from: Progress = initialProgress(),
  now = DAY_1,
): Progress {
  return ids.reduce((p, id) => t.completeStation(p, world, id, 1, now).progress, from);
}

export const ECOS_PATH = [
  'ecos-imprenta',
  'ecos-titulares',
  'ecos-radio',
  'ecos-sala-redaccion',
  'ecos-bitacora-editor',
  'ecos-cierre',
];
