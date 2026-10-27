import type { FormatKind, IslandId, MinigameId, World } from '@/types/domain';
import * as t from './transitions';
import { initialProgress, type Progress, type TransitionResult } from './types';

type Step = (progress: Progress, world: World, now: Date) => TransitionResult;

const visit =
  (islandId: IslandId): Step =>
  (p, w, now) =>
    t.visitIsland(p, w, islandId, now);
const complete =
  (stationId: string, score: number): Step =>
  (p, w, now) =>
    t.completeStation(p, w, stationId, score, now);
const attempt =
  (stationId: string, score: number): Step =>
  (p, w, now) =>
    t.recordAttempt(p, w, stationId, score, now);
const format =
  (kind: FormatKind): Step =>
  (p, w, now) =>
    t.recordFormat(p, w, kind, now);
const minigame =
  (id: MinigameId, run: t.MinigameRun): Step =>
  (p, w, now) =>
    t.recordMinigame(p, w, id, run, now);
const mastery =
  (islandId: IslandId, value: number): Step =>
  (p, w, now) =>
    t.setMastery(p, w, islandId, value, now);

/** Tres jornadas de expedición, de la más antigua a hoy. */
const JOURNEY: Step[][] = [
  // Hace dos días: el puerto de ComunicArte, probando varios formatos.
  [
    visit('comunicarte'),
    format('texto'),
    complete('comunicarte-imprenta', 0.9),
    format('audio'),
    complete('comunicarte-titulares', 0.8),
    format('infografia'),
    complete('comunicarte-radio', 0.85),
    mastery('comunicarte', 0.52),
  ],
  // Ayer: NeuroMath de punta a punta, con su fragmento de luz.
  [
    visit('neuromath'),
    complete('neuromath-patrones', 0.9),
    attempt('neuromath-proporciones', 0.5),
    complete('neuromath-proporciones', 0.85),
    minigame('puentes-de-fractal', { accuracy: 1, criteria: 0.8, toolsUsed: 3 }),
    complete('neuromath-puentes', 1),
    complete('neuromath-cierre', 0.8),
    mastery('neuromath', 0.81),
  ],
  // Hoy: un vistazo al resto del archipiélago.
  [
    visit('latidosocial'),
    complete('latidosocial-territorio', 0.9),
    complete('latidosocial-bienestar', 0.75),
    mastery('latidosocial', 0.46),
    visit('voxcivitas'),
    complete('voxcivitas-argumentos', 0.8),
    mastery('voxcivitas', 0.34),
    visit('gerencia'),
    complete('gerencia-recursos', 0.7),
    mastery('gerencia', 0.3),
    visit('activatuidea'),
  ],
];

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * Recorrido de demostración (`?demo=1`): progreso parcial construido con las
 * mismas transiciones del juego, para ver la carta, el faro, el pasaporte y la
 * bitácora sin empezar de cero. Deja NeuroMath completa (un fragmento), las
 * seis islas visitadas, la Sala de Redacción lista para jugar y al explorador
 * a 100 XP de Guardián del Faro.
 */
export function demoProgress(world: World, now: Date = new Date()): Progress {
  let progress = initialProgress();
  JOURNEY.forEach((steps, index) => {
    const daysAgo = JOURNEY.length - 1 - index;
    // Cada jornada termina una hora antes de `now`; los pasos van cada 7 minutos.
    const start = now.getTime() - daysAgo * DAY - MINUTE * (60 + 7 * steps.length);
    steps.forEach((step, i) => {
      progress = step(progress, world, new Date(start + 7 * MINUTE * i)).progress;
    });
  });
  return progress;
}
