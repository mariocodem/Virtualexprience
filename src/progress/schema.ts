import { z } from 'zod';
import { formatKindSchema, islandIdSchema, minigameIdSchema } from '@/data/schemas';
import type { Progress } from './types';

const unit = z.number().min(0).max(1);

/** Valida lo que se lee de localStorage: datos corruptos o ajenos no deben romper la app. */
export const progressSchema: z.ZodType<Progress> = z.object({
  version: z.literal(1),
  xp: z.number().int().nonnegative(),
  stations: z.record(
    z.string(),
    z.object({
      startedAt: z.string(),
      completedAt: z.string().optional(),
      attempts: z.number().int().nonnegative(),
      bestScore: unit.optional(),
    }),
  ),
  visitedIslands: z.array(islandIdSchema),
  fragments: z.array(islandIdSchema),
  badges: z.record(z.string(), z.string()),
  formatsTried: z.array(formatKindSchema),
  reflections: z.number().int().nonnegative(),
  activeDays: z.array(z.string()),
  minigames: z.partialRecord(
    minigameIdSchema,
    z.object({
      accuracy: unit,
      criteria: unit,
      toolsUsed: z.number().int().nonnegative(),
      runs: z.number().int().nonnegative(),
    }),
  ),
  mastery: z.partialRecord(islandIdSchema, unit),
  journal: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      kind: z.enum([
        'isla-visitada',
        'estacion-iniciada',
        'estacion-completada',
        'fragmento',
        'insignia',
        'nivel',
        'formato',
        'reflexion',
      ]),
      ref: z.string(),
    }),
  ),
});
