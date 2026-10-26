import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  applyBurden,
  BENCH,
  BIN,
  cannonLevel,
  collectConfig,
  createCollect,
  deliver,
  heldBubble,
  JAM_TIME,
  nearestBubble,
  pickUp,
  placeAt,
  resolveDelivery,
  stepCollect,
  UPGRADE_EVERY,
} from '@/games/activatuidea/canon/collect';
import { CANON_ROUNDS, pickCanonRound } from '@/games/activatuidea/canon/model';
import { personName } from '@/games/activatuidea/banco/model';

const config = collectConfig(false, 3);

/** Deja correr la deriva hasta que haya `count` burbujas. */
function fill(random = seeded(7)) {
  const state = createCollect();
  for (let t = 0; t < 10; t++) stepCollect(state, config, 0.5, random, 1);
  return { state, random };
}

describe('comentarios de la arena', () => {
  it('trae rondas de las tres sutilezas con patrones, aislados y ocurrencias', () => {
    expect(new Set(CANON_ROUNDS.map((r) => r.tier))).toEqual(new Set([1, 2, 3]));
    for (const round of CANON_ROUNDS) {
      const kinds = round.feedback.map((f) => f.kind);
      expect(kinds.filter((k) => k === 'patron').length).toBeGreaterThanOrEqual(2);
      expect(kinds).toContain('aislado');
      expect(kinds).toContain('fuera');
    }
  });

  it('elige una ronda de la sutileza pedida y evita repetir la anterior', () => {
    const random = seeded(3);
    for (const tier of [1, 2, 3] as const) {
      const first = pickCanonRound(tier, random);
      expect(first.tier).toBe(tier);
      const second = pickCanonRound(tier, random, first.id);
      if (CANON_ROUNDS.filter((r) => r.tier === tier).length > 1)
        expect(second.id).not.toBe(first.id);
    }
  });

  it('con una sutileza que no existe usa la más cercana', () => {
    const only = CANON_ROUNDS.filter((r) => r.tier === 1);
    expect(pickCanonRound(3, seeded(1), undefined, only).tier).toBe(1);
  });

  it('todas las personas de los comentarios tienen nombre', () => {
    for (const round of CANON_ROUNDS)
      for (const f of round.feedback) expect(personName(f.userId)).not.toBe(f.userId);
  });
});

describe('deriva de las burbujas', () => {
  it('repone hasta el número pedido y las mantiene dentro de la plataforma', () => {
    const { state, random } = fill();
    expect(state.bubbles).toHaveLength(config.count);
    for (let t = 0; t < 400; t++) stepCollect(state, config, 0.1, random, 1);
    for (const b of state.bubbles) expect(Math.hypot(b.x, b.z)).toBeLessThan(config.radius);
  });

  it('saca una ronda entera junta, para poder comparar las voces', () => {
    const { state } = fill();
    const round = CANON_ROUNDS.find((r) =>
      r.feedback.some((f) => f.id === state.bubbles[0]?.feedbackId),
    );
    expect(round).toBeDefined();
    const ids = new Set(round?.feedback.map((f) => f.id));
    expect(state.bubbles.every((b) => ids.has(b.feedbackId))).toBe(true);
  });

  it('revienta las que nadie recoge y pone otras', () => {
    const { state, random } = fill();
    const first = state.bubbles.map((b) => b.id);
    let popped = 0;
    for (let t = 0; t < 600; t++)
      popped += stepCollect(state, config, 0.1, random, 1).popped.length;
    expect(popped).toBeGreaterThan(0);
    expect(state.bubbles.some((b) => first.includes(b.id))).toBe(false);
  });

  it('no deja que reviente la que se lleva', () => {
    const { state, random } = fill();
    const bubble = state.bubbles[0];
    if (!bubble) throw new Error('sin burbuja');
    pickUp(state, bubble);
    for (let t = 0; t < 600; t++) stepCollect(state, config, 0.1, random, 1);
    expect(state.bubbles).toContain(bubble);
  });

  it('con ritmo tranquilo hay menos burbujas, más lentas y más fáciles de alcanzar', () => {
    const calm = collectConfig(true, 3);
    expect(calm.count).toBeLessThan(config.count);
    expect(calm.drift).toBeLessThan(config.drift);
    expect(calm.reach).toBeGreaterThan(config.reach);
    expect(calm.burden).toBeGreaterThan(config.burden);
    expect(calm.life).toBeGreaterThan(config.life);
  });
});

