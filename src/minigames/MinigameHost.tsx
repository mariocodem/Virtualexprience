import { lazy } from 'react';
import type { RetoContent } from '@/data/contentSchemas';
import { GameHost } from '@/games/GameHost';
import { GAMES } from '@/games/registry';
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

/** Elige el minijuego de la estación según su contenido: en 3D o en su versión accesible. */
export function MinigameHost({ content, ...props }: MinigameProps<RetoContent>) {
  switch (content.minigame) {
    case 'sala-de-redaccion': {
      const Game3D = GAMES.comunicarte.Minigame;
      return (
        <GameHost
          accessible={<SalaDeRedaccion content={content} {...props} />}
          immersive={Game3D && <Game3D content={content} {...props} />}
        />
      );
    }
    case 'puentes-de-fractal': {
      const Game3D = GAMES.neuromath.Minigame;
      return (
        <GameHost
          accessible={<PuentesDeFractal content={content} {...props} />}
          immersive={Game3D && <Game3D content={content} {...props} />}
        />
      );
    }
    case 'sesion-de-cabildo': {
      const Game3D = GAMES.voxcivitas.Minigame;
      return (
        <GameHost
          accessible={<SesionDeCabildo content={content} {...props} />}
          immersive={Game3D && <Game3D content={content} {...props} />}
        />
      );
    }
    case 'dia-de-mercado': {
      const Game3D = GAMES.gerencia.Minigame;
      return (
        <GameHost
          accessible={<DiaDeMercado content={content} {...props} />}
          immersive={Game3D && <Game3D content={content} {...props} />}
        />
      );
    }
    case 'banco-de-pruebas': {
      const Game3D = GAMES.activatuidea.Minigame;
      return (
        <GameHost
          accessible={<BancoDePruebas content={content} {...props} />}
          immersive={Game3D && <Game3D content={content} {...props} />}
        />
      );
    }
    case 'huerta-comunitaria': {
      const Game3D = GAMES.latidosocial.Minigame;
      return (
        <GameHost
          accessible={<HuertaComunitaria content={content} {...props} />}
          immersive={Game3D && <Game3D content={content} {...props} />}
        />
      );
    }
    default:
      return null;
  }
}
