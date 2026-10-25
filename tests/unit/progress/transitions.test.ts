import { describe, expect, it } from 'vitest';
import { world } from '@/data';
import * as t from '@/progress/transitions';
import { initialProgress } from '@/progress/types';
import { completeAll, DAY_1, DAY_2, DAY_3, ECOS_PATH, worldPreparing } from './helpers';

describe('completar estaciones', () => {
  it('la primera vez otorga la XP de la estación, registra la bitácora y la insignia de Primer zarpe', () => {
    const { progress, events } = t.completeStation(
      initialProgress(),
      world,
      'comunicarte-imprenta',
      0.9,
      DAY_1,
    );
    expect(progress.xp).toBe(30);
    expect(progress.stations['comunicarte-imprenta']).toMatchObject({
      attempts: 1,
      bestScore: 0.9,
    });
    expect(events).toEqual([
      { type: 'station-completed', stationId: 'comunicarte-imprenta' },
      { type: 'xp', amount: 30 },
      { type: 'badge', badgeId: 'primer-zarpe' },
    ]);
    expect(progress.journal.map((e) => e.kind)).toEqual(['estacion-completada', 'insignia']);
  });

  it('repetir una estación mejora el resultado pero no duplica la XP', () => {
    const once = t.completeStation(
      initialProgress(),
      world,
      'comunicarte-imprenta',
      0.5,
      DAY_1,
    ).progress;
    const { progress, events } = t.completeStation(once, world, 'comunicarte-imprenta', 0.8, DAY_1);
    expect(progress.xp).toBe(30);
    expect(progress.stations['comunicarte-imprenta']).toMatchObject({
      attempts: 2,
      bestScore: 0.8,
    });
    expect(events).toEqual([]);
  });

  it('no permite completar una estación bloqueada ni una en preparación', () => {
    const start = initialProgress();
    expect(t.completeStation(start, world, 'comunicarte-titulares', 1, DAY_1).progress).toBe(start);
    const preparing = worldPreparing(['neuromath-patrones']);
    expect(t.completeStation(start, preparing, 'neuromath-patrones', 1, DAY_1).progress).toBe(
      start,
    );
  });

  it('el desafío entrega el fragmento de la isla y las insignias de competencia', () => {
    const before = completeAll(ECOS_PATH.slice(0, -1));
    const { progress, events } = t.completeStation(before, world, 'comunicarte-cierre', 1, DAY_1);
    expect(progress.fragments).toEqual(['comunicarte']);
    expect(events).toContainEqual({ type: 'fragment', islandId: 'comunicarte' });
    expect(events).toContainEqual({ type: 'badge', badgeId: 'voz-con-proposito' });
    expect(events).toContainEqual({ type: 'badge', badgeId: 'primer-fragmento' });
  });

  it('completar toda la isla sube de Grumete a Navegante y luego a Cartógrafo', () => {
    let progress = initialProgress();
    const levelUps: string[] = [];
    for (const id of ECOS_PATH) {
      const result = t.completeStation(progress, world, id, 1, DAY_1);
      progress = result.progress;
      for (const e of result.events) if (e.type === 'level-up') levelUps.push(e.levelId);
    }
    expect(progress.xp).toBe(340);
    expect(levelUps).toEqual(['navegante', 'cartografo']);
  });

  it('no altera el estado anterior (transiciones puras)', () => {
    const start = initialProgress();
    const snapshot = structuredClone(start);
    t.completeStation(start, world, 'comunicarte-imprenta', 1, DAY_1);
    expect(start).toEqual(snapshot);
  });
});

describe('exploración, formatos y constancia', () => {
  it('visitar las seis islas otorga Cartógrafo una sola vez', () => {
    let progress = initialProgress();
    const earned: string[] = [];
    for (const island of [...world.islands, ...world.islands]) {
      const result = t.visitIsland(progress, world, island.id, DAY_1);
      progress = result.progress;
      for (const e of result.events) if (e.type === 'badge') earned.push(e.badgeId);
    }
    expect(progress.visitedIslands).toHaveLength(6);
    expect(earned).toEqual(['cartografo']);
  });

  it('probar otro formato otorga Otra mirada; los cinco, Cinco sentidos', () => {
    let progress = initialProgress();
    progress = t.recordFormat(progress, world, 'texto', DAY_1).progress;
    expect(progress.badges).not.toHaveProperty('otra-mirada');
    progress = t.recordFormat(progress, world, 'audio', DAY_1).progress;
    expect(progress.badges).toHaveProperty('otra-mirada');
    for (const f of ['video', 'infografia', 'interactivo'] as const) {
      progress = t.recordFormat(progress, world, f, DAY_1).progress;
    }
    expect(progress.badges).toHaveProperty('cinco-sentidos');
    expect(t.recordFormat(progress, world, 'texto', DAY_1).progress).toBe(progress);
  });

  it('cuenta días activos distintos y otorga Marea constante al tercero', () => {
    let progress = initialProgress();
    for (const day of [DAY_1, DAY_1, DAY_2, DAY_3]) {
      progress = t.visitIsland(progress, world, 'comunicarte', day).progress;
    }
    expect(progress.activeDays).toEqual(['2026-10-17', '2026-10-18', '2026-10-20']);
    expect(progress.badges).toHaveProperty('marea-constante');
  });

  it('tres reflexiones otorgan Bitácora viva', () => {
    let progress = initialProgress();
    for (let i = 0; i < 3; i++) {
      progress = t.recordReflection(progress, world, 'comunicarte-bitacora-editor', DAY_1).progress;
    }
    expect(progress.reflections).toBe(3);
    expect(progress.badges).toHaveProperty('bitacora-viva');
  });
});

