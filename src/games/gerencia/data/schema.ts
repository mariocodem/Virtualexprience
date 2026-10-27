import { z } from 'zod';
import raw from './gerencia3d.json';

const text = z.string().min(1);
const station = z.strictObject({ label: text, key: z.string().length(1), hint: text });

/** Datos propios de los juegos 3D de Gerencia+: el equipo del puesto, las estaciones del barco y los avisos. */
export const gerencia3dSchema = z.strictObject({
  team: z
    .array(z.strictObject({ id: text, name: text, role: text, shirt: z.string().regex(/^#/) }))
    .min(2),
  stations: z.strictObject({ velas: station, bomba: station, linterna: station }),
  tips: z.strictObject({
    waterHigh: text,
    noLantern: text,
    noSails: text,
    aimed: text,
    foreman: text,
  }),
});

export type Gerencia3dData = z.infer<typeof gerencia3dSchema>;

export const gerencia3d: Gerencia3dData = gerencia3dSchema.parse(raw);
