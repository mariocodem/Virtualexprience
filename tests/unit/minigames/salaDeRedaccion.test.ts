import { describe, expect, it } from 'vitest';
import type { NewsItem } from '@/data/contentSchemas';
import {
  currentNewsId,
  decide,
  DECIDE_COST,
  investigate,
  INVESTIGATE_COST,
  isFinished,
  newsroomPlan,
  report,
  selectNews,
  startNewsroom,
} from '@/minigames/sala-de-redaccion/engine';

const news = (id: string, tier: 1 | 2 | 3, verdict: NewsItem['verdict']): NewsItem => ({
  id,
  tier,
  headline: `Titular ${id}`,
  source: 'Fuente',
  date: 'Hoy',
  quote: '«Cita»',
  image: 'Foto',
  clues: { fuente: 'f', fecha: 'd', cita: 'c', imagen: 'i' },
  verdict,
  criteria: ['fecha'],
  explanation: 'Porque la fecha no coincide.',
});

const NEWS = [
  news('a', 1, 'descartar'),
  news('b', 1, 'publicar'),
  news('c', 2, 'corregir'),
  news('d', 2, 'descartar'),
  news('e', 3, 'descartar'),
  news('f', 3, 'publicar'),
];
const random = () => 0.3;

describe('Sala de Redacción', () => {
  it('el nivel ajusta número de noticias, minutos y sutileza', () => {
    const easy = newsroomPlan(1);
    const hard = newsroomPlan(5);
    expect(hard.count).toBeGreaterThan(easy.count);
    expect(hard.budget).toBeLessThan(easy.budget);
    expect(hard.tiers).not.toContain(1);
  });

  it('elige noticias de los niveles del plan', () => {
    const chosen = selectNews(NEWS, newsroomPlan(1), random);
    expect(chosen).toHaveLength(4);
    expect(chosen.every((n) => n.tier <= 2)).toBe(true);
  });

  it('investigar y decidir consumen minutos del cierre; repetir una pista no cuesta', () => {
    const plan = newsroomPlan(1);
    let state = startNewsroom(NEWS.slice(0, 4), plan);
    state = investigate(state, 'fecha');
    state = investigate(state, 'fecha');
    expect(state.clock).toBe(plan.budget - INVESTIGATE_COST);
    state = decide(state, 'descartar', 'fecha');
    expect(state.clock).toBe(plan.budget - INVESTIGATE_COST - DECIDE_COST);
    expect(currentNewsId(state)).toBe('b');
  });

  it('evalúa decisiones y criterios por separado', () => {
    const plan = newsroomPlan(1);
    let state = startNewsroom(NEWS.slice(0, 4), plan);
    state = decide(state, 'descartar', 'fecha'); // decisión y criterio correctos
    state = decide(state, 'publicar', 'cita'); // decisión correcta, criterio que no decide
    state = decide(state, 'publicar', 'fecha'); // decisión incorrecta
    state = decide(state, 'descartar', null);
    const result = report(state, NEWS);
    expect(result.accuracy).toBeCloseTo(3 / 4);
    expect(result.criteria).toBeCloseTo(2 / 4);
    expect(isFinished(state)).toBe(true);
  });

  it('al cierre, lo no revisado cuenta como no publicado y se reporta', () => {
    let state = startNewsroom(NEWS.slice(0, 4), { level: 1, count: 4, budget: 20, tiers: [1] });
    state = investigate(state, 'fuente');
    state = decide(state, 'descartar', 'fecha');
    expect(isFinished(state)).toBe(true);
    const result = report(state, NEWS);
    expect(result.unreviewed).toBe(3);
    expect(result.toolsUsed).toBe(1);
  });

  it('cuenta las señales distintas investigadas en la edición', () => {
    let state = startNewsroom(NEWS.slice(0, 4), newsroomPlan(1));
    for (const signal of ['fuente', 'fecha', 'cita', 'imagen'] as const)
      state = investigate(state, signal);
    expect(report(state, NEWS).toolsUsed).toBe(4);
  });
});
