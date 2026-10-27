import { useFrame } from '@react-three/fiber';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { BUILD } from '@/world/palette';
import type { ArenaProps } from '../types';
import {
  chargeArena,
  brumaDensity,
  createArena,
  stepArena,
  strengthenBruma,
  type ArenaConfig,
  type ArenaEvent,
  type ArenaState,
} from '../shared/arena/core';
import { Controls } from '../shared/controls';
import { GameStage } from '../shared/GameStage';
import { Banner, HudMeter, HudPanel, KeyHint, LightsHud } from '../shared/hud';
import { brumaTint } from '../shared/palette';
import { ArenaLights, ArenaCamera, PointerAim } from '../shared/scene/ArenaScenery';
import { Bruma3D } from '../shared/scene/Bruma3D';
import { Explorer } from '../shared/scene/Explorer';
import { DangerZones, FogOrbs, LightBeam } from '../shared/scene/Hazards';
import { ARENA_HELP, type ControlHelp } from '../shared/stage';
import {
  ABYSS,
  beamFromDeckEnd,
  deckSegments,
  keepOutOfAbyss,
  nearestTarget,
  relocate,
  onDeck,
  tileSpot,
  type Spot,
  type Target,
} from './abyss';
import { AbyssTerrain, BridgeDeck, BuildStation, CarriedTile, Tiles } from './AbyssScene';
import {
  makeChallenge,
  newBuild,
  placeCarried,
  resolveTest,
  startChallenge,
  startTest,
  takeBack,
  takeTile,
  tickBuild,
  type Build,
} from './buildFlow';
import { launch } from './debris';
import { DebrisField, type Falling } from './parts';
import { PUENTES } from './puentesData';

const FLOOR = -6.4;

const HELP: ControlHelp[] = [
  { keys: '1 a 5', action: 'Recoger la loseta de ese número' },
  {
    keys: 'E o Enter',
    action: 'Recoger, colocar en el estribo, quitar el último tramo o probar con la palanca',
  },
  ...ARENA_HELP.filter((h) => !h.keys.startsWith('E ')),
];

interface Near {
  kind: Target['kind'] | 'deck';
  id?: string;
}

/**
 * «Reconstruir el puente de luz»: la Bruma flota sobre un abismo. La
 * proyecta un hueco («¾ de 16 m», «25 % de 48 m»…) y el anillo ofrece
 * losetas con valores: se recogen, se tienden desde el estribo y se prueban
 * con la palanca. Si la suma es exacta el puente se enciende y, estando sobre
 * él, el haz alcanza a la Bruma; si no, cae y la Bruma se fortalece.
 */
