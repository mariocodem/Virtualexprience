import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import raw from '@/data/content/activatuidea-taller.json';
import { bancoContentSchema, type BancoContent } from '@/data/contentSchemas';
import { partKind, PART_KINDS, personLook } from '@/games/activatuidea/banco/model';
import { shapesFor } from '@/games/activatuidea/banco/parts3d';
import {
  allClassified,
  askersOf,
  BASKETS,
  buildScore,
  canAdd,
  cycle,
  listenScore,
  nextPending,
  reportView,
  reviewNotes,
  sendToBasket,
  togglePick,
  type Answers,
} from '@/games/activatuidea/banco/session';
import {
  bancoPlan,
  classify,
  iterate,
  nextRound,
  report,
  selectRounds,
  startBanco,
  type BancoRound,
} from '@/minigames/banco-de-pruebas/engine';

const content: BancoContent = bancoContentSchema.parse(raw);
const names = Object.fromEntries(content.users.map((u) => [u.id, u.name]));
const plan = bancoPlan(3);
const first = (): BancoRound => {
  const round = content.rounds[0];
  if (!round) throw new Error('sin rondas');
  return round;
};
const truth = (round: BancoRound): Answers =>
  Object.fromEntries(round.feedback.map((f) => [f.id, f.kind]));

describe('piezas del prototipo en 3D', () => {
  it('todo cambio del contenido tiene pieza y toda pieza tiene formas', () => {
    for (const round of content.rounds)
      for (const change of round.changes) {
        expect(PART_KINDS).toContain(partKind(change.id));
        expect(shapesFor(partKind(change.id)).length).toBeGreaterThan(0);
      }
    for (const kind of PART_KINDS) expect(shapesFor(kind).length).toBeGreaterThan(0);
  });

  it('un cambio nuevo se ve con una pieza genérica y una persona nueva con un aspecto', () => {
    expect(partKind('nuevo')).toBe('etiqueta');
    expect(personLook('alguien', 2).coat).toMatch(/^#/);
    expect(personLook('ana', 0).name).toBe('Ana');
  });
});

describe('clasificar los comentarios', () => {
  it('las canastas siguen el orden de las teclas 1 a 3', () => {
    expect(BASKETS).toEqual(['patron', 'aislado', 'fuera']);
  });

  it('avanza al siguiente pendiente en orden circular y cierra al terminar', () => {
    const round = first();
    let answers: Answers = {};
    const a = round.feedback[0]?.id;
    if (!a) throw new Error('sin comentarios');
    expect(nextPending(round, answers)).toBe(a);
    answers = sendToBasket(answers, a, 'patron');
    expect(nextPending(round, answers, a)).toBe(round.feedback[1]?.id);
    expect(allClassified(round, answers)).toBe(false);
    answers = truth(round);
    expect(allClassified(round, answers)).toBe(true);
    expect(nextPending(round, answers, a)).toBeNull();
  });

  it('se puede cambiar de canasta y recorrer con las flechas', () => {
    const round = first();
    const [a, b] = round.feedback;
    if (!a || !b) throw new Error('faltan comentarios');
    let answers = sendToBasket({}, a.id, 'fuera');
    answers = sendToBasket(answers, a.id, 'aislado');
    expect(answers[a.id]).toBe('aislado');
    expect(cycle(round, a.id, 1)).toBe(b.id);
    expect(cycle(round, a.id, -1)).toBe(round.feedback[round.feedback.length - 1]?.id);
  });

  it('puntúa y revisa las notas igual que la versión accesible', () => {
    const round = first();
    expect(listenScore(round, truth(round))).toBe(1);
    const wrong = Object.fromEntries(round.feedback.map((f) => [f.id, 'fuera'])) as Answers;
    expect(listenScore(round, wrong)).toBeLessThan(1);
    const review = reviewNotes(round, truth(round));
    expect(review.every((r) => r.right)).toBe(true);
  });
});

describe('el estante', () => {
  it('no deja pasar de dos mejoras ni de los materiales', () => {
    const round = first();
    const state = startBanco(content, [round], plan);
    const ids = round.changes.map((c) => c.id);
    let picks: string[] = [];
    for (const id of ids) picks = togglePick(state, round, picks, id);
    expect(picks.length).toBeLessThanOrEqual(2);
    const tight = { ...state, budget: 10 };
    expect(togglePick(tight, round, [], 'c1')).toEqual([]);
    expect(canAdd(tight, round, [], 'c1')).toBe(false);
    expect(togglePick(state, round, ['c1'], 'c1')).toEqual([]);
  });

  it('dice quiénes pidieron cada cambio y puntúa la evidencia', () => {
    const round = first();
    const c1 = round.changes.find((c) => c.id === 'c1');
    const c2 = round.changes.find((c) => c.id === 'c2');
    if (!c1 || !c2) throw new Error('faltan cambios');
    expect(askersOf(round, c1, names)).toEqual(['Ana', 'Beto']);
    expect(buildScore(round, ['c1'])).toBe(1);
    expect(buildScore(round, ['c2'])).toBe(0);
    expect(buildScore(round, [])).toBe(0);
  });
});

describe('partida completa con el mismo motor', () => {
  it('una partida con evidencia llega a la meta y el informe lo dice', () => {
    const queue = selectRounds(content.rounds, plan, seeded(5));
    let state = startBanco(content, queue, plan);
    for (const round of queue) {
      state = classify(state, round, truth(round));
      const ranked = [...round.changes].sort((a, b) => a.cost - b.cost);
      const picks: string[] = [];
      for (const c of ranked) {
        const patron = c.addresses.some(
          (id) => round.feedback.find((f) => f.id === id)?.kind === 'patron',
        );
        if (
          patron &&
          picks.length < 2 &&
          togglePick(state, round, picks, c.id).length > picks.length
        )
          picks.push(c.id);
      }
      state = nextRound(iterate(state, round, picks));
    }
    const result = report(state, content);
    expect(result.accuracy).toBe(1);
    expect(result.criteria).toBe(1);
    const view = reportView(content, state, result);
    expect(view.figures).toHaveLength(3);
    expect(view.criteria.find((c) => c.label.includes('meta'))?.met).toBe(
      result.satisfaction >= content.goal,
    );
    expect(view.brujula.highlights).toHaveLength(4);
  });

  it('clasificar todo como patrón y no construir deja el informe en rojo', () => {
    const queue = selectRounds(content.rounds, plan, seeded(5));
    let state = startBanco(content, queue, plan);
    for (const round of queue) {
      const all = Object.fromEntries(round.feedback.map((f) => [f.id, 'patron' as const]));
      state = nextRound(iterate(classify(state, round, all), round, []));
    }
    const view = reportView(content, state, report(state, content));
    expect(view.title).toContain('otra vuelta');
  });
});
