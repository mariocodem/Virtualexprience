import type { BancoContent, FeedbackKind } from '@/data/contentSchemas';

/**
 * Banco de pruebas (ActivaTuIdea). Cada ronda, quienes prueban el prototipo
 * comentan; se distingue lo que se repite (un patrón) de lo aislado y de lo
 * que está fuera del problema, y con un presupuesto de materiales limitado se
 * eligen los cambios. Iterar con evidencia sube la satisfacción de quienes
 * tienen el problema; perseguir ocurrencias gasta materiales sin mejorar.
 */

export type BancoRound = BancoContent['rounds'][number];
export type Change = BancoRound['changes'][number];

/** Cambios que caben en una iteración. */
export const MAX_CHANGES = 2;

export interface BancoPlan {
  level: number;
  rounds: number;
  tiers: readonly (1 | 2 | 3)[];
  /** Multiplica el presupuesto del contenido: a más nivel, menos materiales. */
  budgetFactor: number;
}

export function bancoPlan(level: number): BancoPlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  const plans: Record<number, Omit<BancoPlan, 'level'>> = {
    1: { rounds: 3, tiers: [1, 2], budgetFactor: 1.2 },
    2: { rounds: 3, tiers: [1, 2], budgetFactor: 1.1 },
    3: { rounds: 4, tiers: [1, 2, 3], budgetFactor: 1 },
    4: { rounds: 4, tiers: [2, 3], budgetFactor: 0.9 },
    5: { rounds: 4, tiers: [2, 3], budgetFactor: 0.85 },
  };
  const plan = plans[l] ?? plans[1];
  if (!plan) throw new Error('Plan inexistente.');
  return { level: l, ...plan };
}

/** Rondas de prueba: al azar dentro del plan, en el orden del guion. */
export function selectRounds(
  rounds: BancoRound[],
  plan: BancoPlan,
  random: () => number,
): BancoRound[] {
  const indexed = rounds.map((round, index) => ({ round, index, key: random() }));
  const pool = indexed.filter((r) => plan.tiers.includes(r.round.tier));
  const rest = indexed.filter((r) => !plan.tiers.includes(r.round.tier));
  return [...pool.sort((a, b) => a.key - b.key), ...rest.sort((a, b) => a.key - b.key)]
    .slice(0, plan.rounds)
    .sort((a, b) => a.index - b.index)
    .map((r) => r.round);
}

export interface BuiltPart {
  roundId: string;
  changeId: string;
  part: string;
}

export interface BancoState {
  queue: string[];
  index: number;
  phase: 'escuchar' | 'iterar' | 'probar';
  budget: number;
  satisfaction: Record<string, number>;
  /** Clasificación que dio el estudiante a cada comentario. */
  notes: Record<string, FeedbackKind>;
  /** Cambios elegidos en cada ronda. */
  picks: Record<string, string[]>;
  built: BuiltPart[];
  /** Variación de satisfacción de la última iteración, por usuario. */
  last: Record<string, number>;
}

export function startBanco(
  content: BancoContent,
  queue: BancoRound[],
  plan: BancoPlan,
): BancoState {
  return {
    queue: queue.map((r) => r.id),
    index: 0,
    phase: 'escuchar',
    budget: Math.round(content.budget * plan.budgetFactor),
    satisfaction: Object.fromEntries(content.users.map((u) => [u.id, u.start])),
    notes: {},
    picks: {},
    built: [],
    last: {},
  };
}

export function currentRoundId(state: BancoState): string | null {
  return state.queue[state.index] ?? null;
}

export function isFinished(state: BancoState): boolean {
  return currentRoundId(state) === null;
}

/** Guarda la clasificación de los comentarios; exige que todos estén clasificados. */
export function classify(
  state: BancoState,
  round: BancoRound,
  answers: Record<string, FeedbackKind>,
): BancoState {
  if (state.phase !== 'escuchar' || currentRoundId(state) !== round.id) return state;
  if (!round.feedback.every((f) => f.id in answers)) return state;
  const notes = { ...state.notes };
  for (const f of round.feedback) {
    const kind = answers[f.id];
    if (kind) notes[f.id] = kind;
  }
  return { ...state, notes, phase: 'iterar' };
}

