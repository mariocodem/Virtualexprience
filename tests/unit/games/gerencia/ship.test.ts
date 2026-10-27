import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  aimTolerance,
  assignSailor,
  bearingToBruma,
  chargeShip,
  createShip,
  DEFAULT_CREW,
  MIN_ORBIT,
  SEA_RADIUS,
  stepShip,
  strengthenShip,
  tempo,
  windEfficiency,
  type ShipConfig,
  type ShipEvent,
  type ShipInput,
  type ShipState,
} from '@/games/gerencia/timon/ship';

const config: ShipConfig = { level: 3, goal: 3, lights: 4, calm: false };
const calmConfig: ShipConfig = { ...config, calm: true };
const idle: ShipInput = { rudder: 0, sail: 0, fire: false };
/** Un timón suave que mantiene al barco dando vueltas por el anillo de mar. */
const orbit: ShipInput = { rudder: 0.25, sail: 0, fire: false };
const immortal: ShipConfig = { ...config, lights: 99 };
const DT = 1 / 60;

function run(
  state: ShipState,
  seconds: number,
  input: ShipInput = idle,
  cfg = config,
  seed = 1,
): ShipEvent[] {
  const random = seeded(seed);
  const events: ShipEvent[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...stepShip(state, cfg, input, DT, random));
  return events;
}

/** Sin peligros: pone la cuenta de ataques fuera de alcance para probar solo la física. */
const quiet = (state: ShipState) => {
  state.attackIn = 9999;
  return state;
};

describe('tripulación', () => {
  it('manda un marinero desde la estación con más gente', () => {
    expect(assignSailor(DEFAULT_CREW, 'velas')).toEqual({ velas: 2, bomba: 1, linterna: 0 });
    expect(assignSailor({ velas: 2, bomba: 1, linterna: 0 }, 'bomba')).toEqual({
      velas: 1,
      bomba: 2,
      linterna: 0,
    });
    expect(assignSailor({ velas: 1, bomba: 2, linterna: 0 }, 'linterna')).toEqual(DEFAULT_CREW);
  });

  it('no cambia nada si todos ya están allí, y siempre suma tres', () => {
    const all = { velas: 3, bomba: 0, linterna: 0 };
    expect(assignSailor(all, 'velas')).toBe(all);
    let crew = { ...DEFAULT_CREW };
    for (const to of ['bomba', 'bomba', 'velas', 'linterna', 'velas', 'velas'] as const) {
      crew = assignSailor(crew, to);
      expect(crew.velas + crew.bomba + crew.linterna).toBe(3);
    }
  });
});

