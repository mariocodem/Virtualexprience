import { describe, expect, it } from 'vitest';
import {
  bossConfig,
  bossLevel,
  expectedScore,
  INITIAL_MASTERY,
  newsroomLevel,
  shouldOfferHint,
  tierDifficulty,
  updateMastery,
} from '@/ai/adaptiveEngine';

describe('motor adaptativo', () => {
  it('el resultado esperado es 0,5 cuando dominio y dificultad coinciden', () => {
    expect(expectedScore(0.5, 0.5)).toBeCloseTo(0.5);
    expect(expectedScore(0.9, 0.25)).toBeGreaterThan(0.95);
  });

  it('acertar un ítem difícil sube más el dominio que acertar uno fácil', () => {
    const easy = updateMastery(INITIAL_MASTERY, tierDifficulty(1), 1, 0) - INITIAL_MASTERY;
    const hard = updateMastery(INITIAL_MASTERY, tierDifficulty(3), 1, 0) - INITIAL_MASTERY;
    expect(hard).toBeGreaterThan(easy);
    expect(easy).toBeGreaterThan(0);
  });

  it('fallar baja el dominio y el paso se encoge con la práctica', () => {
    expect(updateMastery(0.6, 0.5, 0, 0)).toBeLessThan(0.6);
    const early = Math.abs(updateMastery(0.5, 0.5, 1, 0) - 0.5);
    const later = Math.abs(updateMastery(0.5, 0.5, 1, 20) - 0.5);
    expect(later).toBeLessThan(early);
  });

  it('el dominio queda siempre entre 0 y 1', () => {
    expect(updateMastery(0.99, 0, 1, 0)).toBeLessThanOrEqual(1);
    expect(updateMastery(0.01, 1, 0, 0)).toBeGreaterThanOrEqual(0);
  });

  it('la Bruma se hace más fuerte con cada victoria del explorador', () => {
    const levels = [0, 1, 2, 3, 4, 5].map((defeated) => bossLevel(defeated, 0.5));
    expect(levels).toEqual([1, 2, 3, 4, 5, 5]);
  });

  it('el dominio ajusta el nivel un punto, dentro de 1–5', () => {
    expect(bossLevel(2, 0.9)).toBe(4);
    expect(bossLevel(2, 0.1)).toBe(2);
    expect(bossLevel(0, 0.1)).toBe(1);
    expect(bossLevel(5, 0.9)).toBe(5);
  });

  it('a más nivel, menos luz, más aciertos necesarios, menos tiempo y señales más sutiles', () => {
    const easy = bossConfig(1);
    const hard = bossConfig(5);
    expect(hard.lights).toBeLessThanOrEqual(easy.lights);
    expect(hard.hitsToWin).toBeGreaterThan(easy.hitsToWin);
    expect(hard.seconds).toBeLessThan(easy.seconds);
    expect(hard.tiers[2]).toBe(3);
    expect(bossConfig(99).level).toBe(5);
  });

  it('Brújula ofrece pista tras dos fallos, o tras uno si el dominio es bajo', () => {
    expect(shouldOfferHint(1, 0.6)).toBe(false);
    expect(shouldOfferHint(2, 0.6)).toBe(true);
    expect(shouldOfferHint(1, 0.2)).toBe(true);
  });

  it('la Sala de Redacción ajusta su nivel al dominio', () => {
    expect(newsroomLevel(0)).toBe(1);
    expect(newsroomLevel(1)).toBe(5);
  });
});
