import { describe, expect, it } from 'vitest';
import {
  arcSpots,
  createWalker,
  islandSet,
  nearestSpot,
  PLAZA_RADIUS,
  stepWalker,
} from '@/games/stations/plaza';

describe('plaza de las estaciones 3D', () => {
  it('camina a la misma velocidad en diagonal y se detiene en el borde del claro', () => {
    const straight = createWalker();
    const diagonal = createWalker();
    stepWalker(straight, { x: 1, z: 0 }, 0.1);
    stepWalker(diagonal, { x: 1, z: 1 }, 0.1);
    const moved = (w: { x: number; z: number }) => Math.hypot(w.x - 0, w.z - 4.6);
    expect(moved(diagonal)).toBeCloseTo(moved(straight), 5);

    const walker = createWalker();
    for (let i = 0; i < 200; i++) stepWalker(walker, { x: 0, z: 1 }, 0.05);
    expect(Math.hypot(walker.x, walker.z)).toBeLessThan(PLAZA_RADIUS);
    expect(walker.facing).toBeCloseTo(Math.PI / 2);
  });

  it('quieto no gira ni se mueve', () => {
    const walker = createWalker();
    stepWalker(walker, { x: 0, z: 0 }, 0.1);
    expect(walker).toEqual({ ...createWalker(), moving: false });
  });

  it('elige el punto más cercano que está a mano', () => {
    const spots = [
      { id: 'a', x: 0, z: 0 },
      { id: 'b', x: 1, z: 0 },
    ];
    expect(nearestSpot(spots, { x: 0.8, z: 0 })?.id).toBe('b');
    expect(nearestSpot(spots, { x: 5, z: 5 })).toBeUndefined();
  });

  it('reparte los puntos al fondo de la plaza, separados y dentro del claro', () => {
    const spots = arcSpots(['texto', 'audio', 'video', 'infografia', 'interactivo'], 4.8);
    expect(spots.every((s) => s.z < 0 && Math.hypot(s.x, s.z) < PLAZA_RADIUS)).toBe(true);
    for (let i = 1; i < spots.length; i++) {
      const [a, b] = [spots[i - 1], spots[i]];
      if (a && b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(2);
    }
    expect(arcSpots(['solo'], 4)[0]?.x).toBeCloseTo(0);
  });

  it('arma el lugar de cada isla fuera del claro y mirando hacia él', () => {
    for (const id of [
      'comunicarte',
      'neuromath',
      'voxcivitas',
      'gerencia',
      'activatuidea',
      'latidosocial',
    ] as const) {
      const set = islandSet(id);
      expect(set.length).toBeGreaterThan(5);
      for (const piece of set) {
        const [x, , z] = piece.position;
        expect(Math.hypot(x, z)).toBeGreaterThan(PLAZA_RADIUS + 2);
        // El frente local (+Z) girado apunta hacia el centro.
        const front = { x: Math.sin(piece.rotation), z: Math.cos(piece.rotation) };
        expect(front.x * -x + front.z * -z).toBeGreaterThan(0);
      }
    }
  });
});
