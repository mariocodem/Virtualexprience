import { z } from 'zod';
import { stationContentSchema, type StationContent } from './contentSchemas';

// Cada estación descarga su contenido solo cuando se abre (un fragmento por archivo).
const loaders = import.meta.glob<{ default: unknown }>('./content/*.json');

export function hasStationContent(stationId: string): boolean {
  return `./content/${stationId}.json` in loaders;
}

export async function loadStationContent(stationId: string): Promise<StationContent> {
  const loader = loaders[`./content/${stationId}.json`];
  if (!loader) throw new Error(`La estación «${stationId}» no tiene contenido.`);
  const module = await loader();
  const result = stationContentSchema.safeParse(module.default);
  if (!result.success) {
    throw new Error(
      `Contenido inválido en content/${stationId}.json:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
