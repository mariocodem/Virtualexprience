import { describe, expect, it } from 'vitest';
import { bossConfig } from '@/ai/adaptiveEngine';
import { accuracy, answer, density, phaseFor, pickItem, seeded, startBattle } from '@/boss/engine';
import type { QuizItem } from '@/data/contentSchemas';

const item = (id: string, tier: 1 | 2 | 3): QuizItem => ({
  id,
  tier,
  prompt: `Embate ${id}`,
  options: [
    { id: 'a', text: 'Correcta', correct: true, feedback: 'Bien.' },
    { id: 'b', text: 'Incorrecta', correct: false, feedback: 'No.' },
  ],
  explanation: 'Porque sí.',
});

const ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) =>
  item(`i${String(n)}`, (((n - 1) % 3) + 1) as 1 | 2 | 3),
);

describe('batalla contra la Bruma', () => {
  it('cambia de fase al tercio y a los dos tercios de los aciertos', () => {
    expect([0, 1, 2, 3, 4, 5].map((h) => phaseFor(h, 6))).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('elige embates del nivel de la fase, sin repetir', () => {
    const random = seeded(1);
    const chosen = pickItem(ITEMS, 3, [], random);
    expect(chosen.tier).toBe(3);
    const used = ITEMS.filter((i) => i.tier === 3).map((i) => i.id);
    expect(pickItem(ITEMS, 3, used, random).tier).not.toBe(3);
  });

  it('con todos los aciertos la Bruma se disipa y la luz queda intacta', () => {
    const config = bossConfig(1);
    const random = seeded(7);
    let state = startBattle(config, ITEMS, random);
    const phases: number[] = [];
    while (state.outcome === 'en-curso') {
      const result = answer(state, ITEMS, 'a', random);
      if (result.event.phaseChanged) phases.push(result.event.phaseChanged);
      state = result.state;
    }
    expect(state.outcome).toBe('victoria');
    expect(state.hits).toBe(config.hitsToWin);
    expect(state.lights).toBe(config.lights);
    expect(density(state)).toBe(0);
    expect(accuracy(state)).toBe(1);
    expect(phases).toEqual([2, 3]);
  });

  it('cada error o tiempo agotado gasta luz y sin luz el explorador se retira', () => {
    const config = bossConfig(5);
    const random = seeded(3);
    let state = startBattle(config, ITEMS, random);
    state = answer(state, ITEMS, null, random).state;
    expect(state.lights).toBe(config.lights - 1);
    expect(state.consecutiveMisses).toBe(1);
    while (state.outcome === 'en-curso') state = answer(state, ITEMS, 'b', random).state;
    expect(state.outcome).toBe('retirada');
    expect(state.current).toBeNull();
  });

  it('es reproducible con la misma semilla', () => {
    const a = startBattle(bossConfig(3), ITEMS, seeded(42));
    const b = startBattle(bossConfig(3), ITEMS, seeded(42));
    expect(a.current).toBe(b.current);
  });

  it('no deja responder una batalla terminada', () => {
    const random = seeded(9);
    let state = startBattle(bossConfig(1), ITEMS, random);
    while (state.outcome === 'en-curso') state = answer(state, ITEMS, 'a', random).state;
    expect(() => answer(state, ITEMS, 'a', random)).toThrow();
  });
});
