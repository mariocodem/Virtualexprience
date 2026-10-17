import type { BadgeCriterion, World } from '@/types/domain';
import { completedCount } from './selectors';
import type { Progress } from './types';

export function meetsCriterion(
  criterion: BadgeCriterion,
  progress: Progress,
  world: World,
): boolean {
  switch (criterion.kind) {
    case 'stations-completed':
      return completedCount(progress) >= criterion.count;
    case 'island-completed': {
      const playable = world.stations.filter(
        (s) => s.islandId === criterion.islandId && s.availability === 'disponible',
      );
      return (
        progress.fragments.includes(criterion.islandId) &&
        playable.every((s) => Boolean(progress.stations[s.id]?.completedAt))
      );
    }
    case 'islands-visited':
      return progress.visitedIslands.length >= criterion.count;
    case 'fragments':
      return progress.fragments.length >= criterion.count;
    case 'formats-tried':
      return progress.formatsTried.length >= criterion.count;
    case 'reflections':
      return progress.reflections >= criterion.count;
    case 'active-days':
      return progress.activeDays.length >= criterion.count;
    case 'minigame': {
      const best = progress.minigames[criterion.minigame];
      if (!best) return false;
      const value =
        criterion.metric === 'accuracy'
          ? best.accuracy
          : criterion.metric === 'criteria'
            ? best.criteria
            : best.toolsUsed;
      return value >= criterion.min;
    }
  }
}

/** Insignias que se cumplen ahora y todavía no se han otorgado, en el orden del catálogo. */
export function newlyEarnedBadges(progress: Progress, world: World): string[] {
  return world.badges
    .filter((badge) => !(badge.id in progress.badges))
    .filter((badge) => meetsCriterion(badge.criterion, progress, world))
    .map((badge) => badge.id);
}
