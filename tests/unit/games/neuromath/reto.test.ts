import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  archAt,
  cartLaunchSpeed,
  cartX,
  CANYON,
  hasCollapsed,
  SPAN_WORLD,
  testScript,
  worldPerMeter,
} from '@/games/neuromath/canyon';
import { fall, fallTime, GRAVITY, launch } from '@/games/neuromath/debris';
import { PUENTES } from '@/games/neuromath/puentesData';
import {
  lastTarget,
  moveTarget,
  pieceForKey,
  plankSpots,
  pressPiece,
  removeAt,
  withSelection,
} from '@/games/neuromath/workbench';
import { startBridges, bridgePlan, span, testBridge } from '@/minigames/puentes-de-fractal/engine';

const bridge = PUENTES.bridges.find((b) => b.id === 'rocas-gemelas');
if (!bridge) throw new Error('Falta el puente de prueba.');

describe('cañón y guion de la prueba', () => {
  it('el hueco ocupa siempre lo mismo en el dibujo', () => {
    expect(12 * worldPerMeter(12)).toBeCloseTo(SPAN_WORLD);
    expect(worldPerMeter(6)).toBeGreaterThan(worldPerMeter(12));
  });

  it('un puente que resiste cruza entero sin derrumbarse', () => {
    const s = testScript('resiste', CANYON.right, false);
    expect(s.to).toBe(CANYON.cartPark);
    expect(s.collapseAt).toBeNull();
    expect(hasCollapsed(s, 99)).toBe(false);
    expect(cartX(s, 0)).toBe(CANYON.cartStart);
    expect(cartX(s, s.arrive)).toBe(CANYON.cartPark);
    let last = -Infinity;
    for (let t = 0; t <= s.arrive; t += s.arrive / 20) {
      const x = cartX(s, t);
      expect(x).toBeGreaterThanOrEqual(last);
      last = x;
    }
  });

  it('un puente corto cede al llegar la vagoneta y ella sale con impulso', () => {
    const end = -1;
    const s = testScript('corto', end, false);
    expect(s.to).toBe(end);
    expect(s.collapseAt).toBe(s.arrive);
    expect(s.doneAt).toBeGreaterThan(s.arrive);
    expect(hasCollapsed(s, s.arrive - 0.01)).toBe(false);
    expect(hasCollapsed(s, s.arrive)).toBe(true);
    expect(cartLaunchSpeed(s)).toBeGreaterThan(0);
  });

  it('un puente que no encaja se arquea y salta antes de que la vagoneta cruce', () => {
    const s = testScript('largo', CANYON.right + 3, false);
    expect(s.to).toBeLessThan(CANYON.left);
    expect(s.collapseAt).toBeGreaterThan(s.arrive);
    expect(archAt(s, s.arrive)).toBe(0);
    expect(archAt(s, (s.arrive + (s.collapseAt ?? 0)) / 2)).toBeCloseTo(0.5);
    expect(archAt(s, 99)).toBe(1);
    expect(cartLaunchSpeed(s)).toBe(0);
  });

  it('con movimiento reducido todo ocurre al instante y se muestra el final', () => {
    for (const outcome of ['resiste', 'corto', 'largo'] as const) {
      const s = testScript(outcome, 0, true);
      expect(s.arrive).toBe(0);
      expect(s.doneAt).toBe(0);
      expect(cartX(s, 0)).toBe(s.to);
      expect(s.collapseAt === null || s.collapseAt === 0).toBe(true);
    }
  });
});

describe('cinemática de los escombros', () => {
  it('cae con la gravedad y es determinista con la misma semilla', () => {
    const a = launch(0, 0, 0, seeded(4));
    const b = launch(0, 0, 0, seeded(4));
    expect(a).toEqual(b);
    fall(a, 0.5, -10);
    expect(a.y).toBeCloseTo(-GRAVITY * 0.5 * 0.5, 5);
    expect(a.rz).not.toBe(0);
  });

  it('al tocar el fondo avisa una vez y luego se hunde despacio', () => {
    const body = launch(0, 0, 0, seeded(1));
    let splashes = 0;
    for (let i = 0; i < 400; i++) if (fall(body, 1 / 60, -4.6)) splashes += 1;
    expect(splashes).toBe(1);
    expect(body.sunk).toBe(true);
    const y = body.y;
    fall(body, 1, -4.6);
    expect(body.y).toBeLessThan(y);
  });

  it('el tiempo de caída coincide con la integración', () => {
    const body = launch(0, 0, 0, seeded(2), { vx: 0 });
    const target = 3;
    let t = 0;
    while (!fall(body, 1 / 240, -target)) t += 1 / 240;
    expect(t).toBeCloseTo(fallTime(target), 1);
  });
});

describe('banco de piezas', () => {
  it('pulsar una pieza la encaja en la ranura marcada; volver a pulsarla la quita', () => {
    let p = pressPiece([], 2, 0, 'a');
    expect(p).toEqual({ selected: ['a'], target: 1 });
    p = pressPiece(p.selected, 2, p.target, 'b');
    expect(p.selected).toEqual(['a', 'b']);
    // Sin apoyos libres no entra otra pieza: reemplaza la de la ranura marcada.
    p = pressPiece(p.selected, 2, 0, 'c');
    expect(p.selected).toEqual(['c', 'b']);
    p = pressPiece(p.selected, 2, p.target, 'b');
    expect(p.selected).toEqual(['c']);
  });

  it('las ranuras marcables son las ocupadas y la primera libre', () => {
    expect(lastTarget([], 3)).toBe(0);
    expect(lastTarget(['a'], 3)).toBe(1);
    expect(lastTarget(['a', 'b', 'c'], 3)).toBe(2);
    expect(moveTarget(0, 5, ['a'], 3)).toBe(1);
    expect(moveTarget(1, -4, ['a'], 3)).toBe(0);
  });

  it('quitar un tramo corre los siguientes hacia el estribo', () => {
    expect(removeAt(['a', 'b', 'c'], 3, 0)).toEqual({ selected: ['b', 'c'], target: 0 });
    expect(removeAt(['a'], 3, 2)).toEqual({ selected: ['a'], target: 2 });
  });

  it('las teclas 1 a 9 eligen piezas del estante', () => {
    expect(pieceForKey(bridge, '1')).toBe('a');
    expect(pieceForKey(bridge, '5')).toBe('e');
    expect(pieceForKey(bridge, '9')).toBeNull();
    expect(pieceForKey(bridge, 'x')).toBeNull();
  });

  it('los tramos se dibujan a escala, cada uno donde acaba el anterior', () => {
    const spots = plankSpots(bridge, ['a', 'b']);
    expect(spots.map((s) => [s.start, s.end])).toEqual([
      [0, 7],
      [7, 12],
    ]);
  });

  it('la selección del banco pasa al motor de siempre y da el mismo veredicto', () => {
    const plan = bridgePlan(1);
    const engine = withSelection(startBridges([bridge], plan), bridge, ['a', 'b']);
    expect(engine.selected).toEqual(['a', 'b']);
    expect(span(bridge, engine.selected)).toBe(12);
    expect(testBridge(engine, bridge).last?.outcome).toBe('resiste');
    const short = withSelection(engine, bridge, ['b']);
    expect(testBridge(short, bridge).last?.outcome).toBe('corto');
  });
});
