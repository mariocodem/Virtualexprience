import { describe, expect, it } from 'vitest';
import { arc, deskFraming, easeInOutCubic, easeOutCubic } from '@/games/comunicarte/sala/motion';

describe('motion', () => {
  it('las curvas van de 0 a 1 y se acotan', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(-1)).toBe(0);
  });

  it('el arco parte y llega a sus puntos, y sube a mitad de camino', () => {
    const a = [0, 1, 0] as const;
    const b = [4, 0, 2] as const;
    expect(arc(a, b, 0, 1.5)).toEqual([0, 1, 0]);
    const end = arc(a, b, 1, 1.5);
    expect(end[0]).toBeCloseTo(4);
    expect(end[1]).toBeCloseTo(0);
    expect(arc(a, b, 0.5, 1.5)[1]).toBeGreaterThan(1.5);
  });

  it('encuadra con panel lateral en pantallas anchas y con hoja inferior en angostas', () => {
    const wide = deskFraming(1440, 700);
    expect(wide.panelX).toBeGreaterThan(300);
    expect(wide.panelY).toBe(0);
    const narrow = deskFraming(412, 713);
    expect(narrow.panelX).toBe(0);
    expect(narrow.panelY).toBeGreaterThan(300);
    expect(narrow.dist).toBeGreaterThan(9);
    expect(narrow.dist).toBeLessThanOrEqual(32);
  });
});