describe('minijuegos y dominio', () => {
  it('guarda el mejor resultado por métrica y otorga Editor riguroso y Verificador', () => {
    let progress = initialProgress();
    progress = t.recordMinigame(
      progress,
      world,
      'sala-de-redaccion',
      { accuracy: 0.6, criteria: 0.9, toolsUsed: 4 },
      DAY_1,
    ).progress;
    progress = t.recordMinigame(
      progress,
      world,
      'sala-de-redaccion',
      { accuracy: 0.85, criteria: 0.5, toolsUsed: 2 },
      DAY_1,
    ).progress;
    expect(progress.minigames['sala-de-redaccion']).toEqual({
      accuracy: 0.85,
      criteria: 0.9,
      toolsUsed: 4,
      runs: 2,
    });
    expect(progress.badges).toHaveProperty('editor-riguroso');
    expect(progress.badges).toHaveProperty('verificador');
  });

  it('acota el dominio entre 0 y 1', () => {
    expect(
      t.setMastery(initialProgress(), world, 'comunicarte', 1.4, DAY_1).progress.mastery
        .comunicarte,
    ).toBe(1);
    expect(
      t.setMastery(initialProgress(), world, 'comunicarte', Number.NaN, DAY_1).progress.mastery
        .comunicarte,
    ).toBe(0);
  });

  it('un intento fallido cuenta para el motor adaptativo sin completar la estación', () => {
    const { progress } = t.recordAttempt(
      initialProgress(),
      world,
      'comunicarte-imprenta',
      0.3,
      DAY_1,
    );
    expect(progress.stations['comunicarte-imprenta']).toMatchObject({
      attempts: 1,
      bestScore: 0.3,
    });
    expect(progress.stations['comunicarte-imprenta']?.completedAt).toBeUndefined();
    expect(progress.xp).toBe(0);
  });
});

describe('Gran Reto Integrador', () => {
  const allLit = { ...initialProgress(), fragments: world.islands.map((i) => i.id) };

  it('solo cuenta con los seis fragmentos de luz', () => {
    const progress = { ...initialProgress(), fragments: ['comunicarte' as const] };
    expect(t.recordFinale(progress, world, 1, true, DAY_1).progress).toBe(progress);
  });

  it('la primera victoria da su XP, queda en la bitácora y otorga Luz del archipiélago', () => {
    const { progress, events } = t.recordFinale(allLit, world, 0.9, true, DAY_1);
    expect(progress.finale).toMatchObject({ attempts: 1, bestScore: 0.9 });
    expect(progress.finale?.completedAt).toBeDefined();
    expect(progress.xp).toBe(t.FINALE_XP);
    expect(events).toContainEqual({ type: 'finale' });
    expect(events).toContainEqual({ type: 'badge', badgeId: 'luz-del-archipielago' });
    expect(progress.journal.map((e) => e.kind)).toContain('gran-reto');
  });

  it('una retirada cuenta como intento; repetir la victoria no duplica la XP', () => {
    const lost = t.recordFinale(allLit, world, 0.4, false, DAY_1).progress;
    expect(lost.finale).toEqual({ attempts: 1, bestScore: 0.4 });
    expect(lost.xp).toBe(0);
    const won = t.recordFinale(lost, world, 0.8, true, DAY_2).progress;
    const again = t.recordFinale(won, world, 1, true, DAY_3);
    expect(again.progress.xp).toBe(t.FINALE_XP);
    expect(again.progress.finale).toMatchObject({ attempts: 3, bestScore: 1 });
    expect(again.events).not.toContainEqual({ type: 'finale' });
  });
});
