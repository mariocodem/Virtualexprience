import type { Bridge } from '@/data/contentSchemas';
import { outcomeOf, span, type TestOutcome } from '@/minigames/puentes-de-fractal/engine';
import { gapExpression, type GapExpression, type Random } from './gapExpr';

/**
 * Flujo de construcción de la arena «Reconstruir el puente de luz»: la Bruma
 * proyecta un hueco, se recogen losetas, se colocan en el puente y se prueba.
 * Usa el mismo motor de Puentes de Fractal para sumar y juzgar. Puro: la
 * escena solo lo dibuja y le pasa el tiempo.
 */

export interface Challenge {
  bridge: Bridge;
  tier: 1 | 2 | 3;
  gap: GapExpression;
}

export type BuildPhase = 'waiting' | 'building' | 'testing' | 'lit' | 'fallen' | 'dissolving';

export const TIMES = {
  /** Espera antes del primer hueco y entre un puente y el siguiente. */
  first: 1.4,
  between: 1.6,
  test: 1.7,
  fallen: 2.2,
  dissolve: 1.1,
  /** Cuánto dura iluminado el puente si no se dispara. */
  lit: 24,
  litCalm: 40,
} as const;

export interface Build {
  phase: BuildPhase;
  /** Segundos que faltan para el siguiente cambio de fase. */
  timer: number;
  challenge: Challenge | null;
  /** Losetas puestas en el puente, de la orilla hacia el centro. */
  placed: string[];
  /** Loseta que se lleva en las manos. */
  carried: string | null;
  /** Pruebas fallidas que se perdonan (ritmo tranquilo). */
  retries: number;
  outcome: TestOutcome | null;
  /** Medida del puente probado, para decir cuánto sobró o faltó. */
  total: number;
  /** Puentes usados, para no repetir mientras queden. */
  used: string[];
}

export function newBuild(): Build {
  return {
    phase: 'waiting',
    timer: TIMES.first,
    challenge: null,
    placed: [],
    carried: null,
    retries: 0,
    outcome: null,
    total: 0,
    used: [],
  };
}

/** Elige el siguiente puente de la sutileza pedida, sin repetir mientras queden. */
export function pickBridge(
  bridges: readonly Bridge[],
  tier: 1 | 2 | 3,
  used: readonly string[],
  random: Random,
): Bridge {
  const fresh = bridges.filter((b) => !used.includes(b.id));
  const exact = fresh.filter((b) => b.tier === tier);
  const near = fresh.filter((b) => Math.abs(b.tier - tier) === 1);
  const pool =
    exact.length > 0 ? exact : near.length > 0 ? near : fresh.length > 0 ? fresh : [...bridges];
  const choice = pool[Math.floor(random() * pool.length)] ?? pool[0];
  if (!choice) throw new Error('No hay puentes para construir.');
  return choice;
}

export function makeChallenge(
  bridges: readonly Bridge[],
  tier: 1 | 2 | 3,
  used: readonly string[],
  random: Random,
): Challenge {
  const bridge = pickBridge(bridges, tier, used, random);
  return { bridge, tier, gap: gapExpression(bridge.gap, tier, random) };
}

/** Empieza un hueco nuevo: las losetas vuelven al anillo. */
export function startChallenge(build: Build, challenge: Challenge, calm: boolean): Build {
  const used = [...build.used, challenge.bridge.id];
  return {
    ...build,
    phase: 'building',
    timer: 0,
    challenge,
    placed: [],
    carried: null,
    retries: calm ? 1 : 0,
    outcome: null,
    total: 0,
    used,
  };
}

/** Recoge una loseta (si ya llevas una, la suelta de vuelta al anillo). */
export function takeTile(build: Build, pieceId: string): Build {
  if (build.phase !== 'building' || !build.challenge) return build;
  if (!build.challenge.bridge.pieces.some((p) => p.id === pieceId)) return build;
  if (build.placed.includes(pieceId) || build.carried === pieceId) return build;
  return { ...build, carried: pieceId };
}

