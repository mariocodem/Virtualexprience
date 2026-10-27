import { describe, expect, it } from 'vitest';
import {
  clockHands,
  decideStep,
  deskKey,
  investigateStep,
  trayIndex,
  TRAY_OF,
  URGENT_AT,
} from '@/games/comunicarte/sala/desk';
import type { NewsItem } from '@/data/contentSchemas';
import {
  currentNewsId,
  INVESTIGATE_COST,
  newsroomPlan,
  report,
  startNewsroom,
} from '@/minigames/sala-de-redaccion/engine';

const item = (id: string, verdict: NewsItem['verdict']): NewsItem => ({
  id,
  tier: 1,
  headline: id,
  source: 's',
  date: 'd',
  quote: 'q',
  image: 'i',
  clues: { fuente: 'a', fecha: 'b', cita: 'c', imagen: 'd' },
  verdict,
  criteria: ['fuente'],
  explanation: 'e',
});

const news = [item('a', 'publicar'), item('b', 'descartar'), item('c', 'corregir')];
const plan = { ...newsroomPlan(1), count: 3 };

describe('teclas del escritorio', () => {
  it('1 a 4 investigan en la mesa y justifican con un sello en la mano', () => {
    expect(deskKey('1', 'mesa')).toEqual({ kind: 'investigar', signal: 'fuente' });
    expect(deskKey('4', 'mesa')).toEqual({ kind: 'investigar', signal: 'imagen' });
    expect(deskKey('2', 'justificar')).toEqual({ kind: 'criterio', signal: 'fecha' });
  });
  it('A, D y C toman un sello; X lo suelta solo si hay uno', () => {
    expect(deskKey('a', 'mesa')).toEqual({ kind: 'sello', verdict: 'publicar' });
    expect(deskKey('D', 'mesa')).toEqual({ kind: 'sello', verdict: 'descartar' });
    expect(deskKey('c', 'justificar')).toEqual({ kind: 'sello', verdict: 'corregir' });
    expect(deskKey('x', 'justificar')).toEqual({ kind: 'soltar' });
    expect(deskKey('x', 'mesa')).toBeNull();
    expect(deskKey('z', 'mesa')).toBeNull();
  });
});

describe('investigar y decidir con el motor compartido', () => {
  it('investigar consume minutos y avisa al cruzar la media hora', () => {
    let state = startNewsroom(news, { ...plan, budget: URGENT_AT + INVESTIGATE_COST + 5 });
    const step = investigateStep(state, 'fuente');
    state = step.state;
    expect(state.clock).toBe(URGENT_AT + 5);
    expect(step.warning).toBeNull();
    const next = investigateStep(state, 'fecha');
    expect(next.warning).toMatch(/media hora/);
    expect(next.closed).toBe(false);
  });

  it('el reloj en cero cierra la edición', () => {
    const state = startNewsroom(news, { ...plan, budget: INVESTIGATE_COST });
    expect(investigateStep(state, 'cita').closed).toBe(true);
  });

  it('Brújula comenta publicar sin revisar y dos notas a ciegas seguidas', () => {
    const start = startNewsroom(news, plan);
    const first = decideStep(start, 'publicar', 'fuente', 0);
    expect(first.brujula).toMatch(/sin revisar/);
    const second = decideStep(first.state, 'descartar', 'fuente', first.blind);
    expect(second.blind).toBe(2);
    expect(second.brujula).toMatch(/dos notas/);
  });

  it('justificar con una señal no revisada se comenta; revisada, no', () => {
    const start = investigateStep(startNewsroom(news, plan), 'fecha').state;
    expect(decideStep(start, 'descartar', 'fuente', 0).brujula).toMatch(/no la revisaste/);
    expect(decideStep(start, 'descartar', 'fecha', 0).brujula).toBeNull();
  });

  it('la última decisión cierra y el informe es el del motor compartido', () => {
    let state = startNewsroom(news, plan);
    const verdicts = ['publicar', 'descartar', 'corregir'] as const;
    let blind = 0;
    for (const v of verdicts) {
      const step = decideStep(state, v, 'fuente', blind);
      state = step.state;
      blind = step.blind;
      if (v === 'corregir') expect(step.closed).toBe(true);
    }
    expect(currentNewsId(state)).toBeNull();
    const result = report(state, news);
    expect(result.accuracy).toBe(1);
    expect(result.criteria).toBe(1);
  });
});

describe('manecillas y bandejas', () => {
  it('a las 6:00 p. m. las manecillas marcan las seis; con 30 minutos de margen, las 5:30', () => {
    const six = clockHands(0);
    expect(six.minute).toBeCloseTo(0);
    expect(six.hour).toBeCloseTo(Math.PI);
    const half = clockHands(30);
    expect(half.minute).toBeCloseTo(Math.PI);
    expect(clockHands(-10).hour).toBeCloseTo(Math.PI);
  });

  it('cada sello va a su bandeja y cada nota ocupa el siguiente lugar de ella', () => {
    expect(TRAY_OF).toEqual({ publicar: 'aire', descartar: 'papelera', corregir: 'correccion' });
    const decisions = [
      { newsId: 'a', verdict: 'publicar' as const },
      { newsId: 'b', verdict: 'descartar' as const },
      { newsId: 'c', verdict: 'publicar' as const },
    ];
    expect(trayIndex(decisions, 'a')).toBe(0);
    expect(trayIndex(decisions, 'b')).toBe(0);
    expect(trayIndex(decisions, 'c')).toBe(1);
    expect(trayIndex(decisions, 'zz')).toBe(-1);
  });
});