describe('barco', () => {
  it('con alguien en las velas gana velocidad; sin nadie, no hay velocidad', () => {
    const sailing = quiet(createShip(config));
    run(sailing, 6, orbit);
    expect(sailing.speed).toBeGreaterThan(2.5);

    const dead = quiet(createShip(config));
    dead.crew = { velas: 0, bomba: 2, linterna: 1 };
    run(dead, 6);
    expect(dead.speed).toBeCloseTo(0, 5);
  });

  it('dos marineros en las velas rinden más que uno', () => {
    const one = quiet(createShip(config));
    const two = quiet(createShip(config));
    two.crew = { velas: 2, bomba: 1, linterna: 0 };
    run(one, 5, orbit);
    run(two, 5, orbit);
    expect(two.speed).toBeGreaterThan(one.speed);
  });

  it('el viento en popa rinde más que de proa', () => {
    expect(windEfficiency(0, 0)).toBeGreaterThan(windEfficiency(Math.PI, 0));
    expect(windEfficiency(Math.PI, 0)).toBeGreaterThan(0.4);
  });

  it('sin nadie en la bomba entra agua y el barco se hace lento; con bomba se achica', () => {
    const dry = quiet(createShip(config));
    run(dry, 60);
    expect(dry.water).toBe(0);

    const wet = quiet(createShip(config));
    wet.crew = { velas: 2, bomba: 0, linterna: 1 };
    const fast = quiet(createShip(config));
    fast.crew = { velas: 2, bomba: 0, linterna: 1 };
    run(fast, 6);
    run(wet, 40);
    expect(wet.water).toBeGreaterThan(0.5);
    expect(wet.speed).toBeLessThan(fast.speed);
    wet.crew = { velas: 1, bomba: 2, linterna: 0 };
    const before = wet.water;
    run(wet, 10);
    expect(wet.water).toBeLessThan(before);
  });

  it('avisa una sola vez cuando el agua es alta', () => {
    const state = quiet(createShip(config));
    state.crew = { velas: 2, bomba: 0, linterna: 1 };
    const events = run(state, 40);
    expect(events.filter((e) => e.type === 'agua-alta')).toHaveLength(1);
  });

  it('el timón gira con inercia y casi no gira parado', () => {
    const moving = quiet(createShip(config));
    run(moving, 4);
    const h0 = moving.heading;
    run(moving, 0.2, { ...idle, rudder: 1 });
    const early = moving.heading - h0;
    run(moving, 2, { ...idle, rudder: 1 });
    expect(early).toBeGreaterThan(0);
    expect(moving.heading - h0).toBeGreaterThan(early * 3);
    expect(moving.rudder).toBeGreaterThan(0.9);

    const parked = quiet(createShip(config));
    parked.crew = { velas: 0, bomba: 2, linterna: 1 };
    run(parked, 2, { ...idle, rudder: 1 });
    expect(Math.abs(parked.heading - Math.PI)).toBeLessThan(moving.heading - h0);
  });

  it('las velas se abren y se recogen con W y S', () => {
    const state = quiet(createShip(config));
    run(state, 2, { ...idle, sail: 1 });
    expect(state.trim).toBe(1);
    run(state, 3, { ...idle, sail: -1 });
    expect(state.trim).toBe(0);
  });

  it('se queda dentro del mar: ni el borde ni los bajíos', () => {
    const state = quiet(createShip(config));
    state.heading = Math.PI / 2;
    const events = run(state, 12);
    expect(Math.hypot(state.x, state.z)).toBeLessThanOrEqual(SEA_RADIUS);
    expect(events.some((e) => e.type === 'borde')).toBe(true);

    const toward = quiet(createShip(config));
    toward.heading = -Math.PI / 2;
    const e2 = run(toward, 8);
    expect(Math.hypot(toward.x, toward.z)).toBeGreaterThanOrEqual(MIN_ORBIT - 0.01);
    expect(e2.some((e) => e.type === 'bajio')).toBe(true);
  });
});

describe('linterna y haz', () => {
  /** Sitúa el barco con la proa hacia la Bruma. */
  const aimed = (offset = 0) => {
    const state = quiet(createShip(config));
    state.x = 0;
    state.z = 14;
    state.heading = -Math.PI / 2 + offset;
    state.speed = 0;
    return state;
  };
  const fire: ShipInput = { ...idle, fire: true };

  it('sin carga no dispara', () => {
    const state = aimed();
    expect(stepShip(state, config, fire, DT, seeded(1))).toEqual([{ type: 'sin-carga' }]);
  });

  it('sin nadie en la linterna no dispara aunque haya carga', () => {
    const state = aimed();
    state.crew = { velas: 2, bomba: 1, linterna: 0 };
    chargeShip(state);
    expect(stepShip(state, config, fire, DT, seeded(1))).toEqual([{ type: 'sin-linterna' }]);
    expect(state.charge).toBe(1);
  });

  it('apuntando la proa a la Bruma golpea; de lado, se pierde', () => {
    const good = aimed();
    chargeShip(good);
    const ev = stepShip(good, config, fire, DT, seeded(1));
    expect(ev).toContainEqual({ type: 'haz', hit: true });
    expect(good.bruma.hits).toBe(1);
    expect(good.charge).toBe(0);

    const bad = aimed(0.9);
    chargeShip(bad);
    const miss = stepShip(bad, config, fire, DT, seeded(1));
    expect(miss).toContainEqual({ type: 'haz', hit: false });
    expect(bad.bruma.hits).toBe(0);
    expect(bad.charge).toBe(0);
  });

  it('el ritmo tranquilo y dos marineros ensanchan la puntería; de cerca también', () => {
    expect(aimTolerance(true, 1, 10)).toBeGreaterThan(aimTolerance(false, 1, 10));
    expect(aimTolerance(false, 2, 10)).toBeGreaterThan(aimTolerance(false, 1, 10));
    expect(aimTolerance(false, 1, 4)).toBeGreaterThan(aimTolerance(false, 1, 18));
    const state = aimed(0.3);
    expect(Math.abs(bearingToBruma(state).angle)).toBeCloseTo(0.3, 5);
    chargeShip(state);
    expect(stepShip(state, calmConfig, fire, DT, seeded(1))).toContainEqual({
      type: 'haz',
      hit: true,
    });
  });

  it('el último golpe da la victoria y cambia de fase por el camino', () => {
    const state = aimed();
    const events: ShipEvent[] = [];
    for (let i = 0; i < 3; i++) {
      chargeShip(state);
      events.push(...stepShip(state, config, fire, DT, seeded(1)));
    }
    expect(events.filter((e) => e.type === 'fase')).toHaveLength(2);
    expect(state.outcome).toBe('victoria');
    expect(events.at(-1)).toEqual({ type: 'victoria' });
    expect(stepShip(state, config, idle, DT, seeded(1))).toEqual([]);
  });

  it('un golpe despeja los peligros y aturde a la Bruma', () => {
    const state = aimed();
    state.rocks.push({ id: 90, x: 5, z: 5, warn: 1, total: 1, active: 0.3, r: 1.5 });
    chargeShip(state);
    stepShip(state, config, fire, DT, seeded(1));
    expect(state.rocks).toHaveLength(0);
    expect(state.bruma.stagger).toBeGreaterThan(0);
  });

  it('equivocarse fortalece a la Bruma: recupera medio golpe y ataca enseguida', () => {
    const state = aimed();
    state.bruma.hits = 2;
    state.attackIn = 5;
    strengthenShip(state);
    expect(state.bruma.hits).toBe(1.5);
    expect(state.attackIn).toBeLessThanOrEqual(0.4);
    state.bruma.hits = 0.2;
    strengthenShip(state);
    expect(state.bruma.hits).toBe(0);
  });
});

