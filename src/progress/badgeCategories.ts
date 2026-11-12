import type { Badge } from '@/types/domain';

/** Las cuatro familias de insignias: su nombre en el sello y qué premia cada una. */
export const BADGE_CATEGORIES: Record<Badge['category'], { label: string; blurb: string }> = {
  competencia: {
    label: 'Competencia',
    blurb: 'Reconoce una competencia que demostraste en las islas.',
  },
  exploracion: {
    label: 'Exploración',
    blurb: 'Premia recorrer el archipiélago y sus estaciones.',
  },
  accesibilidad: {
    label: 'Accesibilidad',
    blurb: 'Premia aprender en distintos formatos, como propone el DUA.',
  },
  constancia: {
    label: 'Constancia',
    blurb: 'Premia volver, reflexionar y sostener el ritmo.',
  },
};
