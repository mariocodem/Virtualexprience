import type { StationStatus } from './types';

export const STATUS_LABEL: Record<StationStatus, string> = {
  bloqueada: 'Bloqueada',
  disponible: 'Disponible',
  'en-curso': 'En curso',
  completada: 'Completada',
  'en-preparacion': 'En preparación',
};