describe('peligros', () => {
  it('una roca avisa con su sombra y golpea al caer sobre el barco', () => {
    const state = quiet(createShip(config));
    state.speed = 0;
    state.crew = { velas: 0, bomba: 2, linterna: 1 };
    state.rocks.push({
      id: 90,
      x: state.x,
      z: state.z,
      warn: 0.5,
      total: 0.5,
      active: 0.35,
      r: 1.6,
    });
    run(state, 0.3);
    expect(state.lights).toBe(config.lights);
    const events = run(state, 0.4);
    expect(events).toContainEqual({ type: 'herido', lights: config.lights - 1 });
  });

  it('esquivar la roca evita el golpe', () => {
    const state = quiet(createShip(config));
    state.rocks.push({
      id: 90,
      x: state.x + 7,
      z: state.z + 7,
      warn: 0.2,
      total: 0.2,
      active: 0.35,
      r: 1.6,
    });
    run(state, 0.8);
    expect(state.lights).toBe(config.lights);
  });

  it('el golpe da escudo breve y abre una vía de agua que no se cierra', () => {
    const state = quiet(createShip(config));
    state.crew = { velas: 0, bomba: 2, linterna: 1 };
    for (let i = 0; i < 2; i++)
      state.rocks.push({
        id: 90 + i,
        x: state.x,
        z: state.z,
        warn: 0,
        total: 1,
        active: 0.35,
        r: 1.6,
      });
    run(state, 0.1);
    expect(state.lights).toBe(config.lights - 1);
    expect(state.shield).toBeGreaterThan(1);
    expect(state.leak).toBeGreaterThan(0);
  });

  it('un remolino activo jala el barco hacia su centro', () => {
    const state = quiet(createShip(config));
    state.crew = { velas: 0, bomba: 2, linterna: 1 };
    state.whirls.push({ id: 90, x: state.x + 3.5, z: state.z, r: 2.8, warn: 0, life: 5 });
    const x0 = state.x;
    run(state, 0.5);
    expect(state.x).toBeGreaterThan(x0 + 0.2);
  });

  it('un remolino aún en formación no jala', () => {
    const state = quiet(createShip(config));
    state.crew = { velas: 0, bomba: 2, linterna: 1 };
    state.whirls.push({ id: 90, x: state.x + 3.5, z: state.z, r: 2.8, warn: 5, life: 5 });
    run(state, 0.5);
    expect(state.x).toBeCloseTo(0, 3);
  });

  it('una ola golpea si el barco está en su arco y la esquiva quien está fuera', () => {
    const inArc = quiet(createShip(config));
    inArc.crew = { velas: 0, bomba: 2, linterna: 1 };
    inArc.waves.push({
      id: 90,
      angle: Math.atan2(inArc.z, inArc.x),
      radius: 12,
      half: 0.5,
      speed: 4,
    });
    const events = run(inArc, 2);
    expect(events.some((e) => e.type === 'herido')).toBe(true);

    const outside = quiet(createShip(config));
    outside.crew = { velas: 0, bomba: 2, linterna: 1 };
    outside.waves.push({
      id: 91,
      angle: Math.atan2(outside.z, outside.x) + 1.6,
      radius: 12,
      half: 0.5,
      speed: 4,
    });
    expect(run(outside, 2).some((e) => e.type === 'herido')).toBe(false);
  });

  it('con tres golpes de cuatro luces aún navega; al quedarse sin luces se retira una sola vez', () => {
    const state = quiet(createShip({ ...config, lights: 2 }));
    state.crew = { velas: 0, bomba: 2, linterna: 1 };
    const events: ShipEvent[] = [];
    for (let i = 0; i < 2; i++) {
      state.rocks.push({
        id: 90 + i,
        x: state.x,
        z: state.z,
        warn: 0,
        total: 1,
        active: 0.35,
        r: 1.6,
      });
      events.push(...run(state, 2));
    }
    expect(state.outcome).toBe('retirada');
    expect(events.filter((e) => e.type === 'retirada')).toHaveLength(1);
  });

  it('con el tiempo la Bruma lanza peligros de los tres tipos, y es determinista', () => {
    const a = createShip(immortal);
    const b = createShip(immortal);
    a.bruma.phase = 3;
    b.bruma.phase = 3;
    const ea = run(a, 120, idle, immortal, 7);
    const eb = run(b, 120, idle, immortal, 7);
    expect(ea).toEqual(eb);
    const kinds = new Set(ea.flatMap((e) => (e.type === 'ataque' ? [e.kind] : [])));
    expect(kinds).toEqual(new Set(['roca', 'remolino', 'ola']));
  });

  it('en fase 1 solo hay rocas y remolinos', () => {
    const state = createShip(immortal);
    const events = run(state, 90, idle, immortal, 3);
    const kinds = new Set(events.flatMap((e) => (e.type === 'ataque' ? [e.kind] : [])));
    expect(kinds.has('ola')).toBe(false);
  });
});

