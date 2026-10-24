import type { Signal } from '@/data/contentSchemas';
import type { Verdict } from './engine';

export const VERDICT_LABEL: Record<Verdict, string> = {
  publicar: 'Publicar',
  descartar: 'Descartar',
  corregir: 'Pedir corrección',
};

export const VERDICT_SLIP: Record<Verdict, string> = {
  publicar: 'Al aire',
  descartar: 'Descartada',
  corregir: 'A corrección',
};

export const TOOL_LABEL: Record<Signal, string> = {
  fuente: 'Verificar la fuente',
  fecha: 'Revisar la fecha',
  cita: 'Buscar la cita original',
  imagen: 'Revisar la imagen',
};

export const SIGNAL_LABEL: Record<Signal, string> = {
  fuente: 'La fuente',
  fecha: 'La fecha',
  cita: 'La cita',
  imagen: 'La imagen',
};

/** Hora del reloj de la radio: la edición cierra a las 6:00 p. m. */
export function clockTime(clock: number): string {
  const total = 18 * 60 - clock;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(h12)}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'p. m.' : 'a. m.'}`;
}
