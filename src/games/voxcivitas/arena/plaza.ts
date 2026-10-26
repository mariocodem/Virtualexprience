import { ORB_RADIUS, PLAYER_RADIUS, type ArenaState, type Vec2 } from '@/games/shared/arena/core';
import type { Reply } from './voices';

/**
 * La plaza de la arena de Voxcivitas: los vecinos en sus corrillos, el frío
 * de la indiferencia que los apaga y quién alza la voz. Se avanza cuadro a
 * cuadro junto al núcleo del combate (muta el estado y devuelve lo que pasó),
 * sin azar oculto: con las mismas entradas da lo mismo, así se prueba.
 */

export type Mood =
  /** Participa: conserva su color mientras la indiferencia no lo apague. */
  | 'atento'
  /** Pide la palabra: espera a que alguien llegue a escucharlo. */
  | 'alza-la-voz'
  /** Alguien lo escucha (pausa táctica). */
  | 'escuchando'
  /** Se sintió escuchado: su farol encendido protege y anima a los demás. */
  | 'farol'
  /** La indiferencia lo alcanzó. */
  | 'apagado';

export interface Neighbor {
  id: number;
  x: number;
  z: number;
  /** Hacia dónde mira (ángulo en el plano XZ, 0 = +X). */
  facing: number;
  /** Índice del grupo del cabildo al que pertenece. */
  group: number;
  /** De 1 (participa, con su color) a 0 (gris). */
  warmth: number;
  mood: Mood;
}

/** Estela de luz que viaja del farol de un vecino a la linterna del explorador. */
export interface Trail {
  from: number;
  /** Progreso del viaje, de 0 a 1. */
  t: number;
}

export interface PlazaState {
  neighbors: Neighbor[];
  /** Vecino que alza la voz (o al que se escucha), si hay. */
  speaker: number | null;
  /** Segundos de paciencia que le quedan a quien alza la voz. */
  patience: number;
  /** Segundos hasta el próximo llamado. */
  callIn: number;
  trails: Trail[];
}

export interface PlazaConfig {
  radius: number;
  level: number;
  calm: boolean;
  /** Número de grupos del cabildo (para repartir los corrillos). */
  groups: number;
}

export type PlazaEvent =
  /** Toca que alguien alce la voz: la arena elige qué dice y llama a `summon`. */
  | { type: 'turno' }
  /** Nadie llegó a tiempo: quien alzó la voz se apaga. */
  | { type: 'se-rinde'; index: number };

export const NEIGHBOR_RADIUS = 0.42;
/** Distancia a la que se puede escuchar a quien alza la voz. */
export const REACH = 1.9;
/** Radio en que un farol encendido disuelve la niebla. */
export const SHELTER = 1.5;
/** Segundos que tarda la estela en llegar a la linterna. */
export const TRAIL_TIME = 0.9;
/** Radio en que un farol anima (o una falacia enfría) a quienes están cerca. */
export const WARM_RADIUS = 2.8;
const CLUSTER_RING = 0.95;
const CLUSTER_SIZE = 5;
/** Por debajo de este calor, un vecino ya no pide la palabra por su cuenta. */
const COLD = 0.15;

