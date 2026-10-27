import { phaseFor, type Phase } from '@/boss/engine';

/**
 * Núcleo puro de «Llevar el timón»: un barco que da vueltas alrededor del
 * islote de la Bruma. Se gobierna con timón y velas (con inercia), se reparte
 * la tripulación entre velas, bomba y linterna, y la Bruma lanza rocas,
 * remolinos y olas. La linterna solo se carga con decisiones de gestión
 * acertadas (la arena llama a `chargeShip`).
 *
 * Como el núcleo de las demás arenas, `stepShip` muta el estado y devuelve
 * los eventos; con la misma semilla y las mismas entradas da el mismo
 * resultado, así se prueba sin navegador.
 */

export interface Vec2 {
  x: number;
  z: number;
}

/** El mar jugable es un anillo entre los bajíos del islote y la niebla del borde. */
export const SEA_RADIUS = 20;
export const ISLET_RADIUS = 3.6;
export const MIN_ORBIT = 6.4;
export const SHIP_RADIUS = 0.85;
const MAX_SPEED = 8.4;
const BASE_INFLOW = 0.028;
const PUMP_RATE = 0.05;
const HURT_SHIELD = 1.6;
const LEAK_PER_HIT = 0.012;

export type Station = 'velas' | 'bomba' | 'linterna';
export type Crew = Record<Station, number>;
export const CREW_SIZE = 3;
export const STATIONS: readonly Station[] = ['velas', 'bomba', 'linterna'];
export const DEFAULT_CREW: Crew = { velas: 1, bomba: 1, linterna: 1 };

/**
 * Manda un marinero a `to`, quitándolo de la estación con más gente (en
 * empate, de la última de la lista). Si ya están todos allí no cambia nada.
 */
export function assignSailor(crew: Crew, to: Station): Crew {
  let donor: Station | null = null;
  for (const station of [...STATIONS].reverse()) {
    if (station === to || crew[station] === 0) continue;
    if (donor === null || crew[station] > crew[donor]) donor = station;
  }
  if (donor === null) return crew;
  return { ...crew, [donor]: crew[donor] - 1, [to]: crew[to] + 1 };
}

export type HazardKind = 'roca' | 'remolino' | 'ola';

/** Roca lanzada: una sombra avisa dónde caerá. */
export interface Rock {
  id: number;
  x: number;
  z: number;
  /** Segundos de vuelo que quedan; al llegar a 0 cae y golpea durante `active`. */
  warn: number;
  total: number;
  active: number;
  r: number;
}

/** Remolino: se forma, jala hacia su centro y golpea en el ojo. */
export interface Whirl {
  id: number;
  x: number;
  z: number;
  r: number;
  warn: number;
  life: number;
}

/** Ola: un frente en arco que se aleja del islote. */
export interface Wave {
  id: number;
  angle: number;
  radius: number;
  half: number;
  speed: number;
}

export interface ShipBeam {
  from: Vec2;
  to: Vec2;
  hit: boolean;
  life: number;
}

export interface ShipConfig {
  level: number;
  goal: number;
  lights: number;
  calm: boolean;
}

export interface ShipState {
  time: number;
  x: number;
  z: number;
  /** Rumbo en radianes sobre el plano XZ (0 = +X, crece en sentido horario visto desde arriba). */
  heading: number;
  speed: number;
  /** Timón suavizado, de −1 (babor) a 1 (estribor). */
  rudder: number;
  /** Apertura de las velas, de 0 a 1. */
  trim: number;
  crew: Crew;
  /** Agua en la bodega, de 0 a 1. */
  water: number;
  leak: number;
  lights: number;
  shield: number;
  /** Viento: hacia dónde sopla (radianes). */
  wind: number;
  drift: Vec2;
  charge: number;
  bruma: { hits: number; phase: Phase; stagger: number };
  rocks: Rock[];
  whirls: Whirl[];
  waves: Wave[];
  beam: ShipBeam | null;
  outcome: 'en-curso' | 'victoria' | 'retirada';
  attackIn: number;
  nextId: number;
  /** Aviso de agua alta ya dado. */
  waterWarned: boolean;
}

export interface ShipInput {
  /** Timón: −1 a babor, 1 a estribor. */
  rudder: number;
  /** Velas: −1 recoger, 1 abrir. */
  sail: number;
  fire: boolean;
}

export type ShipEvent =
  | { type: 'herido'; lights: number }
  | { type: 'haz'; hit: boolean }
  | { type: 'sin-carga' }
  | { type: 'sin-linterna' }
  | { type: 'fase'; phase: Phase }
  | { type: 'ataque'; kind: HazardKind }
  | { type: 'bajio' }
  | { type: 'borde' }
  | { type: 'agua-alta' }
  | { type: 'victoria' }
  | { type: 'retirada' };

