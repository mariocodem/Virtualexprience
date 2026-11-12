import { describe, expect, it } from 'vitest';
import { world } from '@/data';
import { badgeDestination, badgeStatus, percent } from '@/passport/badgeDetails';
import { initialProgress, type Progress } from '@/progress/types';

const badge = (id: string) => {
  const found = world.badges.find((b) => b.id === id);
  if (!found) throw new Error(id);
  return found;
};

const withProgress = (patch: Partial<Progress>): Progress => ({ ...initialProgress(), ...patch });

describe('ficha de una insignia', () => {
  it('toda insignia dice cómo se sella y qué reconoce', () => {
    for (const b of world.badges) {
      expect(b.howTo.length, b.id).toBeGreaterThan(20);
      expect(b.meaning.length, b.id).toBeGreaterThan(20);
      expect(b.meaning, b.id).not.toMatch(/^Reconoce que/);
    }
  });

  it('una insignia sellada dice cuándo', () => {
    const progress = withProgress({ badges: { cartografo: '2026-10-20T10:00:00.000Z' } });
    expect(badgeStatus(badge('cartografo'), progress, world)).toEqual({
      earned: true,
      at: '2026-10-20T10:00:00.000Z',
    });
  });

  it('las de conteo muestran cuánto llevas', () => {
    const progress = withProgress({ visitedIslands: ['comunicarte', 'neuromath'] });
    expect(badgeStatus(badge('cartografo'), progress, world)).toEqual({
      earned: false,
      tally: { current: 2, target: 6 },
    });
  });

  it('las de un reto dicen si aún no lo jugaste o cuál es tu mejor marca', () => {
    expect(badgeStatus(badge('editor-riguroso'), initialProgress(), world)).toEqual({
      earned: false,
      note: 'Aún no has jugado Sala de Redacción.',
    });
    const played = withProgress({
      minigames: {
        'sala-de-redaccion': { accuracy: 0.6, criteria: 0.5, toolsUsed: 2, runs: 1 },
      },
    });
    expect(badgeStatus(badge('editor-riguroso'), played, world)).toEqual({
      earned: false,
      best: { value: 0.6, goal: 0.8 },
    });
    // Las pistas de verificación se cuentan: 2 de 4.
    expect(badgeStatus(badge('verificador'), played, world)).toEqual({
      earned: false,
      tally: { current: 2, target: 4 },
    });
  });

  it('el Gran Reto explica que se abre con los seis fragmentos', () => {
    const status = badgeStatus(
      badge('luz-del-archipielago'),
      withProgress({ fragments: ['comunicarte'] }),
      world,
    );
    expect(status).toMatchObject({ earned: false, tally: { current: 1, target: 6 } });
    const open = badgeStatus(
      badge('luz-del-archipielago'),
      withProgress({ fragments: world.islands.map((i) => i.id) }),
      world,
    );
    expect(open).toEqual({
      earned: false,
      note: 'El Gran Reto ya está abierto en el Faro Minuto.',
    });
  });

  it('cada insignia lleva a donde se gana', () => {
    expect(badgeDestination(badge('timonel'), world)).toEqual({
      to: '/mundo/gerencia',
      label: 'Zarpar a Gerencia+',
    });
    expect(badgeDestination(badge('verificador'), world)).toEqual({
      to: '/mundo/comunicarte?estacion=comunicarte-sala-redaccion',
      label: 'Ir a Sala de Redacción',
    });
    expect(badgeDestination(badge('guardian-del-faro'), world).to).toBe('/mundo?faro=1');
    expect(badgeDestination(badge('marea-constante'), world).to).toBe('/mundo');
    // Ninguna insignia queda sin destino real.
    for (const b of world.badges) expect(badgeDestination(b, world).to).toMatch(/^\/mundo/);
  });

  it('muestra las proporciones como porcentaje entero', () => {
    expect(percent(0.8)).toBe('80 %');
    expect(percent(0.666)).toBe('67 %');
  });
});
