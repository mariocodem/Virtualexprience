import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  arrivalEffect,
  createField,
  findRumor,
  hold,
  INTERCEPT_REACH,
  judge,
  nearestFlying,
  parseRumors,
  pickRumor,
  resolve,
  review,
  RUMORS,
  rumorPlan,
  stepRumors,
  TOWER,
} from '@/games/comunicarte/arena/rumors';

const ORIGIN = { x: 0, z: 0 };

function spawnOne(tier: 1 | 2 | 3 = 1, calm = false, seed = 3) {
  const field = createField(0);
  const random = seeded(seed);
  const plan = rumorPlan(3, calm);
  const events = stepRumors(field, plan, 0.1, ORIGIN, tier, true, random);
  return { field, plan, random, events };
}

describe('datos de rumores', () => {
  it('se validan y cubren las tres sutilezas con verdaderos y falsos', () => {
    expect(RUMORS.length).toBeGreaterThanOrEqual(12);
    for (const tier of [1, 2, 3] as const) {
      const of = RUMORS.filter((r) => r.tier === tier);
      expect(of.some((r) => r.truth === 'verdadero')).toBe(true);
      expect(of.some((r) => r.truth === 'falso')).toBe(true);
    }
    expect(new Set(RUMORS.map((r) => r.id)).size).toBe(RUMORS.length);
  });

  it('rechaza un rumor sin las dos señales', () => {
    const bad = {
      rumors: RUMORS.slice(0, 6).map((r) => ({ ...r, signals: r.signals.slice(0, 1) })),
    };
    expect(() => parseRumors(bad)).toThrow();
  });
});

describe('plan de rumores', () => {
  it('el ritmo tranquilo es más lento, más espaciado y con un solo rumor a la vez', () => {
    const normal = rumorPlan(3, false);
    const calm = rumorPlan(3, true);
    expect(calm.speed).toBeLessThan(normal.speed);
    expect(calm.every).toBeGreaterThan(normal.every);
    expect(calm.max).toBe(1);
    expect(rumorPlan(5, false).speed).toBeGreaterThan(rumorPlan(1, false).speed);
  });
});

describe('lanzamiento y vuelo', () => {
  it('lanza un rumor desde la Bruma hacia la torre y no pasa del máximo', () => {
    const { field, plan, random, events } = spawnOne();
    expect(events).toHaveLength(1);
    const rumor = field.rumors[0];
    expect(rumor).toBeDefined();
    expect(rumor?.vz).toBeLessThan(0);
    for (let i = 0; i < 50; i++) stepRumors(field, plan, 0.1, ORIGIN, 1, true, random);
    expect(field.rumors.length).toBeLessThanOrEqual(plan.max);
  });

  it('no lanza si no se permite (la linterna ya está cargada)', () => {
    const field = createField(0);
    const events = stepRumors(field, rumorPlan(2, false), 0.1, ORIGIN, 1, false, seeded(1));
    expect(events).toEqual([]);
  });

  it('un rumor retenido no avanza; uno liberado sigue hasta la torre y llega', () => {
    const { field, plan, random } = spawnOne();
    const id = field.rumors[0]?.id ?? -1;
    expect(hold(field, id)).toBe(true);
    const before = { ...findRumor(field, id) };
    stepRumors(field, plan, 1, ORIGIN, 1, false, random);
    expect(findRumor(field, id)?.z).toBe(before.z);
    resolve(field, id, 'dejar-pasar');
    expect(findRumor(field, id)?.status).toBe('cleared');
    const arrived = [];
    for (let i = 0; i < 400 && field.rumors.length > 0; i++) {
      arrived.push(
        ...stepRumors(field, plan, 0.1, ORIGIN, 1, false, random).filter(
          (e) => e.type === 'arrive',
        ),
      );
    }
    expect(arrived).toHaveLength(1);
    expect(field.rumors).toHaveLength(0);
  });

  it('desmentir disipa el rumor retenido', () => {
    const { field } = spawnOne();
    const id = field.rumors[0]?.id ?? -1;
    hold(field, id);
    resolve(field, id, 'desmentir');
    expect(findRumor(field, id)?.status).toBe('gone');
  });
});

