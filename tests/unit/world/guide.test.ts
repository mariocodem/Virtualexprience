import { describe, expect, it } from 'vitest';
import { world } from '@/data';
import { initialProgress, type Progress } from '@/progress/types';
import { guideMessage, guideTarget, suggestedIsland } from '@/world/guide';
import { completeAll, ECOS_PATH } from '../progress/helpers';

const say = (progress: Progress, islandId?: Parameters<typeof guideTarget>[2]) =>
  guideMessage(guideTarget(progress, world, islandId), progress, world);

const allIslandStations = (islandId: string) =>
  world.stations.filter((s) => s.islandId === islandId).map((s) => s.id);

describe('Brújula, la guía del sendero', () => {
  it('al empezar, propone la primera isla y su primera escala', () => {
    const start = initialProgress();
    const target = guideTarget(start, world);
    expect(target).toMatchObject({ kind: 'island', reason: 'nueva' });
    expect(say(start)).toEqual({
      text: 'Empieza tu expedición en ComunicArte: su sendero arranca en «La imprenta del puerto».',
      action: { label: 'Zarpar a ComunicArte', to: '/mundo/comunicarte' },
    });
  });

  it('prefiere la isla con una escala a medias, luego la que ya empezó', () => {
    const halfway: Progress = {
      ...initialProgress(),
      stations: { 'voxcivitas-argumentos': { startedAt: '2026-10-20T10:00:00.000Z', attempts: 1 } },
    };
    expect(suggestedIsland(halfway, world)?.id).toBe('voxcivitas');
    expect(say(halfway).text).toBe(
      'Dejaste «Anatomía de un argumento» a medias en Voxcivitas. ¿La retomamos?',
    );

    const started = completeAll(['neuromath-patrones']);
    expect(suggestedIsland(started, world)?.id).toBe('neuromath');
    expect(say(started).text).toMatch(/^En NeuroMath llevas 1 de 4 escalas\. La siguiente es «/);
  });

  it('dentro de una isla guía a la escala que sigue, con su número y su tipo', () => {
    const progress = completeAll(ECOS_PATH.slice(0, 3));
    const target = guideTarget(progress, world, 'comunicarte');
    expect(target).toMatchObject({ kind: 'station', order: 4, status: 'disponible' });
    expect(say(progress, 'comunicarte')).toEqual({
      text: 'Sigue el sendero hasta la escala 4: «Sala de Redacción» (Reto · 12 min).',
      action: {
        label: 'Abrir la escala 4',
        to: '/mundo/comunicarte?estacion=comunicarte-sala-redaccion',
      },
    });
  });

  it('anuncia el desafío a los pies del monumento', () => {
    const progress = completeAll(ECOS_PATH.slice(0, 5));
    expect(say(progress, 'comunicarte')).toMatchObject({
      text: 'Llegaste al desafío de ComunicArte, a los pies de su monumento. Supéralo para recuperar el Fragmento de la Palabra.',
      action: { label: 'Abrir el desafío' },
    });
  });

  it('al terminar una isla, propone la siguiente', () => {
    const progress = completeAll(ECOS_PATH);
    expect(progress.fragments).toContain('comunicarte');
    const target = guideTarget(progress, world, 'comunicarte');
    expect(target).toMatchObject({ kind: 'island-done' });
    expect(say(progress, 'comunicarte')).toEqual({
      text: 'Completaste el sendero de ComunicArte y recuperaste el Fragmento de la Palabra. Tu próxima isla es NeuroMath.',
      action: { label: 'Zarpar a NeuroMath', to: '/mundo/neuromath' },
    });
  });

  it('con los seis fragmentos guía al faro; tras la Gran Bruma, al pasaporte', () => {
    const all = completeAll(world.islands.flatMap((i) => allIslandStations(i.id)));
    expect(all.fragments).toHaveLength(6);
    expect(guideTarget(all, world)).toEqual({ kind: 'faro' });
    expect(say(all).action).toEqual({ label: 'Ir al Faro Minuto', to: '/mundo?faro=1' });

    const finished: Progress = {
      ...all,
      finale: { attempts: 1, bestScore: 1, completedAt: '2026-10-21T10:00:00.000Z' },
    };
    expect(guideTarget(finished, world)).toEqual({ kind: 'done' });
    expect(say(finished).action?.to).toBe('/pasaporte');
  });

  it('cada mensaje es una frase con acción hacia una ruta del sitio', () => {
    const cases = [initialProgress(), completeAll(ECOS_PATH.slice(0, 2)), completeAll(ECOS_PATH)];
    for (const progress of cases) {
      for (const islandId of [undefined, ...world.islands.map((i) => i.id)]) {
        const message = say(progress, islandId);
        expect(message.text.length).toBeGreaterThan(20);
        expect(message.action?.to).toMatch(/^\/(mundo|pasaporte)/);
      }
    }
  });
});
