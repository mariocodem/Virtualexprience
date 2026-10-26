import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { createArena, type ArenaConfig } from '@/games/shared/arena/core';
import {
  canListen,
  createPlaza,
  listen,
  litCount,
  plazaMood,
  reachFor,
  resolve,
  stepPlaza,
  summon,
  whereIs,
  type PlazaConfig,
} from '@/games/voxcivitas/arena/plaza';
import { giveUpLine, speakerLabel } from '@/games/voxcivitas/plazaData';
import { audienceLayout, backdropLayout, raisedCount } from '@/games/voxcivitas/scene/layout';

const arenaConfig: ArenaConfig = { radius: 9, level: 3, goal: 3, lights: 5, calm: false };
const config: PlazaConfig = { radius: 9, level: 3, calm: false, groups: 4 };

describe('la plaza de la arena', () => {
  it('reparte 23 vecinos en corrillos por grupo, todos con su color', () => {
    const plaza = createPlaza(config);
    expect(plaza.neighbors).toHaveLength(23);
    expect(new Set(plaza.neighbors.map((n) => n.group)).size).toBe(4);
    expect(plaza.neighbors.every((n) => n.warmth === 1 && n.mood === 'atento')).toBe(true);
  });

  it('llama a alguien tras el primer silencio y espera a que lo escuchen', () => {
    const plaza = createPlaza(config);
    const arena = createArena(arenaConfig);
    const events = [];
    for (let i = 0; i < 80; i++) events.push(...stepPlaza(plaza, arena, config, 0.05));
    expect(events.some((e) => e.type === 'turno')).toBe(true);
  });

  it('quien alza la voz es del grupo pedido y lejos del explorador', () => {
    const plaza = createPlaza(config);
    const arena = createArena(arenaConfig);
    const index = summon(plaza, config, 2, arena.player, seeded(5));
    expect(index).not.toBeNull();
    const n = plaza.neighbors[index ?? 0];
    expect(n?.group).toBe(2);
    expect(n?.mood).toBe('alza-la-voz');
    expect(plaza.speaker).toBe(index);
  });

  it('si nadie llega a tiempo se rinde y se apaga', () => {
    const plaza = createPlaza(config);
    const arena = createArena(arenaConfig);
    const index = summon(plaza, config, null, arena.player, seeded(2)) ?? -1;
    let gave = false;
    for (let i = 0; i < 700 && !gave; i++)
      gave = stepPlaza(plaza, arena, config, 0.05).some((e) => e.type === 'se-rinde');
    expect(gave).toBe(true);
    expect(plaza.neighbors[index]?.mood).toBe('apagado');
    expect(plaza.neighbors[index]?.warmth).toBe(0);
  });

  it('escuchar detiene la paciencia y solo se puede cerca', () => {
    const plaza = createPlaza(config);
    const arena = createArena(arenaConfig);
    const index = summon(plaza, config, null, arena.player, seeded(2)) ?? 0;
    const n = plaza.neighbors[index];
    if (!n) throw new Error('sin vecino');
    expect(canListen(plaza, arena.player)).toBe(false);
    arena.player.x = n.x + 1;
    arena.player.z = n.z;
    expect(canListen(plaza, arena.player)).toBe(true);
    expect(reachFor(true)).toBeGreaterThan(reachFor(false));
    listen(plaza);
    expect(n.mood).toBe('escuchando');
    const before = plaza.patience;
    stepPlaza(plaza, arena, config, 1);
    expect(plaza.patience).toBe(before);
  });

  it('una buena intervención enciende el farol y manda una estela; una mala apaga', () => {
    const plaza = createPlaza(config);
    const arena = createArena(arenaConfig);
    const first = summon(plaza, config, null, arena.player, seeded(4)) ?? 0;
    listen(plaza);
    resolve(plaza, config, 'enciende');
    expect(plaza.neighbors[first]?.mood).toBe('farol');
    expect(plaza.trails).toHaveLength(1);
    expect(litCount(plaza)).toBe(1);
    const second = summon(plaza, config, null, arena.player, seeded(9)) ?? 0;
    listen(plaza);
    const mood = plazaMood(plaza);
    resolve(plaza, config, 'apaga');
    expect(plaza.neighbors[second]?.mood).toBe('apagado');
    expect(plazaMood(plaza)).toBeLessThan(mood);
  });

  it('el ritmo tranquilo da más paciencia', () => {
    const calm = createPlaza({ ...config, calm: true });
    const arena = createArena({ ...arenaConfig, calm: true });
    summon(calm, { ...config, calm: true }, null, arena.player, seeded(1));
    const normal = createPlaza(config);
    summon(normal, config, null, arena.player, seeded(1));
    expect(calm.patience).toBeGreaterThan(normal.patience);
  });

  it('describe dónde queda alguien y nombra a quien habla', () => {
    expect(whereIs({ x: 0, z: 0 })).toBe('en el centro de la plaza');
    expect(whereIs({ x: -5, z: -5 })).toBe('al fondo a la izquierda de la plaza');
    expect(speakerLabel('pescadores', 3)).toBe('Una pescadora');
    expect(speakerLabel(null, 6)).toBe('Una vecina');
    expect(giveUpLine('Una pescadora', 0)).toContain('una pescadora');
    expect(giveUpLine('Una pescadora', 1).startsWith('Una pescadora')).toBe(true);
  });
});

describe('la escenografía', () => {
  it('el público queda al fondo y es determinista', () => {
    const crowd = audienceLayout(26);
    expect(crowd).toHaveLength(26);
    expect(crowd.every((p) => p.z < 0)).toBe(true);
    expect(audienceLayout(26)).toEqual(crowd);
  });

  it('los faroles alzados siguen al respaldo', () => {
    expect(raisedCount(26, 0)).toBe(0);
    expect(raisedCount(26, 0.5)).toBe(13);
    expect(raisedCount(26, 1)).toBe(26);
    expect(raisedCount(26, 2)).toBe(26);
  });

  it('el cabildo queda al fondo y el frente libre', () => {
    const items = backdropLayout(10);
    const hall = items.find((i) => i.kind === 'cabildo');
    expect(hall?.z).toBeLessThan(-9);
    expect(items.filter((i) => i.z > 6)).toHaveLength(0);
  });
});
