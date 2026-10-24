import type { CabildoContent, DeliberativeMove } from '@/data/contentSchemas';

/**
 * Sesión de cabildo (Voxcivitas). Quien modera responde a cada grupo; cada
 * intervención mueve la confianza de los grupos y algunas dejan un acuerdo en
 * el acta. Al final se vota: un grupo respalda si su confianza alcanza el
 * umbral. Se evalúa la calidad deliberativa, no solo el resultado.
 */

export type Round = CabildoContent['rounds'][number];
export type Intervention = Round['options'][number];

/** Movimientos que construyen deliberación: escuchar, pedir evidencia, integrar, conceder. */
export const DELIBERATIVE: readonly DeliberativeMove[] = [
  'escuchar',
  'pedir-evidencia',
  'integrar',
  'conceder',
];

export interface CabildoPlan {
  level: number;
  rounds: number;
  tiers: readonly (1 | 2 | 3)[];
}

export function cabildoPlan(level: number): CabildoPlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  const plans: Record<number, Omit<CabildoPlan, 'level'>> = {
    1: { rounds: 5, tiers: [1, 2] },
    2: { rounds: 5, tiers: [1, 2] },
    3: { rounds: 6, tiers: [1, 2, 3] },
    4: { rounds: 6, tiers: [2, 3] },
    5: { rounds: 7, tiers: [2, 3] },
  };
  const plan = plans[l] ?? plans[1];
  if (!plan) throw new Error('Plan inexistente.');
  return { level: l, ...plan };
}

/** Rondas de la sesión: al azar dentro del plan, pero en el orden del guion. */
export function selectRounds(rounds: Round[], plan: CabildoPlan, random: () => number): Round[] {
  const indexed = rounds.map((round, index) => ({ round, index, key: random() }));
  const pool = indexed.filter((r) => plan.tiers.includes(r.round.tier));
  const rest = indexed.filter((r) => !plan.tiers.includes(r.round.tier));
  const pick = [...pool.sort((a, b) => a.key - b.key), ...rest.sort((a, b) => a.key - b.key)];
  return pick
    .slice(0, plan.rounds)
    .sort((a, b) => a.index - b.index)
    .map((r) => r.round);
}

export interface Choice {
  roundId: string;
  optionId: string;
  move: DeliberativeMove;
  quality: number;
}

export interface CabildoState {
  queue: string[];
  index: number;
  trust: Record<string, number>;
  choices: Choice[];
  acta: string[];
}

export function startCabildo(content: CabildoContent, queue: Round[]): CabildoState {
  return {
    queue: queue.map((r) => r.id),
    index: 0,
    trust: Object.fromEntries(content.factions.map((f) => [f.id, content.startTrust])),
    choices: [],
    acta: [],
  };
}

export function currentRoundId(state: CabildoState): string | null {
  return state.queue[state.index] ?? null;
}

export function isFinished(state: CabildoState): boolean {
  return currentRoundId(state) === null;
}

const clampTrust = (value: number) => Math.min(100, Math.max(0, value));

export function intervene(state: CabildoState, round: Round, optionId: string): CabildoState {
  const option = round.options.find((o) => o.id === optionId);
  if (!option || currentRoundId(state) !== round.id) return state;
  const trust = { ...state.trust };
  for (const [faction, delta] of Object.entries(option.effects)) {
    if (faction in trust) trust[faction] = clampTrust((trust[faction] ?? 0) + delta);
  }
  return {
    ...state,
    index: state.index + 1,
    trust,
    choices: [
      ...state.choices,
      { roundId: round.id, optionId, move: option.move, quality: option.quality },
    ],
    acta: option.agreement ? [...state.acta, option.agreement] : state.acta,
  };
}

export type Verdict = 'consenso' | 'mayoria' | 'sin-acuerdo';

export interface CabildoReport {
  supporters: string[];
  verdict: Verdict;
  /** Calidad media de las intervenciones (0–1). */
  accuracy: number;
  /** Proporción de intervenciones deliberativas y bien recibidas. */
  criteria: number;
  /** Movimientos deliberativos distintos usados con acierto (hasta cuatro). */
  toolsUsed: number;
  fallacies: number;
  score: number;
}

export function report(state: CabildoState, content: CabildoContent): CabildoReport {
  const supporters = content.factions
    .filter((f) => (state.trust[f.id] ?? 0) >= content.threshold)
    .map((f) => f.id);
  const total = content.factions.length;
  const verdict: Verdict =
    supporters.length === total
      ? 'consenso'
      : supporters.length > total / 2
        ? 'mayoria'
        : 'sin-acuerdo';
  const n = Math.max(1, state.choices.length);
  const accuracy = state.choices.reduce((sum, c) => sum + c.quality, 0) / n;
  const sound = state.choices.filter((c) => DELIBERATIVE.includes(c.move) && c.quality > 0);
  const criteria = sound.length / n;
  const toolsUsed = new Set(sound.filter((c) => c.quality >= 0.5).map((c) => c.move)).size;
  return {
    supporters,
    verdict,
    accuracy,
    criteria,
    toolsUsed,
    fallacies: state.choices.filter((c) => c.move === 'falacia').length,
    score: 0.5 * accuracy + 0.2 * criteria + 0.3 * (supporters.length / total),
  };
}
