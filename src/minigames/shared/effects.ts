import type { Dilemma } from '@/data/contentSchemas';

export const QUALITY_LABEL: Record<Dilemma['options'][number]['quality'], string> = {
  1: 'Decisión sólida',
  0.5: 'Decisión aceptable',
  0: 'Decisión contraproducente',
};

/** Efectos de una decisión como texto: «Caja +20 · Reputación −5». */
export function effectSummary(
  effects: Record<string, number>,
  labels: Record<string, string>,
): string {
  return Object.entries(effects)
    .filter(([, value]) => value !== 0)
    .map(
      ([key, value]) => `${labels[key] ?? key} ${value > 0 ? '+' : '−'}${String(Math.abs(value))}`,
    )
    .join(' · ');
}
