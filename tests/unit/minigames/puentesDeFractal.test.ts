import { describe, expect, it } from 'vitest';
import { puentesContentSchema, type Bridge } from '@/data/contentSchemas';
import content from '@/data/content/neuromath-puentes.json';
import {
  bridgePlan,
  clearPieces,
  currentBridgeId,
  isFinished,
  nextBridge,
  outcomeOf,
  report,
  selectBridges,
  solutions,
  startBridges,
  testBridge,
  togglePiece,
} from '@/minigames/puentes-de-fractal/engine';

const bridge = (id: string, tier: 1 | 2 | 3, concept: Bridge['concept'] = 'fraccion'): Bridge => ({
  id,
  tier,
  concept,
  prompt: 'Hueco de 10 m.',
  gap: 10,
  slots: 2,
  pieces: [
    { id: 'a', label: '6 m', value: 6 },
    { id: 'b', label: '4 m', value: 4 },
    { id: 'c', label: '3 m', value: 3 },
    { id: 'd', label: '5 m', value: 5 },
  ],
  explanation: '6 + 4 = 10.',
});

const BRIDGES = [
  bridge('p1', 1),
  bridge('p2', 1, 'porcentaje'),
  bridge('p3', 2, 'escala'),
  bridge('p4', 3, 'ecuacion'),
];
const plan = { level: 1, count: 3, tests: 2, tiers: [1, 2, 3] } as const;

describe('Puentes de Fractal', () => {
  it('a más nivel, más puentes, menos cargas de prueba y sin los más evidentes', () => {
    const easy = bridgePlan(1);
    const hard = bridgePlan(5);
    expect(hard.count).toBeGreaterThan(easy.count);
    expect(hard.tests).toBeLessThan(easy.tests);
    expect(hard.tiers).not.toContain(1);
  });

  it('elige los puentes del plan, de menor a mayor sutileza', () => {
    const chosen = selectBridges(BRIDGES, plan, () => 0.5);
    expect(chosen).toHaveLength(3);
    expect(chosen.map((b) => b.tier)).toEqual([...chosen.map((b) => b.tier)].sort());
  });

  it('distingue un puente exacto, uno corto y uno largo', () => {
    expect(outcomeOf(10, 10)).toBe('resiste');
    expect(outcomeOf(7.5, 2.5 + 5)).toBe('resiste');
    expect(outcomeOf(10, 9.5)).toBe('corto');
    expect(outcomeOf(10, 11)).toBe('largo');
  });

  it('no deja poner más piezas que apoyos; quitar una la devuelve', () => {
    const p = bridge('x', 1);
    let state = startBridges([p], plan);
    state = togglePiece(state, p, 'a');
    state = togglePiece(state, p, 'b');
    state = togglePiece(state, p, 'c');
    expect(state.selected).toEqual(['a', 'b']);
    state = togglePiece(state, p, 'a');
    expect(state.selected).toEqual(['b']);
    expect(clearPieces(state).selected).toEqual([]);
  });

  it('resolver en la primera prueba cuenta como calcular antes de probar', () => {
    const [p1, p2] = BRIDGES as [Bridge, Bridge];
    let state = startBridges([p1, p2], plan);
    state = togglePiece(state, p1, 'a');
    state = togglePiece(state, p1, 'b');
    state = testBridge(state, p1);
    expect(state.last?.outcome).toBe('resiste');
    expect(state.settled).toBe(true);
    state = nextBridge(state);
    expect(currentBridgeId(state)).toBe('p2');

    state = togglePiece(state, p2, 'c');
    state = testBridge(state, p2);
    expect(state.last?.outcome).toBe('corto');
    expect(state.testsLeft).toBe(1);
    state = togglePiece(state, p2, 'c');
    state = togglePiece(state, p2, 'a');
    state = togglePiece(state, p2, 'b');
    state = testBridge(state, p2);
    state = nextBridge(state);
    expect(isFinished(state)).toBe(true);

    const result = report(state, BRIDGES);
    expect(result.accuracy).toBe(1);
    expect(result.criteria).toBeCloseTo(0.5);
    expect(result.toolsUsed).toBe(2);
  });

  it('sin cargas de prueba, el puente se derrumba y no cuenta como resuelto', () => {
    const [p1] = BRIDGES as [Bridge];
    let state = startBridges([p1], plan);
    state = togglePiece(state, p1, 'c');
    state = testBridge(state, p1);
    state = testBridge(state, p1);
    expect(state.settled).toBe(true);
    expect(state.testsLeft).toBe(0);
    expect(testBridge(state, p1)).toBe(state);
    expect(report(nextBridge(state), BRIDGES).accuracy).toBe(0);
  });

  it('todos los puentes del contenido tienen al menos una solución exacta', () => {
    const parsed = puentesContentSchema.parse(content);
    for (const b of parsed.bridges) {
      expect(solutions(b).length, b.id).toBeGreaterThan(0);
      expect(new Set(b.pieces.map((p) => p.id)).size, b.id).toBe(b.pieces.length);
    }
  });

  it('el contenido alcanza para el plan más exigente', () => {
    const parsed = puentesContentSchema.parse(content);
    const hard = bridgePlan(5);
    expect(parsed.bridges.filter((b) => hard.tiers.includes(b.tier)).length).toBeGreaterThanOrEqual(
      hard.count,
    );
  });
});
