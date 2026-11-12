import { z } from 'zod';
import raw from './faroVideo.json';
import { faroVideoSchema } from './schemas';

export type FaroVideo = z.infer<typeof faroVideoSchema>;

const result = faroVideoSchema.safeParse(raw);
if (!result.success) {
  throw new Error(`Contenido inválido en faroVideo.json:\n${z.prettifyError(result.error)}`);
}

/** El video de VirtuXperience que se abre al pulsar el Faro Minuto (validado al cargar). */
export const faroVideo: FaroVideo = result.data;

/** Ruta pública de un archivo del video, con la base del despliegue (p. ej. GitHub Pages). */
export const videoAsset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

/** «3 min 28 s». */
export function durationLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${String(m)} min ${String(s)} s` : `${String(m)} min`;
}
