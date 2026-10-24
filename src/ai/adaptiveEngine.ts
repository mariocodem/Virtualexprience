/**
 * Motor adaptativo local (CLAUDE.md §8, capa 1). Funciona sin red y es
 * determinista: las mismas entradas dan las mismas decisiones.
 *
 * Dominio por competencia, m ∈ [0, 1], actualizado como un Elo de un solo
 * jugador frente a ítems de dificultad d ∈ [0, 1]:
 *
 *   esperado = 1 / (1 + e^(−k·(m − d)))        con k = 6
 *   m' = m + K · (resultado − esperado)        con K = 0,18 / √(1 + intentos/4)
 *
 * El paso K se encoge con la práctica: los primeros intentos mueven mucho la
 * estimación y los siguientes la afinan. La fórmula se documenta en docs/ia.md.
 */

export const INITIAL_MASTERY = 0.3;
const K_SLOPE = 6;

/** Dificultad de un ítem según su nivel de sutileza. */
export function tierDifficulty(tier: 1 | 2 | 3): number {
  return tier === 1 ? 0.25 : tier === 2 ? 0.5 : 0.75;
}

export function expectedScore(mastery: number, difficulty: number): number {
  return 1 / (1 + Math.exp(-K_SLOPE * (mastery - difficulty)));
}

export function updateMastery(
  mastery: number,
  difficulty: number,
  outcome: number,
  attempts: number,
): number {
  const step = 0.18 / Math.sqrt(1 + attempts / 4);
  const next = mastery + step * (clamp01(outcome) - expectedScore(mastery, difficulty));
  return clamp01(next);
}

/**
 * Nivel de la Bruma (1–5). Sube con cada Bruma vencida —«se hace más fuerte
 * mientras avanzas»— y el dominio estimado lo ajusta un punto arriba o abajo.
 */
export function bossLevel(defeated: number, mastery: number): number {
  const base = 1 + Math.max(0, defeated);
  const adjust = mastery >= 0.75 ? 1 : mastery < 0.35 ? -1 : 0;
  return Math.min(5, Math.max(1, base + adjust));
}

export interface BossConfig {
  level: number;
  /** Luz del explorador: errores que puede cometer antes de retirarse. */
  lights: number;
  /** Aciertos necesarios para disipar la Bruma (se reparten en tres fases). */
  hitsToWin: number;
  /** Segundos para responder cada embate. */
  seconds: number;
  /** Nivel de sutileza de los ítems en cada fase. */
  tiers: readonly [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3];
}

const CONFIGS: Record<number, Omit<BossConfig, 'level'>> = {
  1: { lights: 4, hitsToWin: 6, seconds: 50, tiers: [1, 1, 2] },
  2: { lights: 4, hitsToWin: 6, seconds: 45, tiers: [1, 2, 2] },
  3: { lights: 3, hitsToWin: 7, seconds: 40, tiers: [1, 2, 3] },
  4: { lights: 3, hitsToWin: 8, seconds: 34, tiers: [2, 2, 3] },
  5: { lights: 3, hitsToWin: 9, seconds: 28, tiers: [2, 3, 3] },
};

export function bossConfig(level: number): BossConfig {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  const config = CONFIGS[clamped] ?? CONFIGS[1];
  if (!config) throw new Error('Configuración de Bruma inexistente.');
  return { level: clamped, ...config };
}

/** Brújula ofrece pista tras dos fallos seguidos, o tras uno si el dominio es bajo. */
export function shouldOfferHint(consecutiveMisses: number, mastery: number): boolean {
  return consecutiveMisses >= 2 || (consecutiveMisses >= 1 && mastery < 0.35);
}

/**
 * Dificultad de los minijuegos (1–5) según el dominio de la competencia de la
 * isla. Cada juego traduce el nivel a su propio plan: sutileza de las señales,
 * recursos disponibles y número de rondas.
 */
export function minigameLevel(mastery: number): number {
  return Math.min(5, Math.max(1, 1 + Math.round(mastery * 4)));
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
