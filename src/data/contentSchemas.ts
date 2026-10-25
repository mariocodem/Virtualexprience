import { z } from 'zod';
import { islandIdSchema } from './schemas';

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

const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
/** Calidad de una decisión abierta: 1 sólida, 0.5 aceptable, 0 contraproducente. */
const qualitySchema = z.union([z.literal(0), z.literal(0.5), z.literal(1)]);
const delta = z.number().int().min(-40).max(40);

/** Dilema con varias salidas defendibles a distinto grado (mercado, huerta). */
export const dilemmaSchema = z.strictObject({
  prompt: text,
  options: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        text,
        quality: qualitySchema,
        feedback: text,
        /** Efecto sobre los indicadores del juego, por nombre de indicador. */
        effects: z.record(z.string(), delta).default({}),
      }),
    )
    .min(2)
    .refine((options) => options.some((o) => o.quality === 1), {
      message: 'Cada dilema necesita al menos una salida sólida.',
    }),
});

export const salaContentSchema = z.strictObject({
  kind: z.literal('reto'),
  minigame: z.literal('sala-de-redaccion'),
  intro: text,
  news: z.array(newsItemSchema).min(6),
});

/** Puentes de Fractal (NeuroMath): piezas expresadas de formas distintas que deben sumar el hueco. */
export const bridgeSchema = z.strictObject({
  id: z.string().min(1),
  tier: tierSchema,
  concept: z.enum(['fraccion', 'porcentaje', 'escala', 'ecuacion', 'proporcion']),
  /** Cómo se presenta el hueco (a veces sobre un plano a escala). */
  prompt: text,
  /** Longitud real del hueco, en metros. */
  gap: z.number().positive(),
  /** Piezas que caben como máximo (apoyos disponibles). */
  slots: z.number().int().min(1).max(4),
  pieces: z
    .array(z.strictObject({ id: z.string().min(1), label: text, value: z.number().positive() }))
    .min(4),
  explanation: text,
});

export const puentesContentSchema = z.strictObject({
  kind: z.literal('reto'),
  minigame: z.literal('puentes-de-fractal'),
  intro: text,
  /** Pista de Brújula por concepto, tras una prueba fallida. */
  hints: z.record(bridgeSchema.shape.concept, text),
  bridges: z.array(bridgeSchema).min(6),
});

/** Sesión de cabildo (Voxcivitas): cada intervención mueve la confianza de los grupos. */
export const deliberativeMoveSchema = z.enum([
  'escuchar',
  'pedir-evidencia',
  'integrar',
  'conceder',
  'falacia',
  'imponer',
]);

export const cabildoContentSchema = z.strictObject({
  kind: z.literal('reto'),
  minigame: z.literal('sesion-de-cabildo'),
  intro: text,
  /** El asunto que el cabildo debe decidir. */
  matter: text,
  factions: z
    .array(z.strictObject({ id: z.string().min(1), name: text, interest: text }))
    .min(3)
    .max(4),
  /** Lo que Brújula enseña sobre cada tipo de intervención, tras elegirla. */
  tips: z.record(deliberativeMoveSchema, text),
  /** Confianza inicial de cada grupo (0–100) y la necesaria para que respalde el acuerdo. */
  startTrust: z.number().int().min(0).max(100),
  threshold: z.number().int().min(0).max(100),
  rounds: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        tier: tierSchema,
        speaker: z.string().min(1),
        statement: text,
        options: z
          .array(
            z.strictObject({
              id: z.string().min(1),
              text,
              move: deliberativeMoveSchema,
              quality: qualitySchema,
              feedback: text,
              effects: z.record(z.string(), delta),
              /** Lo que queda en el acta si se elige esta intervención. */
              agreement: z.string().min(1).optional(),
            }),
          )
          .min(3),
      }),
    )
    .min(6),
});

/** Día de mercado (Gerencia+): pedir según los datos y resolver el dilema del día. */
export const mercadoContentSchema = z.strictObject({
  kind: z.literal('reto'),
  minigame: z.literal('dia-de-mercado'),
  intro: text,
  product: z.strictObject({
    name: text,
    /** Nombre de la unidad en plural, p. ej. «canastas». */
    unit: text,
    cost: z.number().int().positive(),
    price: z.number().int().positive(),
  }),
  startCash: z.number().int().positive(),
  /** Ganancia diaria promedio con la que la temporada se considera bien llevada. */
  goal: z.number().int().positive(),
  days: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        tier: tierSchema,
        title: text,
        /** Datos a la vista para decidir el pedido. */
        data: z.array(z.strictObject({ label: text, value: text })).min(1),
        /** Demanda real del día (lo que los datos permiten inferir). */
        demand: z.number().int().nonnegative(),
        orders: z.array(z.number().int().nonnegative()).min(3),
        reasoning: text,
        dilemma: dilemmaSchema,
      }),
    )
    .min(5),
});

/** Banco de pruebas (ActivaTuIdea): escuchar a quienes prueban e iterar con presupuesto. */
export const feedbackKindSchema = z.enum(['patron', 'aislado', 'fuera']);