export type Random = () => number;

export const BRUMA_POS: Vec2 = { x: 0, z: 0 };

const ATTACKS: Record<Phase, readonly HazardKind[]> = {
  1: ['roca', 'remolino'],
  2: ['roca', 'remolino', 'ola'],
  3: ['roca', 'ola', 'remolino', 'roca'],
};

/** Ritmo de los peligros según nivel y ritmo tranquilo. */
export function tempo(config: Pick<ShipConfig, 'level' | 'calm'>) {
  const calm = config.calm;
  return {
    every: Math.max(1.5, 3.6 - 0.3 * config.level) * (calm ? 1.8 : 1),
    rockWarn: calm ? 2.4 : 1.6,
    rockRadius: calm ? 1.3 : 1.6,
    whirlWarn: calm ? 2.2 : 1.4,
    whirlLife: calm ? 5 : 7,
    whirlRadius: calm ? 2.2 : 2.8,
    waveSpeed: (3.4 + 0.3 * config.level) * (calm ? 0.7 : 1),
    waveHalf: calm ? 0.36 : 0.5,
    /** Qué tan a la delantera apuntan las rocas (1 = a donde irás). */
    lead: calm ? 0.3 : 0.75,
    inflow: calm ? 0.5 : 1,
    speedScale: calm ? 0.85 : 1,
  };
}

