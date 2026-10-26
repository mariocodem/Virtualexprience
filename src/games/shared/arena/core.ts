import { phaseFor, type Phase } from '@/boss/engine';

/**
 * Núcleo del combate 3D contra una Bruma: el explorador se mueve y esquiva,
 * la Bruma lanza sus ataques y la linterna dispara un haz que solo se carga
 * con decisiones correctas (la mecánica de cada isla llama a `chargeArena`).
 *
 * Por rendimiento, `stepArena` muta el estado en cada cuadro y devuelve los
 * eventos ocurridos; con la misma semilla y las mismas entradas da el mismo
 * resultado, así se prueba sin navegador.
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface ArenaConfig {
  /** Radio de la plataforma. */
  radius: number;
  level: number;
  /** Golpes de luz para disipar a la Bruma. */
  goal: number;
  lights: number;
  calm: boolean;
  /** Ataques que puede usar la Bruma, de menor a mayor fase (ver `ATTACKS`). */
  attacks?: Partial<Record<Phase, readonly AttackKind[]>>;
}

export type AttackKind = 'rafaga' | 'acecho' | 'espiral' | 'golpe';

export interface Orb {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Segundos de vida restantes. */
  life: number;
}

/** Zona de impacto: avisa en el suelo antes de golpear. */
export interface Zone {
  id: number;
  x: number;
  z: number;
  r: number;
  /** Segundos de aviso que quedan; al llegar a 0 golpea durante `active`. */
  warn: number;
  active: number;
}

export interface Beam {
  from: Vec2;
  to: Vec2;
  hit: boolean;
  /** Segundos de vida del destello. */
  life: number;
}

export interface ArenaState {
  time: number;
  player: Vec2 & {
    facing: number;
    lights: number;
    /** Invulnerable mientras sea > 0 (tras un golpe o al esquivar). */
    shield: number;
    dashCooldown: number;
    dashing: number;
    moving: boolean;
  };
  bruma: Vec2 & {
    orbit: number;
    hits: number;
    phase: Phase;
    /** Aturdida tras un golpe de luz. */
    stagger: number;
  };
  /** Disparos de luz cargados (decisiones correctas pendientes de usar). */
  charge: number;
  orbs: Orb[];
  zones: Zone[];
  beam: Beam | null;
  outcome: 'en-curso' | 'victoria' | 'retirada';
  attackIn: number;
  /** Ataque en curso que se emite en varios cuadros (la espiral). */
  burst: { kind: AttackKind; left: number; angle: number } | null;
  nextId: number;
}

export interface ArenaInput {
  /** Dirección de movimiento, cada eje entre −1 y 1. */
  move: Vec2;
  /** Punto del suelo al que se apunta; si es nulo, se apunta hacia donde se mira. */
  aim: Vec2 | null;
  fire: boolean;
  dash: boolean;
}

export type ArenaEvent =
  | { type: 'herido'; lights: number }
  | { type: 'haz'; hit: boolean }
  | { type: 'sin-carga' }
  | { type: 'fase'; phase: Phase }
  | { type: 'ataque'; kind: AttackKind }
  | { type: 'esquiva' }
  | { type: 'victoria' }
  | { type: 'retirada' };

export type Random = () => number;

export const PLAYER_RADIUS = 0.42;
export const ORB_RADIUS = 0.3;
const PLAYER_SPEED = 5.2;
const DASH_SPEED = 15;
const DASH_TIME = 0.18;
const DASH_COOLDOWN = 0.9;
const HURT_SHIELD = 1.4;
const BRUMA_ORBIT = 2.6;

/** Ataques por fase, si la arena no define los suyos. */
export const ATTACKS: Record<Phase, readonly AttackKind[]> = {
  1: ['rafaga', 'acecho'],
  2: ['rafaga', 'acecho', 'espiral'],
  3: ['acecho', 'espiral', 'golpe', 'rafaga'],
};

/** Velocidad de los proyectiles y espera entre ataques según nivel y ritmo. */
export function tempo(config: Pick<ArenaConfig, 'level' | 'calm'>): {
  speed: number;
  every: number;
} {
  const speed = (3.1 + 0.45 * config.level) * (config.calm ? 0.6 : 1);
  const every = Math.max(1.1, 2.7 - 0.25 * config.level) * (config.calm ? 1.7 : 1);
  return { speed, every };
}

/** Tolerancia angular del haz: con ritmo tranquilo la puntería ayuda más. */
export function aimTolerance(calm: boolean): number {
  return calm ? 0.6 : 0.26;
}

