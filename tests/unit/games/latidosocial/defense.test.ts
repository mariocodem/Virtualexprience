import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { BOSQUE } from '@/games/latidosocial/arena/data';
import {
  answerDilemma,
  assignGroup,
  createDefense,
  enduranceOf,
  fireCeiba,
  fogSpeed,
  pickNeed,
  stepDefense,
  type DefenseConfig,
  type DefenseEvent,
  type DefenseState,
} from '@/games/latidosocial/arena/defense';

const config: DefenseConfig = {
  level: 3,
  goal: 3,
  lights: 3,
  calm: false,
  tiers: [1, 2, 3],
};
const still = { move: { x: 0, z: 0 } };

function run(state: DefenseState, cfg: DefenseConfig, seconds: number, seed = 7) {
  const random = seeded(seed);
  const events: DefenseEvent[] = [];
  for (let t = 0; t < seconds; t += 0.05)
    events.push(...stepDefense(state, cfg, BOSQUE, still, 0.05, random));
  return events;
}

/** Espera a que el farol tenga llamado y devuelve el grupo que encaja. */
function waitForCall(state: DefenseState, farolId: string, cfg = config) {
  const random = seeded(3);
  for (let i = 0; i < 400; i++) {
    stepDefense(state, cfg, BOSQUE, still, 0.05, random);
    const farol = state.faroles.find((f) => f.id === farolId);
    if (farol?.need) return farol.need;
  }
  throw new Error('No llegó el llamado');
}

describe('data de la arena', () => {
  it('cada saber tiene un único grupo y llamados de las tres sutilezas', () => {
    expect(BOSQUE.faroles).toHaveLength(4);
    expect(new Set(BOSQUE.groups.map((g) => g.saber)).size).toBe(4);
  });
});

describe('niebla y faroles', () => {
  it('es determinista con la misma semilla', () => {
    const a = createDefense(config, BOSQUE);
    const b = createDefense(config, BOSQUE);
    run(a, config, 9, 11);
    run(b, config, 9, 11);
    expect(a.faroles.map((f) => f.need?.id)).toEqual(b.faroles.map((f) => f.need?.id));
    expect(a.faroles.map((f) => f.front)).toEqual(b.faroles.map((f) => f.front));
  });

  it('las oleadas empiezan escalonadas y cada farol pide un saber distinto', () => {
    const state = createDefense(config, BOSQUE);
    run(state, config, 14);
    const sabers = state.faroles.flatMap((f) => (f.need ? [f.need.saber] : []));
    expect(sabers.length).toBeGreaterThan(1);
    expect(new Set(sabers).size).toBe(sabers.length);
  });

  it('una oleada sin atender llega a la ceiba y cuesta una luz', () => {
    const state = createDefense(config, BOSQUE);
    const events = run(state, config, 40);
    expect(events.some((e) => e.type === 'golpe')).toBe(true);
    expect(state.lights).toBeLessThan(config.lights);
  });

  it('sin atender nunca, el bosque se retira', () => {
    const state = createDefense(config, BOSQUE);
    const events = run(state, config, 400);
    expect(state.outcome).toBe('retirada');
    expect(events.filter((e) => e.type === 'retirada')).toHaveLength(1);
  });

  it('el ritmo tranquilo hace la niebla más lenta y los grupos más resistentes', () => {
    const calm = { ...config, calm: true };
    expect(fogSpeed(calm, 1)).toBeLessThan(fogSpeed(config, 1));
    expect(enduranceOf(1, true)).toBeGreaterThan(enduranceOf(1, false));
  });

  it('pickNeed respeta la sutileza y evita sabores ya activos', () => {
    const random = seeded(5);
    for (let i = 0; i < 20; i++) {
      const need = pickNeed(BOSQUE, 2, [], ['semillas', 'agua', 'fuerza'], random);
      expect(need.saber).toBe('registros');
      expect(need.tier).toBe(2);
    }
  });
});

