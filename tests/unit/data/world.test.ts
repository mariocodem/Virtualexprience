import { describe, expect, it } from 'vitest';
import { findIsland, loadWorld, stationsOf, world } from '@/data';
import badges from '@/data/badges.json';
import islands from '@/data/islands.json';
import levels from '@/data/levels.json';
import stations from '@/data/stations.json';
import { validateWorld } from '@/data/validateWorld';
import type { World } from '@/types/domain';

const raw = () => structuredClone({ islands, stations, badges, levels });

describe('contenido del mundo', () => {
  it('el contenido real es válido y coherente', () => {
    expect(validateWorld(world)).toEqual([]);
  });

  it('hay seis islas y cada una tiene un único desafío', () => {
    expect(world.islands).toHaveLength(6);
    for (const island of world.islands) {
      expect(stationsOf(island.id).filter((s) => s.type === 'desafio')).toHaveLength(1);
    }
  });

  it('la Isla de los Ecos es jugable de punta a punta y mezcla los cinco tipos de estación', () => {
    const ecos = stationsOf('ecos');
    expect(ecos.map((s) => s.id)).toEqual([
      'ecos-imprenta',
      'ecos-titulares',
      'ecos-radio',
      'ecos-sala-redaccion',
      'ecos-bitacora-editor',
      'ecos-cierre',
    ]);
    expect(ecos.every((s) => s.availability === 'disponible')).toBe(true);
    expect(new Set(ecos.map((s) => s.type))).toEqual(
      new Set(['explorar', 'practicar', 'reto', 'reflexionar', 'desafio']),
    );
    expect(ecos.find((s) => s.type === 'reto')?.minigame).toBe('sala-de-redaccion');
  });

  it('las estaciones de explorar de Ecos ofrecen los cinco formatos (DUA)', () => {
    for (const station of stationsOf('ecos').filter((s) => s.type === 'explorar')) {
      expect(station.formats).toHaveLength(5);
    }
  });

  it('hay al menos doce insignias que cubren las cuatro categorías', () => {
    expect(world.badges.length).toBeGreaterThanOrEqual(12);
    expect(new Set(world.badges.map((b) => b.category))).toEqual(
      new Set(['competencia', 'exploracion', 'accesibilidad', 'constancia']),
    );
  });

  it('busca islas por el segmento de la URL', () => {
    expect(findIsland('ecos')?.name).toBe('Isla de los Ecos');
    expect(findIsland('atlantida')).toBeUndefined();
  });
});

describe('validación del contenido', () => {
  it('rechaza JSON que no cumple el esquema con un mensaje que nombra el archivo', () => {
    const data = raw();
    (data.stations[0] as { type: string }).type = 'juego';
    expect(() => loadWorld(data)).toThrow(/stations\.json/);
  });

  it('detecta requisitos inexistentes', () => {
    const w: World = structuredClone(world);
    const first = w.stations[0];
    if (!first) throw new Error('sin estaciones');
    first.requires = ['estacion-fantasma'];
    expect(validateWorld(w)).toContainEqual(expect.stringMatching(/estacion-fantasma/));
  });

  it('detecta ciclos en el sendero', () => {
    const w: World = structuredClone(world);
    const first = w.stations.find((s) => s.id === 'ecos-imprenta');
    if (!first) throw new Error('sin estación');
    first.requires = ['ecos-cierre'];
    expect(validateWorld(w)).toContainEqual(expect.stringMatching(/ciclo/));
  });

  it('detecta una isla jugable con estaciones en preparación', () => {
    const w: World = structuredClone(world);
    const station = w.stations.find((s) => s.id === 'ecos-radio');
    if (!station) throw new Error('sin estación');
    station.availability = 'en-preparacion';
    expect(validateWorld(w)).toContainEqual(expect.stringMatching(/jugable "ecos"/));
  });

  it('detecta niveles de explorador desordenados', () => {
    const w: World = structuredClone(world);
    w.levels.explorer.reverse();
    expect(validateWorld(w).length).toBeGreaterThan(0);
  });
});
