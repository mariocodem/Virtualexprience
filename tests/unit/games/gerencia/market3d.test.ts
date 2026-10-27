import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { mercadoContentSchema } from '@/data/contentSchemas';
import raw from '@/data/content/gerencia-mercado.json';
import { marketDecisions, orderDecision, pickDecision } from '@/games/gerencia/timon/decisions';
import {
  crateCount,
  crateFill,
  crateSlot,
  createQueue,
  dayLight,
  dayTarget,
  finishQueue,
  MAX_CRATES,
  planCustomers,
  queueProgress,
  splitEvenly,
  stepQueue,
  stockSlot,
  type Queue,
} from '@/games/gerencia/mercado/market3d';
import { closingTip, seasonReading } from '@/games/gerencia/mercado/report';
import {
  bestOrder,
  marketPlan,
  placeOrder,
  resolveDay,
  selectDays,
  startMarket,
  report,
  type DayResult,
} from '@/minigames/dia-de-mercado/engine';

const content = mercadoContentSchema.parse(raw);

describe('cajas del pedido', () => {
  it('una caja por cada 20 empanadas, con tope', () => {
    expect(crateCount(0)).toBe(0);
    expect(crateCount(20)).toBe(1);
    expect(crateCount(21)).toBe(2);
    expect(crateCount(80)).toBe(4);
    expect(crateCount(9999)).toBe(MAX_CRATES);
  });

  it('la última caja va a medias si el pedido no es múltiplo de 20', () => {
    expect(crateFill(75, 2)).toBe(1);
    expect(crateFill(75, 3)).toBeCloseTo(0.75);
    expect(crateFill(75, 4)).toBe(0);
  });

  it('las cajas se apilan sin encimarse: ocho por piso', () => {
    const slots = Array.from({ length: MAX_CRATES }, (_, i) => crateSlot(i));
    const keys = new Set(slots.map((s) => `${s.x.toFixed(2)}|${s.y.toFixed(2)}|${s.z.toFixed(2)}`));
    expect(keys.size).toBe(MAX_CRATES);
    expect(slots[0]?.y).toBeLessThan(slots[8]?.y ?? 0);
    expect(slots[7]?.y).toBe(slots[0]?.y);
  });

  it('las empanadas del mostrador tienen puesto propio', () => {
    const keys = new Set(
      Array.from({ length: 200 }, (_, i) => {
        const s = stockSlot(i);
        return `${s.x.toFixed(3)}|${s.z.toFixed(3)}`;
      }),
    );
    expect(keys.size).toBe(200);
  });
});

describe('clientes de la jornada', () => {
  it('reparte en partes casi iguales que suman el total', () => {
    expect(splitEvenly(10, 3)).toEqual([4, 3, 3]);
    expect(splitEvenly(0, 0)).toEqual([]);
    expect(splitEvenly(82, 9).reduce((a, b) => a + b, 0)).toBe(82);
  });

  it('los atendidos suman lo vendido y los que se van sin comprar, lo no atendido', () => {
    for (const [sold, missed, waste] of [
      [82, 0, 0],
      [60, 22, 0],
      [40, 15, 12],
      [0, 30, 0],
      [100, 0, 20],
    ] as const) {
      const plan = planCustomers({ sold, missed, waste });
      expect(plan.filter((c) => c.served).reduce((n, c) => n + c.qty, 0)).toBe(sold);
      expect(plan.filter((c) => !c.served).reduce((n, c) => n + c.qty, 0)).toBe(missed);
      expect(plan.length).toBeLessThanOrEqual(14);
    }
  });

  it('si se acabó el producto, los no atendidos van al final; si sobró, se cuelan a mitad', () => {
    const noStock = planCustomers({ sold: 80, missed: 30, waste: 0 });
    expect(noStock.at(-1)?.served).toBe(false);
    const tired = planCustomers({ sold: 80, missed: 30, waste: 10 });
    expect(tired.at(-1)?.served).toBe(true);
    expect(tired.some((c) => !c.served)).toBe(true);
  });
});

