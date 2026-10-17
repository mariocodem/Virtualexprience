import type { FormatKind, StationType } from '@/types/domain';

export const STATION_TYPE_LABEL: Record<StationType, string> = {
  explorar: 'Explorar',
  practicar: 'Practicar',
  reto: 'Reto',
  reflexionar: 'Reflexionar',
  desafio: 'Desafío de isla',
};

export const FORMAT_LABEL: Record<FormatKind, string> = {
  texto: 'Texto',
  audio: 'Audio',
  video: 'Video',
  infografia: 'Infografía',
  interactivo: 'Interactivo',
};
