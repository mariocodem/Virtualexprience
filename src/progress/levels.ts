import type { CompetencyLevel, ExplorerLevel, Levels } from '@/types/domain';

export interface ExplorerStanding {
  current: ExplorerLevel;
  next: ExplorerLevel | undefined;
  /** Avance hacia el siguiente nivel, de 0 a 1 (1 en el nivel máximo). */
  toNext: number;
}

export function explorerStanding(xp: number, levels: Levels): ExplorerStanding {
  const ladder = levels.explorer;
  let index = 0;
  ladder.forEach((level, i) => {
    if (xp >= level.minXp) index = i;
  });
  const current = ladder[index] ?? ladder[0];
  if (!current) throw new Error('No hay niveles de explorador definidos.');
  const next = ladder[index + 1];
  const toNext = next ? (xp - current.minXp) / (next.minXp - current.minXp) : 1;
  return { current, next, toNext: Math.min(1, Math.max(0, toNext)) };
}

export function competencyLevel(mastery: number, levels: Levels): CompetencyLevel {
  let found = levels.competency[0];
  for (const level of levels.competency) {
    if (mastery >= level.minMastery) found = level;
  }
  if (!found) throw new Error('No hay niveles de competencia definidos.');
  return found;
}