/** Tolerancia angular del haz: más amplia con ritmo tranquilo, con dos marineros en la linterna y de cerca. */
export function aimTolerance(calm: boolean, lanternCrew: number, distance: number): number {
  const base = calm ? 0.3 : 0.12;
  const bonus = lanternCrew >= 2 ? 1.4 : 1;
  return base * bonus + Math.atan(1.9 / Math.max(2, distance));
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const SAILS_FACTOR = [0, 1, 1.3, 1.5];

/** Eficiencia de las velas según el rumbo respecto al viento: de 0.45 (de proa) a 1 (en popa). */
export function windEfficiency(heading: number, wind: number): number {
  return 0.725 + 0.275 * Math.cos(angleDiff(heading, wind));
}

export function createShip(config: ShipConfig): ShipState {
  return {
    time: 0,
    x: 0,
    z: 15.5,
    heading: Math.PI,
    speed: 0,
    rudder: 0,
    trim: 0.7,
    crew: { ...DEFAULT_CREW },
    water: 0,
    leak: 0,
    lights: config.lights,
    shield: 0,
    wind: Math.PI / 2 - 0.4,
    drift: { x: 0, z: 0 },
    charge: 0,
    bruma: { hits: 0, phase: 1, stagger: 0 },
    rocks: [],
    whirls: [],
    waves: [],
    beam: null,
    outcome: 'en-curso',
    attackIn: 3,
    nextId: 1,
    waterWarned: false,
  };
}

/** Una decisión acertada carga un disparo de la linterna. */
export function chargeShip(state: ShipState, shots = 1): void {
  if (state.outcome === 'en-curso') state.charge += shots;
}

/** Una decisión equivocada fortalece a la Bruma: recupera parte de un golpe y ataca enseguida. */
export function strengthenShip(state: ShipState): void {
  if (state.outcome !== 'en-curso') return;
  state.bruma.hits = Math.max(0, state.bruma.hits - 0.5);
  state.attackIn = Math.min(state.attackIn, 0.4);
}

export function brumaDensity(state: ShipState, config: Pick<ShipConfig, 'goal'>): number {
  return Math.max(0, 1 - state.bruma.hits / config.goal);
}

/** Velocidad a la que tiende el barco con la tripulación, las velas, el viento y el agua actuales. */
export function targetSpeed(state: ShipState, config: Pick<ShipConfig, 'level' | 'calm'>): number {
  const sails = SAILS_FACTOR[Math.min(3, state.crew.velas)] ?? 0;
  const water = 1 - 0.55 * state.water;
  return (
    MAX_SPEED *
    state.trim *
    sails *
    windEfficiency(state.heading, state.wind) *
    water *
    tempo(config).speedScale
  );
}

export const prow = (state: ShipState, length = 1.5): Vec2 => ({
  x: state.x + Math.cos(state.heading) * length,
  z: state.z + Math.sin(state.heading) * length,
});

/** Dónde está la Bruma respecto a la proa: ángulo con signo (positivo = a estribor) y distancia. */
export function bearingToBruma(state: ShipState): { angle: number; distance: number } {
  const to = Math.atan2(BRUMA_POS.z - state.z, BRUMA_POS.x - state.x);
  return {
    angle: angleDiff(to, state.heading),
    distance: Math.hypot(BRUMA_POS.x - state.x, BRUMA_POS.z - state.z),
  };
}

/** Si el combate ya terminó (la función evita que TypeScript estreche el estado entre pasos). */
function isOver(state: ShipState): boolean {
  return state.outcome !== 'en-curso';
}

/** Cambia el reparto de la tripulación. */
export function setCrew(state: ShipState, crew: Crew): void {
  state.crew = crew;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hurt(state: ShipState, config: ShipConfig, events: ShipEvent[]): void {
  if (state.shield > 0) return;
  state.lights -= 1;
  state.shield = HURT_SHIELD;
  state.leak += LEAK_PER_HIT * tempo(config).inflow;
  events.push({ type: 'herido', lights: state.lights });
  if (state.lights <= 0) {
    state.outcome = 'retirada';
    events.push({ type: 'retirada' });
  }
}

const clampSea = (x: number, z: number, max: number): Vec2 => {
  const d = Math.hypot(x, z);
  if (d <= max || d === 0) return { x, z };
  return { x: (x / d) * max, z: (z / d) * max };
};

function launch(state: ShipState, config: ShipConfig, kind: HazardKind, random: Random): void {
  const t = tempo(config);
  const fx = Math.cos(state.heading);
  const fz = Math.sin(state.heading);
  switch (kind) {
    case 'roca': {
      const lead = state.speed * t.rockWarn * t.lead;
      const p = clampSea(
        state.x + fx * lead + (random() - 0.5) * 2.4,
        state.z + fz * lead + (random() - 0.5) * 2.4,
        SEA_RADIUS - 1,
      );
      state.rocks.push({
        id: state.nextId++,
        x: p.x,
        z: p.z,
        warn: t.rockWarn,
        total: t.rockWarn,
        active: 0.35,
        r: t.rockRadius,
      });
      break;
    }
    case 'remolino': {
      const turn = (random() - 0.5) * 1.0;
      const dist = 6 + random() * 3;
      let p = clampSea(
        state.x + Math.cos(state.heading + turn) * dist,
        state.z + Math.sin(state.heading + turn) * dist,
        SEA_RADIUS - t.whirlRadius,
      );
      const d = Math.hypot(p.x, p.z) || 1;
      if (d < MIN_ORBIT + 1) p = { x: (p.x / d) * (MIN_ORBIT + 1), z: (p.z / d) * (MIN_ORBIT + 1) };
      state.whirls.push({
        id: state.nextId++,
        x: p.x,
        z: p.z,
        r: t.whirlRadius,
        warn: t.whirlWarn,
        life: t.whirlLife,
      });
      break;
    }
    case 'ola': {
      const jitter = (random() - 0.5) * (config.calm ? 0.8 : 0.4);
      state.waves.push({
        id: state.nextId++,
        angle: Math.atan2(state.z, state.x) + jitter,
        radius: ISLET_RADIUS,
        half: t.waveHalf,
        speed: t.waveSpeed,
      });
      break;
    }
  }
}

/** Avanza el combate `dt` segundos. Muta `state` y devuelve lo que pasó. */
export function stepShip(
  state: ShipState,
  config: ShipConfig,
  input: ShipInput,
  dt: number,
  random: Random,
): ShipEvent[] {
  const events: ShipEvent[] = [];
  if (state.outcome !== 'en-curso') return events;
  state.time += dt;
  const t = tempo(config);
  state.shield = Math.max(0, state.shield - dt);
  state.bruma.stagger = Math.max(0, state.bruma.stagger - dt);
  state.wind += Math.sin(state.time * 0.11) * 0.02 * dt;

  // Timón y velas, con inercia.
  const follow = 1 - Math.exp(-(config.calm ? 6 : 4) * dt);
  state.rudder += (clamp(input.rudder, -1, 1) - state.rudder) * follow;
  state.trim = clamp(state.trim + clamp(input.sail, -1, 1) * 0.7 * dt, 0, 1);
  const target = targetSpeed(state, config);
  const accel = target > state.speed ? 2.6 : 3.4;
  state.speed += clamp(target - state.speed, -accel * dt, accel * dt);
  const turnRate = 1.55 * (0.35 + 0.65 * Math.min(1, state.speed / 4));
  state.heading += state.rudder * turnRate * dt;

  // Posición, deriva (remolinos) y límites del mar.
  state.drift.x *= Math.exp(-1.8 * dt);
  state.drift.z *= Math.exp(-1.8 * dt);
  state.x += (Math.cos(state.heading) * state.speed + state.drift.x) * dt;
  state.z += (Math.sin(state.heading) * state.speed + state.drift.z) * dt;
  const d = Math.hypot(state.x, state.z);
  if (d > SEA_RADIUS - 0.8) {
    const k = (SEA_RADIUS - 0.8) / d;
    state.x *= k;
    state.z *= k;
    state.speed *= 0.9;
    events.push({ type: 'borde' });
  } else if (d < MIN_ORBIT) {
    const k = MIN_ORBIT / (d || 1);
    state.x *= k;
    state.z *= k;
    state.speed *= 0.8;
    events.push({ type: 'bajio' });
  }

  // Bodega: el agua entra sola, se achica con quien está en la bomba.
  const inflow = (BASE_INFLOW + state.leak) * t.inflow;
  state.water = clamp(state.water + (inflow - state.crew.bomba * PUMP_RATE) * dt, 0, 1);
  if (state.water >= 0.5 && !state.waterWarned) {
    state.waterWarned = true;
    events.push({ type: 'agua-alta' });
  } else if (state.water < 0.3) {
    state.waterWarned = false;
  }

  // Ataques de la Bruma.
  if (state.bruma.stagger === 0) {
    state.attackIn -= dt;
    if (state.attackIn <= 0) {
      const kinds = ATTACKS[state.bruma.phase];
      const kind = kinds[Math.floor(random() * kinds.length)] ?? 'roca';
      launch(state, config, kind, random);
      events.push({ type: 'ataque', kind });
      state.attackIn = t.every * (0.8 + random() * 0.4);
    }
  }

  // Rocas: caen donde avisó la sombra.
  state.rocks = state.rocks.filter((rock) => {
    if (rock.warn > 0) {
      rock.warn -= dt;
      return true;
    }
    rock.active -= dt;
    if (Math.hypot(rock.x - state.x, rock.z - state.z) < rock.r + SHIP_RADIUS * 0.6)
      hurt(state, config, events);
    return rock.active > 0;
  });
  if (isOver(state)) return events;

  // Remolinos: jalan hacia el centro y golpean en el ojo.
  state.whirls = state.whirls.filter((whirl) => {
    if (whirl.warn > 0) {
      whirl.warn -= dt;
      return true;
    }
    whirl.life -= dt;
    const dx = whirl.x - state.x;
    const dz = whirl.z - state.z;
    const dist = Math.hypot(dx, dz);
    if (dist < whirl.r * 1.5 && dist > 0.001) {
      const pull = 5 * (1 - dist / (whirl.r * 1.5)) * (config.calm ? 0.6 : 1);
      state.drift.x += (dx / dist) * pull * dt * 3;
      state.drift.z += (dz / dist) * pull * dt * 3;
    }
    if (dist < whirl.r * 0.4) hurt(state, config, events);
    return whirl.life > 0;
  });
  if (isOver(state)) return events;

  // Olas: arcos que se alejan del islote.
  state.waves = state.waves.filter((wave) => {
    wave.radius += wave.speed * dt;
    const dist = Math.hypot(state.x, state.z);
    const around = Math.abs(angleDiff(Math.atan2(state.z, state.x), wave.angle));
    const half = wave.half + Math.atan(SHIP_RADIUS / Math.max(1, dist));
    if (around <= half && Math.abs(dist - wave.radius) < 0.45 + SHIP_RADIUS * 0.7)
      hurt(state, config, events);
    return wave.radius < SEA_RADIUS + 2;
  });
  if (isOver(state)) return events;

  // Haz de la linterna desde la proa.
  if (state.beam) {
    state.beam.life -= dt;
    if (state.beam.life <= 0) state.beam = null;
  }
  if (input.fire) {
    if (state.crew.linterna < 1) {
      events.push({ type: 'sin-linterna' });
    } else if (state.charge < 1) {
      events.push({ type: 'sin-carga' });
    } else {
      state.charge -= 1;
      const { angle, distance } = bearingToBruma(state);
      const hit = Math.abs(angle) <= aimTolerance(config.calm, state.crew.linterna, distance);
      const from = prow(state);
      const to = hit
        ? { ...BRUMA_POS }
        : {
            x: from.x + Math.cos(state.heading) * distance,
            z: from.z + Math.sin(state.heading) * distance,
          };
      state.beam = { from, to, hit, life: 0.45 };
      events.push({ type: 'haz', hit });
      if (hit) {
        state.bruma.hits += 1;
        state.bruma.stagger = 1;
        state.rocks = [];
        state.whirls = [];
        state.waves = [];
        const phase = phaseFor(state.bruma.hits, config.goal);
        if (phase !== state.bruma.phase) {
          state.bruma.phase = phase;
          events.push({ type: 'fase', phase });
        }
        if (state.bruma.hits >= config.goal) {
          state.outcome = 'victoria';
          events.push({ type: 'victoria' });
        }
      }
    }
  }
  return events;
}
