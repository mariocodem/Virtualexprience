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

const DiaDeMercado = lazy(async () => ({
  default: (await import('./dia-de-mercado/DiaDeMercado')).DiaDeMercado,
}));

const BancoDePruebas = lazy(async () => ({
  default: (await import('./banco-de-pruebas/BancoDePruebas')).BancoDePruebas,
}));

const HuertaComunitaria = lazy(async () => ({
  default: (await import('./huerta-comunitaria/HuertaComunitaria')).HuertaComunitaria,
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
    case 'dia-de-mercado':
      return <DiaDeMercado content={content} {...props} />;
    case 'banco-de-pruebas':
      return <BancoDePruebas content={content} {...props} />;
    case 'huerta-comunitaria':
      return <HuertaComunitaria content={content} {...props} />;
    default:
      return null;
  }
}
