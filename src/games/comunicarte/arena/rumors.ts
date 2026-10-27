import { z } from 'zod';
import { signalSchema, type Signal } from '@/data/contentSchemas';
import raw from './rumors.json';

/**
 * Reglas puras de la arena «Verificar los rumores»: la Bruma lanza rumores que
 * vuelan hacia la torre de radio; el explorador los intercepta, revisa una o
 * dos señales y decide entre desmentirlos o dejarlos pasar. Acertar carga la
 * linterna; equivocarse (o dejar que un rumor falso llegue a la torre)
 * fortalece a la Bruma.
 */

const text = z.string().min(1);

export const rumorSchema = z.strictObject({
  id: text,
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  truth: z.enum(['verdadero', 'falso']),
  headline: text,
  source: text,
  date: text,
  /** Dos señales que se pueden revisar al interceptar el rumor. */
  signals: z.array(z.strictObject({ signal: signalSchema, text })).length(2),
  explanation: text,
});

export const rumorsSchema = z.strictObject({ rumors: z.array(rumorSchema).min(6) });

export type RumorItem = z.infer<typeof rumorSchema>;
export type Truth = RumorItem['truth'];
export type Tier = RumorItem['tier'];

export function parseRumors(data: unknown): RumorItem[] {
  return rumorsSchema.parse(data).rumors;
}

export const RUMORS: RumorItem[] = parseRumors(raw);

/** La torre de radio, en el borde norte de la plataforma. */
export const TOWER = { x: 0, z: -7.0 } as const;
const ARRIVE_AT = 0.9;
/** Distancia a la que el explorador puede interceptar un rumor. */
export const INTERCEPT_REACH = 2.1;

export type RumorStatus = 'flying' | 'held' | 'cleared' | 'gone';

export interface LiveRumor {
  id: number;
  item: RumorItem;
  x: number;
  z: number;
  vx: number;
  vz: number;
  status: RumorStatus;
  reviewed: Signal[];
  /** Segundos desde que salió de la Bruma. */
  age: number;
}

export interface RumorPlan {
  /** Velocidad del rumor, en unidades por segundo. */
  speed: number;
  /** Segundos entre un rumor y el siguiente. */
  every: number;
  /** Rumores que pueden volar a la vez. */
  max: number;
}

export function rumorPlan(level: number, calm: boolean): RumorPlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  return {
    speed: (0.7 + 0.12 * l) * (calm ? 0.62 : 1),
    every: Math.max(2.1, 4.4 - 0.5 * l) * (calm ? 1.45 : 1),
    max: calm ? 1 : l < 3 ? 2 : 3,
  };
}

export interface RumorField {
  rumors: LiveRumor[];
  nextId: number;
  spawnIn: number;
  /** Rumores ya usados, para no repetir mientras queden. */
  used: string[];
  /** Verdad de los últimos rumores, para que no salgan todos iguales. */
  history: Truth[];
}

export function createField(firstIn = 2.5): RumorField {
  return { rumors: [], nextId: 1, spawnIn: firstIn, used: [], history: [] };
}

export type Random = () => number;

/** Elige el siguiente rumor: de la sutileza pedida, sin repetir, alternando verdaderos y falsos. */
export function pickRumor(
  items: readonly RumorItem[],
  tier: Tier,
  field: Pick<RumorField, 'used' | 'history'>,
  random: Random,
): RumorItem {
  const lastTwo = field.history.slice(-2);
  const sameRun = lastTwo.length === 2 && lastTwo[0] === lastTwo[1];
  const wantFalse = sameRun ? lastTwo[0] === 'verdadero' : random() < 0.6;
  const want: Truth = wantFalse ? 'falso' : 'verdadero';
  const fresh = items.filter((i) => !field.used.includes(i.id));
  const pool = fresh.length > 0 ? fresh : items;
  const tiers: Tier[] = [tier, ...([1, 2, 3] as Tier[]).filter((t) => t !== tier)];
  for (const t of tiers) {
    const options = pool.filter((i) => i.tier === t && i.truth === want);
    const any = pool.filter((i) => i.tier === t);
    const list = options.length > 0 ? options : any;
    const chosen = list[Math.floor(random() * list.length)];
    if (chosen) return chosen;
  }
  const fallback = items[0];
  if (!fallback) throw new Error('No hay rumores.');
  return fallback;
}

export type RumorEvent = { type: 'spawn'; rumor: LiveRumor } | { type: 'arrive'; rumor: LiveRumor };

const active = (r: LiveRumor) => r.status === 'flying' || r.status === 'held';

