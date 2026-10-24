import type { Bridge } from '@/data/contentSchemas';

/**
 * Puentes de Fractal (NeuroMath). Cada hueco se cubre con piezas escritas de
 * formas distintas —fracciones, porcentajes, escalas, ecuaciones— que deben
 * sumar exactamente su longitud. La vagoneta de prueba dice si el puente
 * resiste, queda corto o no encaja; las cargas de prueba son limitadas.
 */

export type TestOutcome = 'resiste' | 'corto' | 'largo';

const EPSILON = 1e-6;

export interface BridgePlan {
  level: number;
  count: number;
  /** Cargas de prueba por puente antes de que se derrumbe. */
  tests: number;
  tiers: readonly (1 | 2 | 3)[];
}

export function bridgePlan(level: number): BridgePlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  const plans: Record<number, Omit<BridgePlan, 'level'>> = {
    1: { count: 3, tests: 3, tiers: [1, 2] },
    2: { count: 4, tests: 3, tiers: [1, 2] },
    3: { count: 4, tests: 2, tiers: [1, 2, 3] },
    4: { count: 5, tests: 2, tiers: [2, 3] },
    5: { count: 5, tests: 2, tiers: [2, 3] },
  };
  const plan = plans[l] ?? plans[1];
  if (!plan) throw new Error('Plan inexistente.');
  return { level: l, ...plan };
}

/** Puentes de la partida: de los niveles del plan, sin repetir, de menor a mayor sutileza. */
export function selectBridges(bridges: Bridge[], plan: BridgePlan, random: () => number): Bridge[] {
  const pool = bridges.filter((b) => plan.tiers.includes(b.tier));
  const source = pool.length >= plan.count ? pool : bridges;
  const shuffled = source
    .map((bridge) => ({ bridge, key: random() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, plan.count)
    .map(({ bridge }) => bridge);
  return shuffled.sort((a, b) => a.tier - b.tier);
}

export function span(bridge: Bridge, selected: readonly string[]): number {
  return selected.reduce(
    (sum, id) => sum + (bridge.pieces.find((p) => p.id === id)?.value ?? 0),
    0,
  );
}

export function outcomeOf(gap: number, total: number): TestOutcome {
  if (Math.abs(total - gap) < EPSILON) return 'resiste';
  return total < gap ? 'corto' : 'largo';
}

/** Combinaciones de piezas (hasta `slots`) que cubren el hueco exactamente. */
export function solutions(bridge: Bridge): string[][] {
  const found: string[][] = [];
  const walk = (start: number, chosen: string[], total: number) => {
    if (chosen.length > 0 && Math.abs(total - bridge.gap) < EPSILON) found.push(chosen);
    if (chosen.length === bridge.slots || total > bridge.gap + EPSILON) return;
    for (let i = start; i < bridge.pieces.length; i += 1) {
      const piece = bridge.pieces[i];
      if (piece) walk(i + 1, [...chosen, piece.id], total + piece.value);
    }
  };
  walk(0, [], 0);
  return found;
}

export interface BridgeResult {
  bridgeId: string;
  solved: boolean;
  /** Pruebas usadas en ese puente. */
  tries: number;
}

export interface LastTest {
  outcome: TestOutcome;
  total: number;
  /** Contador de pruebas de la partida: cambia con cada prueba para reiniciar la animación. */
  serial: number;
}

export interface BridgeState {
  queue: string[];
  index: number;
  selected: string[];
  tests: number;
  testsLeft: number;
  last: LastTest | null;
  /** El puente actual ya se resolvió o se derrumbó: falta pasar al siguiente. */
  settled: boolean;
  serial: number;
  results: BridgeResult[];
}

export function startBridges(queue: Bridge[], plan: BridgePlan): BridgeState {
  return {
    queue: queue.map((b) => b.id),
    index: 0,
    selected: [],
    tests: plan.tests,
    testsLeft: plan.tests,
    last: null,
    settled: false,
    serial: 0,
    results: [],
  };
}

export function currentBridgeId(state: BridgeState): string | null {
  return state.queue[state.index] ?? null;
}

export function isFinished(state: BridgeState): boolean {
  return currentBridgeId(state) === null;
}

/** Pone o quita una pieza; si no quedan apoyos libres, no cambia nada. */
export function togglePiece(state: BridgeState, bridge: Bridge, pieceId: string): BridgeState {
  if (state.settled || !bridge.pieces.some((p) => p.id === pieceId)) return state;
  if (state.selected.includes(pieceId)) {
    return { ...state, selected: state.selected.filter((id) => id !== pieceId), last: null };
  }
  if (state.selected.length >= bridge.slots) return state;
  return { ...state, selected: [...state.selected, pieceId], last: null };
}

export function clearPieces(state: BridgeState): BridgeState {
  return state.settled ? state : { ...state, selected: [], last: null };
}

/** Pasa la vagoneta: resiste, o gasta una carga de prueba; sin cargas, el puente se derrumba. */
export function testBridge(state: BridgeState, bridge: Bridge): BridgeState {
  if (state.settled || state.selected.length === 0 || state.testsLeft <= 0) return state;
  const total = span(bridge, state.selected);
  const outcome = outcomeOf(bridge.gap, total);
  const tries = state.tests - state.testsLeft + 1;
  const testsLeft = outcome === 'resiste' ? state.testsLeft : state.testsLeft - 1;
  const settled = outcome === 'resiste' || testsLeft === 0;
  const serial = state.serial + 1;
  return {
    ...state,
    testsLeft,
    settled,
    serial,
    last: { outcome, total, serial },
    results: settled
      ? [...state.results, { bridgeId: bridge.id, solved: outcome === 'resiste', tries }]
      : state.results,
  };
}

export function nextBridge(state: BridgeState): BridgeState {
  if (!state.settled) return state;
  return {
    ...state,
    index: state.index + 1,
    selected: [],
    testsLeft: state.tests,
    last: null,
    settled: false,
  };
}

export interface BridgeReport {
  results: (BridgeResult & { bridge: Bridge })[];
  /** Puentes que resistieron. */
  accuracy: number;
  /** Puentes resueltos en la primera prueba: calcular antes de probar. */
  criteria: number;
  /** Conceptos distintos con al menos un puente resuelto. */
  toolsUsed: number;
  score: number;
}

export function report(state: BridgeState, bridges: Bridge[]): BridgeReport {
  const byId = new Map(bridges.map((b) => [b.id, b]));
  const results = state.results.flatMap((r) => {
    const bridge = byId.get(r.bridgeId);
    return bridge ? [{ ...r, bridge }] : [];
  });
  const total = Math.max(1, state.queue.length);
  const solved = results.filter((r) => r.solved);
  const accuracy = solved.length / total;
  const criteria = solved.filter((r) => r.tries === 1).length / total;
  return {
    results,
    accuracy,
    criteria,
    toolsUsed: new Set(solved.map((r) => r.bridge.concept)).size,
    score: 0.6 * accuracy + 0.4 * criteria,
  };
}