describe('fila del puesto', () => {
  const run = (q: Queue) => {
    finishQueue(q);
    return q;
  };

  it('termina con las mismas ventas y sobrantes que dijo el motor', () => {
    const plan = planCustomers({ sold: 70, missed: 20, waste: 10 });
    const q = run(createQueue(plan, 80));
    expect(q.done).toBe(true);
    expect(q.sold).toBe(70);
    expect(q.missed).toBe(20);
    expect(q.stock).toBe(10);
  });

  it('los clientes se atienden de uno en uno y en orden de llegada', () => {
    const q = createQueue(planCustomers({ sold: 60, missed: 0, waste: 0 }), 60);
    const buying: number[] = [];
    for (let i = 0; i < 4000 && !q.done; i++) {
      stepQueue(q, 0.05);
      const now = q.walkers.filter((w) => w.state === 'comprando');
      expect(now.length).toBeLessThanOrEqual(1);
      for (const w of now) if (buying.at(-1) !== w.plan.id) buying.push(w.plan.id);
    }
    expect(buying).toEqual([...buying].sort((a, b) => a - b));
  });

  it('nadie compra más de lo que hay y el progreso va de 0 a 1', () => {
    const q = createQueue(planCustomers({ sold: 45, missed: 0, waste: 5 }), 50);
    let last = -1;
    while (!q.done) {
      stepQueue(q, 0.05);
      expect(q.stock).toBeGreaterThanOrEqual(0);
      const p = queueProgress(q);
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
    expect(queueProgress(q)).toBe(1);
  });

  it('con un día sin ventas y sin clientes ya está terminado', () => {
    expect(createQueue([], 10).done).toBe(true);
  });

  it('los atendidos se van con bolsa y los otros, sin comprar', () => {
    const q = createQueue(planCustomers({ sold: 30, missed: 10, waste: 0 }), 30);
    finishQueue(q);
    expect(q.walkers.filter((w) => w.plan.served).every((w) => w.bag && !w.turned)).toBe(true);
    expect(q.walkers.filter((w) => !w.plan.served).every((w) => !w.bag && w.turned)).toBe(true);
  });
});

describe('el sol de la jornada', () => {
  it('amanece, avanza con las ventas y anochece', () => {
    expect(dayTarget('pedido', 0)).toBeLessThan(dayTarget('dilema', 0));
    expect(dayTarget('dilema', 0)).toBeLessThan(dayTarget('jornada', 0));
    expect(dayTarget('jornada', 0)).toBeLessThan(dayTarget('jornada', 1));
    expect(dayTarget('jornada', 1)).toBeLessThan(dayTarget('cierre', 1));
    expect(dayTarget('jornada', 7)).toBe(dayTarget('jornada', 1));
  });

  it('de día hay más luz que al amanecer y de noche casi nada', () => {
    const dawn = dayLight(0.04);
    const noon = dayLight(0.5);
    const night = dayLight(1.08);
    expect(noon.sunIntensity).toBeGreaterThan(dawn.sunIntensity);
    expect(dawn.sunIntensity).toBeGreaterThan(night.sunIntensity);
    expect(night.night).toBe(1);
    expect(noon.night).toBe(0);
    expect(noon.sunPos[1]).toBeGreaterThan(dawn.sunPos[1]);
    expect(dayLight(-5).sky).toBe(dayLight(-0.12).sky);
    expect(dayLight(9).sky).toBe(dayLight(1.08).sky);
    expect(dayLight(0.5).sky).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('mismo motor, mismas métricas', () => {
  const queue = selectDays(content.days, marketPlan(3), seeded(4));

  it('el motor y la escena cuentan lo mismo en cada jornada', () => {
    let state = startMarket(content, queue);
    for (const day of queue) {
      state = placeOrder(state, content, day, bestOrder(day));
      const option = [...day.dilemma.options].sort((a, b) => b.quality - a.quality)[0];
      if (!option) throw new Error('Sin opciones');
      state = resolveDay(state, content, day, option.id);
      const result = state.ledger.at(-1);
      if (!result) throw new Error('Sin resultado');
      const plan = planCustomers(result);
      const q = createQueue(plan, result.order);
      finishQueue(q);
      expect(q.sold).toBe(result.sold);
      expect(q.missed).toBe(result.missed);
      expect(q.stock).toBe(result.waste);
      state = { ...state, index: state.index + 1, phase: 'pedido', order: null };
    }
  });

  it('el informe usa el reporte del motor y el consejo cambia según el pedido', () => {
    const base: DayResult = {
      dayId: 'x',
      order: 80,
      best: 80,
      demand: 80,
      sold: 80,
      waste: 0,
      missed: 0,
      profit: 1,
      cash: 1,
      quality: 1,
    };
    expect(closingTip(base, 60)).toMatch(/respondió a los datos/);
    expect(closingTip({ ...base, order: 100 }, 60)).toMatch(/sobrante/);
    expect(closingTip({ ...base, order: 60 }, 60)).toMatch(/corto/);
    expect(closingTip(base, 20)).toMatch(/agotado/);

    let state = startMarket(content, queue);
    for (const day of queue) {
      state = placeOrder(state, content, day, bestOrder(day));
      const option = day.dilemma.options.find((o) => o.quality === 1);
      if (!option) throw new Error('Sin salida sólida');
      state = resolveDay(state, content, day, option.id);
      state = { ...state, index: state.index + 1, phase: 'pedido', order: null };
    }
    const result = report(state, content);
    const reading = seasonReading(state, result, content, (v) => `$${String(Math.round(v))}`);
    expect(result.accuracy).toBe(1);
    expect(reading.text).toMatch(/siguieron los datos/);
    expect(reading.highlights).toHaveLength(5);
  });
});

describe('decisiones con datos del contramaestre', () => {
  const market = marketDecisions(content);

  it('cada jornada da un pedido con una única respuesta correcta: la que responde a los datos', () => {
    for (const day of content.days) {
      const item = orderDecision(day, content.product.unit);
      expect(item.options.filter((o) => o.correct)).toHaveLength(1);
      expect(item.options.find((o) => o.correct)?.id).toBe(`o-${String(bestOrder(day))}`);
      expect(item.context).toContain(day.data[0]?.label);
    }
  });

  it('los dilemas con una sola salida sólida también son decisiones', () => {
    expect(market.length).toBeGreaterThan(content.days.length);
    for (const item of market) {
      expect(item.options.filter((o) => o.correct)).toHaveLength(1);
      expect(new Set(item.options.map((o) => o.id)).size).toBe(item.options.length);
    }
    expect(new Set(market.map((m) => m.id)).size).toBe(market.length);
  });

  it('alterna fuentes, respeta la sutileza de la fase y no repite mientras queden', () => {
    const own = market
      .slice(0, 3)
      .map((m, i) => ({ ...m, id: `propio-${String(i)}`, tier: 1 as const }));
    const random = seeded(2);
    const used: string[] = [];
    const first = pickDecision(own, market, 1, used, random);
    expect(first.id.startsWith('propio-')).toBe(true);
    used.push(first.id);
    const second = pickDecision(own, market, 1, used, random);
    expect(second.id.startsWith('propio-')).toBe(false);
    expect(second.tier).toBe(1);
    // Con solo tres embates propios (el Gran Reto), sigue habiendo decisiones de sobra.
    for (let i = 0; i < 12; i++) {
      const next = pickDecision(own, market, 2, used, random);
      expect(used).not.toContain(next.id);
      used.push(next.id);
    }
  });
});
