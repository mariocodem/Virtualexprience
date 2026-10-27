import { mixHex } from '../../shared/palette';

/**
 * Lógica pura de la escena 3D del «Día de mercado»: cuántas cajas hay que
 * apilar, dónde van, qué clientes llegan y cómo hacen la fila, y la luz de
 * cada hora del día. Las reglas del negocio (ventas, caja, informe) siguen
 * siendo las del motor `src/minigames/dia-de-mercado/engine.ts`: aquí solo se
 * pone en escena lo que el motor ya decidió.
 */

/** Empanadas por caja. */
export const PER_CRATE = 20;
export const MAX_CRATES = 12;

export const crateCount = (order: number): number =>
  Math.min(MAX_CRATES, Math.max(0, Math.ceil(order / PER_CRATE)));

/** Qué tan llena va la caja `i` del pedido (la última puede ir a medias). */
export const crateFill = (order: number, i: number): number =>
  Math.min(1, Math.max(0, (order - i * PER_CRATE) / PER_CRATE));

export interface Slot {
  x: number;
  y: number;
  z: number;
}

const CRATE = { w: 0.9, h: 0.55, d: 0.7 };

/** Puesto de la caja `i` en la pila del muelle: ocho por piso, cuatro de ancho. */
export function crateSlot(i: number): Slot {
  const layer = Math.floor(i / 8);
  const k = i % 8;
  const col = k % 4;
  const row = Math.floor(k / 4);
  return {
    x: (col - 1.5) * (CRATE.w + 0.05),
    y: CRATE.h / 2 + layer * (CRATE.h + 0.02),
    z: (row - 0.5) * (CRATE.d + 0.05),
  };
}
export const CRATE_SIZE = CRATE;

/** Puesto de la empanada `i` sobre el mostrador: 25 de ancho por filas de fondo. */
export function stockSlot(i: number): Slot {
  const col = i % 25;
  const row = Math.floor(i / 25);
  return { x: (col - 12) * 0.185, y: 0, z: 0.18 - row * 0.2 };
}

export interface CustomerPlan {
  id: number;
  qty: number;
  served: boolean;
  shirt: number;
  skin: number;
}

/** Reparte `total` en `parts` partes casi iguales (suman exactamente `total`). */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const extra = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Clientes de la jornada: cada figura es un grupo que compra varias
 * empanadas. Los servidos suman exactamente lo vendido y los que se van sin
 * comprar, lo que quedó sin atender. Si sobró producto, los que no se
 * atienden (por cansancio del equipo) se cuelan a mitad de la fila; si se
 * acabó el producto, son los últimos.
 */
export function planCustomers(result: {
  sold: number;
  missed: number;
  waste: number;
}): CustomerPlan[] {
  const served = splitEvenly(
    result.sold,
    result.sold === 0 ? 0 : clamp(Math.ceil(result.sold / 9), 1, 9),
  );
  const lost = splitEvenly(
    result.missed,
    result.missed === 0 ? 0 : clamp(Math.ceil(result.missed / 9), 1, 4),
  );
  const plans = served.map((qty) => ({ qty, served: true }));
  const at = result.waste > 0 ? Math.floor(plans.length * 0.6) : plans.length;
  plans.splice(at, 0, ...lost.map((qty) => ({ qty, served: false })));
  return plans.map((p, id) => ({ ...p, id, shirt: id % 5, skin: (id * 2 + 1) % 4 }));
}

export type WalkerState = 'llegando' | 'fila' | 'comprando' | 'se-va' | 'fuera';

export interface Walker {
  plan: CustomerPlan;
  x: number;
  z: number;
  state: WalkerState;
  timer: number;
  /** Se va con su bolsa. */
  bag: boolean;
  /** Se va sin comprar. */
  turned: boolean;
  /** Hacia dónde mira (radianes sobre XZ). */
  facing: number;
}

export interface Queue {
  walkers: Walker[];
  plan: CustomerPlan[];
  time: number;
  spawned: number;
  spawnIn: number;
  stock: number;
  sold: number;
  missed: number;
  done: boolean;
}

export const SPAWN = { x: -12, z: 2.4 };
export const SERVE = { x: 0.6, z: 2.4 };
export const EXIT_SERVED = { x: 7, z: 6 };
export const EXIT_TURNED = { x: -10, z: 6 };
const SPACING = 0.95;
const WALK = 3.2;
const BUY_TIME = 0.75;
const GAP = 0.6;

export function createQueue(plan: CustomerPlan[], stock: number): Queue {
  return {
    walkers: [],
    plan,
    time: 0,
    spawned: 0,
    spawnIn: 0.3,
    stock,
    sold: 0,
    missed: 0,
    done: plan.length === 0,
  };
}

function approach(w: Walker, tx: number, tz: number, speed: number, dt: number): boolean {
  const dx = tx - w.x;
  const dz = tz - w.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.001) return true;
  w.facing = Math.atan2(dz, dx);
  const step = Math.min(d, speed * dt);
  w.x += (dx / d) * step;
  w.z += (dz / d) * step;
  return d - step < 0.01;
}