export function costOf(round: BancoRound, changeIds: readonly string[]): number {
  return changeIds.reduce(
    (sum, id) => sum + (round.changes.find((c) => c.id === id)?.cost ?? 0),
    0,
  );
}

export function canBuild(
  state: BancoState,
  round: BancoRound,
  changeIds: readonly string[],
): boolean {
  return (
    changeIds.length <= MAX_CHANGES &&
    new Set(changeIds).size === changeIds.length &&
    changeIds.every((id) => round.changes.some((c) => c.id === id)) &&
    costOf(round, changeIds) <= state.budget
  );
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** Construye los cambios elegidos y pone el prototipo a prueba. */
export function iterate(
  state: BancoState,
  round: BancoRound,
  changeIds: readonly string[],
): BancoState {
  if (state.phase !== 'iterar' || currentRoundId(state) !== round.id) return state;
  if (!canBuild(state, round, changeIds)) return state;
  const satisfaction = { ...state.satisfaction };
  const last: Record<string, number> = {};
  const chosen = round.changes.filter((c) => changeIds.includes(c.id));
  for (const change of chosen) {
    for (const [user, delta] of Object.entries(change.effects)) {
      if (!(user in satisfaction)) continue;
      const before = satisfaction[user] ?? 0;
      satisfaction[user] = clamp(before + delta);
      last[user] = (last[user] ?? 0) + (satisfaction[user] - before);
    }
  }
  return {
    ...state,
    phase: 'probar',
    budget: state.budget - costOf(round, changeIds),
    satisfaction,
    picks: { ...state.picks, [round.id]: [...changeIds] },
    built: [
      ...state.built,
      ...chosen.map((c) => ({ roundId: round.id, changeId: c.id, part: c.part })),
    ],
    last,
  };
}

export function nextRound(state: BancoState): BancoState {
  if (state.phase !== 'probar') return state;
  return { ...state, index: state.index + 1, phase: 'escuchar', last: {} };
}

/** ¿El cambio responde a algún comentario que se repite (un patrón)? */
export function addressesPattern(round: BancoRound, change: Change): boolean {
  return change.addresses.some((id) => round.feedback.find((f) => f.id === id)?.kind === 'patron');
}

/** ¿El cambio solo atiende comentarios que están fuera del problema? */
export function offProblem(round: BancoRound, change: Change): boolean {
  return (
    change.addresses.length > 0 &&
    change.addresses.every((id) => round.feedback.find((f) => f.id === id)?.kind === 'fuera')
  );
}

export function targetSatisfaction(state: BancoState, content: BancoContent): number {
  const targets = content.users.filter((u) => u.target);
  return (
    targets.reduce((sum, u) => sum + (state.satisfaction[u.id] ?? 0), 0) /
    Math.max(1, targets.length)
  );
}

export interface BancoReport {
  /** Comentarios bien clasificados. */
  accuracy: number;
  /** Cambios elegidos que responden a un patrón. */
  criteria: number;
  /** Rondas en las que algún cambio atendió lo que se repetía. */
  toolsUsed: number;
  satisfaction: number;
  changes: number;
  /** Cambios construidos para lo que está fuera del problema. */
  offProblem: number;
  score: number;
}

export function report(state: BancoState, content: BancoContent): BancoReport {
  const rounds = content.rounds.filter((r) => state.queue.includes(r.id));
  const feedback = rounds.flatMap((r) => r.feedback);
  const accuracy =
    feedback.filter((f) => state.notes[f.id] === f.kind).length / Math.max(1, feedback.length);
  const chosen = rounds.flatMap((r) =>
    (state.picks[r.id] ?? []).flatMap((id) => {
      const change = r.changes.find((c) => c.id === id);
      return change ? [{ round: r, change }] : [];
    }),
  );
  const evidence = chosen.filter(({ round, change }) => addressesPattern(round, change));
  const criteria = evidence.length / Math.max(1, chosen.length);
  const satisfaction = targetSatisfaction(state, content);
  return {
    accuracy,
    criteria,
    toolsUsed: new Set(evidence.map(({ round }) => round.id)).size,
    satisfaction,
    changes: chosen.length,
    offProblem: chosen.filter(({ round, change }) => offProblem(round, change)).length,
    score: 0.35 * accuracy + 0.35 * criteria + 0.3 * Math.min(1, satisfaction / content.goal),
  };
}
