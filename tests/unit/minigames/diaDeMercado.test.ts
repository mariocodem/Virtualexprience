import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { mercadoContentSchema, type MercadoContent } from '@/data/contentSchemas';
import raw from '@/data/content/gerencia-mercado.json';
import {
  affordable,
  bestOrder,
  capacity,
  effectiveDemand,
  isFinished,
  marketPlan,
  nextDay,
  placeOrder,
  report,
  resolveDay,
  selectDays,
  startMarket,
  type MarketDay,
} from '@/minigames/dia-de-mercado/engine';

const content: MercadoContent = mercadoContentSchema.parse(raw);

function season(
  days: MarketDay[],
  order: (d: MarketDay) => number,
  option: (d: MarketDay) => string,
) {
  let state = startMarket(content, days);
  for (const day of days) {
    state = placeOrder(state, content, day, order(day));
    state = resolveDay(state, content, day, option(day));
    state = nextDay(state);
  }
  return state;
}

const bestOption = (d: MarketDay) =>
  [...d.dilemma.options].sort((a, b) => b.quality - a.quality)[0]?.id ?? '';
const worstOption = (d: MarketDay) =>
  [...d.dilemma.options].sort((a, b) => a.quality - b.quality)[0]?.id ?? '';
const biggestOrder = (d: MarketDay) => Math.max(...d.orders);

describe('Día de mercado', () => {
  it('a más nivel, más jornadas y datos más engañosos', () => {
    expect(marketPlan(5).days).toBeGreaterThan(marketPlan(1).days);
    expect(marketPlan(5).tiers).not.toContain(1);
  });

  it('el mejor pedido es el más cercano a la demanda', () => {
    const day = content.days.find((d) => d.id === 'dato-atipico');
    expect(day && bestOrder(day)).toBe(80);
  });

  it('la reputación ajusta la demanda y el ánimo, la capacidad de atención', () => {
    expect(effectiveDemand(80, 50)).toBe(80);
    expect(effectiveDemand(80, 90)).toBeGreaterThan(80);
    expect(effectiveDemand(80, 10)).toBeLessThan(80);
    expect(capacity(30)).toBeLessThan(capacity(80));
  });

  it('no se puede pedir más de lo que alcanza la caja', () => {
    const day = content.days.find((d) => d.id === 'festival-marea');
    if (!day) throw new Error('falta la jornada');
    const state = { ...startMarket(content, [day]), cash: 150_000 };
    expect(affordable(state, content, 200)).toBe(false);
    expect(placeOrder(state, content, day, 200)).toBe(state);
    expect(placeOrder(state, content, day, 75).phase).toBe('dilema');
  });

  it('lo que sobra se pierde y se descuenta de la caja', () => {
    const day = content.days.find((d) => d.id === 'manana-lluvia');
    if (!day) throw new Error('falta la jornada');
    let state = placeOrder(startMarket(content, [day]), content, day, 100);
    state = resolveDay(state, content, day, 'c');
    const result = state.ledger[0];
    expect(result?.waste).toBeGreaterThan(50);
    expect(result?.profit).toBeLessThan(0);
    expect(isFinished(nextDay(state))).toBe(true);
  });

  it('en cualquier nivel, leer los datos y liderar bien supera la meta; lo contrario no', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const days = selectDays(content.days, marketPlan(level), seeded(seed));
        const good = report(season(days, bestOrder, bestOption), content);
        expect(good.averageProfit, `nivel ${String(level)}`).toBeGreaterThanOrEqual(content.goal);
        expect(good.score).toBeGreaterThan(0.9);
        const bad = report(season(days, biggestOrder, worstOption), content);
        expect(bad.score, `nivel ${String(level)}`).toBeLessThan(0.6);
      }
    }
  });

  it('cada jornada tiene un pedido mejor sin empates y una salida sólida', () => {
    for (const day of content.days) {
      const distances = day.orders.map((o) => Math.abs(o - day.demand)).sort((a, b) => a - b);
      expect(distances[0], day.id).toBeLessThan(distances[1] ?? Infinity);
      expect(
        day.dilemma.options.some((o) => o.quality === 1),
        day.id,
      ).toBe(true);
    }
  });
});
