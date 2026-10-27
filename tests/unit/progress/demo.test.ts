import { describe, expect, it } from 'vitest';
import { world } from '@/data';
import { demoProgress } from '@/progress/demo';
import { explorerStanding } from '@/progress/levels';
import { progressSchema } from '@/progress/schema';
import { nextStation, stationStatus } from '@/progress/selectors';
import { DAY_3 } from './helpers';

describe('recorrido de demostración', () => {
  const demo = demoProgress(world, DAY_3);
  const status = (id: string) => {
    const station = world.stations.find((s) => s.id === id);
    if (!station) throw new Error(id);
    return stationStatus(demo, station);
  };

  it('es un progreso válido y siempre el mismo para la misma hora', () => {
    expect(progressSchema.safeParse(demo).success).toBe(true);
    expect(demoProgress(world, DAY_3)).toEqual(demo);
  });

  it('enciende un fragmento y visita las seis islas', () => {
    expect(demo.fragments).toEqual(['neuromath']);
    expect(demo.visitedIslands).toHaveLength(world.islands.length);
  });

  it('deja la Sala de Redacción lista para jugar', () => {
    expect(status('comunicarte-radio')).toBe('completada');
    expect(status('comunicarte-sala-redaccion')).toBe('disponible');
    expect(nextStation(demo, world, 'comunicarte')?.id).toBe('comunicarte-sala-redaccion');
  });

  it('queda en Cartógrafo, a menos de una isla de Guardián del Faro', () => {
    const standing = explorerStanding(demo.xp, world.levels);
    expect(standing.current.id).toBe('cartografo');
    expect(standing.next?.id).toBe('guardian-del-faro');
  });

  it('reparte el recorrido en tres días y gana insignias de varios tipos', () => {
    expect(demo.activeDays).toHaveLength(3);
    expect(Object.keys(demo.badges)).toEqual(
      expect.arrayContaining([
        'primer-zarpe',
        'diez-escalas',
        'cartografo',
        'pensamiento-logico',
        'constructor-de-puentes',
        'otra-mirada',
        'marea-constante',
        'primer-fragmento',
      ]),
    );
    expect(demo.journal.at(-1)?.at).toBe(
      new Date(DAY_3.getTime() - 60 * 60_000 - 7 * 60_000).toISOString(),
    );
  });
});