export function PuenteDeLuz({
  island,
  content,
  level,
  goal,
  lights,
  tiers,
  calm,
  still,
  onBrujula,
  onDecision,
  onEnd,
  onAccessible,
}: ArenaProps) {
  const [controls] = useState(() => new Controls());
  const config = useMemo<ArenaConfig>(
    () => ({ radius: ABYSS.radius, level, goal, lights, calm }),
    [level, goal, lights, calm],
  );
  const [state] = useState<ArenaState>(() => createArena(config));
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState(() => ({ ...state.player, ...state.bruma, charge: state.charge }));
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const [build, setBuild] = useState<Build>(newBuild);
  const buildRef = useRef<Build>(build);
  const [near, setNear] = useState<Near | null>(null);
  const nearKey = useRef('');
  const debris = useRef<Falling[]>([]);
  const tally = useRef({ correct: 0, total: 0 });
  const ended = useRef(false);
  const deniedAt = useRef(0);
  const random = useRef(Math.random).current;
  const tint = brumaTint(island.id);

  const sync = () => {
    setHud({ ...state.player, ...state.bruma, charge: state.charge });
  };
  const shout = (text: string) => {
    setBanner({ text, at: performance.now() });
  };
  const commit = (next: Build) => {
    buildRef.current = next;
    setBuild(next);
  };
  const labelIn = (b: Build, id: string | null) =>
    id === null ? null : (b.challenge?.bridge.pieces.find((p) => p.id === id)?.label ?? null);
  const labelOf = (id: string | null) => labelIn(buildRef.current, id);

  const end = (outcome: 'victoria' | 'retirada') => {
    if (ended.current) return;
    ended.current = true;
    const { correct, total } = tally.current;
    onEnd({ outcome, accuracy: total === 0 ? 0 : correct / total, decisions: total });
  };

  const onEvents = (events: ArenaEvent[]) => {
    for (const event of events) {
      if (event.type === 'herido')
        setAnnounce(`La Bruma te alcanza. Te quedan ${String(event.lights)} luces.`);
      if (event.type === 'fase') {
        const lines = content.bruma.taunts[`phase${String(event.phase)}` as 'phase2' | 'phase3'];
        shout(lines[0] ?? `La Bruma cambia de forma: fase ${String(event.phase)}`);
        setAnnounce(`La Bruma cambia de forma: fase ${String(event.phase)} de 3.`);
      }
      if (event.type === 'haz')
        setAnnounce(event.hit ? 'Tu haz atraviesa la Bruma.' : 'El haz se pierde en la niebla.');
      if (event.type === 'victoria') end('victoria');
      if (event.type === 'retirada') end('retirada');
    }
    sync();
  };

  // Acciones del constructor: las usan E, los números y los botones.
  const act = {
    take: (id: string) => {
      const next = takeTile(buildRef.current, id);
      if (next === buildRef.current) return;
      commit(next);
      setAnnounce(
        `Llevas ${labelOf(id) ?? 'una loseta'}. Ve al estribo, al sur, y pulsa E para colocarla.`,
      );
    },
    place: () => {
      const b = buildRef.current;
      const next = placeCarried(b);
      if (next === b) {
        setAnnounce(
          b.carried === null
            ? 'No llevas ninguna loseta.'
            : 'No quedan apoyos libres: quita un tramo o prueba el puente.',
        );
        return;
      }
      commit(next);
      setAnnounce(
        `Colocada. Tramos: ${String(next.placed.length)} de ${String(next.challenge?.bridge.slots ?? 0)}.`,
      );
    },
    back: () => {
      const b = buildRef.current;
      const next = takeBack(b);
      if (next === b) {
        setAnnounce('Aún no hay tramos en el puente.');
        return;
      }
      commit(next);
      setAnnounce(`Quitaste el último tramo: ${labelIn(next, next.carried) ?? ''}.`);
    },
    test: () => {
      const b = buildRef.current;
      const next = startTest(b, still);
      if (next === b) {
        setAnnounce('Tiende al menos un tramo antes de probar.');
        return;
      }
      commit(next);
      setAnnounce('Probando el puente…');
    },
  };

  const spawnDebris = (b: Build) => {
    if (!b.challenge || still) {
      debris.current = [];
      return;
    }
    debris.current = deckSegments(b.challenge.bridge, b.placed).map((s) => ({
      body: launch(0, 0.1, (s.z0 + s.z1) / 2, random, { vy: 1.5, vx: (random() - 0.5) * 2 }),
      length: s.z0 - s.z1,
      width: ABYSS.deckHalf * 2,
      axis: 'z' as const,
      color: BUILD.wood,
    }));
  };

  const finishTest = () => {
    const resolved = resolveTest(buildRef.current, calm, still);
    if (!resolved) return;
    const { build: next, verdict } = resolved;
    const challenge = next.challenge;
    if (!challenge) return;
    const { bridge, tier } = challenge;
    if (verdict.kind === 'success') {
      chargeArena(state);
      tally.current.total += 1;
      tally.current.correct += 1;
      onDecision({ correct: true, tier, itemId: bridge.id });
      shout('¡Cuadró! Cruza el puente y dispara el haz');
      setAnnounce(
        `El puente mide justo ${bridge.gap} metros y se enciende. Sube al tablero, al norte del estribo, y pulsa Espacio para disparar.`,
      );
      onBrujula({ text: bridge.explanation, source: 'local' });
    } else {
      spawnDebris(buildRef.current);
      const reason =
        verdict.outcome === 'corto' ? 'Quedó corto' : 'Se pasó: no encaja entre las orillas';
      if (verdict.kind === 'fail') {
        strengthenBruma(state);
        tally.current.total += 1;
        onDecision({ correct: false, tier, itemId: bridge.id });
        shout('El puente cae: la Bruma se fortalece');
        setAnnounce(`${reason}. El puente cae y la Bruma se fortalece.`);
      } else {
        shout('El puente cede: te perdono esta, inténtalo otra vez');
        setAnnounce(`${reason}. Las losetas vuelven al anillo: inténtalo de nuevo.`);
      }
      onBrujula({ text: `${reason}. ${PUENTES.hints[bridge.concept]}`, source: 'local' });
    }
    commit(next);
    sync();
  };

  const spotsFor = (b: Build): Spot[] => {
    const pieces = b.challenge?.bridge.pieces ?? [];
    const tiles = pieces.flatMap((p, i): Spot[] =>
      b.placed.includes(p.id) || b.carried === p.id
        ? []
        : [{ target: { kind: 'tile', id: p.id }, ...tileSpot(i, pieces.length) }],
    );
    return [
      ...tiles,
      { target: { kind: 'abutment' }, x: ABYSS.abutment.x, z: ABYSS.abutment.z },
      { target: { kind: 'lever' }, x: ABYSS.lever.x, z: ABYSS.lever.z },
    ];
  };

  const interact = () => {
    const b = buildRef.current;
    if (b.phase !== 'building' || !b.challenge) return;
    const target = nearestTarget(state.player, spotsFor(b));
    if (!target) return;
    if (target.kind === 'tile') act.take(target.id);
    else if (target.kind === 'abutment') {
      if (b.carried !== null) act.place();
      else act.back();
    } else act.test();
  };

  const nearOf = (b: Build): Near | null => {
    if (b.phase !== 'building' || !b.challenge) return null;
    const target = nearestTarget(state.player, spotsFor(b));
    return target
      ? { kind: target.kind, id: target.kind === 'tile' ? target.id : undefined }
      : null;
  };

  const frame = (dt: number) => {
    if (state.outcome !== 'en-curso') return;
    const before = buildRef.current;
    const lit = before.phase === 'lit';
    if (controls.take('interact')) interact();

    const wantFire = controls.take('fire');
    const canFire = lit && onDeck(state.player) && state.charge >= 1;
    if (wantFire && !canFire && state.time - deniedAt.current > 1.2) {
      deniedAt.current = state.time;
      shout(
        state.charge < 1
          ? 'Sin carga: tiende un puente que mida justo'
          : 'Dispara desde el puente iluminado',
      );
    }
    const events = stepArena(
      state,
      config,
      {
        move: controls.move(),
        aim: canFire ? { x: state.bruma.x, z: state.bruma.z } : controls.aim,
        fire: canFire && wantFire,
        dash: controls.take('dash'),
      },
      dt,
      random,
    );
    if (events.some((e) => e.type === 'haz' && e.hit)) beamFromDeckEnd(state.beam);
    keepOutOfAbyss(state.player, buildRef.current.phase === 'lit');
    if (events.length > 0) onEvents(events);

    // Tiempo del constructor.
    const ticked = tickBuild(buildRef.current, dt, state.charge);
    const changed = ticked.build.phase !== buildRef.current.phase;
    if (before.phase === 'lit' && ticked.build.phase !== 'lit') {
      const p = state.player;
      if (Math.hypot(p.x, p.z) < ABYSS.hole + 0.8) {
        relocate(p, { x: ABYSS.abutment.x, z: ABYSS.abutment.z + 0.9 });
        setAnnounce('El puente se disuelve y vuelves al estribo.');
      }
    }
    if (changed) commit(ticked.build);
    else buildRef.current = ticked.build;
    if (ticked.event === 'next-due') {
      const tier = tiers[state.bruma.phase - 1] ?? 3;
      const challenge = makeChallenge(PUENTES.bridges, tier, buildRef.current.used, random);
      commit(startChallenge(buildRef.current, challenge, calm));
      onBrujula(null);
      setAnnounce(
        `La Bruma proyecta un hueco: ${challenge.gap.text}. Tienes ${String(challenge.bridge.slots)} apoyos y ${String(challenge.bridge.pieces.length)} losetas; pulsa un número para recoger una.`,
      );
    }
    if (ticked.event === 'test-done') finishTest();
    if (ticked.event === 'dissolved') onBrujula(null);

    const n: Near | null =
      nearOf(buildRef.current) ??
      (buildRef.current.phase === 'lit' && onDeck(state.player) ? { kind: 'deck' } : null);
    const key = n ? `${n.kind}:${n.id ?? ''}` : '';
    if (key !== nearKey.current) {
      nearKey.current = key;
      setNear(n);
    }
  };

  const onDigit = useEffectEvent((event: KeyboardEvent) => {
    if (paused || event.altKey || event.ctrlKey || event.metaKey) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.closest('[data-neuromath-arena]')) return;
    const piece = buildRef.current.challenge?.bridge.pieces[Number(event.key) - 1];
    if (!piece || !/^[1-9]$/.test(event.key)) return;
    event.preventDefault();
    act.take(piece.id);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onDigit(event);
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, []);

  const challenge = build.challenge;
  const density = brumaDensity(state, config);
  const lit = build.phase === 'lit';
  const building = build.phase === 'building';
  const nearTile = near?.kind === 'tile' ? (near.id ?? null) : null;
  const nearKind = near?.kind === 'abutment' || near?.kind === 'lever' ? near.kind : null;

  const hint = (() => {
    if (lit && hud.charge >= 1)
      return near?.kind === 'deck'
        ? { keys: 'Espacio', text: 'Dispara el haz: sale del extremo del puente' }
        : { keys: '↑', text: 'Sube al puente iluminado para disparar' };
    if (!building) return null;
    if (near?.kind === 'tile')
      return { keys: 'E', text: `Recoger «${labelIn(build, near.id ?? null) ?? ''}»` };
    if (near?.kind === 'abutment')
      return build.carried
        ? { keys: 'E', text: 'Colocar la loseta en el puente' }
        : build.placed.length > 0
          ? { keys: 'E', text: 'Quitar el último tramo' }
          : { keys: '1-5', text: 'Elige una loseta y vuelve aquí para tender el puente' };
    if (near?.kind === 'lever') return { keys: 'E', text: 'Probar el puente con la palanca' };
    return null;
  })();

  return (
    <div data-neuromath-arena="" className="contents">
      <GameStage
        label={`Arena de la ${content.bruma.name}: reconstruir el puente de luz`}
        controls={controls}
        paused={paused}
        onPause={setPaused}
        help={HELP}
        announce={announce}
        onAccessible={onAccessible}
        hud={
          <>
            <div className="absolute top-14 left-3 grid w-[min(16rem,50vw)] gap-2 sm:top-3">
              <HudPanel className="grid gap-2">
                <HudMeter
                  label={content.bruma.name}
                  value={density}
                  text={`Fase ${String(hud.phase)} de 3`}
                  tone="fog"
                />
                <HudMeter
                  label="Carga de la linterna"
                  value={Math.min(1, hud.charge)}
                  text={hud.charge >= 1 ? `${String(Math.floor(hud.charge))} disparo` : 'Sin carga'}
                />
                <LightsHud lights={hud.lights} max={lights} />
              </HudPanel>
            </div>
            {banner && <Banner text={banner.text} at={banner.at} />}
            <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
              {challenge && (building || build.phase === 'testing') && (
                <HudPanel className="pointer-events-auto w-full max-w-xl">
                  <p className="toponym text-[0.625rem] text-sea-100">
                    La Bruma proyecta un hueco · {String(challenge.bridge.slots)} apoyos
                  </p>
                  <p className="mt-0.5 font-display text-lg leading-tight font-extrabold text-land-sun">
                    {challenge.gap.text}
                    {calm && challenge.gap.kind !== 'metros' && (
                      <span className="ml-2 text-sm font-semibold text-plate">
                        (son {challenge.gap.meters})
                      </span>
                    )}
                  </p>
                  <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                    {challenge.bridge.pieces.map((piece, i) => {
                      const placedAt = build.placed.indexOf(piece.id);
                      const carrying = build.carried === piece.id;
                      return (
                        <li key={piece.id}>
                          <button
                            type="button"
                            aria-keyshortcuts={String(i + 1)}
                            aria-pressed={carrying}
                            disabled={!building || placedAt >= 0}
                            onClick={(event) => {
                              act.take(piece.id);
                              event.currentTarget
                                .closest<HTMLElement>('[role="application"]')
                                ?.focus();
                            }}
                            className="flex min-h-11 items-center gap-1.5 border-[1.5px] border-sea-100 px-2 py-1 text-left text-xs text-plate hover:border-land-sun disabled:opacity-45 aria-pressed:border-land-sun aria-pressed:bg-land-sun aria-pressed:text-ink"
                          >
                            <kbd className="grid size-5 shrink-0 place-items-center border-[1.5px] border-current font-display text-[0.6875rem] font-bold">
                              {i + 1}
                            </kbd>
                            {piece.label}
                            {placedAt >= 0 && (
                              <span className="text-[0.6875rem]">· tramo {placedAt + 1}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-1.5 text-xs text-sea-100" aria-live="off">
                    {build.placed.length} de {challenge.bridge.slots} tramos
                    {build.carried ? ` · llevas «${labelIn(build, build.carried) ?? ''}»` : ''}
                  </p>
                </HudPanel>
              )}
              {hint ? (
                <KeyHint keys={hint.keys}>{hint.text}</KeyHint>
              ) : (
                !challenge && (
                  <KeyHint keys="Mayús">Esquiva mientras la Bruma proyecta el hueco</KeyHint>
                )
              )}
            </div>
          </>
        }
      >
        <ArenaLights />
        <AbyssTerrain still={still} />
        {challenge && (
          <>
            <Tiles
              bridge={challenge.bridge}
              placed={build.placed}
              carried={build.carried}
              near={nearTile}
            />
            <BridgeDeck bridge={challenge.bridge} placed={build.placed} buildRef={buildRef} />
          </>
        )}
        <BuildStation buildRef={buildRef} nearKind={nearKind} />
        <DebrisField items={debris} floor={FLOOR} />
        <Director onFrame={frame} />
        <Explorer
          get={() => {
            const { player } = state;
            const aim = controls.aim;
            return {
              x: player.x,
              z: player.z,
              facing: aim ? Math.atan2(aim.z - player.z, aim.x - player.x) : player.facing,
              moving: player.moving,
              hurt: player.shield,
              y: buildRef.current.phase === 'lit' && onDeck(player) ? 0.2 : 0,
            };
          }}
          glow={() => Math.min(1, state.charge / 2)}
          still={still}
        />
        <CarriedTile state={state} buildRef={buildRef} label={labelIn(build, build.carried)} />
        <Bruma3D
          get={() => ({
            x: state.bruma.x,
            z: state.bruma.z,
            density: brumaDensity(state, config),
            stagger: state.bruma.stagger,
            y: 1.4,
          })}
          tint={tint}
          look={() => state.player}
          still={still}
        />
        <FogOrbs get={() => state.orbs} tint={tint} />
        <DangerZones get={() => state.zones} />
        <LightBeam get={() => state.beam} />
        <ArenaCamera follow={() => state.player} still={still} />
        <PointerAim controls={controls} />
      </GameStage>
    </div>
  );
}

/** Pone el reloj del juego: avanza el combate y el constructor en cada cuadro. */
function Director({ onFrame }: { onFrame: (dt: number) => void }) {
  useFrame((_, dt) => {
    onFrame(Math.min(0.05, dt));
  });
  return null;
}
