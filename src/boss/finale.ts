import type { FinaleContent, QuizItem } from '@/data/contentSchemas';
import type { IslandId } from '@/types/domain';
import { pickItem, type Outcome, type Random } from './engine';

/**
 * Gran Reto Integrador contra la Gran Bruma, como reductor puro. La Bruma toma
 * una tras otra la forma de cada isla y termina en su corazón, donde los
 * embates combinan las seis competencias. La luz del explorador son sus seis
 * fragmentos: cada error apaga uno. La sutileza de cada embate sigue el
 * dominio estimado de esa competencia.
 */

export type FormKey = IslandId | 'corazon';

export interface FinalePlan {
  level: number;
  /** Aciertos para disipar cada forma de isla. */
  hitsPerForm: number;
  /** Aciertos para disipar el corazón. */
  heartHits: number;
  /** Fragmentos de luz: errores que se pueden cometer antes de retirarse. */
  lights: number;
  /** Segundos para responder cada embate. */
  seconds: number;
}

const PLANS: Record<number, Omit<FinalePlan, 'level'>> = {
  1: { hitsPerForm: 1, heartHits: 1, lights: 6, seconds: 60 },
  2: { hitsPerForm: 1, heartHits: 2, lights: 6, seconds: 55 },
  3: { hitsPerForm: 2, heartHits: 2, lights: 6, seconds: 50 },
  4: { hitsPerForm: 2, heartHits: 2, lights: 6, seconds: 42 },
  5: { hitsPerForm: 2, heartHits: 3, lights: 6, seconds: 36 },
};

/** Nivel del Gran Reto (1–5) según el dominio medio de las seis competencias. */
export function finaleLevel(
  mastery: Partial<Record<IslandId, number>>,
  islands: readonly IslandId[],
): number {
  const values = islands.map((id) => mastery[id] ?? 0.3);
  const average = values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
  return Math.min(5, Math.max(1, 1 + Math.round(average * 4)));
}

export function finalePlan(level: number): FinalePlan {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  const plan = PLANS[l] ?? PLANS[1];
  if (!plan) throw new Error('Plan inexistente.');
  return { level: l, ...plan };
}

/** Sutileza del embate: según el dominio de la competencia, y más sutil a cada acierto de la forma. */
export function tierFor(form: FormKey, hitsInForm: number, mastery: number): 1 | 2 | 3 {
  if (form === 'corazon') return 3;
  const base = mastery < 0.45 ? 1 : mastery < 0.7 ? 2 : 3;
  return Math.min(3, base + hitsInForm) as 1 | 2 | 3;
}

export interface FinaleAnswer {
  itemId: string;
  optionId: string | null;
  correct: boolean;
  form: FormKey;
}

export interface FinaleState {
  plan: FinalePlan;
  /** Las seis formas en el orden del contenido y, al final, el corazón. */
  order: FormKey[];
  form: number;
  hits: number;
  lights: number;
  used: string[];
  current: string | null;
  consecutiveMisses: number;
  outcome: Outcome;
  cleared: FormKey[];
  answers: FinaleAnswer[];
}

export interface FinaleEvent {
  correct: boolean;
  item: QuizItem;
  optionId: string | null;
  form: FormKey;
  /** Forma que se acaba de disipar con este acierto. */
  formCleared: FormKey | null;
  outcome: Outcome;
}

export function formKey(state: FinaleState): FormKey | null {
  return state.order[state.form] ?? null;
}

export function itemsOf(content: FinaleContent, form: FormKey): QuizItem[] {
  if (form === 'corazon') return content.heart.items;
  return content.forms.find((f) => f.island === form)?.items ?? [];
}

export function hitsNeeded(plan: FinalePlan, form: FormKey): number {
  return form === 'corazon' ? plan.heartHits : plan.hitsPerForm;
}

/** Aciertos totales para disipar a la Gran Bruma. */
export function totalHits(plan: FinalePlan): number {
  return plan.hitsPerForm * 6 + plan.heartHits;
}

