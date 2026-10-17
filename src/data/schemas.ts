import { z } from 'zod';

/**
 * Esquemas del contenido pedagógico. Todo el contenido vive en JSON y se valida
 * aquí al cargar: así el mundo escala a nuevas rutas sin tocar componentes.
 */

export const islandIdSchema = z.enum(['ecos', 'fractal', 'agora', 'timon', 'chispa', 'raiz']);

export const stationTypeSchema = z.enum([
  'explorar',
  'practicar',
  'reto',
  'reflexionar',
  'desafio',
]);

export const formatKindSchema = z.enum(['texto', 'audio', 'video', 'infografia', 'interactivo']);

export const minigameIdSchema = z.enum(['sala-de-redaccion', 'puentes-de-fractal']);

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones (kebab-case).');

export const islandSchema = z.strictObject({
  id: islandIdSchema,
  name: z.string().min(3),
  /** Línea de VirtuXperience que representa la isla. */
  line: z.string().min(2),
  competency: z.string().min(3),
  metaphor: z.string().min(3),
  summary: z.string().min(20),
  fragmentName: z.string().min(3),
  /** `jugable`: ruta completa. `en-preparacion`: navegable con estaciones de muestra. */
  expedition: z.enum(['jugable', 'en-preparacion']),
  /** Posición en la carta, en unidades del mundo; el Faro está en el origen. */
  position: z.strictObject({ x: z.number(), z: z.number() }),
  /** Radio aproximado de la isla en unidades del mundo. */
  radius: z.number().positive(),
});

export const stationSchema = z.strictObject({
  id: idSchema,
  islandId: islandIdSchema,
  title: z.string().min(3),
  type: stationTypeSchema,
  summary: z.string().min(10),
  xp: z.number().int().nonnegative(),
  minutes: z.number().int().positive(),
  /** Estaciones que deben completarse antes; definen el sendero sugerido. */
  requires: z.array(idSchema),
  availability: z.enum(['disponible', 'en-preparacion']),
  /** Formatos disponibles (principio DUA de representación). */
  formats: z.array(formatKindSchema).min(1),
  minigame: minigameIdSchema.optional(),
});

const badgeCriterionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('stations-completed'), count: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('island-completed'), islandId: islandIdSchema }),
  z.strictObject({ kind: z.literal('islands-visited'), count: z.number().int().min(1).max(6) }),
  z.strictObject({ kind: z.literal('fragments'), count: z.number().int().min(1).max(6) }),
  z.strictObject({ kind: z.literal('formats-tried'), count: z.number().int().min(2).max(5) }),
  z.strictObject({ kind: z.literal('reflections'), count: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('active-days'), count: z.number().int().positive() }),
  z.strictObject({
    kind: z.literal('minigame'),
    minigame: minigameIdSchema,
    metric: z.enum(['accuracy', 'criteria', 'tools-used']),
    min: z.number().nonnegative(),
  }),
]);

export const badgeSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(['competencia', 'exploracion', 'accesibilidad', 'constancia']),
  criterion: badgeCriterionSchema,
});

export const explorerLevelSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(3),
  minXp: z.number().int().nonnegative(),
});

export const competencyLevelSchema = z.strictObject({
  id: z.enum(['inicial', 'intermedio', 'avanzado']),
  name: z.string().min(3),
  minMastery: z.number().min(0).max(1),
});

export const levelsSchema = z.strictObject({
  explorer: z.array(explorerLevelSchema).min(1),
  competency: z.array(competencyLevelSchema).length(3),
});

export const islandsSchema = z.array(islandSchema).length(6);
export const stationsSchema = z.array(stationSchema).min(1);
export const badgesSchema = z.array(badgeSchema).min(12);
