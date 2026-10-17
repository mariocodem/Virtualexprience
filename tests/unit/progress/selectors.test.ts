import { describe, expect, it } from 'vitest';
import { getStation, world } from '@/data';
import { competencyLevel, explorerStanding } from '@/progress/levels';
import { hasProgress, islandProgress, nextStation, stationStatus } from '@/progress/selectors';
import * as t from '@/progress/transitions';
import { initialProgress } from '@/progress/types';
import { completeAll, DAY_1, ECOS_PATH } from './helpers';

const station = (id: string) => {
  const found = getStation(id);
  if (!found) throw new Error(`Estación ${id} no existe`);
  return found;
};

describe('estado de una estación', () => {
  it('sigue el sendero: bloqueada → disponible → en curso → completada', () => {
    let progress = initialProgress();
    expect(stationStatus(progress, station('comunicarte-imprenta'))).toBe('disponible');
    expect(stationStatus(progress, station('comunicarte-titulares'))).toBe('bloqueada');

    progress = t.startStation(progress, world, 'comunicarte-imprenta', DAY_1).progress;
    expect(stationStatus(progress, station('comunicarte-imprenta'))).toBe('en-curso');

    progress = t.completeStation(progress, world, 'comunicarte-imprenta', 1, DAY_1).progress;
    expect(stationStatus(progress, station('comunicarte-imprenta'))).toBe('completada');
    expect(stationStatus(progress, station('comunicarte-titulares'))).toBe('disponible');
  });

  it('las estaciones en preparación lo dicen, aunque se cumplan sus requisitos', () => {
    const progress = completeAll(['neuromath-patrones', 'neuromath-proporciones']);
    expect(stationStatus(progress, station('neuromath-puentes'))).toBe('en-preparacion');
  });

  it('no se puede iniciar una estación bloqueada', () => {
    const start = initialProgress();
    expect(t.startStation(start, world, 'comunicarte-radio', DAY_1).progress).toBe(start);
  });
});

describe('progreso de la isla y sugerencia', () => {
  it('cuenta solo estaciones disponibles y sugiere la siguiente del sendero', () => {
    const progress = completeAll(ECOS_PATH.slice(0, 2));
    expect(islandProgress(progress, world, 'comunicarte')).toEqual({
      completed: 2,
      playable: 6,
      ratio: 2 / 6,
      hasFragment: false,
    });
    expect(nextStation(progress, world, 'comunicarte')?.id).toBe('comunicarte-radio');
    expect(islandProgress(progress, world, 'neuromath').playable).toBe(2);
  });

  it('prefiere la estación que quedó en curso', () => {
    let progress = completeAll(['voxcivitas-argumentos']);
    progress = t.startStation(progress, world, 'voxcivitas-dilemas', DAY_1).progress;
    expect(nextStation(progress, world, 'voxcivitas')?.id).toBe('voxcivitas-dilemas');
  });

  it('distingue a quien vuelve con progreso de quien llega por primera vez', () => {
    expect(hasProgress(initialProgress())).toBe(false);
    expect(
      hasProgress(t.visitIsland(initialProgress(), world, 'comunicarte', DAY_1).progress),
    ).toBe(true);
  });
});

describe('niveles', () => {
  it.each([
    [0, 'grumete', 'navegante', 0],
    [50, 'grumete', 'navegante', 0.5],
    [100, 'navegante', 'cartografo', 0],
    [599, 'cartografo', 'guardian-del-faro', 299 / 300],
    [600, 'guardian-del-faro', undefined, 1],
    [5000, 'guardian-del-faro', undefined, 1],
  ])('con %i XP es %s', (xp, current, next, toNext) => {
    const standing = explorerStanding(xp, world.levels);
    expect(standing.current.id).toBe(current);
    expect(standing.next?.id).toBe(next);
    expect(standing.toNext).toBeCloseTo(toNext);
  });

  it.each([
    [0, 'inicial'],
    [0.39, 'inicial'],
    [0.4, 'intermedio'],
    [0.75, 'avanzado'],
    [1, 'avanzado'],
  ])('un dominio de %f es nivel %s', (mastery, level) => {
    expect(competencyLevel(mastery, world.levels).id).toBe(level);
  });
});