export function createArena(config: ArenaConfig): ArenaState {
  return {
    time: 0,
    player: {
      x: 0,
      z: config.radius * 0.7,
      facing: Math.PI,
      lights: config.lights,
      shield: 0,
      dashCooldown: 0,
      dashing: 0,
      moving: false,
    },
    bruma: { x: 0, z: -BRUMA_ORBIT, orbit: -Math.PI / 2, hits: 0, phase: 1, stagger: 0 },
    charge: 0,
    orbs: [],
    zones: [],
    beam: null,
    outcome: 'en-curso',
    attackIn: 2.2,
    burst: null,
    nextId: 1,
  };
}

/** Una decisión correcta carga un disparo de luz. */
export function chargeArena(state: ArenaState, shots = 1): void {
  if (state.outcome === 'en-curso') state.charge += shots;
}

/** Una decisión equivocada fortalece a la Bruma: recupera parte de un golpe y ataca enseguida. */
export function strengthenBruma(state: ArenaState): void {
  if (state.outcome !== 'en-curso') return;
  state.bruma.hits = Math.max(0, state.bruma.hits - 0.5);
  state.attackIn = Math.min(state.attackIn, 0.4);
}

/** Densidad de la Bruma, de 1 (intacta) a 0 (disipada). */
export function brumaDensity(state: ArenaState, config: Pick<ArenaConfig, 'goal'>): number {
  return Math.max(0, 1 - state.bruma.hits / config.goal);
}

function spawnOrb(state: ArenaState, x: number, z: number, angle: number, speed: number): void {
  state.orbs.push({
    id: state.nextId++,
    x,
    z,
    vx: Math.cos(angle) * speed,
    vz: Math.sin(angle) * speed,
    life: 6,
  });
}

function launch(state: ArenaState, config: ArenaConfig, kind: AttackKind, random: Random): void {
  const { speed } = tempo(config);
  const { bruma, player } = state;
  const toPlayer = Math.atan2(player.z - bruma.z, player.x - bruma.x);
  switch (kind) {
    case 'rafaga': {
      const n = (config.calm ? 6 : 8) + config.level;
      const offset = random() * Math.PI * 2;
      for (let i = 0; i < n; i++)
        spawnOrb(state, bruma.x, bruma.z, offset + (i / n) * Math.PI * 2, speed * 0.85);
      break;
    }
    case 'acecho': {
      const spread = config.calm ? 0.32 : 0.22;
      for (const k of [-1, 0, 1])
        spawnOrb(state, bruma.x, bruma.z, toPlayer + k * spread, speed * 1.1);
      break;
    }
    case 'espiral':
      state.burst = {
        kind,
        left: config.calm ? 10 : 14 + config.level * 2,
        angle: random() * Math.PI * 2,
      };
      break;
    case 'golpe': {
      const n = config.calm ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const a = random() * Math.PI * 2;
        const d = i === 0 ? 0 : 1.2 + random() * 1.4;
        state.zones.push({
          id: state.nextId++,
          x: clampTo(player.x + Math.cos(a) * d, config.radius),
          z: clampTo(player.z + Math.sin(a) * d, config.radius),
          r: 1.1,
          warn: config.calm ? 1.5 : 1.0,
          active: 0.35,
        });
      }
      break;
    }
  }
}

const clampTo = (v: number, r: number) => Math.max(-r, Math.min(r, v));

function hurt(state: ArenaState, events: ArenaEvent[]): void {
  const { player } = state;
  if (player.shield > 0 || player.dashing > 0) return;
  player.lights -= 1;
  player.shield = HURT_SHIELD;
  events.push({ type: 'herido', lights: player.lights });
  if (player.lights <= 0) {
    state.outcome = 'retirada';
    events.push({ type: 'retirada' });
  }
}