/** Avanza los rumores `dt` segundos y lanza uno nuevo si toca. Muta el campo. */
export function stepRumors(
  field: RumorField,
  plan: RumorPlan,
  dt: number,
  origin: { x: number; z: number },
  tier: Tier,
  canSpawn: boolean,
  random: Random,
  items: readonly RumorItem[] = RUMORS,
): RumorEvent[] {
  const events: RumorEvent[] = [];
  for (const r of field.rumors) {
    r.age += dt;
    if (r.status !== 'flying' && r.status !== 'cleared') continue;
    r.x += r.vx * dt;
    r.z += r.vz * dt;
    if (Math.hypot(TOWER.x - r.x, TOWER.z - r.z) < ARRIVE_AT) {
      events.push({ type: 'arrive', rumor: { ...r } });
      r.status = 'gone';
    }
  }
  field.rumors = field.rumors.filter((r) => r.status !== 'gone');

  field.spawnIn = Math.max(0, field.spawnIn - dt);
  if (canSpawn && field.spawnIn === 0 && field.rumors.filter(active).length < plan.max) {
    const item = pickRumor(items, tier, field, random);
    const dx = TOWER.x - origin.x;
    const dz = TOWER.z - origin.z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    // Sale un poco adelante de la Bruma para no esconderse en su niebla.
    const rumor: LiveRumor = {
      id: field.nextId++,
      item,
      x: origin.x + (dx / len) * 1.4,
      z: origin.z + (dz / len) * 1.4,
      vx: (dx / len) * plan.speed,
      vz: (dz / len) * plan.speed,
      status: 'flying',
      reviewed: [],
      age: 0,
    };
    field.rumors.push(rumor);
    field.used.push(item.id);
    field.history.push(item.truth);
    field.spawnIn = plan.every * (0.85 + random() * 0.3);
    events.push({ type: 'spawn', rumor: { ...rumor } });
  }
  return events;
}

/** El rumor volando más cercano al explorador dentro del alcance, o `null`. */
export function nearestFlying(
  field: RumorField,
  player: { x: number; z: number },
  reach = INTERCEPT_REACH,
): LiveRumor | null {
  let best: LiveRumor | null = null;
  let bestDistance = reach;
  for (const r of field.rumors) {
    if (r.status !== 'flying') continue;
    const d = Math.hypot(r.x - player.x, r.z - player.z);
    if (d < bestDistance) {
      best = r;
      bestDistance = d;
    }
  }
  return best;
}

export function findRumor(field: RumorField, id: number): LiveRumor | undefined {
  return field.rumors.find((r) => r.id === id);
}

/** Detiene un rumor para revisarlo: no avanza mientras se decide. */
export function hold(field: RumorField, id: number): boolean {
  const rumor = findRumor(field, id);
  if (rumor?.status !== 'flying') return false;
  rumor.status = 'held';
  return true;
}

/** Revisa una de las dos señales del rumor. Devuelve su texto, o `null` si no aplica. */
export function review(rumor: LiveRumor, signal: Signal): string | null {
  const found = rumor.item.signals.find((s) => s.signal === signal);
  if (!found) return null;
  if (!rumor.reviewed.includes(signal)) rumor.reviewed.push(signal);
  return found.text;
}

export type Choice = 'desmentir' | 'dejar-pasar';

export interface Judgement {
  correct: boolean;
  /** Disparos de linterna que gana (puede ser fracción). */
  charge: number;
  /** La Bruma se fortalece. */
  strengthen: boolean;
  /** Lo que se dice en la tarjeta tras decidir. */
  feedback: string;
}

/** Evalúa la decisión sobre un rumor interceptado. */
export function judge(item: RumorItem, choice: Choice): Judgement {
  const isFalse = item.truth === 'falso';
  if (choice === 'desmentir') {
    return isFalse
      ? {
          correct: true,
          charge: 1,
          strengthen: false,
          feedback: 'Desmentido a tiempo: la radio no lo difunde.',
        }
      : {
          correct: false,
          charge: 0,
          strengthen: true,
          feedback:
            'Era verdadero: desmentirlo le quita información útil a la gente y fortalece a la Bruma.',
        };
  }
  return isFalse
    ? {
        correct: false,
        charge: 0,
        strengthen: true,
        feedback: 'Era falso: lo dejaste pasar y la radio lo transmitirá.',
      }
    : {
        correct: true,
        charge: 0.5,
        strengthen: false,
        feedback: 'Verdadero: puede llegar a la torre y salir al aire.',
      };
}

/** Aplica la decisión al rumor retenido: desmentido se disipa; dejado pasar sigue su camino. */
export function resolve(field: RumorField, id: number, choice: Choice): void {
  const rumor = findRumor(field, id);
  if (rumor?.status !== 'held') return;
  rumor.status = choice === 'desmentir' ? 'gone' : 'cleared';
}

export interface ArrivalEffect {
  /** ¿Cuenta como decisión equivocada (un falso que nadie detuvo)? */
  mistake: boolean;
  strengthen: boolean;
  /** Texto para anunciar y para Brújula. */
  message: string;
}

/** Qué pasa cuando un rumor llega a la torre: solo un falso sin detener castiga. */
export function arrivalEffect(rumor: LiveRumor): ArrivalEffect {
  if (rumor.item.truth === 'falso' && rumor.status !== 'cleared') {
    return {
      mistake: true,
      strengthen: true,
      message: `La radio transmitió un rumor falso: «${rumor.item.headline}». ${rumor.item.explanation}`,
    };
  }
  return {
    mistake: false,
    strengthen: false,
    message:
      rumor.item.truth === 'verdadero'
        ? 'La radio transmitió una noticia verdadera.'
        : 'La radio transmitió el rumor falso que dejaste pasar.',
  };
}

/** Hay un rumor retenido o volando (la Bruma no lanza otro si ya hay el máximo). */
export const activeCount = (field: RumorField): number => field.rumors.filter(active).length;
