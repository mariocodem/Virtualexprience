import type { NewsItem, Signal } from '@/data/contentSchemas';

/**
 * Sala de Redacción (CLAUDE.md §7). Reloj de edición por turnos: investigar
 * una señal y decidir consumen minutos antes del cierre. Se evalúan las
 * decisiones y los criterios aplicados, no solo el acierto.
 */

export type Verdict = NewsItem['verdict'];

export const INVESTIGATE_COST = 15;
export const DECIDE_COST = 5;

export interface NewsroomPlan {
  level: number;
  count: number;
  /** Minutos disponibles hasta el cierre de edición. */
  budget: number;
  tiers: readonly (1 | 2 | 3)[];
}

export function newsroomPlan(level: number): NewsroomPlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  const plans: Record<number, Omit<NewsroomPlan, 'level'>> = {
    1: { count: 4, budget: 150, tiers: [1, 2] },
    2: { count: 4, budget: 130, tiers: [1, 2] },
    3: { count: 5, budget: 130, tiers: [1, 2, 3] },
    4: { count: 6, budget: 135, tiers: [2, 3] },
    5: { count: 6, budget: 115, tiers: [2, 3] },
  };
  const plan = plans[l] ?? plans[1];
  if (!plan) throw new Error('Plan inexistente.');
  return { level: l, ...plan };
}

/** Elige las noticias de la edición: de los niveles del plan, sin repetir, en orden aleatorio. */
export function selectNews(news: NewsItem[], plan: NewsroomPlan, random: () => number): NewsItem[] {
  const pool = news.filter((n) => plan.tiers.includes(n.tier));
  const source = pool.length >= plan.count ? pool : news;
  const shuffled = [...source].sort(() => random() - 0.5);
  return shuffled.slice(0, plan.count);
}

export interface Decision {
  newsId: string;
  verdict: Verdict;
  criterion: Signal | null;
}

export interface NewsroomState {
  queue: string[];
  index: number;
  clock: number;
  revealed: Record<string, Signal[]>;
  decisions: Decision[];
}

export function startNewsroom(queue: NewsItem[], plan: NewsroomPlan): NewsroomState {
  return {
    queue: queue.map((n) => n.id),
    index: 0,
    clock: plan.budget,
    revealed: {},
    decisions: [],
  };
}

export function currentNewsId(state: NewsroomState): string | null {
  return state.clock > 0 ? (state.queue[state.index] ?? null) : null;
}

export function isFinished(state: NewsroomState): boolean {
  return currentNewsId(state) === null;
}

export function investigate(state: NewsroomState, signal: Signal): NewsroomState {
  const id = currentNewsId(state);
  if (!id) return state;
  const seen = state.revealed[id] ?? [];
  if (seen.includes(signal)) return state;
  return {
    ...state,
    clock: Math.max(0, state.clock - INVESTIGATE_COST),
    revealed: { ...state.revealed, [id]: [...seen, signal] },
  };
}

export function decide(
  state: NewsroomState,
  verdict: Verdict,
  criterion: Signal | null,
): NewsroomState {
  const id = currentNewsId(state);
  if (!id) return state;
  return {
    ...state,
    clock: Math.max(0, state.clock - DECIDE_COST),
    index: state.index + 1,
    decisions: [...state.decisions, { newsId: id, verdict, criterion }],
  };
}

export interface NewsResult {
  news: NewsItem;
  decision: Decision | null;
  verdictOk: boolean;
  criterionOk: boolean;
}

export interface NewsroomReport {
  results: NewsResult[];
  /** Proporción de decisiones correctas sobre la edición completa. */
  accuracy: number;
  /** Proporción de justificaciones con una señal que de verdad decide el caso. */
  criteria: number;
  /** Señales distintas investigadas en la edición (las cuatro dan «Verificador»). */
  toolsUsed: number;
  /** Noticias que quedaron sin revisar al cierre. */
  unreviewed: number;
  score: number;
}

export function report(state: NewsroomState, news: NewsItem[]): NewsroomReport {
  const byId = new Map(news.map((n) => [n.id, n]));
  const results: NewsResult[] = state.queue.flatMap((id) => {
    const item = byId.get(id);
    if (!item) return [];
    const decision = state.decisions.find((d) => d.newsId === id) ?? null;
    const verdictOk = decision?.verdict === item.verdict;
    const criterionOk =
      decision?.criterion !== null &&
      decision?.criterion !== undefined &&
      item.criteria.includes(decision.criterion);
    return [{ news: item, decision, verdictOk, criterionOk }];
  });
  const total = Math.max(1, results.length);
  const accuracy = results.filter((r) => r.verdictOk).length / total;
  const criteria = results.filter((r) => r.criterionOk).length / total;
  const toolsUsed = new Set(Object.values(state.revealed).flat()).size;
  return {
    results,
    accuracy,
    criteria,
    toolsUsed,
    unreviewed: results.filter((r) => !r.decision).length,
    score: 0.6 * accuracy + 0.4 * criteria,
  };
}