/** Avanza el combate `dt` segundos. Muta `state` y devuelve lo que pasó. */
export function stepArena(
  state: ArenaState,
  config: ArenaConfig,
  input: ArenaInput,
  dt: number,
  random: Random,
): ArenaEvent[] {
  const events: ArenaEvent[] = [];
  if (state.outcome !== 'en-curso') return events;
  state.time += dt;
  const { player, bruma } = state;

  // Explorador: movimiento, esquiva y límites de la plataforma.
  const len = Math.hypot(input.move.x, input.move.z);
  const dir = len > 0 ? { x: input.move.x / len, z: input.move.z / len } : null;
  player.moving = dir !== null;
  if (dir) player.facing = Math.atan2(dir.z, dir.x);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.shield = Math.max(0, player.shield - dt);
  if (input.dash && player.dashCooldown === 0) {
    player.dashing = DASH_TIME;
    player.dashCooldown = DASH_COOLDOWN;
    events.push({ type: 'esquiva' });
  }
  const speed = player.dashing > 0 ? DASH_SPEED : PLAYER_SPEED;
  player.dashing = Math.max(0, player.dashing - dt);
  const heading =
    dir ?? (player.dashing > 0 ? { x: Math.cos(player.facing), z: Math.sin(player.facing) } : null);
  if (heading) {
    player.x += heading.x * speed * dt;
    player.z += heading.z * speed * dt;
  }
  const out = Math.hypot(player.x, player.z);
  const max = config.radius - PLAYER_RADIUS;
  if (out > max) {
    player.x *= max / out;
    player.z *= max / out;
  }

  // Bruma: orbita el centro; aturdida, se detiene.
  bruma.stagger = Math.max(0, bruma.stagger - dt);
  if (bruma.stagger === 0) bruma.orbit += dt * (0.18 + 0.05 * bruma.phase);
  bruma.x = Math.cos(bruma.orbit) * BRUMA_ORBIT;
  bruma.z = Math.sin(bruma.orbit) * BRUMA_ORBIT;

  // Ataques.
  const { speed: orbSpeed, every } = tempo(config);
  const kinds = config.attacks?.[bruma.phase] ?? ATTACKS[bruma.phase];
  if (state.burst) {
    state.burst.angle += 0.42;
    state.burst.left -= 1;
    spawnOrb(state, bruma.x, bruma.z, state.burst.angle, orbSpeed * 0.8);
    spawnOrb(state, bruma.x, bruma.z, state.burst.angle + Math.PI, orbSpeed * 0.8);
    if (state.burst.left <= 0) state.burst = null;
  } else if (bruma.stagger === 0) {
    state.attackIn -= dt;
    if (state.attackIn <= 0 && kinds.length > 0) {
      const kind = kinds[Math.floor(random() * kinds.length)] ?? 'rafaga';
      launch(state, config, kind, random);
      events.push({ type: 'ataque', kind });
      state.attackIn = every * (0.8 + random() * 0.4);
    }
  }

  // Proyectiles y zonas.
  const reach = PLAYER_RADIUS + ORB_RADIUS;
  state.orbs = state.orbs.filter((orb) => {
    orb.x += orb.vx * dt;
    orb.z += orb.vz * dt;
    orb.life -= dt;
    if (Math.hypot(orb.x - player.x, orb.z - player.z) < reach) {
      hurt(state, events);
      return false;
    }
    return orb.life > 0 && Math.hypot(orb.x, orb.z) < config.radius + 3;
  });
  state.zones = state.zones.filter((zone) => {
    if (zone.warn > 0) {
      zone.warn -= dt;
      return true;
    }
    zone.active -= dt;
    if (Math.hypot(zone.x - player.x, zone.z - player.z) < zone.r + PLAYER_RADIUS * 0.5)
      hurt(state, events);
    return zone.active > 0;
  });
  if (player.lights <= 0) return events;

  // Haz de luz.
  if (state.beam) {
    state.beam.life -= dt;
    if (state.beam.life <= 0) state.beam = null;
  }
  if (input.fire) {
    if (state.charge < 1) {
      events.push({ type: 'sin-carga' });
    } else {
      state.charge -= 1;
      const angle = input.aim
        ? Math.atan2(input.aim.z - player.z, input.aim.x - player.x)
        : player.facing;
      const toBruma = Math.atan2(bruma.z - player.z, bruma.x - player.x);
      const off = Math.abs(Math.atan2(Math.sin(angle - toBruma), Math.cos(angle - toBruma)));
      const hit = off <= aimTolerance(config.calm);
      const length = Math.hypot(bruma.x - player.x, bruma.z - player.z);
      const end = hit
        ? { x: bruma.x, z: bruma.z }
        : { x: player.x + Math.cos(angle) * length, z: player.z + Math.sin(angle) * length };
      state.beam = { from: { x: player.x, z: player.z }, to: end, hit, life: 0.45 };
      events.push({ type: 'haz', hit });
      if (hit) {
        bruma.hits += 1;
        bruma.stagger = 0.9;
        state.orbs = state.orbs.filter((o) => Math.hypot(o.x - bruma.x, o.z - bruma.z) > 2.2);
        const phase = phaseFor(bruma.hits, config.goal);
        if (phase !== bruma.phase) {
          bruma.phase = phase;
          events.push({ type: 'fase', phase });
        }
        if (bruma.hits >= config.goal) {
          state.outcome = 'victoria';
          state.orbs = [];
          state.zones = [];
          events.push({ type: 'victoria' });
        }
      }
    }
  }
  return events;
}
