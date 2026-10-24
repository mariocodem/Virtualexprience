import type { MercadoContent } from '@/data/contentSchemas';

/**
 * Día de mercado (Gerencia+). Cada jornada se pide producto leyendo los datos
 * (lo que sobra se pierde) y se resuelve un dilema de gestión que mueve la
 * caja, la reputación y el ánimo del equipo. La reputación ajusta la demanda;
 * un equipo agotado atiende a menos clientes.
 */

export type MarketDay = MercadoContent['days'][number];
type Option = MarketDay['dilemma']['options'][number];

/** Los efectos de caja del contenido vienen en miles de pesos. */
export const CASH_UNIT = 1000;

export interface MarketPlan {
  level: number;
  days: number;
  tiers: readonly (1 | 2 | 3)[];
}

export function marketPlan(level: number): MarketPlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  const plans: Record<number, Omit<MarketPlan, 'level'>> = {
    1: { days: 4, tiers: [1, 2] },
    2: { days: 5, tiers: [1, 2] },
    3: { days: 5, tiers: [1, 2, 3] },
    4: { days: 6, tiers: [2, 3] },
    5: { days: 6, tiers: [2, 3] },
  };
  const plan = plans[l] ?? plans[1];
  if (!plan) throw new Error('Plan inexistente.');
  return { level: l, ...plan };
}

/** Jornadas de la temporada: al azar dentro del plan, en el orden del calendario. */
export function selectDays(days: MarketDay[], plan: MarketPlan, random: () => number): MarketDay[] {
  const indexed = days.map((day, index) => ({ day, index, key: random() }));
  const pool = indexed.filter((d) => plan.tiers.includes(d.day.tier));
  const rest = indexed.filter((d) => !plan.tiers.includes(d.day.tier));
  return [...pool.sort((a, b) => a.key - b.key), ...rest.sort((a, b) => a.key - b.key)]
    .slice(0, plan.days)
    .sort((a, b) => a.index - b.index)
    .map((d) => d.day);
}

/** El pedido que mejor responde a los datos: el más cercano a la demanda real. */
export function bestOrder(day: MarketDay): number {
  return (
    [...day.orders].sort(
      (a, b) => Math.abs(a - day.demand) - Math.abs(b - day.demand) || a - b,
    )[0] ?? 0
  );
}

/** Demanda del día ajustada por la reputación del puesto (50 = sin ajuste). */
export function effectiveDemand(demand: number, reputation: number): number {
  return Math.round(demand * (0.85 + (0.3 * reputation) / 100));
}

/** Clientes que el equipo alcanza a atender según su ánimo. */
export function capacity(team: number): number {
  return 60 + Math.round(team);
}

export interface DayResult {
  dayId: string;
  order: number;
  best: number;
  demand: number;
  sold: number;
  waste: number;
  /** Clientes que quisieron comprar y no alcanzaron producto o atención. */
  missed: number;
  profit: number;
  cash: number;
  quality: number;
}

export interface MarketState {
  queue: string[];
  index: number;
  phase: 'pedido' | 'dilema' | 'cierre';
  cash: number;
  reputation: number;
  team: number;
  order: number | null;
  ledger: DayResult[];
}

export function startMarket(content: MercadoContent, queue: MarketDay[]): MarketState {
  return {
    queue: queue.map((d) => d.id),
    index: 0,
    phase: 'pedido',
    cash: content.startCash,
    reputation: 50,
    team: 60,
    order: null,
    ledger: [],
  };
}

export function currentDayId(state: MarketState): string | null {
  return state.queue[state.index] ?? null;
}

export function isFinished(state: MarketState): boolean {
  return currentDayId(state) === null;
}

export function affordable(state: MarketState, content: MercadoContent, quantity: number): boolean {
  return quantity * content.product.cost <= state.cash;
}

export function placeOrder(
  state: MarketState,
  content: MercadoContent,
  day: MarketDay,
  quantity: number,
): MarketState {
  if (state.phase !== 'pedido' || currentDayId(state) !== day.id) return state;
  if (!day.orders.includes(quantity) || !affordable(state, content, quantity)) return state;
  return { ...state, order: quantity, phase: 'dilema' };
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** Resuelve el dilema y cierra la jornada: ventas, sobrantes y caja. */
export function resolveDay(
  state: MarketState,
  content: MercadoContent,
  day: MarketDay,
  optionId: string,
): MarketState {
  const option: Option | undefined = day.dilemma.options.find((o) => o.id === optionId);
  if (state.phase !== 'dilema' || state.order === null || !option) return state;
  const reputation = clamp(state.reputation + (option.effects.reputacion ?? 0));
  const team = clamp(state.team + (option.effects.equipo ?? 0));
  const wanted = effectiveDemand(day.demand, reputation);
  const sold = Math.min(state.order, wanted, capacity(team));
  const { cost, price } = content.product;
  const profit = sold * price - state.order * cost + (option.effects.caja ?? 0) * CASH_UNIT;
  const cash = state.cash + profit;
  return {
    ...state,
    phase: 'cierre',
    reputation,
    team,
    cash,
    ledger: [
      ...state.ledger,
      {
        dayId: day.id,
        order: state.order,
        best: bestOrder(day),
        demand: wanted,
        sold,
        waste: state.order - sold,
        missed: Math.max(0, wanted - sold),
        profit,
        cash,
        quality: option.quality,
      },
    ],
  };
}

export function nextDay(state: MarketState): MarketState {
  if (state.phase !== 'cierre') return state;
  return { ...state, index: state.index + 1, phase: 'pedido', order: null };
}

export interface MarketReport {
  /** Jornadas con el pedido que mejor respondía a los datos. */
  accuracy: number;
  /** Calidad media de las decisiones de gestión. */
  criteria: number;
  /** Jornadas pedidas con precisión (sin sobrantes ni clientes sin atender por falta de producto). */
  toolsUsed: number;
  averageProfit: number;
  waste: number;
  score: number;
}

export function report(state: MarketState, content: MercadoContent): MarketReport {
  const n = Math.max(1, state.ledger.length);
  const accuracy = state.ledger.filter((d) => d.order === d.best).length / n;
  const criteria = state.ledger.reduce((sum, d) => sum + d.quality, 0) / n;
  const averageProfit = state.ledger.reduce((sum, d) => sum + d.profit, 0) / n;
  const profitScore = Math.min(1, Math.max(0, averageProfit) / content.goal);
  return {
    accuracy,
    criteria,
    toolsUsed: state.ledger.filter((d) => d.order === d.best).length,
    averageProfit,
    waste: state.ledger.reduce((sum, d) => sum + d.waste, 0),
    score: 0.4 * accuracy + 0.3 * criteria + 0.3 * profitScore,
  };
}
