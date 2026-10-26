import { z } from 'zod';
import raw from './bosque.json';

/**
 * Datos propios de la arena «Defender el bosque juntos»: los saberes, los
 * cuatro grupos (los mismos de la huerta), los faroles de los senderos y los
 * llamados que hace cada farol cuando llega la niebla.
 */

const text = z.string().min(1);
const tier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const saberSchema = z.enum(['semillas', 'agua', 'fuerza', 'registros']);

export const bosqueSchema = z
  .strictObject({
    sabers: z.array(z.strictObject({ id: saberSchema, label: text })).length(4),
    groups: z
      .array(
        z.strictObject({
          id: text,
          name: text,
          short: text,
          saber: saberSchema,
          /** Lunas seguidas que aguanta en la huerta: aquí, cuánto resiste en un farol. */
          stamina: z.number().int().min(1).max(4),
        }),
      )
      .length(4),
    faroles: z
      .array(
        z.strictObject({
          id: text,
          name: text,
          short: text,
          /** Dirección del sendero en grados (0 = este, 90 = hacia el muelle). */
          angle: z.number().min(-180).max(180),
        }),
      )
      .length(4),
    needs: z
      .array(
        z.strictObject({
          id: text,
          /** 1 = el saber se nombra · 3 = hay que inferirlo de la situación. */
          tier,
          saber: saberSchema,
          text,
          /** Grupos cuyo saber encaja con el llamado. */
          fits: z.array(text).min(1),
          /** Por qué encaja: se usa en la retroalimentación. */
          why: text,
        }),
      )
      .min(12),
  })
  .superRefine((data, ctx) => {
    const groups = new Map(data.groups.map((g) => [g.id, g]));
    for (const need of data.needs) {
      for (const fit of need.fits) {
        const group = groups.get(fit);
        if (group?.saber !== need.saber)
          ctx.addIssue({
            code: 'custom',
            message: `El llamado «${need.id}» encaja con «${fit}», que no tiene ese saber.`,
          });
      }
    }
    for (const saber of saberSchema.options) {
      for (const level of [1, 2, 3] as const) {
        if (!data.needs.some((n) => n.saber === saber && n.tier === level))
          ctx.addIssue({
            code: 'custom',
            message: `Falta un llamado de ${saber} con sutileza ${String(level)}.`,
          });
      }
    }
  });

export type BosqueData = z.infer<typeof bosqueSchema>;
export type Saber = z.infer<typeof saberSchema>;
export type Need = BosqueData['needs'][number];
export type GroupInfo = BosqueData['groups'][number];
export type FarolInfo = BosqueData['faroles'][number];

export const BOSQUE: BosqueData = bosqueSchema.parse(raw);

export function saberLabel(data: BosqueData, saber: Saber): string {
  return data.sabers.find((s) => s.id === saber)?.label ?? saber;
}
