import { phaseFor, type Phase } from '@/boss/engine';
import type { Beam, Vec2 } from '@/games/shared/arena/core';
import type { BosqueData, Need } from './data';

/**
 * Núcleo puro de «Defender el bosque juntos». La Bruma manda oleadas de niebla
 * por los senderos de cuatro faroles; cada oleada trae un llamado que pide un
 * saber. Se asigna al grupo que lo tiene: la niebla se disipa y la ceiba se
 * llena de luz. Los grupos se cansan: hay que rotarlos antes de que se agoten.
 * Con la misma semilla y las mismas entradas el resultado es el mismo.
 */

export type Random = () => number;

export interface DefenseConfig {
  level: number;
  goal: number;
  /** Luces del bosque: oleadas que pueden llegar a la ceiba antes de retirarse. */
  lights: number;
  calm: boolean;
  /** Sutileza de los llamados en cada fase. */
  tiers: readonly (1 | 2 | 3)[];
}

export const RADIUS = 11;
export const FAROL_RING = 6.4;
/** Donde nace la niebla y hasta dónde llega: la ceiba. */
export const EDGE = 10.4;
export const CEIBA = 1.7;
export const REACH = 2.1;
export const CEIBA_TOP: Vec2 = { x: 0, z: 0 };
export const BRUMA_AT: Vec2 = { x: 0, z: -12.6 };
const PLAYER_SPEED = 4.8;
const GAP = 3;
/** Segundos que tarda un grupo con el saber justo en disipar una oleada. */
const CLEAR_SECONDS = 7;
const BLOOM_RATE = 0.1;
const REST_RATE = 1 / 9;
const IDLE_RATE = 1 / 16;
const WARN = 0.25;
const BACK = 0.6;

export interface FarolRuntime {
  id: string;
  x: number;
  z: number;
  /** Dirección del sendero en radianes. */
  angle: number;
  /** Llamado vigente; nulo entre oleadas. */
  need: Need | null;
  /** Grupo que lo atiende. */
  group: string | null;
  /** Avance de la niebla: 0 en el borde, 1 sobre la ceiba. */
  front: number;
  /** Cuánta niebla queda en la oleada (1 a 0). */
  fog: number;
  /** Segundos para la próxima oleada. */
  delay: number;
}

export interface GroupRuntime {
  id: string;
  /** Energía 0–1. */
  energy: number;
  /** Segundos de trabajo seguido que aguanta. */
  endurance: number;
  resting: boolean;
  warned: boolean;
}

export interface DefenseState {
  time: number;
  player: Vec2 & { facing: number; moving: boolean };
  faroles: FarolRuntime[];
  groups: GroupRuntime[];
  /** Participación 0.3–1: multiplica lo que rinden los faroles. */
  participation: number;
  /** Luz que lleva la ceiba hacia su próxima decisión (0–1). */
  bloom: number;
  dilemma: boolean;
  /** Disparos de la ceiba cargados. */
  charge: number;
  hits: number;
  phase: Phase;
  stagger: number;
  lights: number;
  beam: Beam | null;
  outcome: 'en-curso' | 'victoria' | 'retirada';
  usedNeeds: string[];
}

export type DefenseEvent =
  | { type: 'llamado'; farol: string; need: string }
  | { type: 'oleada'; farol: string }
  | { type: 'golpe'; farol: string; lights: number }
  | { type: 'cansado'; group: string }
  | { type: 'agotado'; group: string; farol: string | null }
  | { type: 'descansado'; group: string }
  | { type: 'asamblea' }
  | { type: 'haz' }
  | { type: 'sin-carga' }
  | { type: 'fase'; phase: Phase }
  | { type: 'victoria' }
  | { type: 'retirada' };

export interface DefenseInput {
  move: Vec2;
}

/** Posición de un farol: sobre su sendero. */
export const farolSpot = (angleDeg: number): Vec2 => ({
  x: Math.cos((angleDeg * Math.PI) / 180) * FAROL_RING,
  z: Math.sin((angleDeg * Math.PI) / 180) * FAROL_RING,
});

/** Segundos que aguanta un grupo trabajando seguido (con ritmo tranquilo, más). */
export const enduranceOf = (stamina: number, calm: boolean): number =>
  (10 * stamina + 6) / (calm ? 0.55 : 1);

/** Avance de la niebla por segundo si nadie la detiene. */
export function fogSpeed(config: Pick<DefenseConfig, 'level' | 'calm'>, phase: Phase): number {
  const base = 0.034 + 0.006 * config.level;
  return (base * (1 + 0.1 * (phase - 1))) / (config.calm ? 1.7 : 1);
}