describe('ritmo tranquilo', () => {
  it('es claramente más amable: menos ataques, más aviso y más margen', () => {
    const normal = tempo(config);
    const calm = tempo(calmConfig);
    expect(calm.every).toBeGreaterThan(normal.every * 1.5);
    expect(calm.rockWarn).toBeGreaterThan(normal.rockWarn);
    expect(calm.whirlWarn).toBeGreaterThan(normal.whirlWarn);
    expect(calm.waveSpeed).toBeLessThan(normal.waveSpeed);
    expect(calm.rockRadius).toBeLessThan(normal.rockRadius);
    expect(calm.waveHalf).toBeLessThan(normal.waveHalf);
    expect(calm.inflow).toBeLessThan(normal.inflow);
    expect(calm.speedScale).toBeLessThan(normal.speedScale);
  });

  it('lanza menos peligros en el mismo tiempo y entra menos agua', () => {
    const count = (cfg: ShipConfig) =>
      run(quiet2(createShip({ ...cfg, lights: 99 })), 100, idle, { ...cfg, lights: 99 }, 5).filter(
        (e) => e.type === 'ataque',
      ).length;
    const quiet2 = (s: ShipState) => {
      s.attackIn = 1;
      return s;
    };
    expect(count(calmConfig)).toBeLessThan(count(config) * 0.7);

    const a = quiet(createShip(config));
    const b = quiet(createShip(calmConfig));
    a.crew = b.crew = { velas: 2, bomba: 0, linterna: 1 };
    run(a, 20);
    run(b, 20, idle, calmConfig);
    expect(b.water).toBeLessThan(a.water);
  });
});
