import type { z } from 'zod';
import type {
  badgeSchema,
  competencyLevelSchema,
  explorerLevelSchema,
  formatKindSchema,
  islandIdSchema,
  islandSchema,
  levelsSchema,
  minigameIdSchema,
  stationSchema,
  stationTypeSchema,
} from '@/data/schemas';

export type IslandId = z.infer<typeof islandIdSchema>;
export type Island = z.infer<typeof islandSchema>;
export type StationType = z.infer<typeof stationTypeSchema>;
export type Station = z.infer<typeof stationSchema>;
export type FormatKind = z.infer<typeof formatKindSchema>;
export type MinigameId = z.infer<typeof minigameIdSchema>;
export type Badge = z.infer<typeof badgeSchema>;
export type BadgeCriterion = Badge['criterion'];
export type ExplorerLevel = z.infer<typeof explorerLevelSchema>;
export type CompetencyLevel = z.infer<typeof competencyLevelSchema>;
export type Levels = z.infer<typeof levelsSchema>;

export interface World {
  islands: Island[];
  stations: Station[];
  badges: Badge[];
  levels: Levels;
}