type Mastery = Partial<Record<IslandId, number>>;

function nextItem(
  content: FinaleContent,
  form: FormKey,
  hits: number,
  mastery: Mastery,
  used: readonly string[],
  random: Random,
): QuizItem {
  const tier = tierFor(form, hits, form === 'corazon' ? 1 : (mastery[form] ?? 0.3));
  return pickItem(itemsOf(content, form), tier, used, random);
}

export function startFinale(
  content: FinaleContent,
  plan: FinalePlan,
  mastery: Mastery,
  random: Random,
): FinaleState {
  const order: FormKey[] = [...content.forms.map((f) => f.island), 'corazon'];
  const [first] = order;
  if (!first) throw new Error('La Gran Bruma no tiene formas.');
  const item = nextItem(content, first, 0, mastery, [], random);
  return {
    plan,
    order,
    form: 0,
    hits: 0,
    lights: plan.lights,
    used: [item.id],
    current: item.id,
    consecutiveMisses: 0,
    outcome: 'en-curso',
    cleared: [],
    answers: [],
  };
}

/** Responde al embate actual. `optionId` nulo significa que se agotó el tiempo. */
export function answerFinale(
  state: FinaleState,
  content: FinaleContent,
  mastery: Mastery,
  optionId: string | null,
  random: Random,
): { state: FinaleState; event: FinaleEvent } {
  const form = formKey(state);
  const item = form ? itemsOf(content, form).find((i) => i.id === state.current) : undefined;
  if (!form || !item || state.outcome !== 'en-curso') {
    throw new Error('No hay un embate en curso.');
  }

  const correct = optionId !== null && item.options.some((o) => o.id === optionId && o.correct);
  let hits = state.hits + (correct ? 1 : 0);
  let index = state.form;
  let formCleared: FormKey | null = null;
  const cleared = [...state.cleared];
  if (correct && hits >= hitsNeeded(state.plan, form)) {
    formCleared = form;
    cleared.push(form);
    index += 1;
    hits = 0;
  }
  const lights = state.lights - (correct ? 0 : 1);
  const outcome: Outcome =
    index >= state.order.length ? 'victoria' : lights <= 0 ? 'retirada' : 'en-curso';

  let current: string | null = null;
  let used = state.used;
  const nextForm = state.order[index];
  if (outcome === 'en-curso' && nextForm) {
    const next = nextItem(content, nextForm, hits, mastery, used, random);
    current = next.id;
    used = [...used, next.id];
  }

  return {
    state: {
      ...state,
      form: index,
      hits,
      lights,
      used,
      current,
      consecutiveMisses: correct ? 0 : state.consecutiveMisses + 1,
      outcome,
      cleared,
      answers: [...state.answers, { itemId: item.id, optionId, correct, form }],
    },
    event: { correct, item, optionId, form, formCleared, outcome },
  };
}

export function finaleAccuracy(state: FinaleState): number {
  if (state.answers.length === 0) return 0;
  return state.answers.filter((a) => a.correct).length / state.answers.length;
}

/** Densidad de la Gran Bruma, de 1 (intacta) a 0 (disipada). */
export function finaleDensity(state: FinaleState): number {
  const done = state.cleared.reduce((sum, f) => sum + hitsNeeded(state.plan, f), 0) + state.hits;
  return Math.max(0, 1 - done / totalHits(state.plan));
}

/** Aciertos y embates de cada competencia: la luz que dejó cada isla en el Gran Reto. */
export function lightByCompetency(
  state: FinaleState,
): Record<FormKey, { correct: number; total: number }> {
  const result = Object.fromEntries(
    state.order.map((f) => [f, { correct: 0, total: 0 }]),
  ) as Record<FormKey, { correct: number; total: number }>;
  for (const a of state.answers) {
    const entry = result[a.form];
    entry.total += 1;
    if (a.correct) entry.correct += 1;
  }
  return result;
}
