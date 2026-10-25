import type { HuertaContent } from '@/data/contentSchemas';

/**
 * La huerta comunitaria (LatidoSocial). Cada luna se reparte el trabajo: cada
 * grupo toma una tarea o descansa. Un grupo rinde el doble en la tarea que
 * encaja con su saber; si trabaja más lunas seguidas de las que aguanta, se
 * agota: rinde la mitad, baja la participación y debe descansar la luna
 * siguiente. La salud del suelo multiplica lo que rinden siembras y cosechas.
 * Luego, un dilema de la comunidad.
 */

export type Moon = HuertaContent['moons'][number];
export type Task = Moon['tasks'][number];
export type Group = HuertaContent['groups'][number];

/** Asignación de quien no toma ninguna tarea esta luna. */
export const REST = 'descanso';

/** Participación que se pierde cada vez que un grupo se agota. */
export const EXHAUSTION_COST = 10;

/** Una tarea rinde como mucho el doble: más manos en la misma era no la hacen crecer más. */
export const MAX_UNITS = 2;

/** Indicadores que mueven las tareas y los dilemas. */
export const INDICATORS = ['familias', 'suelo', 'comunidad'] as const;

export interface HuertaPlan {
  level: number;
  moons: number;
  tiers: readonly (1 | 2 | 3)[];
  /** Lunas seguidas de más que aguanta cada grupo: a menos nivel, más margen. */
  energyBonus: number;
}

export function huertaPlan(level: number): HuertaPlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  const plans: Record<number, Omit<HuertaPlan, 'level'>> = {
    1: { moons: 5, tiers: [1, 2], energyBonus: 1 },
    2: { moons: 5, tiers: [1, 2], energyBonus: 1 },
    3: { moons: 5, tiers: [1, 2, 3], energyBonus: 0 },
    4: { moons: 5, tiers: [2, 3], energyBonus: 0 },
    5: { moons: 5, tiers: [2, 3], energyBonus: 0 },
  };
  const plan = plans[l] ?? plans[1];
  if (!plan) throw new Error('Plan inexistente.');
  return { level: l, ...plan };
}

/** Lunas de la temporada: al azar dentro del plan, en el orden del calendario. */
export function selectMoons(moons: Moon[], plan: HuertaPlan, random: () => number): Moon[] {
  const indexed = moons.map((moon, index) => ({ moon, index, key: random() }));
  const pool = indexed.filter((m) => plan.tiers.includes(m.moon.tier));
  const rest = indexed.filter((m) => !plan.tiers.includes(m.moon.tier));
  return [...pool.sort((a, b) => a.key - b.key), ...rest.sort((a, b) => a.key - b.key)]
    .slice(0, plan.moons)
    .sort((a, b) => a.index - b.index)
    .map((m) => m.moon);
}

/** Cuánto rinden siembras y cosechas según la salud del suelo (50 = sin ajuste). */
export function soilFactor(suelo: number): number {
  return 0.5 + suelo / 100;
}

export interface MoonResult {
  moonId: string;
  /** Tarea o descanso de cada grupo. */
  assignment: Record<string, string>;
  /** Grupos que trabajaron en una tarea que encaja con su saber. */
  fits: string[];
  /** Grupos que podían trabajar en su saber: tenían tarea afín y energía. */
  chances: string[];
  /** Grupos que trabajaron más allá de su energía. */
  exhausted: string[];
  /** Lo que movió el trabajo de la luna, por indicador. */
  work: Record<string, number>;
  /** Calidad de la decisión del dilema; nula hasta resolverlo. */
  quality: number | null;
  dilemma: Record<string, number>;
  /** Indicadores al empezar la luna, para leer cuánto cambiaron. */
  before: Indicators;
}

export type Indicator = (typeof INDICATORS)[number];
export type Indicators = Record<Indicator, number>;

export interface HuertaState {
  queue: string[];
  index: number;
  phase: 'reparto' | 'dilema' | 'cierre';
  familias: number;
  suelo: number;
  comunidad: number;
  /** Lunas seguidas que lleva trabajando cada grupo. */
  streak: Record<string, number>;
  /** Lunas seguidas que aguanta cada grupo sin agotarse. */
  stamina: Record<string, number>;
  /** Grupos agotados que deben descansar esta luna. */
  resting: string[];
  log: MoonResult[];
}

export function startHuerta(content: HuertaContent, queue: Moon[], plan: HuertaPlan): HuertaState {
  return {
    queue: queue.map((m) => m.id),
    index: 0,
    phase: 'reparto',
    familias: 0,
    suelo: 50,
    comunidad: 50,
    streak: Object.fromEntries(content.groups.map((g) => [g.id, 0])),
    stamina: Object.fromEntries(
      content.groups.map((g) => [g.id, Math.max(1, g.energy + plan.energyBonus)]),
    ),
    resting: [],
    log: [],
  };
}

export function currentMoonId(state: HuertaState): string | null {
  return state.queue[state.index] ?? null;
}

export function isFinished(state: HuertaState): boolean {
  return currentMoonId(state) === null;
}

/** Lunas de trabajo que le quedan al grupo antes de agotarse. */
export function energyLeft(state: HuertaState, groupId: string): number {
  return Math.max(0, (state.stamina[groupId] ?? 1) - (state.streak[groupId] ?? 0));
}

