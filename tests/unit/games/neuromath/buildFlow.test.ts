import { describe, expect, it } from 'vitest';
import { seeded } from '@/boss/engine';
import {
  builtSpan,
  makeChallenge,
  newBuild,
  pickBridge,
  placeCarried,
  resolveTest,
  startChallenge,
  startTest,
  takeBack,
  takeTile,
  tickBuild,
  TIMES,
  type Build,
} from '@/games/neuromath/buildFlow';
import { PUENTES } from '@/games/neuromath/puentesData';

const bridges = PUENTES.bridges;
const found = bridges.find((b) => b.id === 'rocas-gemelas');
if (!found) throw new Error('Falta el puente de prueba.');
const bridge = found;

function building(calm = false): Build {
  const challenge = makeChallenge([bridge], 1, [], seeded(1));
  return startChallenge(newBuild(), challenge, calm);
}

describe('flujo de construcción de la arena', () => {
  it('elige un puente de la sutileza pedida sin repetir mientras queden', () => {
    const random = seeded(3);
    const first = pickBridge(bridges, 2, [], random);
    expect(first.tier).toBe(2);
    const used = bridges.filter((b) => b.tier === 2).map((b) => b.id);
    const next = pickBridge(bridges, 2, used.slice(0, 1), random);
    expect(next.id).not.toBe(used[0]);
    // Agotados todos los puentes, vuelve a empezar en vez de fallar.
    expect(
      pickBridge(
        bridges,
        1,
        bridges.map((b) => b.id),
        random,
      ),
    ).toBeDefined();
  });

  it('empieza esperando y tras el hueco proyecta un reto con las losetas en el anillo', () => {
    const idle = newBuild();
    expect(idle.phase).toBe('waiting');
    const { build, event } = tickBuild(idle, TIMES.first + 0.1, 0);
    expect(event).toBe('next-due');
    expect(build.phase).toBe('waiting');
    const b = building();
    expect(b.phase).toBe('building');
    expect(b.placed).toEqual([]);
    expect(b.challenge?.gap.meters).toBe('12 m');
  });

  it('recoger, colocar y devolver una loseta respeta los apoyos', () => {
    let b = building();
    b = takeTile(b, 'a');
    expect(b.carried).toBe('a');
    b = takeTile(b, 'b'); // cambiar la que llevas
    expect(b.carried).toBe('b');
    b = placeCarried(b);
    expect(b.placed).toEqual(['b']);
    expect(b.carried).toBeNull();
    b = placeCarried(takeTile(b, 'a'));
    expect(b.placed).toEqual(['b', 'a']);
    // Sin apoyos libres no entra otra.
    const full = placeCarried(takeTile(b, 'c'));
    expect(full.placed).toEqual(['b', 'a']);
    expect(full.carried).toBe('c');
    // Quitar el último solo si las manos están libres.
    expect(takeBack(full)).toBe(full);
    const back = takeBack(placeCarried({ ...full, carried: null }));
    expect(back.carried).toBe('a');
    expect(back.placed).toEqual(['b']);
  });

  it('no deja recoger una loseta ya puesta ni una que no existe', () => {
    let b = placeCarried(takeTile(building(), 'a'));
    expect(takeTile(b, 'a')).toBe(b);
    expect(takeTile(b, 'zzz')).toBe(b);
    b = { ...b, phase: 'testing' };
    expect(takeTile(b, 'b')).toBe(b);
  });

  it('mide con el mismo motor del reto: ½ de 14 m + ⅓ de 15 m cubren 12 m', () => {
    let b = building();
    for (const id of ['a', 'b']) b = placeCarried(takeTile(b, id));
    expect(builtSpan(b)).toBe(12);
    const test = startTest(b, false);
    expect(test.phase).toBe('testing');
    expect(test.outcome).toBe('resiste');
    const done = resolveTest(test, false, false);
    expect(done?.verdict.kind).toBe('success');
    expect(done?.build.phase).toBe('lit');
  });

  it('un puente corto o pasado cae y la Bruma se fortalece; el ritmo tranquilo perdona la primera', () => {
    const wrong = (b: Build) => placeCarried(takeTile(placeCarried(takeTile(b, 'a')), 'd'));
    const short = startTest(placeCarried(takeTile(building(), 'b')), false);
    expect(short.outcome).toBe('corto');
    expect(resolveTest(short, false, false)?.verdict.kind).toBe('fail');
    const long = startTest(wrong(building()), false);
    expect(long.outcome).toBe('largo');
    const fallen = resolveTest(long, false, false);
    expect(fallen?.build.phase).toBe('fallen');

    const calm = resolveTest(startTest(wrong(building(true)), false), true, false);
    expect(calm?.verdict.kind).toBe('retry');
    expect(calm?.build.phase).toBe('building');
    expect(calm?.build.placed).toEqual([]);
    expect(calm?.build.retries).toBe(0);
    // Segundo fallo: ya no se perdona.
    const again = wrong(calm?.build ?? newBuild());
    expect(resolveTest(startTest(again, false), true, false)?.verdict.kind).toBe('fail');
  });

  it('no se prueba un puente vacío ni fuera de la fase de construcción', () => {
    const b = building();
    expect(startTest(b, false)).toBe(b);
    expect(resolveTest(b, false, false)).toBeNull();
  });

  it('el temporizador lleva de la prueba al veredicto, y el puente iluminado se disuelve sin carga', () => {
    let b = placeCarried(takeTile(building(), 'a'));
    b = placeCarried(takeTile(b, 'b'));
    b = startTest(b, false);
    const mid = tickBuild(b, TIMES.test / 2, 0);
    expect(mid.event).toBeNull();
    const end = tickBuild(mid.build, TIMES.test, 0);
    expect(end.event).toBe('test-done');
    const lit = resolveTest(end.build, false, false)?.build ?? newBuild();
    expect(lit.phase).toBe('lit');
    // Con carga sigue iluminado; sin ella, empieza a disolverse.
    expect(tickBuild(lit, 1, 1).build.phase).toBe('lit');
    const dissolving = tickBuild(lit, 1, 0).build;
    expect(dissolving.phase).toBe('dissolving');
    const next = tickBuild(dissolving, TIMES.dissolve + 0.1, 0);
    expect(next.event).toBe('dissolved');
    expect(next.build.phase).toBe('waiting');
    expect(next.build.challenge).toBeNull();
  });

  it('un puente caído deja pasar el tiempo y vuelve a la espera', () => {
    const short = startTest(placeCarried(takeTile(building(), 'b')), true);
    const fallen = resolveTest(short, false, true)?.build ?? newBuild();
    expect(fallen.phase).toBe('fallen');
    const next = tickBuild(fallen, 1, 0);
    expect(next.build.phase).toBe('waiting');
  });
});
