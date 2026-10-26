import type { CabildoContent, DeliberativeMove } from '@/data/contentSchemas';
import type { CabildoReport, CabildoState, Verdict } from '@/minigames/sesion-de-cabildo/engine';
import type { ReportCriterion, ReportFigure } from '@/minigames/shared/types';

/**
 * Reglas de puesta en escena de la Sesión de cabildo en 3D: dónde se sienta
 * cada grupo, cómo se ve su confianza, cómo se vota y qué dice el informe.
 * Las reglas del juego (rondas, confianza, puntaje) son las del motor de la
 * versión accesible (src/minigames/sesion-de-cabildo/engine.ts).
 */

export const MOVE_LABEL: Record<DeliberativeMove, string> = {
  escuchar: 'Escucha activa',
  'pedir-evidencia': 'Pedir evidencia',
  integrar: 'Integrar posturas',
  conceder: 'Conceder',
  falacia: 'Falacia',
  imponer: 'Imposición',
};

export const VERDICT_TITLE: Record<Verdict, string> = {
  consenso: 'Acuerdo por consenso',
  mayoria: 'Acuerdo por mayoría',
  'sin-acuerdo': 'El cabildo no llegó a un acuerdo',
};

/** Radio de la mesa redonda y del círculo donde se paran los representantes. */
export const TABLE_RADIUS = 1.55;
export const SEAT_RADIUS = 2.55;

export interface Spot {
  x: number;
  z: number;
  /** Ángulo del puesto alrededor de la mesa (0 = +X). */
  angle: number;
}

/**
 * Puesto de cada grupo alrededor de la mesa. Quien modera ocupa el frente
 * (+Z, hacia la cámara) y los grupos se reparten en el resto del círculo,
 * de izquierda a derecha vistos desde la moderación.
 */
export function seatSpot(index: number, count: number, radius = SEAT_RADIUS): Spot {
  const angle = Math.PI / 2 + ((index + 1) * Math.PI * 2) / (count + 1);
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, angle };
}

/** Puesto de quien modera: al frente de la mesa. */
export function moderatorSpot(radius = SEAT_RADIUS): Spot {
  return { x: 0, z: radius, angle: Math.PI / 2 };
}

/** Aura de confianza en el suelo: de un hilo de luz (0 %) a un círculo amplio (100 %). */
export const AURA = { min: 0.28, span: 1.12 } as const;

export function auraRadius(trust: number): number {
  return AURA.min + (AURA.span * Math.min(100, Math.max(0, trust))) / 100;
}

/** Cuánto cambió la confianza de cada grupo (ya con los topes de 0 y 100). */
export function trustDeltas(
  before: Record<string, number>,
  after: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.keys(after).map((id) => [id, Math.round((after[id] ?? 0) - (before[id] ?? 0))]),
  );
}

export interface Ballot {
  id: string;
  name: string;
  trust: number;
  /** ¿Alza su farol? Respalda si su confianza llega al umbral. */
  yes: boolean;
}

/** La votación, grupo por grupo, en el orden de los puestos. */
export function ballots(state: CabildoState, content: CabildoContent): Ballot[] {
  return content.factions.map((f) => {
    const trust = state.trust[f.id] ?? 0;
    return { id: f.id, name: f.name, trust, yes: trust >= content.threshold };
  });
}

/** Proporción del público que alza su farol según el veredicto. */
export function crowdSupport(verdict: Verdict): number {
  return verdict === 'consenso' ? 1 : verdict === 'mayoria' ? 0.5 : 0;
}

export interface Debrief {
  title: string;
  figures: ReportFigure[];
  criteria: ReportCriterion[];
  brujula: { text: string; highlights: string[] };
}

/**
 * El informe de la sesión: los mismos criterios, cifras y lectura de Brújula
 * que la versión accesible, para que ambas lleguen al mismo resultado.
 */
export function debrief(
  state: CabildoState,
  result: CabildoReport,
  content: CabildoContent,
): Debrief {
  const listened = state.choices.filter(
    (c) => c.move === 'escuchar' || c.move === 'pedir-evidencia',
  ).length;
  const integrated = state.choices.filter((c) => c.move === 'integrar' && c.quality > 0).length;
  const parts: string[] = [];
  if (result.verdict === 'consenso')
    parts.push('Todos los grupos respaldan el acuerdo: moderaste para que cada voz contara.');
  else if (result.verdict === 'mayoria')
    parts.push('Hay acuerdo, pero no de todos: piensa qué grupo quedó por fuera y por qué.');
  else
    parts.push(
      'Sin confianza no hay acuerdo: las respuestas que descalifican o imponen cierran el diálogo.',
    );
  if (result.fallacies > 0)
    parts.push(
      `Usaste ${String(result.fallacies)} ${result.fallacies === 1 ? 'falacia' : 'falacias'}: algunas sonaban amables, pero no respondían al argumento.`,
    );
  if (listened < 2)
    parts.push(
      'Escucha y pide evidencia antes de proponer: así las posturas se vuelven negociables.',
    );

  return {
    title: VERDICT_TITLE[result.verdict],
    figures: [
      {
        label: 'Respaldan',
        value: `${String(result.supporters.length)} de ${String(content.factions.length)}`,
      },
      { label: 'Calidad media', value: `${String(Math.round(result.accuracy * 100))} %` },
      { label: 'Acuerdos en el acta', value: String(state.acta.length) },
    ],
    criteria: [
      { label: 'Argumentaste sin falacias', met: result.fallacies === 0 },
      { label: 'Escuchaste y pediste evidencia antes de decidir', met: listened >= 2 },
      { label: 'Integraste posturas distintas', met: integrated >= 1 },
      { label: 'El acuerdo cuenta con todos los grupos', met: result.verdict === 'consenso' },
    ],
    brujula: {
      text: parts.join(' '),
      highlights: [
        `Resultado de la votación: ${VERDICT_TITLE[result.verdict]}.`,
        `Calidad media de las intervenciones: ${String(Math.round(result.accuracy * 100))} %.`,
        `Falacias usadas: ${String(result.fallacies)}.`,
        `Intervenciones de escucha o evidencia: ${String(listened)}.`,
        `Acuerdos en el acta: ${String(state.acta.length)}.`,
      ],
    },
  };
}

/**
 * Distancia de la cámara para que un ancho dado quepa en el encuadre con este
 * aspecto (en pantallas verticales la cámara se aleja).
 */
export function frameDistance(
  aspect: number,
  fovDegrees: number,
  halfWidth: number,
  min: number,
): number {
  const halfV = (fovDegrees * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * Math.max(0.2, aspect));
  return Math.max(min, halfWidth / Math.tan(halfH));
}
