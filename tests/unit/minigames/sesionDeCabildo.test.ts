import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { cabildoContentSchema, type CabildoContent } from '@/data/contentSchemas';
import raw from '@/data/content/voxcivitas-cabildo.json';
import {
  cabildoPlan,
  currentRoundId,
  intervene,
  isFinished,
  report,
  selectRounds,
  startCabildo,
  type Round,
} from '@/minigames/sesion-de-cabildo/engine';

const content: CabildoContent = cabildoContentSchema.parse(raw);

function play(rounds: Round[], pick: (round: Round) => string) {
  let state = startCabildo(content, rounds);
  for (const round of rounds) state = intervene(state, round, pick(round));
  return state;
}

const best = (round: Round) =>
  [...round.options].sort((a, b) => b.quality - a.quality)[0]?.id ?? '';
const worst = (round: Round) =>
  [...round.options].sort((a, b) => a.quality - b.quality)[0]?.id ?? '';

describe('Sesión de cabildo', () => {
  it('a más nivel, más rondas y sin las más evidentes', () => {
    expect(cabildoPlan(5).rounds).toBeGreaterThan(cabildoPlan(1).rounds);
    expect(cabildoPlan(5).tiers).not.toContain(1);
  });

  it('elige rondas del plan y respeta el orden del guion', () => {
    const plan = cabildoPlan(3);
    const chosen = selectRounds(content.rounds, plan, seeded(7));
    expect(chosen).toHaveLength(plan.rounds);
    const order = chosen.map((r) => content.rounds.indexOf(r));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('cada intervención mueve la confianza, con límites de 0 a 100', () => {
    const [first] = content.rounds as [Round];
    let state = startCabildo(content, [first]);
    expect(currentRoundId(state)).toBe(first.id);
    state = intervene(state, first, 'b');
    expect(state.trust.pescadores).toBe(30);
    expect(isFinished(state)).toBe(true);
    expect(intervene(state, first, 'a')).toBe(state);
  });

  it('las intervenciones con acuerdo quedan en el acta', () => {
    const round = content.rounds.find((r) => r.id === 'madrugada');
    if (!round) throw new Error('falta la ronda');
    const state = intervene(startCabildo(content, [round]), round, 'b');
    expect(state.acta).toHaveLength(1);
  });

  it('moderar con calidad lleva al consenso; con falacias, a ningún acuerdo', () => {
    const good = report(play(content.rounds, best), content);
    expect(good.verdict).toBe('consenso');
    expect(good.accuracy).toBe(1);
    expect(good.fallacies).toBe(0);
    expect(good.toolsUsed).toBe(4);

    const bad = report(play(content.rounds, worst), content);
    expect(bad.verdict).toBe('sin-acuerdo');
    expect(bad.criteria).toBeLessThan(0.3);
    expect(bad.score).toBeLessThan(0.6);
  });

  it('en cualquier nivel, la mejor moderación alcanza el consenso', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const rounds = selectRounds(content.rounds, cabildoPlan(level), seeded(seed));
        expect(report(play(rounds, best), content).verdict, `nivel ${String(level)}`).toBe(
          'consenso',
        );
      }
    }
  });

  it('el contenido es coherente: oradores y efectos existen, y hay una salida sólida', () => {
    const factions = new Set(content.factions.map((f) => f.id));
    for (const round of content.rounds) {
      expect(factions.has(round.speaker), round.id).toBe(true);
      expect(
        round.options.some((o) => o.quality === 1),
        round.id,
      ).toBe(true);
      for (const option of round.options) {
        for (const key of Object.keys(option.effects)) expect(factions.has(key), key).toBe(true);
      }
    }
  });
});
