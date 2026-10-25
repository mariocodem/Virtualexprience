import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { huertaContentSchema, type HuertaContent } from '@/data/contentSchemas';
import raw from '@/data/content/latidosocial-huerta.json';
import {
  assign,
  EXHAUSTION_COST,
  energyLeft,
  huertaPlan,
  INDICATORS,
  isFinished,
  nextMoon,
  report,
  resolveMoon,
  REST,
  selectMoons,
  soilFactor,
  startHuerta,
  validAssignment,
  type HuertaState,
  type Moon,
} from '@/minigames/huerta-comunitaria/engine';

const content: HuertaContent = huertaContentSchema.parse(raw);
const groups = content.groups.map((g) => g.id);

/** Cada grupo en la tarea de su saber, si le queda energía; si no, descansa. */
function care(state: HuertaState, moon: Moon): Record<string, string> {
  return Object.fromEntries(
    groups.map((g) => {
      const task = moon.tasks.find((t) => t.fits.includes(g));
      const ok = task && !state.resting.includes(g) && energyLeft(state, g) > 0;
      return [g, ok ? task.id : REST];
    }),
  );
}

/** Como `care`, pero quien no tiene tarea afín ayuda en la siembra si le queda energía. */
function generous(state: HuertaState, moon: Moon): Record<string, string> {
  const sow = moon.tasks.find((t) => (t.effects.familias ?? 0) > 0)?.id ?? REST;
  return Object.fromEntries(
    Object.entries(care(state, moon)).map(([g, choice]) => {
      const free = !state.resting.includes(g) && energyLeft(state, g) > 0;
      return [g, choice === REST && free ? sow : choice];
    }),
  );
}

/** Todos a la primera tarea, siempre que se pueda, sin mirar saberes ni energía. */
function rush(state: HuertaState, moon: Moon): Record<string, string> {
  const first = moon.tasks[0]?.id ?? REST;
  return Object.fromEntries(groups.map((g) => [g, state.resting.includes(g) ? REST : first]));
}

const best = (moon: Moon) => moon.dilemma.options.find((o) => o.quality === 1)?.id ?? '';
const worst = (moon: Moon) =>
  [...moon.dilemma.options].sort((a, b) => a.quality - b.quality)[0]?.id ?? '';

function season(
  moons: Moon[],
  level: number,
  plan: (s: HuertaState, m: Moon) => Record<string, string>,
  decide: (m: Moon) => string,
) {
  let state = startHuerta(content, moons, huertaPlan(level));
  for (const moon of moons) {
    state = assign(state, content, moon, plan(state, moon));
    state = resolveMoon(state, moon, decide(moon));
    state = nextMoon(state);
  }
  return state;
}

