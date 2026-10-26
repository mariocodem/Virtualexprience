import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { cabildoContentSchema } from '@/data/contentSchemas';
import raw from '@/data/content/voxcivitas-cabildo.json';
import {
  cabildoPlan,
  intervene,
  isFinished,
  report,
  selectRounds,
  startCabildo,
  type CabildoState,
  type Round,
} from '@/minigames/sesion-de-cabildo/engine';
import {
  auraRadius,
  ballots,
  crowdSupport,
  debrief,
  frameDistance,
  moderatorSpot,
  seatSpot,
  SEAT_RADIUS,
  TABLE_RADIUS,
  trustDeltas,
} from '@/games/voxcivitas/cabildo/session';

const content = cabildoContentSchema.parse(raw);

/** Juega una sesión entera eligiendo con `pick` en cada ronda. */
function play(queue: Round[], pick: (round: Round) => string): CabildoState {
  let state = startCabildo(content, queue);
  for (const round of queue) state = intervene(state, round, pick(round));
  return state;
}

const best = (round: Round) =>
  [...round.options].sort((a, b) => b.quality - a.quality)[0]?.id ?? '';
const worst = (round: Round) =>
  [...round.options].sort((a, b) => a.quality - b.quality)[0]?.id ?? '';

describe('Sesión de cabildo en 3D: puesta en escena', () => {
  it('los grupos rodean la mesa sin ocupar el puesto de la moderación', () => {
    const n = content.factions.length;
    const spots = Array.from({ length: n }, (_, i) => seatSpot(i, n));
    const front = moderatorSpot();
    for (const s of spots) {
      expect(Math.hypot(s.x, s.z)).toBeCloseTo(SEAT_RADIUS);
      expect(Math.hypot(s.x - front.x, s.z - front.z)).toBeGreaterThan(SEAT_RADIUS);
    }
    // De izquierda a derecha vistos desde la moderación.
    expect(spots[0]?.x ?? 0).toBeLessThan(0);
    expect(spots[n - 1]?.x ?? 0).toBeGreaterThan(0);
    expect(SEAT_RADIUS).toBeGreaterThan(TABLE_RADIUS);
  });

  it('el aura crece con la confianza y marca el umbral', () => {
    expect(auraRadius(0)).toBeLessThan(auraRadius(content.threshold));
    expect(auraRadius(content.threshold)).toBeLessThan(auraRadius(100));
    expect(auraRadius(140)).toBe(auraRadius(100));
    expect(auraRadius(-5)).toBe(auraRadius(0));
  });

  it('los cambios de confianza respetan los topes del motor', () => {
    expect(trustDeltas({ a: 50, b: 95 }, { a: 62, b: 100 })).toEqual({ a: 12, b: 5 });
  });

  it('la cámara se aleja en pantallas verticales para que quepa la mesa', () => {
    const wide = frameDistance(16 / 9, 40, 4.4, 9);
    const tall = frameDistance(412 / 700, 40, 4.4, 9);
    expect(wide).toBe(9);
    expect(tall).toBeGreaterThan(wide);
  });
});

describe('Sesión de cabildo en 3D: mismo resultado que la versión accesible', () => {
  const plan = cabildoPlan(3);
  const queue = selectRounds(content.rounds, plan, seeded(7));

  it('moderar con escucha, evidencia e integración logra consenso y supera el reto', () => {
    const state = play(queue, best);
    expect(isFinished(state)).toBe(true);
    const result = report(state, content);
    expect(result.verdict).toBe('consenso');
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    const votes = ballots(state, content);
    expect(votes.every((v) => v.yes)).toBe(true);
    expect(crowdSupport(result.verdict)).toBe(1);
    const summary = debrief(state, result, content);
    expect(summary.title).toBe('Acuerdo por consenso');
    expect(summary.criteria.every((c) => c.met)).toBe(true);
    expect(summary.figures[0]?.value).toBe(
      `${String(content.factions.length)} de ${String(content.factions.length)}`,
    );
  });

  it('imponer y caer en falacias deja al cabildo sin acuerdo', () => {
    const state = play(queue, worst);
    const result = report(state, content);
    expect(result.verdict).toBe('sin-acuerdo');
    expect(result.score).toBeLessThan(0.6);
    expect(ballots(state, content).filter((v) => v.yes)).toHaveLength(result.supporters.length);
    expect(crowdSupport(result.verdict)).toBe(0);
    const summary = debrief(state, result, content);
    expect(summary.criteria.find((c) => c.label.includes('falacias'))?.met).toBe(false);
    expect(summary.brujula.text).toContain('Sin confianza no hay acuerdo');
  });
});
