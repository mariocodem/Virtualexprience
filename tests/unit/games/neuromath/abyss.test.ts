import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  ABYSS,
  DECK,
  deckSegments,
  keepOutOfAbyss,
  metersToWorld,
  nearestTarget,
  onDeck,
  tileSpot,
  type Spot,
} from '@/games/neuromath/abyss';
import { formatNumber, gapExpression, isRound } from '@/games/neuromath/gapExpr';
import { PUENTES } from '@/games/neuromath/puentesData';

const bridge = PUENTES.bridges.find((b) => b.id === 'rocas-gemelas');
if (!bridge) throw new Error('Falta el puente de prueba.');

describe('geografía del abismo', () => {
  it('el hueco siempre mide lo mismo en pantalla, sea cual sea la medida', () => {
    expect(12 * metersToWorld(12)).toBeCloseTo(DECK.length);
    expect(7.5 * metersToWorld(7.5)).toBeCloseTo(DECK.length);
  });

  it('los tramos se tienden a escala desde el estribo, uno a continuación del otro', () => {
    const segments = deckSegments(bridge, ['a', 'b']);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.z0).toBe(DECK.start);
    expect(segments[1]?.z0).toBeCloseTo(segments[0]?.z1 ?? 0);
    // ½ de 14 m (7) + ⅓ de 15 m (5) = 12 m: cubren de orilla a orilla.
    expect(segments[1]?.z1).toBeCloseTo(DECK.end);
    expect(deckSegments(bridge, ['zzz'])).toEqual([]);
  });

  it('las losetas se reparten por el anillo, lejos del estribo y de la palanca', () => {
    const spots = Array.from({ length: 5 }, (_, i) => tileSpot(i, 5));
    for (const s of spots) {
      expect(Math.hypot(s.x, s.z)).toBeCloseTo(ABYSS.tileRing);
      expect(Math.hypot(s.x - ABYSS.abutment.x, s.z - ABYSS.abutment.z)).toBeGreaterThan(
        ABYSS.reach * 2,
      );
      expect(Math.hypot(s.x - ABYSS.lever.x, s.z - ABYSS.lever.z)).toBeGreaterThan(ABYSS.reach * 2);
    }
    expect(new Set(spots.map((s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`)).size).toBe(5);
  });

  it('el hueco no se pisa: sin puente devuelve al borde; con puente iluminado, solo deja el tablero', () => {
    const edge = ABYSS.hole + 0.1;
    const lost = { x: 1.5, z: 1 };
    keepOutOfAbyss(lost, false);
    expect(Math.hypot(lost.x, lost.z)).toBeCloseTo(edge);
    const onBridge = { x: 0.3, z: 1 };
    keepOutOfAbyss(onBridge, true);
    expect(onBridge).toEqual({ x: 0.3, z: 1 });
    const off = { x: 3, z: 0.5 };
    keepOutOfAbyss(off, true);
    expect(off.x).toBe(ABYSS.deckHalf);
    const ring = { x: 6, z: 0 };
    keepOutOfAbyss(ring, false);
    expect(ring).toEqual({ x: 6, z: 0 });
  });

  it('reconoce cuándo se está sobre el tablero', () => {
    expect(onDeck({ x: 0, z: 0 })).toBe(true);
    expect(onDeck({ x: 0.6, z: -3 })).toBe(true);
    expect(onDeck({ x: 2, z: 0 })).toBe(false);
    expect(onDeck({ x: 0, z: 6.5 })).toBe(false);
  });

  it('elige el objetivo más cercano dentro del alcance', () => {
    const spots: Spot[] = [
      { target: { kind: 'abutment' }, x: 0, z: 5 },
      { target: { kind: 'lever' }, x: 2.5, z: 5 },
      { target: { kind: 'tile', id: 'a' }, x: -5, z: 0 },
    ];
    expect(nearestTarget({ x: 0.3, z: 5.2 }, spots)).toEqual({ kind: 'abutment' });
    expect(nearestTarget({ x: 2, z: 5 }, spots)).toEqual({ kind: 'lever' });
    expect(nearestTarget({ x: -4.5, z: 0.4 }, spots)).toEqual({ kind: 'tile', id: 'a' });
    expect(nearestTarget({ x: 0, z: 0 }, spots)).toBeNull();
  });
});

describe('expresiones de hueco', () => {
  it('toda expresión vale lo mismo que el hueco: hay que calcularla', () => {
    const random = seeded(7);
    for (const b of PUENTES.bridges) {
      for (const tier of [1, 2, 3] as const) {
        const e = gapExpression(b.gap, tier, random);
        expect(e.meters).toBe(`${formatNumber(b.gap)} m`);
        expect(e.text.length).toBeGreaterThan(0);
        if (e.kind === 'fraccion') {
          const m = /^(\S+) de (\d+(?:,\d+)?) m$/.exec(e.text);
          expect(m).not.toBeNull();
          const glyphs: Record<string, number> = {
            '½': 0.5,
            '⅓': 1 / 3,
            '⅔': 2 / 3,
            '¼': 0.25,
            '¾': 0.75,
            '⅗': 0.6,
            '⅝': 0.625,
            '⅞': 0.875,
            '⅖': 0.4,
            '⅜': 0.375,
          };
          expect(
            (glyphs[m?.[1] ?? ''] ?? 0) * Number((m?.[2] ?? '0').replace(',', '.')),
          ).toBeCloseTo(b.gap);
        }
        if (e.kind === 'porcentaje') {
          const m = /^(\d+) % de (\d+(?:,\d+)?) m$/.exec(e.text);
          expect(m).not.toBeNull();
          expect((Number(m?.[1]) * Number((m?.[2] ?? '0').replace(',', '.'))) / 100).toBeCloseTo(
            b.gap,
          );
        }
        if (e.kind === 'escala') {
          const m = /^(\d+(?:,\d+)?) cm en un plano 1:(\d+)$/.exec(e.text);
          expect(m).not.toBeNull();
          expect((Number((m?.[1] ?? '0').replace(',', '.')) * Number(m?.[2])) / 100).toBeCloseTo(
            b.gap,
          );
        }
        if (e.kind === 'ecuacion') {
          const m = /^(\d+)x \+ (\d+) = (\d+(?:,\d+)?), con x en metros$/.exec(e.text);
          expect(m).not.toBeNull();
          expect(
            (Number((m?.[3] ?? '0').replace(',', '.')) - Number(m?.[2])) / Number(m?.[1]),
          ).toBeCloseTo(b.gap);
        }
      }
    }
  });

  it('la sutileza sube con la fase y es determinista con la misma semilla', () => {
    const kinds = (tier: 1 | 2 | 3) =>
      new Set(PUENTES.bridges.map((b) => gapExpression(b.gap, tier, seeded(b.gap * 10)).kind));
    expect(kinds(1)).not.toContain('ecuacion');
    expect(kinds(2)).not.toContain('ecuacion');
    expect(kinds(3).has('ecuacion') || kinds(3).has('escala') || kinds(3).has('porcentaje')).toBe(
      true,
    );
    expect(gapExpression(12, 2, seeded(5))).toEqual(gapExpression(12, 2, seeded(5)));
  });

  it('formatea a la colombiana y reconoce redondeos', () => {
    expect(formatNumber(7.5)).toBe('7,5');
    expect(formatNumber(12)).toBe('12');
    expect(isRound(7.5)).toBe(true);
    expect(isRound(7.55)).toBe(false);
  });
});