export function createDefense(config: DefenseConfig, data: BosqueData): DefenseState {
  return {
    time: 0,
    player: { x: 0, z: 3.4, facing: Math.PI / 2, moving: false },
    faroles: data.faroles.map((f, i) => {
      const spot = farolSpot(f.angle);
      return {
        id: f.id,
        x: spot.x,
        z: spot.z,
        angle: (f.angle * Math.PI) / 180,
        need: null,
        group: null,
        front: 0,
        fog: 0,
        delay: 2 + i * (config.calm ? 4.5 : 3.2),
      };
    }),
    groups: data.groups.map((g) => ({
      id: g.id,
      energy: 1,
      endurance: enduranceOf(g.stamina, config.calm),
      resting: false,
      warned: false,
    })),
    participation: 1,
    bloom: 0,
    dilemma: false,
    charge: 0,
    hits: 0,
    phase: 1,
    stagger: 0,
    lights: config.lights,
    beam: null,
    outcome: 'en-curso',
    usedNeeds: [],
  };
}

/**
 * Elige el llamado de una oleada: de la sutileza de la fase, de un saber que
 * no esté ya en otro farol, sin repetir mientras queden.
 */
export function pickNeed(
  data: BosqueData,
  tier: 1 | 2 | 3,
  used: readonly string[],
  activeSabers: readonly string[],
  random: Random,
): Need {
  const fresh = data.needs.filter((n) => !used.includes(n.id));
  const pool = fresh.length > 0 ? fresh : data.needs;
  const near = (list: Need[]) => list.filter((n) => n.tier === tier);
  const free = pool.filter((n) => !activeSabers.includes(n.saber));
  const options =
    [near(free), free, near(pool), pool].find((list) => list.length > 0) ?? data.needs;
  const choice = options[Math.floor(random() * options.length)] ?? options[0];
  if (!choice) throw new Error('El bosque no tiene llamados.');
  return choice;
}

const tierOf = (state: DefenseState, config: DefenseConfig): 1 | 2 | 3 =>
  config.tiers[state.phase - 1] ?? config.tiers[config.tiers.length - 1] ?? 3;

/** Un grupo equivocado o un farol sin atender fortalece a la Bruma. */
export function strengthen(state: DefenseState): void {
  if (state.outcome !== 'en-curso') return;
  state.hits = Math.max(0, state.hits - 0.5);
  for (const farol of state.faroles)
    if (farol.need) farol.front = Math.min(0.95, farol.front + 0.06);
}

export interface AssignResult {
  ok: boolean;
  /** ¿El saber del grupo encaja con el llamado? Nulo si solo se liberó el farol. */
  correct: boolean | null;
  need: Need | null;
}

/** Asigna un grupo a un farol (o lo deja libre con `null`). */
export function assignGroup(
  state: DefenseState,
  farolId: string,
  groupId: string | null,
): AssignResult {
  const farol = state.faroles.find((f) => f.id === farolId);
  if (!farol || state.outcome !== 'en-curso') return { ok: false, correct: null, need: null };
  if (groupId === null) {
    farol.group = null;
    return { ok: true, correct: null, need: farol.need };
  }
  const group = state.groups.find((g) => g.id === groupId);
  if (!group || group.resting || !farol.need) return { ok: false, correct: null, need: farol.need };
  for (const other of state.faroles) if (other.group === groupId) other.group = null;
  farol.group = groupId;
  const correct = farol.need.fits.includes(groupId);
  if (!correct) strengthen(state);
  return { ok: true, correct, need: farol.need };
}

/** La ceiba pidió decidir en comunidad: acertar carga el haz; fallar fortalece a la Bruma. */
export function answerDilemma(state: DefenseState, correct: boolean): void {
  if (state.outcome !== 'en-curso') return;
  state.dilemma = false;
  state.bloom = 0;
  if (correct) state.charge += 1;
  else strengthen(state);
}

/** Dispara el haz de la ceiba hacia la Bruma. Siempre acierta: lo difícil es cargarlo. */
export function fireCeiba(state: DefenseState, config: DefenseConfig): DefenseEvent[] {
  if (state.outcome !== 'en-curso') return [];
  if (state.charge < 1) return [{ type: 'sin-carga' }];
  state.charge -= 1;
  state.hits += 1;
  state.stagger = 1;
  state.beam = { from: CEIBA_TOP, to: BRUMA_AT, hit: true, life: 0.5 };
  for (const farol of state.faroles) farol.front = Math.max(0, farol.front - BACK);
  const events: DefenseEvent[] = [{ type: 'haz' }];
  const phase = phaseFor(state.hits, config.goal);
  if (phase !== state.phase) {
    state.phase = phase;
    events.push({ type: 'fase', phase });
  }
  if (state.hits >= config.goal) {
    state.outcome = 'victoria';
    for (const farol of state.faroles) {
      farol.need = null;
      farol.fog = 0;
    }
    events.push({ type: 'victoria' });
  }
  return events;
}

