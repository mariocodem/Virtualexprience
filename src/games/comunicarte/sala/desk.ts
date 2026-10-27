import type { Signal } from '@/data/contentSchemas';
import {
  currentNewsId,
  decide,
  investigate,
  type NewsroomState,
  type Verdict,
} from '@/minigames/sala-de-redaccion/engine';
import { SIGNAL_LABEL } from '@/minigames/sala-de-redaccion/labels';

/**
 * Reglas del escritorio 3D de la Sala de Redacción. Envuelve el motor de la
 * versión accesible (mismas reglas, mismo reloj y mismo informe) y añade lo
 * propio del escritorio: teclas, bandejas, manecillas del reloj de pared y
 * los mismos comentarios de Brújula durante la edición.
 */

export const SIGNALS: readonly Signal[] = ['fuente', 'fecha', 'cita', 'imagen'];
export const VERDICTS: readonly Verdict[] = ['publicar', 'descartar', 'corregir'];

/** Objeto del escritorio con el que se investiga cada señal. */
export const TOOL_OF: Record<Signal, string> = {
  fuente: 'Lupa',
  fecha: 'Calendario',
  cita: 'Archivador',
  imagen: 'Mesa de luz',
};

/** Tecla de cada sello: A de «al aire», D de «descartar», C de «corrección». */
export const STAMP_KEY: Record<Verdict, string> = { publicar: 'A', descartar: 'D', corregir: 'C' };

/** A dónde va la nota sellada. */
export type Tray = 'aire' | 'papelera' | 'correccion';
export const TRAY_OF: Record<Verdict, Tray> = {
  publicar: 'aire',
  descartar: 'papelera',
  corregir: 'correccion',
};

export const TRAY_LABEL: Record<Tray, string> = {
  aire: 'la bandeja «Al aire»',
  papelera: 'la papelera',
  correccion: 'la bandeja de corrección',
};

/** En la mesa se investiga; con un sello en la mano, se justifica. */
export type DeskMode = 'mesa' | 'justificar';

export type DeskAction =
  | { kind: 'investigar'; signal: Signal }
  | { kind: 'sello'; verdict: Verdict }
  | { kind: 'criterio'; signal: Signal }
  | { kind: 'soltar' };

/**
 * Traduce una tecla a una acción del escritorio. Los números 1 a 4 son las
 * cuatro señales: en la mesa las investigan y, con un sello en la mano,
 * justifican la decisión.
 */
export function deskKey(key: string, mode: DeskMode): DeskAction | null {
  const k = key.toLowerCase();
  const signal = SIGNALS[['1', '2', '3', '4'].indexOf(k)];
  if (signal)
    return mode === 'mesa' ? { kind: 'investigar', signal } : { kind: 'criterio', signal };
  const verdict = VERDICTS.find((v) => STAMP_KEY[v].toLowerCase() === k);
  if (verdict) return { kind: 'sello', verdict };
  if (mode === 'justificar' && (k === 'x' || k === 'backspace')) return { kind: 'soltar' };
  return null;
}

/** Minutos a partir de los cuales Brújula avisa que el cierre está cerca. */
export const URGENT_AT = 30;

export interface InvestigateStep {
  state: NewsroomState;
  /** Aviso de Brújula, si lo hay (si no, se conserva el que había). */
  warning: string | null;
  /** La edición cerró: el reloj llegó a las 6:00 p. m. */
  closed: boolean;
}

/** Investiga una señal de la nota en la mesa (consume minutos del cierre). */
export function investigateStep(state: NewsroomState, signal: Signal): InvestigateStep {
  const next = investigate(state, signal);
  const warning =
    next.clock <= URGENT_AT && state.clock > URGENT_AT
      ? 'Queda media hora para el cierre. Decide con lo que ya sabes las notas que faltan.'
      : null;
  return { state: next, warning, closed: next.clock <= 0 };
}

export interface DecideStep {
  state: NewsroomState;
  /** Comentario de Brújula sobre el proceso (nulo: nada que decir). */
  brujula: string | null;
  /** Notas seguidas decididas sin investigar ninguna señal. */
  blind: number;
  closed: boolean;
}

/**
 * Sella la nota en la mesa. Brújula comenta el proceso, no el acierto, con las
 * mismas reglas que la versión accesible.
 */
export function decideStep(
  state: NewsroomState,
  verdict: Verdict,
  criterion: Signal,
  blind: number,
): DecideStep {
  const id = currentNewsId(state);
  const seen = id ? (state.revealed[id] ?? []) : [];
  const next = decide(state, verdict, criterion);
  const streak = seen.length === 0 ? blind + 1 : 0;
  let brujula: string | null = null;
  if (verdict === 'publicar' && seen.length === 0) {
    brujula =
      'Pusiste al aire una nota sin revisar ninguna señal. Una radio confiable verifica antes de difundir.';
  } else if (streak >= 2) {
    brujula =
      'Llevas dos notas sin investigar. Revisar al menos la señal más dudosa vale los 15 minutos.';
  } else if (!seen.includes(criterion) && seen.length > 0) {
    brujula = `Justificaste con ${SIGNAL_LABEL[criterion].toLowerCase()}, pero no la revisaste. Un criterio pesa más cuando lo comprobaste.`;
  }
  return { state: next, brujula, blind: streak, closed: currentNewsId(next) === null };
}

/**
 * Ángulos de las manecillas del reloj de pared, en radianes y en sentido
 * horario desde las 12. La edición cierra a las 6:00 p. m.
 */
export function clockHands(clock: number): { hour: number; minute: number } {
  const minutes = 18 * 60 - Math.max(0, clock);
  const turn = Math.PI * 2;
  return {
    minute: ((minutes % 60) / 60) * turn,
    hour: (((minutes / 60) % 12) / 12) * turn,
  };
}

/** Lugar de cada nota sellada dentro de su bandeja: cuántas había antes en la misma. */
export function trayIndex(
  decisions: readonly { newsId: string; verdict: Verdict }[],
  newsId: string,
): number {
  const at = decisions.findIndex((d) => d.newsId === newsId);
  const decision = decisions[at];
  if (!decision) return -1;
  const tray = TRAY_OF[decision.verdict];
  return decisions.slice(0, at).filter((d) => TRAY_OF[d.verdict] === tray).length;
}
