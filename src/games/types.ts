import type { ComponentType, LazyExoticComponent } from 'react';
import type {
  BancoContent,
  BossContent,
  CabildoContent,
  HuertaContent,
  MercadoContent,
  PuentesContent,
  SalaContent,
} from '@/data/contentSchemas';
import type { MinigameProps } from '@/minigames/shared/types';
import type { BrujulaMessage } from '@/stations/BrujulaBubble';
import type { Island, IslandId } from '@/types/domain';

/**
 * Contratos de los juegos 3D (docs/juegos-3d.md). Cada isla aporta, en
 * src/games/<isla>/, su reto en 3D y su arena contra la Bruma. La versión
 * accesible de siempre sigue disponible: los juegos 3D la complementan.
 */

/** Una decisión de conocimiento tomada dentro de un juego 3D (alimenta el dominio y el resultado). */
export interface Decision {
  correct: boolean;
  tier: 1 | 2 | 3;
  /** Ítem del contenido al que corresponde, si lo hay. */
  itemId?: string;
}

export interface ArenaResult {
  outcome: 'victoria' | 'retirada';
  /** Proporción de decisiones correctas (0–1): es el resultado de la estación. */
  accuracy: number;
  decisions: number;
}

/** Lo que recibe la arena de una isla: el combate 3D contra su Bruma. */
export interface ArenaProps {
  island: Island;
  /** La Bruma de la isla (nombre, carácter, frases) y sus embates de conocimiento. */
  content: BossContent;
  /** Nivel 1–5 del motor adaptativo. */
  level: number;
  /** Golpes de luz necesarios para disipar a la Bruma. */
  goal: number;
  /** Luces del explorador: impactos que aguanta antes de retirarse. */
  lights: number;
  /** Sutileza de los embates en cada fase (1 = señales evidentes, 3 = sutiles). */
  tiers: readonly [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3];
  /** Ritmo tranquilo: ataques más lentos y espaciados, puntería asistida. */
  calm: boolean;
  /** Movimiento reducido: sin sacudidas, partículas ni cámara que sigue. */
  still: boolean;
  onBrujula: (message: BrujulaMessage | null) => void;
  /** Cada decisión de conocimiento, en el momento en que se toma. */
  onDecision: (decision: Decision) => void;
  /** Fin del combate: la anfitriona registra el resultado y muestra el cierre. */
  onEnd: (result: ArenaResult) => void;
  /** Salir a la versión accesible desde el menú de pausa. */
  onAccessible: () => void;
}

/** Qué aporta una isla a los juegos 3D. `null` = aún sin versión 3D (se juega la accesible). */
export interface IslandGames<C> {
  /** El reto de la isla en 3D: mismas props y mismo motor que su versión accesible. */
  Minigame: LazyExoticComponent<ComponentType<MinigameProps<C>>> | null;
  arena: {
    Component: LazyExoticComponent<ComponentType<ArenaProps>>;
    /** Nombre de la mecánica, en verbo: «Verificar los rumores». */
    verb: string;
    /** Cómo se juega, en frases breves para la cartela previa. */
    howTo: string[];
  } | null;
}

export interface GamesByIsland {
  comunicarte: IslandGames<SalaContent>;
  neuromath: IslandGames<PuentesContent>;
  voxcivitas: IslandGames<CabildoContent>;
  gerencia: IslandGames<MercadoContent>;
  activatuidea: IslandGames<BancoContent>;
  latidosocial: IslandGames<HuertaContent>;
}

export type ArenaEntry = NonNullable<GamesByIsland[IslandId]['arena']>;
