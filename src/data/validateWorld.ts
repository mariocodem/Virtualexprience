import type { World } from '@/types/domain';

/**
 * Reglas que Zod no puede expresar por sí solo: referencias cruzadas entre
 * archivos, senderos sin ciclos y umbrales ordenados. Devuelve los problemas
 * encontrados; una lista vacía significa contenido coherente.
 */
export function validateWorld(world: World): string[] {
  const problems: string[] = [];
  const islandIds = new Set(world.islands.map((i) => i.id));
  const stationsById = new Map(world.stations.map((s) => [s.id, s]));

  if (islandIds.size !== world.islands.length) problems.push('Hay islas con id repetido.');
  if (stationsById.size !== world.stations.length) problems.push('Hay estaciones con id repetido.');
  if (new Set(world.badges.map((b) => b.id)).size !== world.badges.length) {
    problems.push('Hay insignias con id repetido.');
  }

  for (const station of world.stations) {
    if (!islandIds.has(station.islandId)) {
      problems.push(`La estación "${station.id}" apunta a una isla inexistente.`);
    }
    for (const required of station.requires) {
      const dependency = stationsById.get(required);
      if (!dependency) {
        problems.push(`La estación "${station.id}" requiere "${required}", que no existe.`);
      } else if (dependency.islandId !== station.islandId) {
        problems.push(`La estación "${station.id}" requiere una estación de otra isla.`);
      }
    }
    if (station.type === 'desafio' && station.formats.length === 0) {
      problems.push(`El desafío "${station.id}" no tiene formatos.`);
    }
  }

  for (const island of world.islands) {
    const own = world.stations.filter((s) => s.islandId === island.id);
    if (own.length === 0) problems.push(`La isla "${island.id}" no tiene estaciones.`);
    const challenges = own.filter((s) => s.type === 'desafio');
    if (challenges.length !== 1) {
      problems.push(`La isla "${island.id}" debe tener exactamente un desafío.`);
    }
    if (island.expedition === 'jugable' && own.some((s) => s.availability !== 'disponible')) {
      problems.push(`La isla jugable "${island.id}" tiene estaciones en preparación.`);
    }
    if (!own.some((s) => s.availability === 'disponible')) {
      problems.push(`La isla "${island.id}" necesita al menos una estación de muestra disponible.`);
    }
  }

  for (const cycle of findCycles(world)) {
    problems.push(`El sendero tiene un ciclo: ${cycle.join(' → ')}.`);
  }

  const explorer = world.levels.explorer;
  if (explorer[0]?.minXp !== 0)
    problems.push('El primer nivel de explorador debe empezar en 0 XP.');
  if (!isStrictlyAscending(explorer.map((l) => l.minXp))) {
    problems.push('Los niveles de explorador deben tener XP mínima creciente.');
  }
  const competency = world.levels.competency;
  if (competency[0]?.minMastery !== 0)
    problems.push('El primer nivel de competencia debe empezar en 0.');
  if (!isStrictlyAscending(competency.map((l) => l.minMastery))) {
    problems.push('Los niveles de competencia deben tener dominio mínimo creciente.');
  }

  return problems;
}

function isStrictlyAscending(values: number[]): boolean {
  return values.every((value, i) => i === 0 || value > (values[i - 1] ?? Number.NEGATIVE_INFINITY));
}

function findCycles(world: World): string[][] {
  const requires = new Map(world.stations.map((s) => [s.id, s.requires]));
  const state = new Map<string, 'visiting' | 'done'>();
  const cycles: string[][] = [];

  const visit = (id: string, path: string[]) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      cycles.push([...path.slice(path.indexOf(id)), id]);
      return;
    }
    state.set(id, 'visiting');
    for (const next of requires.get(id) ?? []) visit(next, [...path, id]);
    state.set(id, 'done');
  };

  for (const id of requires.keys()) visit(id, []);
  return cycles;
}
