import { z } from 'zod';
import type { Island, IslandId, Station, World } from '@/types/domain';
import badgesJson from './badges.json';
import islandsJson from './islands.json';
import levelsJson from './levels.json';
import { badgesSchema, islandsSchema, levelsSchema, stationsSchema } from './schemas';
import stationsJson from './stations.json';
import { validateWorld } from './validateWorld';

function parse<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`Contenido inválido en src/data/${file}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Valida y construye el mundo a partir de los JSON. Falla temprano y con mensaje claro. */
export function loadWorld(raw: {
  islands: unknown;
  stations: unknown;
  badges: unknown;
  levels: unknown;
}): World {
  const world: World = {
    islands: parse(islandsSchema, raw.islands, 'islands.json'),
    stations: parse(stationsSchema, raw.stations, 'stations.json'),
    badges: parse(badgesSchema, raw.badges, 'badges.json'),
    levels: parse(levelsSchema, raw.levels, 'levels.json'),
  };
  const problems = validateWorld(world);
  if (problems.length > 0) {
    throw new Error(`El mundo tiene contenido incoherente:\n- ${problems.join('\n- ')}`);
  }
  return world;
}

export const world: World = loadWorld({
  islands: islandsJson,
  stations: stationsJson,
  badges: badgesJson,
  levels: levelsJson,
});

const islandsById = new Map(world.islands.map((island) => [island.id, island]));
const stationsById = new Map(world.stations.map((station) => [station.id, station]));

export function getIsland(id: IslandId): Island {
  const island = islandsById.get(id);
  if (!island) throw new Error(`Isla desconocida: ${id}`);
  return island;
}

/** Busca una isla por el segmento de la URL; `undefined` si no existe. */
export function findIsland(slug: string): Island | undefined {
  return world.islands.find((island) => island.id === slug);
}

export function getStation(id: string): Station | undefined {
  return stationsById.get(id);
}

/** Estaciones de una isla en el orden sugerido del sendero. */
export function stationsOf(islandId: IslandId): Station[] {
  return world.stations.filter((station) => station.islandId === islandId);
}
