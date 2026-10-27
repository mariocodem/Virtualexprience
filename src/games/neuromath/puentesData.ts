import { puentesContentSchema } from '@/data/contentSchemas';
import raw from '@/data/content/neuromath-puentes.json';

/**
 * Los puentes de la isla, validados con Zod: la arena los usa como material
 * (huecos, piezas, pistas por concepto) aunque la Bruma que la invoque sea otra,
 * como ocurre en el Gran Reto Integrador.
 */
export const PUENTES = puentesContentSchema.parse(raw);
