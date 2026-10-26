import { z } from 'zod';
import { feedbackKindSchema } from '@/data/contentSchemas';
import raw from '../data/canon.json';

/**
 * Comentarios de quienes prueban el cañón de luz: el material de la arena.
 * Cada ronda trae voces que dicen lo mismo con otras palabras (patrón), una
 * que solo dice una persona (aislado) y una ocurrencia ajena al problema.
 */

const feedbackSchema = z.strictObject({
  id: z.string().min(1),
  userId: z.string().min(1),
  quote: z.string().min(1),
  kind: feedbackKindSchema,
  why: z.string().min(1),
});

const roundSchema = z.strictObject({
  id: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1),
  feedback: z.array(feedbackSchema).min(3),
});

export const canonSchema = z.strictObject({
  prototype: z.string().min(1),
  rounds: z.array(roundSchema).min(3),
});

export type CanonRound = z.infer<typeof roundSchema>;
export type CanonFeedback = z.infer<typeof feedbackSchema>;

const data = canonSchema.parse(raw);

export const CANON_ROUNDS: readonly CanonRound[] = data.rounds;

/**
 * Ronda para una fase: al azar entre las de esa sutileza, sin repetir la
 * anterior; si no hay de esa sutileza, la más cercana.
 */
export function pickCanonRound(
  tier: 1 | 2 | 3,
  random: () => number,
  avoid?: string,
  rounds: readonly CanonRound[] = CANON_ROUNDS,
): CanonRound {
  const distance = (r: CanonRound) => Math.abs(r.tier - tier);
  const best = Math.min(...rounds.map(distance));
  const pool = rounds.filter((r) => distance(r) === best);
  const fresh = pool.filter((r) => r.id !== avoid);
  const from = fresh.length > 0 ? fresh : pool;
  const chosen = from[Math.floor(random() * from.length)] ?? rounds[0];
  if (!chosen) throw new Error('Sin rondas de comentarios.');
  return chosen;
}