/** Avanza la fila `dt` segundos: llegan, esperan su turno, compran (o se van sin comprar) y se retiran. */
export function stepQueue(q: Queue, dt: number): void {
  if (q.done) return;
  q.time += dt;
  q.spawnIn -= dt;
  if (q.spawnIn <= 0 && q.spawned < q.plan.length) {
    const plan = q.plan[q.spawned];
    if (plan)
      q.walkers.push({
        plan,
        x: SPAWN.x,
        z: SPAWN.z,
        state: 'llegando',
        timer: 0,
        bag: false,
        turned: false,
        facing: 0,
      });
    q.spawned += 1;
    q.spawnIn = GAP;
  }
  let rank = 0;
  for (const w of q.walkers) {
    if (w.state === 'fuera') continue;
    if (w.state === 'se-va') {
      const exit = w.turned ? EXIT_TURNED : EXIT_SERVED;
      if (approach(w, exit.x, exit.z, WALK * 1.2, dt)) w.state = 'fuera';
      continue;
    }
    const target = SERVE.x - rank * SPACING;
    rank += 1;
    const arrived = approach(w, target, SERVE.z, WALK, dt);
    if (w.state === 'llegando' && arrived) w.state = 'fila';
    if (w.state === 'fila' && arrived && rank === 1) {
      w.state = 'comprando';
      w.timer = BUY_TIME;
      w.facing = -Math.PI / 2;
    }
    if (w.state === 'comprando') {
      w.timer -= dt;
      if (w.timer <= 0) {
        if (w.plan.served) {
          q.stock -= w.plan.qty;
          q.sold += w.plan.qty;
          w.bag = true;
        } else {
          q.missed += w.plan.qty;
          w.turned = true;
        }
        w.state = 'se-va';
        rank -= 1;
      }
    }
  }
  if (q.spawned >= q.plan.length && q.walkers.every((w) => w.state === 'fuera')) q.done = true;
}

/** Fracción de la jornada ya atendida (0 a 1), para mover el sol. */
export function queueProgress(q: Queue): number {
  if (q.plan.length === 0) return 1;
  const gone = q.walkers.filter((w) => w.state === 'se-va' || w.state === 'fuera').length;
  return gone / q.plan.length;
}

/** Corre la fila hasta el final de golpe (al saltar la jornada). */
export function finishQueue(q: Queue): void {
  for (let i = 0; i < 4000 && !q.done; i++) stepQueue(q, 0.1);
}

export type Step = 'pedido' | 'dilema' | 'jornada' | 'cierre';

/** Hora del día (0 amanecer, 1 anochecer) a la que tiende la luz en cada momento. */
export function dayTarget(step: Step, progress: number): number {
  switch (step) {
    case 'pedido':
      return 0.05;
    case 'dilema':
      return 0.2;
    case 'jornada':
      return 0.26 + 0.64 * clamp(progress, 0, 1);
    case 'cierre':
      return 0.97;
  }
}

export interface DayLight {
  sky: string;
  fog: string;
  sun: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunPos: [number, number, number];
  /** 0 de día, 1 de noche cerrada: enciende las luces del puesto. */
  night: number;
}

interface Key {
  t: number;
  sky: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  night: number;
}

const KEYS: Key[] = [
  {
    t: -0.12,
    sky: '#16264d',
    sun: '#8aa0e0',
    sunI: 0.35,
    hemiSky: '#3a4f8c',
    hemiGround: '#14213f',
    hemiI: 0.55,
    night: 1,
  },
  {
    t: 0.04,
    sky: '#f4b98a',
    sun: '#ffb27a',
    sunI: 1.5,
    hemiSky: '#ffd9b8',
    hemiGround: '#4a5f93',
    hemiI: 0.85,
    night: 0.25,
  },
  {
    t: 0.25,
    sky: '#a9d3ec',
    sun: '#ffe2b8',
    sunI: 2.3,
    hemiSky: '#eaf4fb',
    hemiGround: '#2a5a92',
    hemiI: 1.1,
    night: 0,
  },
  {
    t: 0.5,
    sky: '#9fd0ee',
    sun: '#fff6df',
    sunI: 2.7,
    hemiSky: '#f2f8fc',
    hemiGround: '#2a5a92',
    hemiI: 1.2,
    night: 0,
  },
  {
    t: 0.8,
    sky: '#f1c58a',
    sun: '#ffc27a',
    sunI: 2.1,
    hemiSky: '#ffe3c0',
    hemiGround: '#3c5a94',
    hemiI: 0.95,
    night: 0.15,
  },
  {
    t: 0.93,
    sky: '#d9806c',
    sun: '#ff8d63',
    sunI: 1.3,
    hemiSky: '#e8a98f',
    hemiGround: '#33467f',
    hemiI: 0.7,
    night: 0.6,
  },
  {
    t: 1.08,
    sky: '#16264d',
    sun: '#8aa0e0',
    sunI: 0.35,
    hemiSky: '#3a4f8c',
    hemiGround: '#14213f',
    hemiI: 0.55,
    night: 1,
  },
];

/** Luz de la hora `t`: amanecer, mañana, mediodía, tarde dorada, atardecer y noche. */
export function dayLight(t: number): DayLight {
  const x = clamp(t, KEYS[0]?.t ?? 0, KEYS.at(-1)?.t ?? 1);
  let i = 0;
  while (i < KEYS.length - 2 && x > (KEYS[i + 1]?.t ?? 0)) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  if (!a || !b) throw new Error('Sin claves de luz.');
  const k = clamp((x - a.t) / (b.t - a.t), 0, 1);
  const lerp = (p: number, q: number) => p + (q - p) * k;
  const arc = clamp(t, 0, 1) * Math.PI;
  const sky = mixHex(a.sky, b.sky, k);
  return {
    sky,
    fog: mixHex(sky, '#dfe7ea', 0.35),
    sun: mixHex(a.sun, b.sun, k),
    sunIntensity: lerp(a.sunI, b.sunI),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, k),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, k),
    hemiIntensity: lerp(a.hemiI, b.hemiI),
    sunPos: [-Math.cos(arc) * 16, Math.max(1.5, Math.sin(arc) * 14 + 1.5), 7],
    night: lerp(a.night, b.night),
  };
}