describe('recoger y llevar', () => {
  it('recoge la más cercana dentro del alcance y solo una a la vez', () => {
    const { state } = fill();
    const [a, b] = state.bubbles;
    if (!a || !b) throw new Error('faltan burbujas');
    a.x = 1;
    a.z = 1;
    b.x = 1.5;
    b.z = 1;
    expect(nearestBubble(state, { x: 1.4, z: 1 }, 1)).toBe(b);
    expect(nearestBubble(state, { x: -8, z: -8 }, 1)).toBeNull();
    expect(pickUp(state, a)).toBe(true);
    expect(pickUp(state, b)).toBe(false);
    expect(heldBubble(state)).toBe(a);
    expect(nearestBubble(state, { x: 1, z: 1 }, 1)).toBe(b);
  });

  it('reconoce el banco y la papelera', () => {
    expect(placeAt(BENCH)).toBe('banco');
    expect(placeAt(BIN)).toBe('papelera');
    expect(placeAt({ x: 0, z: 0 })).toBeNull();
  });

  it('cargar frena sin afectar movimientos bruscos (esquiva)', () => {
    const at = { x: 1, z: 0 };
    applyBurden(at, { x: 0, z: 0 }, 0.5);
    expect(at.x).toBeCloseTo(0.5);
    const dash = { x: 4, z: 0 };
    applyBurden(dash, { x: 0, z: 0 }, 0.5);
    expect(dash.x).toBe(4);
  });
});

describe('entregas', () => {
  it('llevar un patrón al banco es correcto y mejora el cañón', () => {
    const r = resolveDelivery('patron', 'banco');
    expect(r).toMatchObject({ correct: true, effect: 'carga' });
    const state = createCollect();
    expect(cannonLevel(state)).toBe(0);
    state.delivered = UPGRADE_EVERY;
    expect(cannonLevel(state)).toBe(1);
    state.delivered = 99;
    expect(cannonLevel(state)).toBe(3);
  });

  it('llevar un caso aislado o una ocurrencia al banco atasca el cañón', () => {
    for (const kind of ['aislado', 'fuera'] as const) {
      expect(resolveDelivery(kind, 'banco')).toMatchObject({ correct: false, effect: 'atasco' });
    }
  });

  it('descartar lo que no es evidencia es correcto; tirar un patrón, no', () => {
    expect(resolveDelivery('aislado', 'papelera')).toMatchObject({
      correct: true,
      effect: 'descarte',
    });
    expect(resolveDelivery('fuera', 'papelera')).toMatchObject({
      correct: true,
      effect: 'descarte',
    });
    expect(resolveDelivery('patron', 'papelera')).toMatchObject({
      correct: false,
      effect: 'perdido',
    });
  });

  it('al entregar se quita la burbuja y se aplican mejora o atasco', () => {
    const { state, random } = fill();
    const [a, b] = state.bubbles;
    if (!a || !b) throw new Error('faltan burbujas');
    deliver(state, a, resolveDelivery('patron', 'banco'));
    expect(state.bubbles).not.toContain(a);
    expect(state.delivered).toBe(1);
    deliver(state, b, resolveDelivery('fuera', 'banco'));
    expect(state.jam).toBe(JAM_TIME);
    stepCollect(state, config, 1, random, 1);
    expect(state.jam).toBeCloseTo(JAM_TIME - 1);
  });
});
