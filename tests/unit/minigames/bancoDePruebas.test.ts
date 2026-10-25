import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { bancoContentSchema, type BancoContent, type FeedbackKind } from '@/data/contentSchemas';
import raw from '@/data/content/activatuidea-taller.json';
import {
  addressesPattern,
  bancoPlan,
  canBuild,
  classify,
  iterate,
  isFinished,
  nextRound,
  report,
  selectRounds,
  startBanco,
  type BancoRound,
  type BancoState,
} from '@/minigames/banco-de-pruebas/engine';

const content: BancoContent = bancoContentSchema.parse(raw);

const truth = (round: BancoRound) =>
  Object.fromEntries(round.feedback.map((f) => [f.id, f.kind])) as Record<string, FeedbackKind>;
const allPatron = (round: BancoRound) =>
  Object.fromEntries(round.feedback.map((f) => [f.id, 'patron'])) as Record<string, FeedbackKind>;

/** Elige los cambios que responden a patrones, del más barato al más caro, si alcanza. */
function evidence(state: BancoState, round: BancoRound): string[] {
  const picks: string[] = [];
  for (const change of [...round.changes].sort((a, b) => a.cost - b.cost)) {
    if (addressesPattern(round, change) && canBuild(state, round, [...picks, change.id])) {
      picks.push(change.id);
    }
  }
  return picks;
}

/** Persigue las ocurrencias: los cambios que no responden a ningún patrón. */
function whims(state: BancoState, round: BancoRound): string[] {
  const picks: string[] = [];
  for (const change of round.changes) {
    if (!addressesPattern(round, change) && canBuild(state, round, [...picks, change.id])) {
      picks.push(change.id);
    }
  }
  return picks;
}

function season(
  rounds: BancoRound[],
  level: number,
  notes: (r: BancoRound) => Record<string, FeedbackKind>,
  pick: (s: BancoState, r: BancoRound) => string[],
) {
  let state = startBanco(content, rounds, bancoPlan(level));
  for (const round of rounds) {
    state = classify(state, round, notes(round));
    state = iterate(state, round, pick(state, round));
    state = nextRound(state);
  }
  return state;
}

describe('Banco de pruebas', () => {
  it('a más nivel, más rondas sutiles y menos materiales', () => {
    expect(bancoPlan(5).budgetFactor).toBeLessThan(bancoPlan(1).budgetFactor);
    expect(bancoPlan(5).tiers).not.toContain(1);
  });

  it('no se itera sin clasificar todos los comentarios', () => {
    const [round] = content.rounds as [BancoRound];
    const state = startBanco(content, [round], bancoPlan(1));
    expect(classify(state, round, { f1: 'patron' })).toBe(state);
    expect(classify(state, round, truth(round)).phase).toBe('iterar');
  });

  it('respeta el presupuesto y el máximo de cambios por iteración', () => {
    const [round] = content.rounds as [BancoRound];
    let state = classify(startBanco(content, [round], bancoPlan(1)), round, truth(round));
    expect(canBuild(state, round, ['c1', 'c2', 'c3'])).toBe(false);
    expect(canBuild({ ...state, budget: 30 }, round, ['c1', 'c2'])).toBe(false);
    state = iterate(state, round, ['c1']);
    expect(state.phase).toBe('probar');
    expect(state.built.map((b) => b.part)).toEqual(['Cierre enrollable']);
    expect(state.last.ana).toBe(20);
    expect(isFinished(nextRound(state))).toBe(true);
  });

  it('en cualquier nivel, iterar con evidencia alcanza la meta; perseguir ocurrencias no', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const rounds = selectRounds(content.rounds, bancoPlan(level), seeded(seed));
        const good = report(season(rounds, level, truth, evidence), content);
        expect(good.satisfaction, `nivel ${String(level)}`).toBeGreaterThanOrEqual(content.goal);
        expect(good.score).toBeGreaterThan(0.9);
        expect(good.offProblem).toBe(0);
        expect(good.toolsUsed).toBe(rounds.length);
        const bad = report(season(rounds, level, allPatron, whims), content);
        expect(bad.score, `nivel ${String(level)}`).toBeLessThan(0.6);
        expect(bad.offProblem).toBeGreaterThan(0);
      }
    }
  });

  it('el contenido es coherente: cada ronda tiene un patrón atendible y referencias válidas', () => {
    const users = new Set(content.users.map((u) => u.id));
    for (const round of content.rounds) {
      const ids = new Set(round.feedback.map((f) => f.id));
      expect(
        round.feedback.filter((f) => f.kind === 'patron').length,
        round.id,
      ).toBeGreaterThanOrEqual(2);
      expect(
        round.changes.some((c) => addressesPattern(round, c)),
        round.id,
      ).toBe(true);
      for (const f of round.feedback) expect(users.has(f.userId), f.id).toBe(true);
      for (const change of round.changes) {
        for (const id of change.addresses) expect(ids.has(id), `${round.id}/${id}`).toBe(true);
        for (const user of Object.keys(change.effects)) expect(users.has(user), user).toBe(true);
      }
    }
  });
});
