import { z } from 'zod';
import {
  finaleContentSchema,
  stationContentSchema,
  type FinaleContent,
  type StationContent,
} from './contentSchemas';

// Cada estación descarga su contenido solo cuando se abre (un fragmento por archivo).
const loaders = import.meta.glob<{ default: unknown }>('./content/*.json');

export function hasStationContent(stationId: string): boolean {
  return `./content/${stationId}.json` in loaders;
}

async function readStationContent(stationId: string): Promise<StationContent> {
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

// Un solo pedido por estación: se reutiliza al abrirla, al precargarla o al repetirla.
const cache = new Map<string, Promise<StationContent>>();

/** Contenido validado de una estación; la misma promesa para cada llamada. */
export function loadStationContent(stationId: string): Promise<StationContent> {
  let promise = cache.get(stationId);
  if (!promise) {
    promise = readStationContent(stationId);
    cache.set(stationId, promise);
    // Un fallo no queda guardado: el siguiente intento vuelve a pedirlo.
    promise.catch(() => cache.delete(stationId));
  }
  return promise;
}

/** Adelanta la descarga del contenido (p. ej. al abrir la ficha de la estación). */
export function preloadStationContent(stationId: string): void {
  if (hasStationContent(stationId)) void loadStationContent(stationId).catch(() => undefined);
}

let finale: Promise<FinaleContent> | null = null;

/** Contenido del Gran Reto Integrador del Faro: se descarga solo al abrirlo. */
export function loadFinaleContent(): Promise<FinaleContent> {
  finale ??= import('./content/faro-gran-reto.json').then((module) => {
    const result = finaleContentSchema.safeParse(module.default);
    if (!result.success) {
      throw new Error(
        `Contenido inválido en content/faro-gran-reto.json:\n${z.prettifyError(result.error)}`,
      );
    }
    return result.data;
  });
  finale.catch(() => {
    finale = null;
  });
  return finale;
}