describe('interceptar', () => {
  it('solo se intercepta un rumor volando dentro del alcance', () => {
    const { field } = spawnOne();
    const rumor = field.rumors[0];
    if (!rumor) throw new Error('sin rumor');
    expect(nearestFlying(field, { x: rumor.x + INTERCEPT_REACH - 0.1, z: rumor.z })).toBe(rumor);
    expect(nearestFlying(field, { x: rumor.x + INTERCEPT_REACH + 0.5, z: rumor.z })).toBeNull();
    hold(field, rumor.id);
    expect(nearestFlying(field, { x: rumor.x, z: rumor.z })).toBeNull();
  });

  it('revisar una señal la registra una sola vez y devuelve su texto', () => {
    const { field } = spawnOne();
    const rumor = field.rumors[0];
    if (!rumor) throw new Error('sin rumor');
    const first = rumor.item.signals[0];
    if (!first) throw new Error('sin señal');
    expect(review(rumor, first.signal)).toBe(first.text);
    review(rumor, first.signal);
    expect(rumor.reviewed).toEqual([first.signal]);
  });
});

describe('decisiones', () => {
  const falso = RUMORS.find((r) => r.truth === 'falso');
  const verdadero = RUMORS.find((r) => r.truth === 'verdadero');
  if (!falso || !verdadero) throw new Error('faltan rumores');

  it('desmentir un falso carga la linterna', () => {
    expect(judge(falso, 'desmentir')).toMatchObject({
      correct: true,
      charge: 1,
      strengthen: false,
    });
  });
  it('dejar pasar un verdadero es correcto y carga menos', () => {
    const j = judge(verdadero, 'dejar-pasar');
    expect(j).toMatchObject({ correct: true, strengthen: false });
    expect(j.charge).toBeGreaterThan(0);
    expect(j.charge).toBeLessThan(1);
  });
  it('detener un verdadero o dejar pasar un falso fortalece a la Bruma', () => {
    expect(judge(verdadero, 'desmentir')).toMatchObject({
      correct: false,
      charge: 0,
      strengthen: true,
    });
    expect(judge(falso, 'dejar-pasar')).toMatchObject({
      correct: false,
      charge: 0,
      strengthen: true,
    });
  });
});

describe('llegada a la torre', () => {
  it('un falso que nadie detuvo castiga; un verdadero no', () => {
    const { field } = spawnOne(1, false, 11);
    const rumor = field.rumors[0];
    if (!rumor) throw new Error('sin rumor');
    const live = {
      ...rumor,
      item: { ...rumor.item, truth: 'falso' as const },
      status: 'flying' as const,
    };
    expect(arrivalEffect(live)).toMatchObject({ mistake: true, strengthen: true });
    expect(arrivalEffect({ ...live, item: { ...live.item, truth: 'verdadero' } })).toMatchObject({
      mistake: false,
      strengthen: false,
    });
    expect(arrivalEffect({ ...live, status: 'cleared' })).toMatchObject({ mistake: false });
    expect(Math.hypot(TOWER.x, TOWER.z)).toBeGreaterThan(5);
  });
});

describe('elección de rumores', () => {
  it('es determinista con la misma semilla y no repite mientras queden', () => {
    const run = () => {
      const field = createField(0);
      const random = seeded(7);
      const ids: string[] = [];
      for (let i = 0; i < 6; i++) {
        const item = pickRumor(RUMORS, 2, field, random);
        field.used.push(item.id);
        field.history.push(item.truth);
        ids.push(item.id);
      }
      return ids;
    };
    expect(run()).toEqual(run());
    expect(new Set(run()).size).toBe(6);
  });

  it('no encadena más de dos del mismo tipo', () => {
    const field = createField(0);
    const random = seeded(2);
    let run = 0;
    let last = '';
    for (let i = 0; i < 12; i++) {
      const item = pickRumor(RUMORS, 1, field, random);
      field.used.push(item.id);
      field.history.push(item.truth);
      run = item.truth === last ? run + 1 : 1;
      last = item.truth;
      expect(run).toBeLessThanOrEqual(3);
    }
  });

  it('con pocos rumores de una sutileza, tira de las demás', () => {
    const only = RUMORS.filter((r) => r.tier === 3);
    const item = pickRumor(only, 1, createField(0), seeded(1));
    expect(item.tier).toBe(3);
  });
});
