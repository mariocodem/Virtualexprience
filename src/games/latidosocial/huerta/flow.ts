import type { HuertaContent } from '@/data/contentSchemas';
import {
  REST,
  type HuertaReport,
  type HuertaState,
  type Moon,
} from '@/minigames/huerta-comunitaria/engine';

/**
 * Reglas de la escena de «La huerta comunitaria» en 3D que no son del motor:
 * el teclado del reparto, dónde está cada grupo y cuánto han crecido las
 * plantas. Todo puro: el motor (`engine.ts`) sigue siendo el de la versión
 * accesible.
 */

export interface Reparto {
  /** Grupo seleccionado a la espera de tarea. */
  selected: string | null;
  /** Tarea o descanso elegido por cada grupo. */
  choices: Record<string, string>;
}

export interface RepartoContext {
  groups: readonly string[];
  tasks: readonly string[];
  /** Grupos agotados: deben descansar. */
  resting: readonly string[];
}

export interface RepartoStep {
  reparto: Reparto;
  /** Texto para anunciar a lectores de pantalla, si hay. */
  note: string | null;
}

/** Reparto inicial de una luna: quienes se agotaron ya descansan. */
export function initialReparto(resting: readonly string[]): Reparto {
  return { selected: null, choices: Object.fromEntries(resting.map((g) => [g, REST])) };
}

export const isReady = (reparto: Reparto, ctx: RepartoContext): boolean =>
  ctx.groups.every((g) => reparto.choices[g] !== undefined);

/** Elige un grupo (con o sin teclado). Un grupo agotado no puede trabajar. */
export function selectGroup(reparto: Reparto, ctx: RepartoContext, group: string): RepartoStep {
  if (!ctx.groups.includes(group)) return { reparto, note: null };
  if (ctx.resting.includes(group))
    return {
      reparto: { ...reparto, selected: null },
      note: `${group} se agotó y descansa esta luna.`,
    };
  return { reparto: { ...reparto, selected: group }, note: null };
}

/** Lleva al grupo seleccionado a una tarea (por id) o al descanso. */
export function assignSelected(reparto: Reparto, ctx: RepartoContext, choice: string): RepartoStep {
  const { selected } = reparto;
  if (!selected) return { reparto, note: null };
  if (choice !== REST && !ctx.tasks.includes(choice)) return { reparto, note: null };
  return {
    reparto: { selected: null, choices: { ...reparto.choices, [selected]: choice } },
    note: choice === REST ? 'Descansa bajo la ceiba.' : null,
  };
}

/**
 * Teclado del reparto. Con ningún grupo elegido, 1 a 4 elige un grupo; con uno
 * elegido, 1 a 3 lo lleva a esa tarea y 0 (o R) al descanso; Retroceso suelta.
 */
export function pressKey(reparto: Reparto, ctx: RepartoContext, key: string): RepartoStep {
  if (key === 'Backspace') return { reparto: { ...reparto, selected: null }, note: null };
  const digit = /^[0-9]$/.test(key) ? Number(key) : null;
  if (!reparto.selected) {
    if (digit === null || digit < 1) return { reparto, note: null };
    const group = ctx.groups[digit - 1];
    return group ? selectGroup(reparto, ctx, group) : { reparto, note: null };
  }
  if (key === 'r' || key === 'R' || digit === 0) return assignSelected(reparto, ctx, REST);
  if (digit === null) return { reparto, note: null };
  const task = ctx.tasks[digit - 1];
  return task ? assignSelected(reparto, ctx, task) : { reparto, note: null };
}

export interface Spot {
  x: number;
  z: number;
  yaw: number;
}

/** Ubicación de las eras: una por tarea, de izquierda a derecha. */
export function bedSpot(index: number, count: number): { x: number; z: number } {
  return { x: (index - (count - 1) / 2) * 5.2, z: -0.6 };
}

export const CEIBA_AT = { x: -9.2, z: -1.6 };
export const ASSEMBLY_AT = { x: 0, z: 6.2 };

/**
 * Dónde está un grupo: trabajando en su era, descansando bajo la ceiba, en
 * asamblea (cuando se resuelve el dilema) o esperando en la plaza.
 */