describe('asignar grupos', () => {
  it('el grupo con el saber disipa la oleada y llena la ceiba', () => {
    const state = createDefense(config, BOSQUE);
    const need = waitForCall(state, 'manantial');
    const group = need.fits[0] ?? '';
    const result = assignGroup(state, 'manantial', group);
    expect(result).toMatchObject({ ok: true, correct: true });
    const events = run(state, config, 12, 21);
    expect(events.some((e) => e.type === 'oleada' && e.farol === 'manantial')).toBe(true);
    expect(state.bloom).toBeGreaterThan(0);
  });

  it('un grupo equivocado no disipa, solo frena un poco, y fortalece a la Bruma', () => {
    const state = createDefense(config, BOSQUE);
    state.hits = 1;
    const need = waitForCall(state, 'semillero');
    const wrong = BOSQUE.groups.find((g) => !need.fits.includes(g.id))?.id ?? '';
    const result = assignGroup(state, 'semillero', wrong);
    expect(result.correct).toBe(false);
    expect(state.hits).toBe(0.5);
    const fog = state.faroles.find((f) => f.id === 'semillero')?.fog ?? 0;
    run(state, config, 3, 5);
    expect(state.faroles.find((f) => f.id === 'semillero')?.fog).toBe(fog);
  });

  it('un grupo vive en un solo farol y no se asigna sin llamado', () => {
    const state = createDefense(config, BOSQUE);
    expect(assignGroup(state, 'muelle', 'abuelas').ok).toBe(false);
    waitForCall(state, 'manantial');
    waitForCall(state, 'semillero');
    assignGroup(state, 'manantial', 'jovenes');
    assignGroup(state, 'semillero', 'jovenes');
    expect(state.faroles.find((f) => f.id === 'manantial')?.group).toBeNull();
    expect(state.faroles.find((f) => f.id === 'semillero')?.group).toBe('jovenes');
  });

  it('dejar libre un farol no cuenta como decisión', () => {
    const state = createDefense(config, BOSQUE);
    waitForCall(state, 'manantial');
    assignGroup(state, 'manantial', 'abuelas');
    expect(assignGroup(state, 'manantial', null)).toMatchObject({ ok: true, correct: null });
    expect(state.faroles.find((f) => f.id === 'manantial')?.group).toBeNull();
  });
});

describe('cansancio y rotación', () => {
  it('un grupo agotado deja su farol, descansa y baja la participación', () => {
    const state = createDefense({ ...config, lights: 99 }, BOSQUE);
    const cfg = { ...config, lights: 99 };
    waitForCall(state, 'manantial', cfg);
    assignGroup(state, 'manantial', 'abuelas');
    const random = seeded(2);
    const events: DefenseEvent[] = [];
    for (let t = 0; t < 40 && !events.some((e) => e.type === 'agotado'); t += 0.05)
      events.push(...stepDefense(state, cfg, BOSQUE, still, 0.05, random));
    expect(events.some((e) => e.type === 'cansado' && e.group === 'abuelas')).toBe(true);
    expect(events.some((e) => e.type === 'agotado' && e.group === 'abuelas')).toBe(true);
    expect(state.participation).toBeLessThan(1);
    expect(state.faroles.find((f) => f.id === 'manantial')?.group).not.toBe('abuelas');
  });

  it('no se puede asignar a un grupo que descansa, y vuelve al recuperarse', () => {
    const cfg = { ...config, lights: 99 };
    const state = createDefense(cfg, BOSQUE);
    waitForCall(state, 'manantial', cfg);
    assignGroup(state, 'manantial', 'abuelas');
    run(state, cfg, 18, 2);
    const abuelas = state.groups.find((g) => g.id === 'abuelas');
    expect(abuelas?.resting).toBe(true);
    waitForCall(state, 'semillero', cfg);
    expect(assignGroup(state, 'semillero', 'abuelas').ok).toBe(false);
    const events = run(state, cfg, 15, 4);
    expect(events.some((e) => e.type === 'descansado')).toBe(true);
  });

  it('rotar a tiempo evita el agotamiento: el grupo en reposo recupera energía', () => {
    const state = createDefense(config, BOSQUE);
    waitForCall(state, 'manantial');
    assignGroup(state, 'manantial', 'jovenes');
    run(state, config, 20, 2);
    const tired = state.groups.find((g) => g.id === 'jovenes')?.energy ?? 1;
    assignGroup(state, 'manantial', null);
    run(state, config, 10, 2);
    expect(state.groups.find((g) => g.id === 'jovenes')?.energy).toBeGreaterThan(tired);
  });
});

