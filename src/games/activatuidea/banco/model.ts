import { z } from 'zod';
import raw from '../data/taller3d.json';

/**
 * Datos propios del taller en 3D: qué pieza se ve en el prototipo por cada
 * cambio del contenido y cómo luce cada persona que lo prueba. Si el contenido
 * crece con cambios o personas nuevas, se ven con una pieza y un aspecto
 * genéricos: el juego no depende de esta tabla para funcionar.
 */

export const PART_KINDS = [
  'cierre-enrollable',
  'tela-fosforescente',
  'correa-acolchada',
  'candado',
  'fuelle',
  'cinta-reflectiva',
  'portavasos',
  'panel-solar',
  'cinta-pecho',
  'logo',
  'version-playa',
  'rediseno',
  'forro-transpirable',
  'lote-regalo',
  'bolsa-carnada',
  'aromatizante',
  'detalles-reflectivos',
  'lona-delgada',
  'ruedas',
  'forro-colores',
  'etiqueta',
] as const;

export type PartKind = (typeof PART_KINDS)[number];

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

export const PROPS = ['portatil', 'sombrero', 'carpeta', 'camara', 'ninguno'] as const;
export type PersonProp = (typeof PROPS)[number];

const lookSchema = z.strictObject({
  name: z.string().min(1),
  coat: hex,
  trim: hex,
  skin: hex,
  hair: hex,
  prop: z.enum(PROPS),
});

export type PersonLook = z.infer<typeof lookSchema>;

export const taller3dSchema = z.strictObject({
  parts: z.record(z.string().min(1), z.enum(PART_KINDS)),
  people: z.record(z.string().min(1), lookSchema),
});

const data = taller3dSchema.parse(raw);

/** Nombre de quien prueba el prototipo, para los comentarios que flotan en la arena. */
export function personName(userId: string): string {
  return data.people[userId]?.name ?? userId;
}

/** Pieza visible en el prototipo para un cambio del contenido. */
export function partKind(changeId: string): PartKind {
  return data.parts[changeId] ?? 'etiqueta';
}

const DEFAULT_LOOK: PersonLook = {
  name: 'Visitante',
  coat: '#4f7fb8',
  trim: '#f3f6f8',
  skin: '#c68e64',
  hair: '#2b1d14',
  prop: 'ninguno',
};

const FALLBACK_LOOKS: PersonLook[] = [
  DEFAULT_LOOK,
  {
    name: 'Visitante',
    coat: '#5e9e4b',
    trim: '#f1ebdd',
    skin: '#e0b08a',
    hair: '#5e3d26',
    prop: 'ninguno',
  },
  {
    name: 'Visitante',
    coat: '#b4533a',
    trim: '#f3d9a4',
    skin: '#8d5a3b',
    hair: '#1b1410',
    prop: 'ninguno',
  },
  {
    name: 'Visitante',
    coat: '#4a5bb8',
    trim: '#fed300',
    skin: '#f1c7a5',
    hair: '#a87a4f',
    prop: 'ninguno',
  },
];

/** Aspecto de quien prueba el prototipo; si no está en la tabla, uno genérico según su turno. */
export function personLook(userId: string, index: number): PersonLook {
  return data.people[userId] ?? FALLBACK_LOOKS[index % FALLBACK_LOOKS.length] ?? DEFAULT_LOOK;
}
