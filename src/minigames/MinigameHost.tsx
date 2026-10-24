import { lazy } from 'react';
import type { RetoContent } from '@/data/contentSchemas';
import type { MinigameProps } from './shared/types';

// Cada minijuego es su propio fragmento: solo se descarga el de la estación abierta.
const SalaDeRedaccion = lazy(async () => ({
  default: (await import('./sala-de-redaccion/SalaDeRedaccion')).SalaDeRedaccion,
}));

const PuentesDeFractal = lazy(async () => ({
  default: (await import('./puentes-de-fractal/PuentesDeFractal')).PuentesDeFractal,
}));

const SesionDeCabildo = lazy(async () => ({
  default: (await import('./sesion-de-cabildo/SesionDeCabildo')).SesionDeCabildo,
}));

/** Elige el minijuego de la estación según su contenido. */
export function MinigameHost({ content, ...props }: MinigameProps<RetoContent>) {
  switch (content.minigame) {
    case 'sala-de-redaccion':
      return <SalaDeRedaccion content={content} {...props} />;
    case 'puentes-de-fractal':
      return <PuentesDeFractal content={content} {...props} />;
    case 'sesion-de-cabildo':
      return <SesionDeCabildo content={content} {...props} />;
    default:
      return null;
  }
}
