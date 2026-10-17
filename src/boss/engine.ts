import type { BossConfig } from '@/ai/adaptiveEngine';
import type { QuizItem } from '@/data/contentSchemas';

/**
 * Batalla contra la Bruma, como reductor puro: cada respuesta devuelve el nuevo
 * estado y lo que pasó. Aciertos disipan la Bruma (fases a 1/3 y 2/3, con
 * señales más sutiles); errores y tiempo agotado gastan la luz del explorador.
 */

export type Phase = 1 | 2 | 3;
export type Outcome = 'en-curso' | 'victoria' | 'retirada';

export interface BattleAnswer {
  itemId: string;
  optionId: string | null;
  correct: boolean;
}

export interface BattleState {
  config: BossConfig;
  phase: Phase;
  hits: number;
  lights: number;
  used: string[];
  current: string | null;
  consecutiveMisses: number;
  outcome: Outcome;
  answers: BattleAnswer[];
}

export interface BattleEvent {
  correct: boolean;
  item: QuizItem;
  optionId: string | null;
  phaseChanged: Phase | null;
  outcome: Outcome;
}

export type Random = () => number;

export function phaseFor(hits: number, hitsToWin: number): Phase {
  if (hits >= (hitsToWin * 2) / 3) return 3;
  if (hits >= hitsToWin / 3) return 2;
  return 1;
}

/** Densidad de la Bruma, de 1 (intacta) a 0 (disipada). */
export function density(state: BattleState): number {
  return Math.max(0, 1 - state.hits / state.config.hitsToWin);
}

export function accuracy(state: BattleState): number {
  return state.answers.length === 0 ? 0 : state.hits / state.answers.length;
}

/** Elige el siguiente embate: del nivel de sutileza de la fase, sin repetir mientras queden. */
export function pickItem(
  items: QuizItem[],
  tier: 1 | 2 | 3,
  used: readonly string[],
  random: Random,
): QuizItem {
  const fresh = items.filter((i) => !used.includes(i.id));
  const pool = fresh.filter((i) => i.tier === tier);
  const near = fresh.filter((i) => Math.abs(i.tier - tier) === 1);
  const candidates =
    pool.length > 0 ? pool : near.length > 0 ? near : fresh.length > 0 ? fresh : items;
  const choice = candidates[Math.floor(random() * candidates.length)] ?? candidates[0];
  if (!choice) throw new Error('La Bruma no tiene embates.');
  return choice;
}

export function startBattle(config: BossConfig, items: QuizItem[], random: Random): BattleState {
  const first = pickItem(items, config.tiers[0], [], random);
  return {
    config,
    phase: 1,
    hits: 0,
    lights: config.lights,
    used: [first.id],
    current: first.id,
    consecutiveMisses: 0,
    outcome: 'en-curso',
    answers: [],
  };
}

/** Responde al embate actual. `optionId` nulo significa que se agotó el tiempo. */
export function answer(
  state: BattleState,
  items: QuizItem[],
  optionId: string | null,
  random: Random,
): { state: BattleState; event: BattleEvent } {
  const item = items.find((i) => i.id === state.current);
  if (!item || state.outcome !== 'en-curso') throw new Error('No hay un embate en curso.');

  const correct = optionId !== null && item.options.some((o) => o.id === optionId && o.correct);
  const hits = state.hits + (correct ? 1 : 0);
  const lights = state.lights - (correct ? 0 : 1);
  const phase = phaseFor(hits, state.config.hitsToWin);
  const outcome: Outcome =
    hits >= state.config.hitsToWin ? 'victoria' : lights <= 0 ? 'retirada' : 'en-curso';

  let current: string | null = null;
  let used = state.used;
  if (outcome === 'en-curso') {
    const next = pickItem(items, state.config.tiers[phase - 1] ?? 3, used, random);
    current = next.id;
    used = [...used, next.id];
  }

  const next: BattleState = {
    ...state,
    phase,
    hits,
    lights,
    used,
    current,
    consecutiveMisses: correct ? 0 : state.consecutiveMisses + 1,
    outcome,
    answers: [...state.answers, { itemId: item.id, optionId, correct }],
  };
  return {
    state: next,
    event: { correct, item, optionId, phaseChanged: phase !== state.phase ? phase : null, outcome },
  };
}

/** Generador con semilla (mulberry32): batallas reproducibles en pruebas. */
export function seeded(seed: number): Random {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
