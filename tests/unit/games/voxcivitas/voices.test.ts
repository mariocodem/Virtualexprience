import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import { bossContentSchema, cabildoContentSchema } from '@/data/contentSchemas';
import rawCabildo from '@/data/content/voxcivitas-cabildo.json';
import rawCierre from '@/data/content/voxcivitas-cierre.json';
import { judge, pickVoice, voicesFrom, type Voice } from '@/games/voxcivitas/arena/voices';
import { PLAZA, plazaDataSchema, shortName } from '@/games/voxcivitas/plazaData';

const cabildo = cabildoContentSchema.parse(rawCabildo);
const boss = bossContentSchema.parse(rawCierre);

describe('voces de la plaza', () => {
  const pool = voicesFrom(boss, cabildo);
  const voice = (key: string): Voice => {
    const found = pool.find((v) => v.key === key);
    if (!found) throw new Error(`Sin voz ${key}`);
    return found;
  };

  it('reúne las rondas del cabildo y los embates de la Bruma, sin claves repetidas', () => {
    expect(pool).toHaveLength(cabildo.rounds.length + boss.items.length);
    expect(new Set(pool.map((v) => v.key)).size).toBe(pool.length);
    const round = pool.find((v) => v.source === 'cabildo');
    expect(round?.group).toBe(cabildo.rounds[0]?.speaker);
    expect(round?.options.every((o) => o.move !== null && o.lesson.length > 0)).toBe(true);
  });

  it('sin el cabildo, la plaza se arma solo con los embates', () => {
    const only = voicesFrom(boss, null);
    expect(only.every((v) => v.source === 'bruma' && v.group === null)).toBe(true);
  });

  it('solo la intervención sólida enciende el farol', () => {
    const round = voice('cabildo:mercado');
    expect(judge(round, 'a')).toMatchObject({ reply: 'enciende', correct: true });
    expect(judge(round, 'c')).toMatchObject({ reply: 'a-medias', correct: false });
    expect(judge(round, 'b')).toMatchObject({ reply: 'apaga', correct: false });
    expect(judge(round, 'zz')).toBeNull();
    const item = voice('bruma:voz-2');
    expect(judge(item, 'a')?.reply).toBe('enciende');
    expect(judge(item, 'b')?.reply).toBe('apaga');
  });

  it('elige voces de la sutileza de la fase, sin repetir y alternando las fuentes', () => {
    const random = seeded(3);
    const used: string[] = [];
    let last: Voice['source'] | null = null;
    for (let i = 0; i < 6; i++) {
      const voice = pickVoice(pool, 2, used, last, random);
      expect(used).not.toContain(voice.key);
      expect(Math.abs(voice.tier - 2)).toBeLessThanOrEqual(1);
      if (last) expect(voice.source).not.toBe(last);
      used.push(voice.key);
      last = voice.source;
    }
  });

  it('cuando se agotan, vuelve a empezar en vez de quedarse sin voces', () => {
    const used = pool.map((v) => v.key);
    expect(() => pickVoice(pool, 3, used, null, seeded(1))).not.toThrow();
  });
});

describe('datos propios de la plaza', () => {
  it('nombran a cada grupo del cabildo y validan con Zod', () => {
    expect(plazaDataSchema.safeParse(PLAZA).success).toBe(true);
    for (const f of cabildo.factions) expect(PLAZA.groups[f.id]).toBeDefined();
    expect(shortName('pescadores', 'Asociación de pescadores')).toBe('Pescadores');
    expect(shortName('otro', 'Grupo nuevo')).toBe('Grupo nuevo');
  });
});