/** Pone la loseta que llevas en el siguiente apoyo libre del puente. */
export function placeCarried(build: Build): Build {
  if (build.phase !== 'building' || !build.challenge || build.carried === null) return build;
  if (build.placed.length >= build.challenge.bridge.slots) return build;
  return { ...build, placed: [...build.placed, build.carried], carried: null };
}

/** Quita la última loseta del puente y la lleva en las manos. */
export function takeBack(build: Build): Build {
  if (build.phase !== 'building' || build.carried !== null) return build;
  const last = build.placed.at(-1);
  if (last === undefined) return build;
  return { ...build, placed: build.placed.slice(0, -1), carried: last };
}

/** Lo que mide el puente que hay puesto, con el mismo motor que el reto. */
export function builtSpan(build: Build): number {
  return build.challenge ? span(build.challenge.bridge, build.placed) : 0;
}

/** Prueba el puente: la luz recorre el tendido y se sabe si mide justo. */
export function startTest(build: Build, still: boolean): Build {
  if (build.phase !== 'building' || !build.challenge || build.placed.length === 0) return build;
  const total = builtSpan(build);
  return {
    ...build,
    phase: 'testing',
    timer: still ? 0.05 : TIMES.test,
    total,
    outcome: outcomeOf(build.challenge.bridge.gap, total),
  };
}

export type Verdict =
  | { kind: 'success' }
  | { kind: 'retry'; outcome: TestOutcome }
  | { kind: 'fail'; outcome: TestOutcome };

/** Cierra la prueba: ilumina el puente, o lo derrumba (con una segunda oportunidad si se perdona). */
export function resolveTest(
  build: Build,
  calm: boolean,
  still: boolean,
): { build: Build; verdict: Verdict } | null {
  if (build.phase !== 'testing' || build.outcome === null) return null;
  if (build.outcome === 'resiste') {
    return {
      build: { ...build, phase: 'lit', timer: calm ? TIMES.litCalm : TIMES.lit },
      verdict: { kind: 'success' },
    };
  }
  if (build.retries > 0) {
    return {
      build: {
        ...build,
        phase: 'building',
        timer: 0,
        placed: [],
        carried: null,
        retries: build.retries - 1,
      },
      verdict: { kind: 'retry', outcome: build.outcome },
    };
  }
  return {
    build: { ...build, phase: 'fallen', timer: still ? 0.6 : TIMES.fallen },
    verdict: { kind: 'fail', outcome: build.outcome },
  };
}

export type TickEvent = 'test-done' | 'next-due' | 'dissolved' | null;

/**
 * Avanza los temporizadores. `charge` son los disparos que le quedan a la
 * linterna: con el puente iluminado y sin carga, se disuelve enseguida.
 */
export function tickBuild(
  build: Build,
  dt: number,
  charge: number,
): { build: Build; event: TickEvent } {
  if (build.phase === 'building') return { build, event: null };
  if (build.phase === 'lit' && charge < 1) {
    return { build: { ...build, phase: 'dissolving', timer: TIMES.dissolve }, event: null };
  }
  const timer = build.timer - dt;
  if (timer > 0) return { build: { ...build, timer }, event: null };
  switch (build.phase) {
    case 'waiting':
      return { build: { ...build, timer: 0 }, event: 'next-due' };
    case 'testing':
      return { build: { ...build, timer: 0 }, event: 'test-done' };
    case 'fallen':
      return {
        build: { ...build, phase: 'waiting', timer: TIMES.between, challenge: null, placed: [] },
        event: null,
      };
    case 'lit':
      return { build: { ...build, phase: 'dissolving', timer: TIMES.dissolve }, event: null };
    case 'dissolving':
      return {
        build: { ...build, phase: 'waiting', timer: TIMES.between, challenge: null, placed: [] },
        event: 'dissolved',
      };
    default:
      return { build, event: null };
  }
}