/** Ritmo de la plaza según el nivel; el ritmo tranquilo da más paciencia y enfría menos. */
export function plazaTiming(level: number, calm: boolean) {
  return {
    first: calm ? 3 : 2.2,
    gap: calm ? 3.2 : 2.2,
    patience: calm ? 26 : Math.max(11, 19 - 1.5 * level),
    /** Calor que roba por segundo un orbe de niebla que atraviesa a un vecino. */
    chill: calm ? 0.9 : 1.6,
    /** Frío de fondo: la indiferencia avanza sola, despacio. */
    drift: calm ? 0.002 : 0.004,
    /** Calor que da por segundo un farol a quienes tiene cerca. */
    glow: 0.03,
  };
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Cuatro corrillos de cinco vecinos en las esquinas de la plaza, cada uno de
 * un grupo, y tres vecinos sueltos a los lados y al fondo. El frente queda
 * libre: por ahí entra el explorador.
 */
export function createPlaza(config: PlazaConfig): PlazaState {
  const groups = Math.max(1, config.groups);
  const neighbors: Neighbor[] = [];
  const ring = config.radius * 0.73;
  [1, 3, 5, 7].forEach((k, cluster) => {
    const a = (k * Math.PI) / 4;
    const cx = Math.cos(a) * ring;
    const cz = Math.sin(a) * ring;
    for (let i = 0; i < CLUSTER_SIZE; i++) {
      const b = a + 0.3 + (i * Math.PI * 2) / CLUSTER_SIZE;
      const x = cx + Math.cos(b) * CLUSTER_RING;
      const z = cz + Math.sin(b) * CLUSTER_RING;
      neighbors.push({
        id: neighbors.length,
        x,
        z,
        facing: Math.atan2(cz - z, cx - x),
        group: cluster % groups,
        warmth: 1,
        mood: 'atento',
      });
    }
  });
  [0, Math.PI, (3 * Math.PI) / 2].forEach((a, k) => {
    const x = Math.cos(a) * config.radius * 0.84;
    const z = Math.sin(a) * config.radius * 0.84;
    neighbors.push({
      id: neighbors.length,
      x,
      z,
      facing: Math.atan2(-z, -x),
      group: (k + 1) % groups,
      warmth: 1,
      mood: 'atento',
    });
  });
  return {
    neighbors,
    speaker: null,
    patience: 0,
    callIn: plazaTiming(config.level, config.calm).first,
    trails: [],
  };
}

/** Avanza la plaza `dt` segundos, después del núcleo del combate. Muta ambos estados. */
export function stepPlaza(
  plaza: PlazaState,
  arena: ArenaState,
  config: PlazaConfig,
  dt: number,
): PlazaEvent[] {
  const events: PlazaEvent[] = [];
  if (arena.outcome !== 'en-curso') return events;
  const timing = plazaTiming(config.level, config.calm);
  const { player } = arena;
  const { neighbors } = plaza;

  // Nadie atraviesa a los vecinos: el explorador los rodea.
  const min = NEIGHBOR_RADIUS + PLAYER_RADIUS;
  for (const n of neighbors) {
    const dx = player.x - n.x;
    const dz = player.z - n.z;
    const d = Math.hypot(dx, dz);
    if (d >= min) continue;
    if (d < 1e-6) {
      player.x = n.x + min;
    } else {
      player.x = n.x + (dx / d) * min;
      player.z = n.z + (dz / d) * min;
    }
  }

  // La niebla apaga a quien atraviesa; los faroles encendidos la disuelven.
  const touch = NEIGHBOR_RADIUS + ORB_RADIUS;
  arena.orbs = arena.orbs.filter((orb) => {
    for (const n of neighbors) {
      if (n.mood === 'farol') {
        if (dist(orb, n) < SHELTER) return false;
      } else if ((n.mood === 'atento' || n.mood === 'apagado') && dist(orb, n) < touch) {
        n.warmth = Math.max(0, n.warmth - timing.chill * dt);
      }
    }
    return true;
  });

  // Frío de fondo y la luz que contagia un farol.
  for (const n of neighbors) {
    if (n.mood === 'atento') n.warmth = Math.max(0, n.warmth - timing.drift * dt);
  }
  for (const f of neighbors) {
    if (f.mood !== 'farol') continue;
    for (const n of neighbors) {
      if ((n.mood !== 'atento' && n.mood !== 'apagado') || dist(f, n) > WARM_RADIUS) continue;
      n.warmth = Math.min(1, n.warmth + timing.glow * dt);
      if (n.mood === 'apagado' && n.warmth >= 0.45) n.mood = 'atento';
    }
  }

  // Quien alzó la voz espera; si nadie llega, se rinde.
  const speaker = plaza.speaker === null ? undefined : neighbors[plaza.speaker];
  if (speaker && plaza.speaker !== null) {
    if (speaker.mood === 'alza-la-voz') {
      plaza.patience = Math.max(0, plaza.patience - dt);
      if (plaza.patience === 0) {
        speaker.mood = 'apagado';
        speaker.warmth = 0;
        events.push({ type: 'se-rinde', index: plaza.speaker });
        plaza.speaker = null;
        plaza.callIn = timing.gap;
      }
    }
  } else {
    plaza.callIn = Math.max(0, plaza.callIn - dt);
    // Con dos disparos cargados, primero hay que usarlos.
    if (plaza.callIn === 0 && arena.charge < 2) {
      events.push({ type: 'turno' });
      plaza.callIn = 0.5;
    }
  }

  for (const trail of plaza.trails) trail.t += dt / TRAIL_TIME;
  plaza.trails = plaza.trails.filter((trail) => trail.t < 1);
  return events;
}

/**
 * Alguien alza la voz: de preferencia del grupo que habla, con calor para
 * participar y lejos del explorador (hay que ir hasta allá). Devuelve su índice.
 */
export function summon(
  plaza: PlazaState,
  config: PlazaConfig,
  group: number | null,
  player: Vec2,
  random: () => number,
): number | null {
  const ofGroup = (n: Neighbor) => group === null || n.group === group;
  const open = (n: Neighbor) => n.mood === 'atento' || n.mood === 'apagado';
  const warm = (n: Neighbor) => n.mood === 'atento' && n.warmth > COLD;
  const passes: ((n: Neighbor) => boolean)[] = [
    (n) => warm(n) && ofGroup(n),
    (n) => open(n) && ofGroup(n),
    warm,
    open,
    (n) => n.mood === 'farol',
  ];
  for (const test of passes) {
    const found = plaza.neighbors.filter(test);
    if (found.length === 0) continue;
    const far = found.filter((n) => dist(n, player) >= 3);
    const pool = far.length > 0 ? far : found;
    const chosen = pool[Math.floor(random() * pool.length)] ?? pool[0];
    if (!chosen) continue;
    chosen.mood = 'alza-la-voz';
    chosen.warmth = Math.max(chosen.warmth, 0.55);
    plaza.speaker = chosen.id;
    plaza.patience = plazaTiming(config.level, config.calm).patience;
    return chosen.id;
  }
  return null;
}

/** Distancia para escuchar: con ritmo tranquilo basta con acercarse un poco más. */
export const reachFor = (calm: boolean) => (calm ? REACH * 1.45 : REACH);

/** ¿Está el explorador lo bastante cerca de quien alza la voz para escucharlo? */
export function canListen(plaza: PlazaState, player: Vec2, reach = REACH): boolean {
  if (plaza.speaker === null) return false;
  const n = plaza.neighbors[plaza.speaker];
  return n?.mood === 'alza-la-voz' && dist(n, player) <= reach;
}

/** El explorador llega y escucha: la paciencia deja de correr. */
export function listen(plaza: PlazaState): void {
  const n = plaza.speaker === null ? undefined : plaza.neighbors[plaza.speaker];
  if (n?.mood === 'alza-la-voz') n.mood = 'escuchando';
}

/** El desenlace de la intervención en la plaza. */
export function resolve(plaza: PlazaState, config: PlazaConfig, reply: Reply): void {
  if (plaza.speaker === null) return;
  const n = plaza.neighbors[plaza.speaker];
  if (!n) return;
  const around = plaza.neighbors.filter(
    (m) => m !== n && (m.mood === 'atento' || m.mood === 'apagado') && dist(m, n) <= WARM_RADIUS,
  );
  if (reply === 'enciende') {
    n.mood = 'farol';
    n.warmth = 1;
    for (const m of around) {
      m.warmth = Math.min(1, m.warmth + 0.35);
      if (m.mood === 'apagado' && m.warmth >= 0.45) m.mood = 'atento';
    }
    plaza.trails.push({ from: n.id, t: 0 });
  } else if (reply === 'a-medias') {
    n.mood = 'atento';
    n.warmth = 0.6;
  } else {
    n.mood = 'apagado';
    n.warmth = 0;
    for (const m of around) if (m.mood === 'atento') m.warmth = Math.max(0, m.warmth - 0.2);
  }
  plaza.speaker = null;
  plaza.callIn = plazaTiming(config.level, config.calm).gap;
}

/** Ánimo de la plaza (0–1): el calor medio de los vecinos; un farol cuenta como 1. */
export function plazaMood(plaza: PlazaState): number {
  const { neighbors } = plaza;
  if (neighbors.length === 0) return 0;
  return (
    neighbors.reduce((sum, n) => sum + (n.mood === 'farol' ? 1 : n.warmth), 0) / neighbors.length
  );
}

export function litCount(plaza: PlazaState): number {
  return plaza.neighbors.filter((n) => n.mood === 'farol').length;
}

/** Dónde queda un punto, visto desde la cámara: «al fondo a la izquierda de la plaza». */
export function whereIs(point: Vec2): string {
  const depth = point.z < -2.5 ? 'al fondo' : point.z > 2.5 ? 'al frente' : '';
  const side = point.x < -2.5 ? 'a la izquierda' : point.x > 2.5 ? 'a la derecha' : '';
  if (!depth && !side) return 'en el centro de la plaza';
  return `${[depth, side].filter(Boolean).join(' ')} de la plaza`;
}
