import type { FeedbackKind } from '@/data/contentSchemas';
import type { Vec2 } from '../../shared/arena/core';
import { pickCanonRound, type CanonFeedback, type CanonRound } from './model';

/**
 * Recolección y fabricación de la arena «Prototipar el cañón de luz»: los
 * comentarios flotan por el taller como burbujas, se recoge una y se lleva
 * al banco de trabajo o a la papelera. Todo es puro y determinista (recibe su
 * azar), así se prueba sin navegador.
 */

export type Tier = 1 | 2 | 3;

export interface Bubble {
  id: number;
  feedbackId: string;
  userId: string;
  quote: string;
  kind: FeedbackKind;
  why: string;
  tier: Tier;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Segundos que le quedan flotando antes de reventarse. */
  life: number;
  /** La lleva el explorador. */
  held: boolean;
}

export interface CollectConfig {
  /** Radio de la plataforma. */
  radius: number;
  /** Burbujas flotando a la vez. */
  count: number;
  /** Velocidad de la deriva. */
  drift: number;
  life: number;
  /** Distancia a la que se alcanza una burbuja. */
  reach: number;
  /** Fracción de velocidad que queda al cargar una burbuja. */
  burden: number;
  calm: boolean;
}

export const BENCH: Vec2 = { x: -5.4, z: 3.2 };
export const BIN: Vec2 = { x: 5.4, z: 3.2 };
export const BENCH_REACH = 1.9;
export const BIN_REACH = 1.6;
/** Mejoras del cañón (aspecto) y comentarios que se repiten que lleva cada una. */
export const UPGRADE_EVERY = 2;
export const MAX_UPGRADES = 3;
/** Segundos que queda atascado el cañón tras llevarle una ocurrencia. */
export const JAM_TIME = 3.5;

export function collectConfig(calm: boolean, level: number): CollectConfig {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  return {
    radius: 9,
    count: calm ? 3 : 4,
    drift: (calm ? 0.55 : 0.8) + 0.07 * l,
    life: calm ? 40 : 26,
    reach: calm ? 1.9 : 1.4,
    burden: calm ? 0.85 : 0.62,
    calm,
  };
}

export interface CollectState {
  bubbles: Bubble[];
  nextId: number;
  /** Comentarios de la ronda en curso que aún no han salido a flotar. */
  queue: CanonFeedback[];
  roundId: string | null;
  roundTier: Tier;
  /** Segundos para que salga la siguiente burbuja si falta alguna. */
  spawnIn: number;
  /** Comentarios que se repiten llevados al banco: mejoran el cañón. */
  delivered: number;
  /** Segundos de atasco que quedan. */
  jam: number;
}

export function createCollect(): CollectState {
  return {
    bubbles: [],
    nextId: 1,
    queue: [],
    roundId: null,
    roundTier: 1,
    spawnIn: 0.4,
    delivered: 0,
    jam: 0,
  };
}

/** Nivel visible del cañón (0 a MAX_UPGRADES). */
export function cannonLevel(state: Pick<CollectState, 'delivered'>): number {
  return Math.min(MAX_UPGRADES, Math.floor(state.delivered / UPGRADE_EVERY));
}

const shuffle = <T>(items: readonly T[], random: () => number): T[] =>
  items
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);

/**
 * Siguiente comentario: se sacan por rondas enteras para que las voces que
 * repiten un patrón floten a la vez y se puedan comparar.
 */
function nextFeedback(
  state: CollectState,
  tier: Tier,
  random: () => number,
  rounds?: readonly CanonRound[],
): { feedback: CanonFeedback; tier: Tier } {
  if (state.queue.length === 0) {
    const round = pickCanonRound(tier, random, state.roundId ?? undefined, rounds);
    state.roundId = round.id;
    state.roundTier = round.tier;
    state.queue = shuffle(round.feedback, random);
  }
  const feedback = state.queue.shift();
  if (!feedback) throw new Error('Cola de comentarios vacía.');
  return { feedback, tier: state.roundTier };
}

function spawn(
  state: CollectState,
  config: CollectConfig,
  tier: Tier,
  random: () => number,
  rounds?: readonly CanonRound[],
): Bubble {
  const { feedback, tier: own } = nextFeedback(state, tier, random, rounds);
  const angle = random() * Math.PI * 2;
  const heading = random() * Math.PI * 2;
  const where = config.radius * 0.55 * Math.sqrt(random());
  const bubble: Bubble = {
    id: state.nextId++,
    feedbackId: feedback.id,
    userId: feedback.userId,
    quote: feedback.quote,
    kind: feedback.kind,
    why: feedback.why,
    tier: own,
    x: Math.cos(angle) * where,
    z: Math.sin(angle) * where,
    vx: Math.cos(heading) * config.drift,
    vz: Math.sin(heading) * config.drift,
    life: config.life * (0.85 + random() * 0.3),
    held: false,
  };
  state.bubbles.push(bubble);
  return bubble;
}

export interface CollectStep {
  /** Cambió el conjunto de burbujas (salió o reventó alguna). */
  changed: boolean;
  /** Burbujas que reventaron sin que nadie las recogiera. */
  popped: Bubble[];
}

