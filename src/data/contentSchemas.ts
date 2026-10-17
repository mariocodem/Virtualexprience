import { z } from 'zod';

/**
 * Contenido de cada estación, uno por archivo en src/data/content/<id>.json.
 * Se carga bajo demanda al abrir la estación y se valida aquí.
 */

const text = z.string().min(1);

/** Pregunta de opción múltiple con retroalimentación por opción (practicar, comprobaciones, Bruma). */
export const quizItemSchema = z.strictObject({
  id: z.string().min(1),
  /** 1 = señales evidentes · 3 = señales sutiles. */
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  prompt: text,
  /** Material sobre el que se pregunta (un titular, un dato, una situación). */
  context: z.string().optional(),
  options: z
    .array(z.strictObject({ id: z.string().min(1), text, correct: z.boolean(), feedback: text }))
    .min(2)
    .refine((options) => options.filter((o) => o.correct).length === 1, {
      message: 'Cada pregunta debe tener exactamente una opción correcta.',
    }),
  explanation: text,
});

const sectionSchema = z.strictObject({ heading: text, body: text });

export const explorarContentSchema = z.strictObject({
  kind: z.literal('explorar'),
  intro: text,
  formats: z.strictObject({
    texto: z.strictObject({ sections: z.array(sectionSchema).min(1) }),
    /** El audio se narra con la voz del sistema (Web Speech) y se subtitula con este guion. */
    audio: z.strictObject({ script: z.array(text).min(1) }).optional(),
    /** Cápsula animada: escenas con subtítulo que avanzan solas o a mano. */
    video: z
      .strictObject({
        scenes: z
          .array(z.strictObject({ title: text, caption: text, glyph: z.string().optional() }))
          .min(2),
      })
      .optional(),
    infografia: z
      .strictObject({
        title: text,
        nodes: z.array(z.strictObject({ label: text, detail: text })).min(2),
      })
      .optional(),
    interactivo: z
      .strictObject({
        prompt: text,
        categories: z.array(z.strictObject({ id: z.string().min(1), label: text })).min(2),
        items: z.array(z.strictObject({ text, category: z.string().min(1) })).min(2),
      })
      .optional(),
  }),
  /** Comprobación breve al final: la estación se completa al responderla. */
  check: z.array(quizItemSchema).min(1),
});

export const practicarContentSchema = z.strictObject({
  kind: z.literal('practicar'),
  intro: text,
  items: z.array(quizItemSchema).min(3),
  /** Proporción mínima de aciertos para dar la estación por superada. */
  passing: z.number().min(0).max(1).default(0.6),
});

export const reflexionarContentSchema = z.strictObject({
  kind: z.literal('reflexionar'),
  prompt: text,
  guidance: z.array(text).min(1),
  minChars: z.number().int().positive().default(120),
  /** Criterios con los que Brújula lee la reflexión (también sin conexión, por palabras clave). */
  rubric: z
    .array(z.strictObject({ id: z.string().min(1), label: text, keywords: z.array(text).min(1) }))
    .min(2),
});

export const signalSchema = z.enum(['fuente', 'fecha', 'cita', 'imagen']);

export const newsItemSchema = z.strictObject({
  id: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  headline: text,
  source: text,
  date: text,
  quote: text,
  image: text,
  /** Lo que se descubre al investigar cada señal. */
  clues: z.strictObject({ fuente: text, fecha: text, cita: text, imagen: text }),
  verdict: z.enum(['publicar', 'descartar', 'corregir']),
  /** Señales que realmente deciden el caso: son los criterios correctos para justificar. */
  criteria: z.array(signalSchema).min(1),
  explanation: text,
});

export const retoContentSchema = z.strictObject({
  kind: z.literal('reto'),
  minigame: z.literal('sala-de-redaccion'),
  intro: text,
  news: z.array(newsItemSchema).min(6),
});

export const bossContentSchema = z.strictObject({
  kind: z.literal('desafio'),
  bruma: z.strictObject({
    /** Forma que toma la Bruma en esta isla, p. ej. «Bruma de los rumores». */
    name: text,
    /** Rasgo que encarna: lo contrario de la competencia de la isla. */
    nature: text,
    intro: text,
    victory: text,
    defeat: text,
    taunts: z.strictObject({
      phase1: z.array(text).min(1),
      phase2: z.array(text).min(1),
      phase3: z.array(text).min(1),
      hit: z.array(text).min(1),
      miss: z.array(text).min(1),
    }),
  }),
  items: z.array(quizItemSchema).min(9),
});

export const stationContentSchema = z.discriminatedUnion('kind', [
  explorarContentSchema,
  practicarContentSchema,
  reflexionarContentSchema,
  retoContentSchema,
  bossContentSchema,
]);

export type QuizItem = z.infer<typeof quizItemSchema>;
export type ExplorarContent = z.infer<typeof explorarContentSchema>;
export type PracticarContent = z.infer<typeof practicarContentSchema>;
export type ReflexionarContent = z.infer<typeof reflexionarContentSchema>;
export type RetoContent = z.infer<typeof retoContentSchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type Signal = z.infer<typeof signalSchema>;
export type BossContent = z.infer<typeof bossContentSchema>;
export type StationContent = z.infer<typeof stationContentSchema>;