/** Avanza el combate `dt` segundos. Muta `state` y devuelve lo ocurrido. */
export function stepDefense(
  state: DefenseState,
  config: DefenseConfig,
  data: BosqueData,
  input: DefenseInput,
  dt: number,
  random: Random,
): DefenseEvent[] {
  const events: DefenseEvent[] = [];
  if (state.outcome !== 'en-curso') return events;
  state.time += dt;
  state.stagger = Math.max(0, state.stagger - dt);

  // Explorador.
  const { player } = state;
  const len = Math.hypot(input.move.x, input.move.z);
  player.moving = len > 0;
  if (len > 0) {
    player.facing = Math.atan2(input.move.z, input.move.x);
    player.x += (input.move.x / len) * PLAYER_SPEED * dt;
    player.z += (input.move.z / len) * PLAYER_SPEED * dt;
    const out = Math.hypot(player.x, player.z);
    const max = RADIUS - 1.2;
    if (out > max) {
      player.x *= max / out;
      player.z *= max / out;
    }
    const inner = Math.hypot(player.x, player.z);
    if (inner < 1.3) {
      player.x *= 1.3 / Math.max(inner, 0.001);
      player.z *= 1.3 / Math.max(inner, 0.001);
    }
  }

  // Grupos: se cansan en un farol, descansan fuera de él.
  for (const group of state.groups) {
    const farol = state.faroles.find((f) => f.group === group.id);
    if (farol && !group.resting) {
      group.energy = Math.max(0, group.energy - dt / group.endurance);
      if (group.energy <= 0) {
        group.resting = true;
        group.warned = false;
        farol.group = null;
        state.participation = Math.max(0.3, state.participation - 0.15);
        events.push({ type: 'agotado', group: group.id, farol: farol.id });
      } else if (group.energy < WARN && !group.warned) {
        group.warned = true;
        events.push({ type: 'cansado', group: group.id });
      }
    } else {
      group.energy = Math.min(1, group.energy + dt * (group.resting ? REST_RATE : IDLE_RATE));
      if (group.energy > WARN + 0.1) group.warned = false;
      if (group.resting && group.energy >= 0.6) {
        group.resting = false;
        events.push({ type: 'descansado', group: group.id });
      }
    }
  }
  state.participation = Math.min(1, state.participation + dt * (config.calm ? 0.04 : 0.02));

  // Faroles y niebla.
  const speed = fogSpeed(config, state.phase);
  const clear = CLEAR_SECONDS / (config.calm ? 1.3 : 1);
  for (const farol of state.faroles) {
    if (!farol.need) {
      farol.delay -= dt;
      if (farol.delay > 0) continue;
      const active = state.faroles.flatMap((f) => (f.need ? [f.need.saber] : []));
      farol.need = pickNeed(data, tierOf(state, config), state.usedNeeds, active, random);
      state.usedNeeds = [...state.usedNeeds.slice(-(data.needs.length - 4)), farol.need.id];
      farol.front = 0;
      farol.fog = 1;
      events.push({ type: 'llamado', farol: farol.id, need: farol.need.id });
      continue;
    }
    const need = farol.need;
    const attendant = farol.group;
    const fits = attendant !== null && need.fits.includes(attendant);
    if (fits) {
      farol.fog -= (dt / clear) * (0.5 + 0.5 * state.participation);
      farol.front += speed * 0.15 * dt;
      state.bloom = Math.min(1, state.bloom + BLOOM_RATE * state.participation * dt);
    } else {
      farol.front += speed * (attendant ? 0.7 : 1) * dt;
    }
    if (farol.fog <= 0) {
      farol.need = null;
      farol.fog = 0;
      farol.front = 0;
      farol.delay = GAP * (config.calm ? 1.4 : 1);
      state.bloom = Math.min(1, state.bloom + 0.08);
      events.push({ type: 'oleada', farol: farol.id });
    } else if (farol.front >= 1) {
      farol.need = null;
      farol.fog = 0;
      farol.front = 0;
      farol.delay = GAP;
      state.lights -= 1;
      events.push({ type: 'golpe', farol: farol.id, lights: state.lights });
      if (state.lights <= 0) {
        state.outcome = 'retirada';
        events.push({ type: 'retirada' });
        return events;
      }
    }
  }

  if (state.bloom >= 1 && !state.dilemma) {
    state.dilemma = true;
    events.push({ type: 'asamblea' });
  }

  if (state.beam) {
    state.beam.life -= dt;
    if (state.beam.life <= 0) state.beam = null;
  }
  return events;
}