/** ¿Cada grupo tiene tarea o descanso, y quienes se agotaron descansan? */
export function validAssignment(
  state: HuertaState,
  content: HuertaContent,
  moon: Moon,
  assignment: Record<string, string>,
): boolean {
  return content.groups.every((g) => {
    const choice = assignment[g.id];
    if (choice === REST) return true;
    if (state.resting.includes(g.id)) return false;
    return moon.tasks.some((t) => t.id === choice);
  });
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function apply(state: HuertaState, delta: Record<string, number>): Indicators {
  return {
    familias: Math.max(0, state.familias + (delta.familias ?? 0)),
    suelo: clamp(state.suelo + (delta.suelo ?? 0)),
    comunidad: clamp(state.comunidad + (delta.comunidad ?? 0)),
  };
}

/** Reparte el trabajo de la luna y aplica lo que rinde. */
export function assign(
  state: HuertaState,
  content: HuertaContent,
  moon: Moon,
  assignment: Record<string, string>,
): HuertaState {
  if (state.phase !== 'reparto' || currentMoonId(state) !== moon.id) return state;
  if (!validAssignment(state, content, moon, assignment)) return state;
  const units: Record<string, number> = {};
  const streak = { ...state.streak };
  const fits: string[] = [];
  const exhausted: string[] = [];
  const chances = content.groups
    .map((g) => g.id)
    .filter(
      (g) =>
        moon.tasks.some((t) => t.fits.includes(g)) &&
        !state.resting.includes(g) &&
        energyLeft(state, g) > 0,
    );
  for (const group of content.groups) {
    const task = moon.tasks.find((t) => t.id === assignment[group.id]);
    if (!task) {
      streak[group.id] = 0;
      continue;
    }
    const fit = task.fits.includes(group.id);
    const tired = energyLeft(state, group.id) === 0;
    if (fit) fits.push(group.id);
    if (tired) exhausted.push(group.id);
    units[task.id] = (units[task.id] ?? 0) + (fit ? 2 : 1) * (tired ? 0.5 : 1);
    streak[group.id] = (streak[group.id] ?? 0) + 1;
  }
  const raw: Record<string, number> = {};
  const factor = soilFactor(state.suelo);
  for (const task of moon.tasks) {
    const u = Math.min(MAX_UNITS, units[task.id] ?? 0);
    for (const [key, value] of Object.entries(task.effects)) {
      const grown = key === 'familias' && value > 0 ? value * factor : value;
      raw[key] = (raw[key] ?? 0) + grown * u;
    }
  }
  const work = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round(v)]));
  const cost = { comunidad: -EXHAUSTION_COST * exhausted.length };
  const after = apply({ ...state, ...apply(state, work) }, cost);
  return {
    ...state,
    ...after,
    phase: 'dilema',
    streak,
    log: [
      ...state.log,
      {
        moonId: moon.id,
        assignment: { ...assignment },
        fits,
        chances,
        exhausted,
        work,
        quality: null,
        dilemma: {},
        before: { familias: state.familias, suelo: state.suelo, comunidad: state.comunidad },
      },
    ],
  };
}

/** Resuelve el dilema de la comunidad y cierra la luna. */
export function resolveMoon(state: HuertaState, moon: Moon, optionId: string): HuertaState {
  const option = moon.dilemma.options.find((o) => o.id === optionId);
  const last = state.log.at(-1);
  if (state.phase !== 'dilema' || !option || last?.moonId !== moon.id) return state;
  return {
    ...state,
    ...apply(state, option.effects),
    phase: 'cierre',
    log: [...state.log.slice(0, -1), { ...last, quality: option.quality, dilemma: option.effects }],
  };
}

export function nextMoon(state: HuertaState): HuertaState {
  if (state.phase !== 'cierre') return state;
  return {
    ...state,
    index: state.index + 1,
    phase: 'reparto',
    resting: state.log.at(-1)?.exhausted ?? [],
  };
}

/** Grupos que, pudiendo trabajar en su saber, quedaron en su tarea afín. */
export function usedChances(result: MoonResult): string[] {
  return result.chances.filter((g) => result.fits.includes(g));
}

export interface HuertaReport {
  /** Oportunidades de trabajar en su saber que se aprovecharon. */
  accuracy: number;
  /** Calidad media de las decisiones de la comunidad. */
  criteria: number;
  /** Grupos que aportaron sin agotarse nunca. */
  toolsUsed: number;
  exhaustions: number;
  familias: number;
  score: number;
}

export function report(state: HuertaState, content: HuertaContent): HuertaReport {
  const works = state.log.flatMap((m) =>
    Object.entries(m.assignment).filter(([, choice]) => choice !== REST),
  );
  const used = state.log.reduce((sum, m) => sum + usedChances(m).length, 0);
  const chances = state.log.reduce((sum, m) => sum + m.chances.length, 0);
  const accuracy = used / Math.max(1, chances);
  const criteria =
    state.log.reduce((sum, m) => sum + (m.quality ?? 0), 0) / Math.max(1, state.log.length);
  const exhaustedGroups = new Set(state.log.flatMap((m) => m.exhausted));
  const toolsUsed = new Set(works.map(([group]) => group).filter((g) => !exhaustedGroups.has(g)))
    .size;
  const care = toolsUsed / content.groups.length;
  return {
    accuracy,
    criteria,
    toolsUsed,
    exhaustions: state.log.reduce((sum, m) => sum + m.exhausted.length, 0),
    familias: state.familias,
    score:
      0.3 * accuracy +
      0.25 * criteria +
      0.3 * Math.min(1, state.familias / content.goal) +
      0.15 * care,
  };
}