export function crewSpot(args: {
  group: number;
  groups: number;
  /** Tarea o descanso elegido, o nada si aún no lo decidió. */
  choice: string | undefined;
  tasks: readonly string[];
  /** Cuántos grupos comparten ese mismo destino y qué lugar ocupa este. */
  sharing: { count: number; order: number };
  assembly: boolean;
}): Spot {
  const { group, groups, choice, tasks, sharing, assembly } = args;
  if (assembly) {
    const a = (group / groups) * Math.PI * 2 + Math.PI / 4;
    const x = ASSEMBLY_AT.x + Math.cos(a) * 2.7;
    const z = ASSEMBLY_AT.z + Math.sin(a) * 1.9;
    return { x, z, yaw: Math.atan2(ASSEMBLY_AT.x - x, ASSEMBLY_AT.z - z) };
  }
  if (choice === REST) {
    const a = 0.4 + sharing.order * 1.3;
    return {
      x: CEIBA_AT.x + Math.cos(a) * 2.5,
      z: CEIBA_AT.z + Math.sin(a) * 2.2,
      yaw: Math.PI / 2,
    };
  }
  const bed = choice === undefined ? -1 : tasks.indexOf(choice);
  if (bed >= 0) {
    const base = bedSpot(bed, tasks.length);
    const offset = (sharing.order - (sharing.count - 1) / 2) * 2.4;
    return { x: base.x + offset, z: base.z + 2.5, yaw: Math.PI };
  }
  return { x: (group - (groups - 1) / 2) * 2.8, z: 6.8, yaw: 0 };
}

/** Cuánto ha crecido la huerta (0–1): lo cosechado frente a la meta, matizado por el suelo. */
export function growthOf(state: Pick<HuertaState, 'familias' | 'suelo'>, goal: number): number {
  const harvest = Math.min(1, state.familias / Math.max(1, goal));
  const soil = 0.75 + 0.25 * Math.min(1, state.suelo / 100) * 2;
  return Math.min(1, 0.18 + 0.82 * harvest * Math.min(1, soil));
}

/** Cuánto trabajo recibió cada era en la última luna repartida (0–1). */
export function bedWork(state: HuertaState, moon: Moon): number[] {
  const last = state.log.at(-1);
  if (last?.moonId !== moon.id) return moon.tasks.map(() => 0);
  return moon.tasks.map((task) => {
    const units = Object.values(last.assignment).filter((c) => c === task.id).length;
    return Math.min(1, units / 2);
  });
}

/** Posición de la luna en el cielo: sale por la izquierda y se alza y llena con la temporada. */
export function moonSky(index: number, total: number): { x: number; y: number; phase: number } {
  const t = total <= 1 ? 0.5 : index / (total - 1);
  return { x: -20 + t * 30, y: 15 + Math.sin(t * Math.PI) * 6, phase: 0.25 + 0.75 * t };
}

export function moonTip(
  result: HuertaState['log'][number],
  usedChances: (r: HuertaState['log'][number]) => string[],
): string {
  const works = Object.values(result.assignment).filter((c) => c !== REST).length;
  if (result.exhausted.length > 0)
    return 'Un grupo trabajó más allá de lo que aguantaba: rindió la mitad y la comunidad lo resintió. El descanso también se planea.';
  if (works === 0)
    return 'Nadie trabajó esta luna. Descansar está bien, pero la huerta necesita manos para dar frutos.';
  if (usedChances(result).length < result.chances.length)
    return 'Algún grupo podía trabajar en lo que mejor sabe hacer y quedó en otra tarea. Lee qué sabe cada uno antes de repartir.';
  return 'Cada grupo aportó desde lo que sabe hacer: así rinde el trabajo comunitario.';
}

/** Lectura de Brújula del informe final y sus hechos; la misma que la versión accesible. */
export function reportReading(
  content: HuertaContent,
  state: HuertaState,
  result: HuertaReport,
): { text: string; highlights: string[] } {
  const moons = state.log.length;
  const solid = state.log.filter((m) => m.quality === 1).length;
  const parts: string[] = [];
  parts.push(
    result.familias >= content.goal
      ? 'La huerta alimenta a las familias que se propuso: el trabajo de todos dio frutos.'
      : 'La huerta no alcanzó a las familias de la meta. Revisa si cada grupo trabajó donde rendía más y si se cuidó el suelo.',
  );
  parts.push(
    result.exhaustions > 0
      ? 'Hubo grupos agotados: en un proyecto comunitario, el bienestar de quienes lo sostienen es parte del resultado.'
      : 'Nadie se agotó: planeaste el descanso como parte del trabajo.',
  );
  parts.push(
    result.criteria >= 0.75
      ? 'En los dilemas decidiste con la comunidad y con criterios claros.'
      : 'En los dilemas, busca la salida que incluya a la comunidad y cuide el territorio, no solo la cosecha.',
  );
  return {
    text: parts.join(' '),
    highlights: [
      `Familias alimentadas: ${String(result.familias)} de ${String(content.goal)}.`,
      `Veces que un grupo pudo trabajar en su saber y lo hizo: ${String(Math.round(result.accuracy * 100))} %.`,
      `Veces que un grupo se agotó: ${String(result.exhaustions)}.`,
      `Decisiones comunitarias sólidas: ${String(solid)} de ${String(moons)}.`,
      `Salud final del suelo: ${String(Math.round(state.suelo))} de 100. Participación final: ${String(Math.round(state.comunidad))} de 100.`,
    ],
  };
}
