import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  answerFinale,
  finaleAccuracy,
  finaleDensity,
  finaleLevel,
  finalePlan,
  formKey,
  itemsOf,
  lightByCompetency,
  startFinale,
  tierFor,
  totalHits,
  type FinaleState,
} from '@/boss/finale';
import { finaleContentSchema, type FinaleContent } from '@/data/contentSchemas';
import raw from '@/data/content/faro-gran-reto.json';
import { world } from '@/data';

const content: FinaleContent = finaleContentSchema.parse(raw);

function current(state: FinaleState) {
  const form = formKey(state);
  const item = form ? itemsOf(content, form).find((i) => i.id === state.current) : undefined;
  if (!item) throw new Error('sin embate');
  return item;
}
const right = (state: FinaleState) => current(state).options.find((o) => o.correct)?.id ?? null;
const wrong = (state: FinaleState) => current(state).options.find((o) => !o.correct)?.id ?? null;

describe('Gran Reto Integrador', () => {
  it('el contenido trae una forma por isla, en el orden del archipiélago, y embates de varios niveles', () => {
    expect(content.forms.map((f) => f.island).sort()).toEqual(
      world.islands.map((i) => i.id).sort(),
    );
    for (const form of content.forms) {
      expect(new Set(form.items.map((i) => i.tier)).size, form.island).toBeGreaterThanOrEqual(2);
    }
    const ids = [...content.forms.flatMap((f) => f.items), ...content.heart.items].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('el nivel sigue al dominio medio y ajusta aciertos, corazón y reloj', () => {
    const islands = world.islands.map((i) => i.id);
    expect(finaleLevel({}, islands)).toBe(2);
    expect(finaleLevel(Object.fromEntries(islands.map((id) => [id, 1])), islands)).toBe(5);
    expect(totalHits(finalePlan(5))).toBeGreaterThan(totalHits(finalePlan(1)));
    expect(finalePlan(5).seconds).toBeLessThan(finalePlan(1).seconds);
  });

  it('la sutileza sube con el dominio de cada competencia y en el corazón siempre es la mayor', () => {
    expect(tierFor('neuromath', 0, 0.2)).toBe(1);
    expect(tierFor('neuromath', 1, 0.2)).toBe(2);
    expect(tierFor('neuromath', 0, 0.8)).toBe(3);
    expect(tierFor('corazon', 0, 0)).toBe(3);
  });

  it('recorre las seis formas en orden y vence al disipar el corazón', () => {
    const plan = finalePlan(3);
    let state = startFinale(content, plan, {}, seeded(7));
    const seen: string[] = [];
    while (state.outcome === 'en-curso') {
      const form = formKey(state);
      if (form && seen.at(-1) !== form) seen.push(form);
      state = answerFinale(state, content, {}, right(state), seeded(seen.length)).state;
    }
    expect(state.outcome).toBe('victoria');
    expect(seen).toEqual([...content.forms.map((f) => f.island), 'corazon']);
    expect(state.answers).toHaveLength(totalHits(plan));
    expect(finaleAccuracy(state)).toBe(1);
    expect(finaleDensity(state)).toBe(0);
  });

  it('cada error apaga un fragmento y sin luz hay que retirarse', () => {
    const plan = finalePlan(1);
    let state = startFinale(content, plan, {}, seeded(3));
    for (let i = 0; i < plan.lights; i++) {
      expect(state.outcome).toBe('en-curso');
      const { state: next, event } = answerFinale(state, content, {}, wrong(state), seeded(i));
      expect(event.correct).toBe(false);
      expect(next.lights).toBe(state.lights - 1);
      state = next;
    }
    expect(state.outcome).toBe('retirada');
    expect(state.cleared).toEqual([]);
  });

  it('se agota el tiempo: cuenta como error y no disipa la forma', () => {
    const state = startFinale(content, finalePlan(3), {}, seeded(1));
    const { state: next, event } = answerFinale(state, content, {}, null, seeded(2));
    expect(event.correct).toBe(false);
    expect(next.form).toBe(0);
    expect(next.consecutiveMisses).toBe(1);
  });

  it('anuncia qué forma se disipa y lleva la cuenta por competencia', () => {
    const plan = finalePlan(1);
    let state = startFinale(content, plan, {}, seeded(5));
    state = answerFinale(state, content, {}, wrong(state), seeded(1)).state;
    const { state: next, event } = answerFinale(state, content, {}, right(state), seeded(2));
    expect(event.formCleared).toBe(content.forms[0]?.island);
    const first = content.forms[0]?.island ?? 'comunicarte';
    expect(lightByCompetency(next)[first]).toEqual({ correct: 1, total: 2 });
  });
});
