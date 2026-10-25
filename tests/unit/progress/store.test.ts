import { beforeEach, describe, expect, it } from 'vitest';
import { world } from '@/data';
import { createProgressStore, PROGRESS_STORAGE_KEY } from '@/progress/store';
import { DAY_1 } from './helpers';

describe('store de progreso', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('las acciones devuelven los eventos y persisten en localStorage', () => {
    const store = createProgressStore(world, () => DAY_1);
    const events = store.getState().completeStation('comunicarte-imprenta', 1);
    expect(events).toContainEqual({ type: 'xp', amount: 30 });
    expect(store.getState().xp).toBe(30);

    const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}') as {
      state: { xp: number; stations: Record<string, unknown> };
    };
    expect(saved.state.xp).toBe(30);
    expect(saved.state.stations).toHaveProperty('comunicarte-imprenta');
    expect(saved.state).not.toHaveProperty('completeStation');
  });

  it('recupera el progreso guardado al crear otro store (otra sesión)', () => {
    createProgressStore(world, () => DAY_1)
      .getState()
      .visitIsland('comunicarte');
    const next = createProgressStore(world, () => DAY_1);
    expect(next.getState().visitedIslands).toEqual(['comunicarte']);
  });

  it('ignora datos guardados corruptos en vez de romper la app', () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ state: { xp: 'mucho' }, version: 1 }),
    );
    const store = createProgressStore(world, () => DAY_1);
    expect(store.getState().xp).toBe(0);
    expect(store.getState().stations).toEqual({});
  });

  it('reiniciar deja el progreso como el primer día', () => {
    const store = createProgressStore(world, () => DAY_1);
    store.getState().completeStation('comunicarte-imprenta', 1);
    store.getState().replace({
      ...store.getState(),
      fragments: world.islands.map((i) => i.id),
    });
    store.getState().recordFinale(1, true);
    store.getState().reset();
    expect(store.getState().xp).toBe(0);
    expect(store.getState().journal).toEqual([]);
    expect(store.getState().finale).toBeNull();
  });

  it('lee el progreso guardado antes del Gran Reto, que no traía ese registro', () => {
    const before = Object.fromEntries(
      Object.entries(createProgressStore(world, () => DAY_1).getState()).filter(
        ([key]) => key !== 'finale',
      ),
    );
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ state: { ...before, xp: 40 }, version: 1 }),
    );
    const store = createProgressStore(world, () => DAY_1);
    expect(store.getState().xp).toBe(40);
    expect(store.getState().finale).toBeNull();
  });
});