/** Avanza la deriva `dt` segundos: mueve, rebota, hace reventar y repone burbujas. */
export function stepCollect(
  state: CollectState,
  config: CollectConfig,
  dt: number,
  random: () => number,
  tier: Tier,
  rounds?: readonly CanonRound[],
): CollectStep {
  let changed = false;
  const popped: Bubble[] = [];
  state.jam = Math.max(0, state.jam - dt);
  const edge = config.radius - 1.1;
  for (const b of state.bubbles) {
    if (b.held) continue;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    const out = Math.hypot(b.x, b.z);
    if (out > edge) {
      // Rebota hacia adentro: refleja la velocidad sobre la normal del borde.
      const nx = b.x / out;
      const nz = b.z / out;
      const dot = b.vx * nx + b.vz * nz;
      if (dot > 0) {
        b.vx -= 2 * dot * nx;
        b.vz -= 2 * dot * nz;
      }
      b.x = nx * edge;
      b.z = nz * edge;
    }
    b.life -= dt;
  }
  const kept = state.bubbles.filter((b) => {
    if (b.held || b.life > 0) return true;
    popped.push(b);
    return false;
  });
  if (kept.length !== state.bubbles.length) {
    state.bubbles = kept;
    changed = true;
  }
  if (state.bubbles.length < config.count) {
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawn(state, config, tier, random, rounds);
      state.spawnIn = 0.9;
      changed = true;
    }
  }
  return { changed, popped };
}

/** La burbuja libre más cercana dentro de `reach`, si la hay. */
export function nearestBubble(state: CollectState, at: Vec2, reach: number): Bubble | null {
  let best: Bubble | null = null;
  let bestDistance = reach;
  for (const b of state.bubbles) {
    if (b.held) continue;
    const d = Math.hypot(b.x - at.x, b.z - at.z);
    if (d <= bestDistance) {
      best = b;
      bestDistance = d;
    }
  }
  return best;
}

export function heldBubble(state: CollectState): Bubble | null {
  return state.bubbles.find((b) => b.held) ?? null;
}

/** Recoge una burbuja si no se lleva otra. */
export function pickUp(state: CollectState, bubble: Bubble): boolean {
  if (heldBubble(state)) return false;
  bubble.held = true;
  return true;
}

/** Dónde está el explorador respecto de los dos puntos de entrega. */
export type Place = 'banco' | 'papelera';

export function placeAt(at: Vec2): Place | null {
  if (Math.hypot(at.x - BENCH.x, at.z - BENCH.z) <= BENCH_REACH) return 'banco';
  if (Math.hypot(at.x - BIN.x, at.z - BIN.z) <= BIN_REACH) return 'papelera';
  return null;
}

export type Effect = 'carga' | 'atasco' | 'descarte' | 'perdido';

export interface Resolution {
  /** ¿Fue la decisión correcta para el conocimiento? */
  correct: boolean;
  effect: Effect;
  /** Mensaje de lo ocurrido, en español. */
  message: string;
}

/**
 * Qué pasa al llevar un comentario a un sitio. Lo que se repite mejora el
 * cañón; una ocurrencia o un caso aislado lo atasca; descartar lo que no es
 * evidencia está bien, pero tirar un patrón pierde evidencia.
 */
export function resolveDelivery(kind: FeedbackKind, place: Place): Resolution {
  if (place === 'banco') {
    if (kind === 'patron')
      return {
        correct: true,
        effect: 'carga',
        message: 'Se repite: el cañón mejora y se carga.',
      };
    return {
      correct: false,
      effect: 'atasco',
      message:
        kind === 'aislado'
          ? 'Lo dijo una sola persona: el cañón se atasca.'
          : 'Eso no es del problema: el cañón se atasca.',
    };
  }
  if (kind === 'patron')
    return {
      correct: false,
      effect: 'perdido',
      message: 'Eso lo decían varias personas: perdiste evidencia.',
    };
  return {
    correct: true,
    effect: 'descarte',
    message:
      kind === 'aislado'
        ? 'Bien: un caso aislado se anota, no se construye.'
        : 'Bien: lo que está fuera del problema no es evidencia.',
  };
}

/** Quita la burbuja entregada y aplica el efecto de la entrega al estado del taller. */
export function deliver(state: CollectState, bubble: Bubble, resolution: Resolution): void {
  state.bubbles = state.bubbles.filter((b) => b.id !== bubble.id);
  if (resolution.effect === 'carga') state.delivered += 1;
  if (resolution.effect === 'atasco') state.jam = JAM_TIME;
  state.spawnIn = Math.min(state.spawnIn, 0.8);
}

/**
 * Deja al explorador más lento mientras carga: si se movió desde `last`, solo
 * avanza la fracción `burden` del trayecto (sin afectar la esquiva).
 */
export function applyBurden(at: Vec2, last: Vec2, burden: number, maxStep = 1.5): void {
  const dx = at.x - last.x;
  const dz = at.z - last.z;
  if (Math.hypot(dx, dz) > maxStep) return;
  at.x = last.x + dx * burden;
  at.z = last.z + dz * burden;
}
