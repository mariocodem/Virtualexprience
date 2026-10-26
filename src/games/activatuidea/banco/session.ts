import type { BancoContent, FeedbackKind } from '@/data/contentSchemas';
import {
  addressesPattern,
  canBuild,
  type BancoReport,
  type BancoRound,
  type BancoState,
  type Change,
} from '@/minigames/banco-de-pruebas/engine';
import type { ReportCriterion, ReportFigure } from '@/minigames/shared/types';

/**
 * Reglas de la partida en 3D del Banco de pruebas que no están en el motor:
 * qué comentario se escucha, a qué canasta va, qué piezas caben en el estante
 * y qué dice Brújula. Las reglas de puntaje siguen en el motor común
 * (src/minigames/banco-de-pruebas/engine.ts), igual que en la versión accesible.
 */

/** Las canastas del taller, en el orden de las teclas 1 a 3. */
export const BASKETS: readonly FeedbackKind[] = ['patron', 'aislado', 'fuera'];

export const KIND_LABEL: Record<FeedbackKind, string> = {
  patron: 'Se repite',
  aislado: 'Caso aislado',
  fuera: 'Fuera del problema',
};

export type Answers = Record<string, FeedbackKind>;

export function allClassified(round: BancoRound, answers: Answers): boolean {
  return round.feedback.every((f) => f.id in answers);
}

/**
 * Siguiente comentario por clasificar después de `from` (en orden circular),
 * o `null` si ya están todos en una canasta.
 */
export function nextPending(round: BancoRound, answers: Answers, from?: string): string | null {
  const ids = round.feedback.map((f) => f.id);
  const start = from === undefined ? -1 : ids.indexOf(from);
  for (let k = 1; k <= ids.length; k++) {
    const id = ids[(start + k + ids.length) % ids.length];
    if (id !== undefined && !(id in answers)) return id;
  }
  return null;
}

/** El comentario anterior o siguiente, para recorrerlos con las flechas. */
export function cycle(round: BancoRound, selected: string, step: 1 | -1): string {
  const ids = round.feedback.map((f) => f.id);
  const at = Math.max(0, ids.indexOf(selected));
  return ids[(at + step + ids.length) % ids.length] ?? selected;
}

/** Envía un comentario a una canasta (se puede cambiar mientras no se revisen las notas). */
export function sendToBasket(answers: Answers, feedbackId: string, kind: FeedbackKind): Answers {
  return { ...answers, [feedbackId]: kind };
}

/** Proporción de comentarios bien clasificados en la ronda (alimenta el dominio). */
export function listenScore(round: BancoRound, answers: Answers): number {
  return (
    round.feedback.filter((f) => answers[f.id] === f.kind).length /
    Math.max(1, round.feedback.length)
  );
}

export interface ReviewedNote {
  id: string;
  userId: string;
  quote: string;
  /** Lo que anotó el estudiante. */
  mine: FeedbackKind | null;
  kind: FeedbackKind;
  right: boolean;
  why: string;
}

export function reviewNotes(round: BancoRound, notes: Answers): ReviewedNote[] {
  return round.feedback.map((f) => {
    const mine = notes[f.id] ?? null;
    return {
      id: f.id,
      userId: f.userId,
      quote: f.quote,
      mine,
      kind: f.kind,
      right: mine === f.kind,
      why: f.why,
    };
  });
}

/**
 * Pone o quita una pieza del estante. Si al ponerla ya no se puede construir
 * (más de dos cambios o no alcanzan los materiales), la elección no cambia.
 */
export function togglePick(
  state: BancoState,
  round: BancoRound,
  picks: readonly string[],
  changeId: string,
): string[] {
  if (picks.includes(changeId)) return picks.filter((id) => id !== changeId);
  const next = [...picks, changeId];
  return canBuild(state, round, next) ? next : [...picks];
}

/** ¿Se puede poner esta pieza junto a las ya elegidas? */
export function canAdd(
  state: BancoState,
  round: BancoRound,
  picks: readonly string[],
  changeId: string,
): boolean {
  return picks.includes(changeId) || canBuild(state, round, [...picks, changeId]);
}

/** Quiénes pidieron un cambio (sus comentarios), sin repetir. */
export function askersOf(
  round: BancoRound,
  change: Change,
  names: Readonly<Record<string, string>>,
): string[] {
  return [
    ...new Set(
      change.addresses.flatMap((id) => {
        const f = round.feedback.find((x) => x.id === id);
        return f ? [names[f.userId] ?? f.userId] : [];
      }),
    ),
  ];
}