describe('La huerta comunitaria', () => {
  it('a más nivel, lunas más sutiles y menos margen de energía', () => {
    expect(huertaPlan(5).energyBonus).toBeLessThan(huertaPlan(1).energyBonus);
    expect(huertaPlan(5).tiers).not.toContain(1);
  });

  it('exige una tarea o descanso por grupo', () => {
    const [moon] = content.moons as [Moon];
    const state = startHuerta(content, [moon], huertaPlan(3));
    const partial = { abuelas: REST };
    expect(validAssignment(state, content, moon, partial)).toBe(false);
    expect(assign(state, content, moon, partial)).toBe(state);
    expect(validAssignment(state, content, moon, care(state, moon))).toBe(true);
  });

  it('el saber del grupo rinde el doble y la salud del suelo multiplica la siembra', () => {
    const [moon] = content.moons as [Moon];
    const seeds = moon.tasks.find((t) => (t.effects.familias ?? 0) > 0);
    if (!seeds) throw new Error('La primera luna necesita una siembra.');
    const [fit] = seeds.fits as [string];
    const other = groups.find((g) => !seeds.fits.includes(g)) ?? '';
    const base = startHuerta(content, [moon], huertaPlan(3));
    const only = (g: string) =>
      Object.fromEntries(groups.map((x) => [x, x === g ? seeds.id : REST]));
    const doubled = assign(base, content, moon, only(fit));
    const single = assign(base, content, moon, only(other));
    expect(doubled.familias).toBe(2 * single.familias);
    expect(doubled.log[0]?.fits).toEqual([fit]);
    const rich = assign({ ...base, suelo: 100 }, content, moon, only(fit));
    expect(rich.familias).toBe(Math.round(doubled.familias * soilFactor(100)));
  });

  it('trabajar más allá de la energía agota: rinde la mitad, baja la participación y obliga a descansar', () => {
    const moons = content.moons.slice(0, 2);
    const [first, second] = moons as [Moon, Moon];
    const level = 3;
    let state = startHuerta(content, moons, huertaPlan(level));
    const tired = content.groups.find((g) => g.energy === 1);
    if (!tired) throw new Error('El contenido necesita un grupo de poca energía.');
    const everyone = (moon: Moon) =>
      Object.fromEntries(groups.map((g) => [g, moon.tasks[0]?.id ?? REST]));
    state = nextMoon(
      resolveMoon(assign(state, content, first, everyone(first)), first, best(first)),
    );
    expect(energyLeft(state, tired.id)).toBe(0);
    const before = state.comunidad;
    state = assign(state, content, second, everyone(second));
    const moon = state.log[1];
    expect(moon?.exhausted).toContain(tired.id);
    const cost = EXHAUSTION_COST * (moon?.exhausted.length ?? 0);
    expect(state.comunidad).toBe(Math.max(0, before + (moon?.work.comunidad ?? 0) - cost));
    state = nextMoon(resolveMoon(state, second, best(second)));
    expect(isFinished(state)).toBe(true);
    expect(state.resting).toContain(tired.id);
  });

  it('en cualquier nivel, cuidar y aprovechar los saberes alcanza la meta; apurar a todos no', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const moons = selectMoons(content.moons, huertaPlan(level), seeded(seed));
        const good = report(season(moons, level, care, best), content);
        const bad = report(season(moons, level, rush, worst), content);
        expect(good.familias, `nivel ${String(level)}`).toBeGreaterThanOrEqual(content.goal);
        expect(good.exhaustions).toBe(0);
        expect(good.accuracy).toBe(1);
        expect(bad.accuracy).toBeLessThan(0.5);
        // Las manos extra no restan aprovechamiento de saberes.
        const helped = report(season(moons, level, generous, best), content);
        expect(helped.accuracy).toBe(1);
        expect(helped.exhaustions).toBe(0);
        expect(good.toolsUsed).toBe(groups.length);
        expect(good.score).toBeGreaterThan(0.9);
        expect(bad.score, `nivel ${String(level)}`).toBeLessThan(0.6);
        expect(bad.exhaustions).toBeGreaterThan(0);
      }
    }
  });

  it('el contenido es coherente: saberes, indicadores y una siembra o cosecha por luna', () => {
    for (const moon of content.moons) {
      expect(
        moon.tasks.some((t) => (t.effects.familias ?? 0) > 0),
        moon.id,
      ).toBe(true);
      expect(new Set(moon.tasks.map((t) => t.id)).size).toBe(moon.tasks.length);
      for (const task of moon.tasks) {
        for (const g of task.fits) expect(groups, `${moon.id}/${task.id}`).toContain(g);
        for (const key of Object.keys(task.effects)) expect(INDICATORS).toContain(key);
      }
      for (const option of moon.dilemma.options) {
        for (const key of Object.keys(option.effects)) expect(INDICATORS).toContain(key);
      }
    }
    for (const g of groups) {
      const fits = content.moons.filter((m) => m.tasks.some((t) => t.fits.includes(g))).length;
      expect(fits, g).toBeGreaterThanOrEqual(3);
    }
  });
});