describe('la ceiba', () => {
  it('al llenarse pide una decisión; acertar carga el haz y fallar fortalece a la Bruma', () => {
    const state = createDefense(config, BOSQUE);
    state.bloom = 0.999;
    const need = waitForCall(state, 'manantial');
    assignGroup(state, 'manantial', need.fits[0] ?? '');
    const events = run(state, config, 2);
    expect(events.some((e) => e.type === 'asamblea')).toBe(true);
    expect(state.dilemma).toBe(true);
    answerDilemma(state, true);
    expect(state.charge).toBe(1);
    expect(state.dilemma).toBe(false);

    state.hits = 2;
    answerDilemma(state, false);
    expect(state.hits).toBe(1.5);
  });

  it('el haz exige carga, golpea siempre y gana con metas cortas', () => {
    const short = { ...config, goal: 1 };
    const state = createDefense(short, BOSQUE);
    expect(fireCeiba(state, short)).toEqual([{ type: 'sin-carga' }]);
    state.charge = 1;
    const events = fireCeiba(state, short);
    expect(events.map((e) => e.type)).toContain('haz');
    expect(events.at(-1)?.type).toBe('victoria');
    expect(state.outcome).toBe('victoria');
    expect(fireCeiba(state, short)).toEqual([]);
  });

  it('cambia de fase con los golpes de luz', () => {
    const state = createDefense({ ...config, goal: 6 }, BOSQUE);
    state.charge = 6;
    const phases = [];
    for (let i = 0; i < 6; i++) {
      for (const e of fireCeiba(state, { ...config, goal: 6 }))
        if (e.type === 'fase') phases.push(e.phase);
    }
    expect(phases).toEqual([2, 3]);
  });

  it('el explorador se mueve dentro del bosque y no atraviesa la ceiba', () => {
    const state = createDefense(config, BOSQUE);
    const random = seeded(1);
    for (let i = 0; i < 100; i++)
      stepDefense(state, config, BOSQUE, { move: { x: 0, z: -1 } }, 0.05, random);
    expect(Math.hypot(state.player.x, state.player.z)).toBeGreaterThanOrEqual(1.29);
    for (let i = 0; i < 400; i++)
      stepDefense(state, config, BOSQUE, { move: { x: 1, z: 1 } }, 0.05, random);
    expect(Math.hypot(state.player.x, state.player.z)).toBeLessThanOrEqual(9.8);
  });
});

describe('equilibrio', () => {
  function play(cfg: DefenseConfig, reaction: number, seed: number) {
    const state = createDefense(cfg, BOSQUE);
    const random = seeded(seed);
    let next = 0;
    for (let t = 0; t < 600 && state.outcome === 'en-curso'; t += 0.05) {
      stepDefense(state, cfg, BOSQUE, still, 0.05, random);
      if (state.dilemma) answerDilemma(state, true);
      if (state.charge >= 1) fireCeiba(state, cfg);
      if (t < next) continue;
      next = t + reaction;
      for (const farol of state.faroles) {
        const fit = farol.need?.fits[0];
        const group = state.groups.find((g) => g.id === fit);
        if (!farol.need || !group || group.resting || farol.group === fit) continue;
        assignGroup(state, farol.id, fit ?? null);
      }
      for (const farol of state.faroles) {
        const g = state.groups.find((x) => x.id === farol.group);
        if (g && g.energy < 0.2) assignGroup(state, farol.id, null);
      }
    }
    return state;
  }

  it('un jugador atento gana con luces de sobra, también en ritmo tranquilo', () => {
    for (const calm of [false, true]) {
      const cfg = { ...config, goal: 5, lights: 5, calm };
      for (const seed of [1, 2, 3]) {
        const state = play(cfg, 2, seed);
        expect(state.outcome).toBe('victoria');
        expect(state.lights).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
