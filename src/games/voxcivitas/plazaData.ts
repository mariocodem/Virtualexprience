import { z } from 'zod';
import raw from './plaza.json';

/**
 * Datos propios de los juegos 3D de Voxcivitas: cómo se nombra a cada grupo
 * en la plaza, quiénes más alzan la voz y qué pasa cuando nadie responde.
 * El contenido pedagógico (rondas y embates) sigue en src/data/content/.
 */

const text = z.string().min(1);

export const plazaDataSchema = z.strictObject({
  /** Por id de grupo del cabildo: rótulo corto y cómo se nombra a quien alza la voz. */
  groups: z.record(z.string(), z.strictObject({ short: text, member: text })),
  /** Vecinos sin grupo que plantean las preguntas de la Bruma. */
  passersby: z.array(text).min(1),
  /** Cuando se agota la paciencia de quien alzó la voz; `{who}` es esa persona. */
  giveUp: z.array(text.refine((line) => line.includes('{who}'), 'Falta {who} en la frase.')).min(1),
});

export type PlazaData = z.infer<typeof plazaDataSchema>;

export const PLAZA: PlazaData = plazaDataSchema.parse(raw);

/** Rótulo corto de un grupo (o su nombre completo si no hay uno). */
export function shortName(groupId: string, name: string, data: PlazaData = PLAZA): string {
  return data.groups[groupId]?.short ?? name;
}

/** Cómo se nombra a quien alza la voz: el miembro de su grupo, o un vecino cualquiera. */
export function speakerLabel(
  groupId: string | null,
  index: number,
  data: PlazaData = PLAZA,
): string {
  const member = groupId === null ? undefined : data.groups[groupId]?.member;
  if (member) return member;
  return data.passersby[index % data.passersby.length] ?? 'Un vecino';
}

/** La frase de cuando nadie responde, con el nombre de quien esperaba. */
export function giveUpLine(who: string, index: number, data: PlazaData = PLAZA): string {
  const line =
    data.giveUp[index % data.giveUp.length] ?? 'Sin quien escuche, {who} deja de participar.';
  const name = line.startsWith('{who}') ? who : who.charAt(0).toLowerCase() + who.slice(1);
  return line.replace('{who}', name);
}