export const bancoContentSchema = z.strictObject({
  kind: z.literal('reto'),
  minigame: z.literal('banco-de-pruebas'),
  intro: text,
  problem: text,
  idea: text,
  users: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        name: text,
        profile: text,
        start: z.number().int().min(0).max(100),
        /** ¿Tiene el problema que la idea resuelve? Solo su satisfacción cuenta para la meta. */
        target: z.boolean().default(true),
      }),
    )
    .min(3)
    .max(4),
  /** Materiales para toda la temporada de pruebas. */
  budget: z.number().int().positive(),
  /** Satisfacción media con la que el prototipo está listo para presentarse. */
  goal: z.number().int().min(0).max(100),
  rounds: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        tier: tierSchema,
        title: text,
        feedback: z
          .array(
            z.strictObject({
              id: z.string().min(1),
              userId: z.string().min(1),
              quote: text,
              kind: feedbackKindSchema,
              why: text,
            }),
          )
          .min(3),
        changes: z
          .array(
            z.strictObject({
              id: z.string().min(1),
              label: text,
              /** Rótulo que aparece en el plano del prototipo. */
              part: text,
              cost: z.number().int().nonnegative(),
              /** Comentarios que esta mejora atiende. Vacío: nadie la pidió. */
              addresses: z.array(z.string().min(1)),
              effects: z.record(z.string(), delta),
            }),
          )
          .min(3),
      }),
    )
    .min(3),
});

/** La huerta comunitaria (LatidoSocial): repartir el trabajo sin agotar a nadie. */
export const huertaContentSchema = z.strictObject({
  kind: z.literal('reto'),
  minigame: z.literal('huerta-comunitaria'),
  intro: text,
  groups: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        name: text,
        strength: text,
        energy: z.number().int().min(1).max(4),
      }),
    )
    .length(4),
  /** Familias que la huerta debería alimentar al final de la temporada. */
  goal: z.number().int().positive(),
  moons: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        tier: tierSchema,
        title: text,
        situation: text,
        tasks: z
          .array(
            z.strictObject({
              id: z.string().min(1),
              label: text,
              detail: text,
              /** Grupos cuyo saber encaja mejor con la tarea: rinden el doble. */
              fits: z.array(z.string().min(1)).min(1),
              effects: z.record(z.string(), delta),
            }),
          )
          .min(2)
          .max(4),
        dilemma: dilemmaSchema,
      }),
    )
    .min(4),
});

export const retoContentSchema = z.discriminatedUnion('minigame', [
  salaContentSchema,
  puentesContentSchema,
  cabildoContentSchema,
  mercadoContentSchema,
  bancoContentSchema,
  huertaContentSchema,
]);

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

/**
 * Gran Reto Integrador (Faro Minuto): la Gran Bruma toma, una tras otra, la
 * forma de cada Bruma del archipiélago y termina en su corazón, donde los
 * embates combinan las seis competencias.
 */
export const finaleContentSchema = z.strictObject({
  kind: z.literal('gran-reto'),
  bruma: z.strictObject({
    name: text,
    nature: text,
    intro: text,
    /** Lo que dice si el explorador se retira. */
    victory: text,
    /** Lo que dice al disiparse. */
    defeat: text,
    taunts: z.strictObject({
      hit: z.array(text).min(1),
      miss: z.array(text).min(1),
    }),
  }),
  forms: z
    .array(
      z.strictObject({
        island: islandIdSchema,
        name: text,
        /** Lo que dice al tomar esta forma. */
        taunt: text,
        /** Lo que queda cuando esta forma se disipa. */
        release: text,
        items: z.array(quizItemSchema).min(3),
      }),
    )
    .length(6)
    .refine((forms) => new Set(forms.map((f) => f.island)).size === 6, {
      message: 'La Gran Bruma toma una forma por isla, sin repetir.',
    }),
  heart: z.strictObject({
    name: text,
    taunt: text,
    items: z.array(quizItemSchema).min(2),
  }),
  /** El faro al encenderse. */
  epilogue: text,
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
export type SalaContent = z.infer<typeof salaContentSchema>;
export type PuentesContent = z.infer<typeof puentesContentSchema>;
export type Bridge = z.infer<typeof bridgeSchema>;
export type CabildoContent = z.infer<typeof cabildoContentSchema>;
export type DeliberativeMove = z.infer<typeof deliberativeMoveSchema>;
export type MercadoContent = z.infer<typeof mercadoContentSchema>;
export type BancoContent = z.infer<typeof bancoContentSchema>;
export type FeedbackKind = z.infer<typeof feedbackKindSchema>;
export type HuertaContent = z.infer<typeof huertaContentSchema>;
export type Dilemma = z.infer<typeof dilemmaSchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type Signal = z.infer<typeof signalSchema>;
export type BossContent = z.infer<typeof bossContentSchema>;
export type StationContent = z.infer<typeof stationContentSchema>;
export type FinaleContent = z.infer<typeof finaleContentSchema>;
export type FinaleForm = FinaleContent['forms'][number];