/** Proporción de cambios elegidos que responden a un patrón (alimenta el dominio). */
export function buildScore(round: BancoRound, changeIds: readonly string[]): number {
  const chosen = round.changes.filter((c) => changeIds.includes(c.id));
  if (chosen.length === 0) return 0;
  return chosen.filter((c) => addressesPattern(round, c)).length / chosen.length;
}

/** Lo que dice Brújula al revisar las notas (el mismo texto de la versión accesible). */
export function listenMessage(round: BancoRound, answers: Answers): string {
  return listenScore(round, answers) === 1
    ? 'Leíste bien la prueba: distinguiste lo que se repite de lo anecdótico.'
    : 'Un patrón se reconoce cuando varias personas con el problema dicen lo mismo, aunque usen palabras distintas. El entusiasmo de quien no tiene el problema no es evidencia.';
}

/** Lo que dice Brújula al construir (el mismo texto de la versión accesible). */
export function buildMessage(round: BancoRound, changeIds: readonly string[]): string {
  const chosen = round.changes.filter((c) => changeIds.includes(c.id));
  const grounded = chosen.filter((c) => addressesPattern(round, c)).length;
  if (chosen.length === 0)
    return 'No construiste nada esta ronda. Ahorrar materiales tiene sentido, pero sin iterar el prototipo no aprende.';
  return grounded === chosen.length
    ? 'Iteraste sobre lo que se repetía: así se gastan los materiales donde más importan.'
    : 'Parte de los materiales se fue en cambios que nadie con el problema pidió. Prioriza los patrones.';
}

export interface Reaction {
  userId: string;
  delta: number;
}

/** Cómo reaccionó cada persona a la última iteración, en el orden del contenido. */
export function reactions(state: BancoState, content: BancoContent): Reaction[] {
  return content.users.map((u) => ({ userId: u.id, delta: state.last[u.id] ?? 0 }));
}

export interface ReportView {
  title: string;
  figures: ReportFigure[];
  criteria: ReportCriterion[];
  brujula: { text: string; highlights: string[] };
}

/** Informe de la partida: cifras, criterios y lectura de Brújula, como en la versión accesible. */
export function reportView(
  content: BancoContent,
  state: BancoState,
  result: BancoReport,
): ReportView {
  const ready = result.satisfaction >= content.goal;
  const parts: string[] = [
    ready
      ? 'Tu prototipo ya resuelve el problema para quienes lo tienen: está listo para el pitch.'
      : 'El prototipo todavía no convence a quienes tienen el problema. Revisa en qué gastaste los materiales.',
  ];
  if (result.accuracy < 0.75)
    parts.push(
      'Separar patrones de casos aislados es la habilidad central: busca lo que dicen varias personas con el problema.',
    );
  parts.push(
    result.criteria < 0.75
      ? 'Algunos cambios respondieron a ocurrencias o a quien no tiene el problema. Iterar es elegir qué no construir.'
      : 'Cada cambio respondió a evidencia: así se itera con poco.',
  );
  return {
    title: ready ? 'El prototipo está listo para el pitch' : 'El prototipo necesita otra vuelta',
    figures: [
      { label: 'Satisfacción', value: `${String(Math.round(result.satisfaction))} %` },
      { label: 'Notas acertadas', value: `${String(Math.round(result.accuracy * 100))} %` },
      {
        label: 'Patrones atendidos',
        value: `${String(result.toolsUsed)} de ${String(state.queue.length)}`,
      },
    ],
    criteria: [
      { label: 'Distinguiste patrones de casos aislados', met: result.accuracy >= 0.75 },
      { label: 'Iteraste con evidencia, no con ocurrencias', met: result.criteria >= 0.75 },
      {
        label: 'No construiste para lo que está fuera del problema',
        met: result.offProblem === 0,
        detail: 'El entusiasmo de quien no tiene el problema no es evidencia.',
      },
      { label: 'Alcanzaste la meta de satisfacción', met: ready },
    ],
    brujula: {
      text: parts.join(' '),
      highlights: [
        `Comentarios bien clasificados: ${String(Math.round(result.accuracy * 100))} %.`,
        `Cambios construidos: ${String(result.changes)}; de ellos, responden a patrones: ${String(Math.round(result.criteria * 100))} %.`,
        `Satisfacción final de quienes tienen el problema: ${String(Math.round(result.satisfaction))} % (meta ${String(content.goal)} %).`,
        `Materiales sin usar: ${String(state.budget)}.`,
      ],
    },
  };
}
