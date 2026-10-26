import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  aimTolerance,
  brumaDensity,
  chargeArena,
  createArena,
  stepArena,
  strengthenBruma,
  tempo,
  type ArenaConfig,
  type ArenaInput,
  type ArenaState,
} from '@/games/shared/arena/core';

const config: ArenaConfig = { radius: 9, level: 3, goal: 3, lights: 4, calm: false };
const idle: ArenaInput = { move: { x: 0, z: 0 }, aim: null, fire: false, dash: false };
const DT = 1 / 60;

function run(state: ArenaState, seconds: number, input: ArenaInput = idle, cfg = config, seed = 1) {
  const random = seeded(seed);
  const events = [];
  for (let t = 0; t < seconds; t += DT) events.push(...stepArena(state, cfg, input, DT, random));
  return events;
}

/** Apunta a la Bruma y dispara un cuadro. */
function fireAtBruma(state: ArenaState) {
  return stepArena(
    state,
    config,
    { ...idle, aim: { x: state.bruma.x, z: state.bruma.z }, fire: true },
    DT,
    seeded(2),
  );
}

describe('núcleo de la arena', () => {
  it('el ritmo tranquilo hace los ataques más lentos y espaciados, y ayuda a apuntar', () => {
    const calm = tempo({ level: 3, calm: true });
    const normal = tempo({ level: 3, calm: false });
    expect(calm.speed).toBeLessThan(normal.speed);
    expect(calm.every).toBeGreaterThan(normal.every);
    expect(aimTolerance(true)).toBeGreaterThan(aimTolerance(false));
  });

  it('el explorador no sale de la plataforma', () => {
    const state = createArena(config);
    run(state, 4, { ...idle, move: { x: 1, z: 0 } });
    expect(Math.hypot(state.player.x, state.player.z)).toBeLessThanOrEqual(config.radius);
  });

  it('sin carga, la linterna no dispara; cada decisión correcta carga un disparo', () => {
    const state = createArena(config);
    expect(fireAtBruma(state)).toContainEqual({ type: 'sin-carga' });
    expect(state.bruma.hits).toBe(0);
    chargeArena(state);
    expect(fireAtBruma(state)).toContainEqual({ type: 'haz', hit: true });
    expect(state.bruma.hits).toBe(1);
    expect(state.charge).toBe(0);
  });

  it('un disparo que no apunta a la Bruma se pierde', () => {
    const state = createArena(config);
    chargeArena(state);
    const away = { x: -state.bruma.x * 5, z: -state.bruma.z * 5 };
    const events = stepArena(state, config, { ...idle, aim: away, fire: true }, DT, seeded(1));
    expect(events).toContainEqual({ type: 'haz', hit: false });
    expect(state.bruma.hits).toBe(0);
  });

  it('cambia de fase y se disipa al llegar a la meta', () => {
    const state = createArena(config);
    chargeArena(state, 3);
    const events = [...fireAtBruma(state), ...fireAtBruma(state), ...fireAtBruma(state)];
    expect(events).toContainEqual({ type: 'fase', phase: 2 });
    expect(events).toContainEqual({ type: 'victoria' });
    expect(state.outcome).toBe('victoria');
    expect(brumaDensity(state, config)).toBe(0);
  });

  it('una decisión equivocada fortalece a la Bruma', () => {
    const state = createArena(config);
    chargeArena(state);
    fireAtBruma(state);
    strengthenBruma(state);
    expect(state.bruma.hits).toBe(0.5);
    expect(state.attackIn).toBeLessThanOrEqual(0.4);
  });

  it('quedarse quieto bajo los ataques apaga las luces y obliga a retirarse', () => {
    const state = createArena({ ...config, level: 5 });
    const events = run(state, 60, idle, { ...config, level: 5 });
    expect(events.some((e) => e.type === 'ataque')).toBe(true);
    expect(events.filter((e) => e.type === 'herido').length).toBe(config.lights);
    expect(state.outcome).toBe('retirada');
  });

  it('esquivar da un instante de invulnerabilidad y tiene recarga', () => {
    const state = createArena(config);
    const first = stepArena(
      state,
      config,
      { ...idle, dash: true, move: { x: 1, z: 0 } },
      DT,
      seeded(1),
    );
    expect(first).toContainEqual({ type: 'esquiva' });
    const again = stepArena(
      state,
      config,
      { ...idle, dash: true, move: { x: 1, z: 0 } },
      DT,
      seeded(1),
    );
    expect(again).not.toContainEqual({ type: 'esquiva' });
    expect(state.player.dashing).toBeGreaterThan(0);
  });

  it('con la misma semilla, el combate se repite igual', () => {
    const a = createArena(config);
    const b = createArena(config);
    run(a, 10, { ...idle, move: { x: 0.5, z: -0.3 } }, config, 9);
    run(b, 10, { ...idle, move: { x: 0.5, z: -0.3 } }, config, 9);
    expect(a).toEqual(b);
  });
});
