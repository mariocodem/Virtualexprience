import { useFrame } from '@react-three/fiber';
import { useCallback, useMemo, useRef, useState } from 'react';
import cabildoRaw from '@/data/content/voxcivitas-cabildo.json';
import { cabildoContentSchema } from '@/data/contentSchemas';
import { Controls } from '@/games/shared/controls';
import {
  chargeArena,
  createArena,
  strengthenBruma,
  type ArenaConfig,
  type ArenaEvent,
  type ArenaState,
} from '@/games/shared/arena/core';
import { GameStage } from '@/games/shared/GameStage';
import { Banner, HudMeter, HudPanel, KeyHint, LightsHud } from '@/games/shared/hud';
import { brumaTint } from '@/games/shared/palette';
import { ArenaLights, ArenaPlatform } from '@/games/shared/scene/ArenaScenery';
import { ArenaRig } from '@/games/shared/scene/ArenaRig';
import { STAGE_BUTTON, type ControlHelp } from '@/games/shared/stage';
import type { ArenaProps } from '@/games/types';
import { BUILD, ISLE } from '@/world/palette';
import { Wheel, type WheelFeedback } from '../hud/Wheel';
import { groupInk } from '../palette';
import { giveUpLine, speakerLabel } from '../plazaData';
import { PlazaBackdrop } from '../scene/Backdrop';
import { Crowd } from '../scene/Crowd';
import type { CrowdPose } from '../scene/crowdPose';
import { LightTrails, VoiceMarker } from '../scene/Markers';
import {
  canListen,
  createPlaza,
  listen,
  litCount,
  plazaMood,
  plazaTiming,
  reachFor,
  resolve,
  stepPlaza,
  summon,
  whereIs,
  type PlazaConfig,
  type PlazaState,
} from './plaza';
import { judge, pickVoice, QUALITY_TEXT, voicesFrom, type Source, type Voice } from './voices';

const CABILDO = cabildoContentSchema.parse(cabildoRaw);
const RADIUS = 9;

const HELP: ControlHelp[] = [
  { keys: 'WASD o flechas', action: 'Moverte por la plaza' },
  { keys: 'E o Enter', action: 'Escuchar a quien alza la voz (cerca de él)' },
  { keys: '1 a 3', action: 'Elegir tu intervención' },
  { keys: 'Ratón', action: 'Apuntar la linterna' },
  { keys: 'Espacio o clic', action: 'Disparar el haz (necesita carga)' },
  { keys: 'Mayús', action: 'Esquivar la niebla' },
  { keys: 'Esc o P', action: 'Pausa' },
];

interface Call {
  label: string;
  where: string;
  patience: number;
  near: boolean;
}

interface Open {
  voice: Voice;
  label: string;
  feedback: WheelFeedback | null;
}

const REPLY_NOTE = {
  enciende: 'Se sintió escuchado: enciende su farol y su luz viaja a tu linterna.',
  'a-medias': 'Se queda a medias: no se apaga, pero tampoco enciende su farol.',
  apaga: 'Se apaga del todo y la Bruma se fortalece.',
} as const;

/**
 * Arena «Moderar la plaza»: la Bruma de la indiferencia apaga a los vecinos.
 * Quien alza la voz espera a que alguien llegue a escucharlo; con una buena
 * intervención deliberativa enciende su farol y su luz carga la linterna, y con
 * una falacia o una imposición se apaga y la Bruma se hace fuerte.
 */
export function PlazaArena({
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
    () => ({ radius: RADIUS, level, goal, lights, calm }),
    [level, goal, lights, calm],
  );
  const plazaConfig = useMemo<PlazaConfig>(
    () => ({ radius: RADIUS, level, calm, groups: CABILDO.factions.length }),
    [level, calm],
  );
  const [state] = useState<ArenaState>(() => createArena(config));
  const [plaza] = useState<PlazaState>(() => createPlaza(plazaConfig));
  const pool = useMemo(() => voicesFrom(content, CABILDO), [content]);
  const timing = plazaTiming(level, calm);
  const reach = reachFor(calm);

  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState(() => ({
    ...state.bruma,
    charge: state.charge,
    lights: state.player.lights,
  }));
  const [view, setView] = useState({ mood: 1, lit: 0 });
  const [call, setCall] = useState<Call | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const pending = useRef<{ voice: Voice; index: number; label: string } | null>(null);
  const used = useRef<string[]>([]);
  const last = useRef<Source | null>(null);
  const tally = useRef({ correct: 0, total: 0 });
  const ended = useRef(false);
  const random = useRef(Math.random).current;
  const tint = brumaTint(island.id);

  const sync = useCallback(() => {
    setHud({ ...state.bruma, charge: state.charge, lights: state.player.lights });
  }, [state]);
  const shout = (text: string) => {
    setBanner({ text, at: performance.now() });
  };

  const end = (outcome: 'victoria' | 'retirada') => {
    if (ended.current) return;
    ended.current = true;
    const { correct, total } = tally.current;
    onEnd({ outcome, accuracy: total === 0 ? 0 : correct / total, decisions: total });
  };

  const onEvents = (events: ArenaEvent[]) => {
    for (const event of events) {
      if (event.type === 'herido')
        setAnnounce(`La niebla te alcanza. Te quedan ${String(event.lights)} luces.`);
      if (event.type === 'fase') shout(`La Bruma cambia de forma: fase ${String(event.phase)}`);
      if (event.type === 'haz')
        setAnnounce(event.hit ? 'Tu haz atraviesa la Bruma.' : 'El haz se pierde en la niebla.');
      if (event.type === 'sin-carga') shout('Sin carga: escucha a quien alza la voz');
      if (event.type === 'victoria') end('victoria');
      if (event.type === 'retirada') end('retirada');
    }
    sync();
  };

  const callOut = () => {
    const tier = tiers[state.bruma.phase - 1] ?? 3;
    const voice = pickVoice(pool, tier, used.current, last.current, random);
    const group = voice.group ? CABILDO.factions.findIndex((f) => f.id === voice.group) : -1;
    const index = summon(plaza, plazaConfig, group >= 0 ? group : null, state.player, random);
    if (index === null) return;
    used.current.push(voice.key);
    last.current = voice.source;
    const neighbor = plaza.neighbors[index];
    if (!neighbor) return;
    const label = speakerLabel(voice.group, index);
    pending.current = { voice, index, label };
    setAnnounce(`${label} alza la voz ${whereIs(neighbor)}. Acércate y pulsa E para escucharlo.`);
  };

  const giveUp = (index: number) => {
    const who = pending.current?.label ?? 'Alguien';
    pending.current = null;
    setCall(null);
    if (!calm) strengthenBruma(state);
    const line = giveUpLine(who, index);
    shout('Nadie respondió a tiempo');
    setAnnounce(line);
    onBrujula({ text: line, source: 'local' });
    sync();
  };

  const listenNow = () => {
    const p = pending.current;
    if (!p || open || state.outcome !== 'en-curso') return;
    if (!canListen(plaza, state.player, reach)) return;
    listen(plaza);
    controls.clear();
    setOpen({ voice: p.voice, label: p.label, feedback: null });
    setCall(null);
    setAnnounce(`Escuchas a ${p.label}: ${p.voice.prompt}`);
  };

  const choose = (optionId: string) => {
    if (!open || open.feedback || state.outcome !== 'en-curso') return;
    const result = judge(open.voice, optionId);
    if (!result) return;
    tally.current.total += 1;
    if (result.correct) {
      tally.current.correct += 1;
      chargeArena(state);
      shout('¡Linterna cargada! Apunta a la Bruma y dispara');
    } else if (result.reply === 'apaga') {
      strengthenBruma(state);
    }
    onDecision({ correct: result.correct, tier: open.voice.tier, itemId: open.voice.itemId });
    resolve(plaza, plazaConfig, result.reply);
    onBrujula({ text: result.option.lesson, source: 'local' });
    pending.current = null;
    const quality = result.option.quality;
    setOpen({
      ...open,
      feedback: {
        optionId,
        label: QUALITY_TEXT[quality],
        tone: result.reply === 'enciende' ? 'good' : result.reply === 'a-medias' ? 'mid' : 'bad',
        text: result.option.feedback,
        notes: [REPLY_NOTE[result.reply], result.option.lesson],
      },
    });
    setAnnounce(`${QUALITY_TEXT[quality]}. ${result.option.feedback}`);
    sync();
  };

  const close = () => {
    setOpen(null);
    onBrujula(null);
  };

  const timeScale = () => (open && !open.feedback ? (calm ? 0.2 : 0.4) : open ? 0 : 1);

  /** Avanza la plaza junto al combate y mantiene al día lo que ve el HUD. */
  const tick = (dt: number) => {
    const scale = timeScale();
    if (scale > 0) {
      for (const event of stepPlaza(plaza, state, plazaConfig, Math.min(0.05, dt) * scale)) {
        if (event.type === 'turno') callOut();
        else giveUp(event.index);
      }
    }
    const p = pending.current;
    const n = plaza.speaker === null ? undefined : plaza.neighbors[plaza.speaker];
    if (p && n?.mood === 'alza-la-voz') {
      const near = canListen(plaza, state.player, reach);
      if (near && controls.take('interact')) {
        listenNow();
      } else {
        const patience = Math.round((plaza.patience / timing.patience) * 20) / 20;
        if (call?.patience !== patience || call.near !== near || call.label !== p.label)
          setCall({ label: p.label, where: whereIs(n), patience, near });
      }
    } else if (call && !open) {
      setCall(null);
    }
    const mood = Math.round(plazaMood(plaza) * 100) / 100;
    const lit = litCount(plaza);
    if (mood !== view.mood || lit !== view.lit) setView({ mood, lit });
  };

  const readCrowd = useCallback(
    (i: number, out: CrowdPose) => {
      const n = plaza.neighbors[i];
      if (!n) return;
      out.x = n.x;
      out.z = n.z;
      out.rotY = Math.PI / 2 - n.facing;
      out.warmth = n.mood === 'farol' ? 1 : n.warmth;
      out.ink = groupInk(n.group);
      out.lit = n.mood === 'farol';
      out.calling = n.mood === 'alza-la-voz' || n.mood === 'escuchando';
    },
    [plaza],
  );

  const density = Math.max(0, 1 - hud.hits / goal);
  const speakerWhere = call?.where ?? '';

  return (
    <GameStage
      label={`Arena de la ${content.bruma.name}: moderar la plaza`}
      controls={controls}
      paused={paused}
      onPause={setPaused}
      help={HELP}
      announce={announce}
      onAccessible={onAccessible}
      hud={
        <>
          <div className="absolute top-3 left-3 grid w-[min(16rem,calc(100%-9rem))] gap-2 sm:w-64">
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
              <HudMeter
                label="Ánimo de la plaza"
                value={view.mood}
                text={`${String(view.lit)} ${view.lit === 1 ? 'farol' : 'faroles'}`}
                tone="route"
              />
              <LightsHud lights={hud.lights} max={lights} />
            </HudPanel>
            {call && (
              <HudPanel className="grid gap-1">
                <p className="text-xs font-semibold">Alza la voz: {call.label}</p>
                <p className="text-[0.6875rem] text-sea-100">{speakerWhere}</p>
                <HudMeter
                  label="Su paciencia"
                  value={call.patience}
                  text={call.patience <= 0.3 ? 'Se agota' : 'Espera'}
                  tone={call.patience <= 0.3 ? 'low' : 'sun'}
                />
              </HudPanel>
            )}
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          <div className="absolute inset-x-3 bottom-3 flex max-h-[68%] flex-col items-start justify-end gap-2 sm:bottom-4 sm:left-4">
            {open ? (
              <Wheel
                kicker={`Escuchas a ${open.label}`}
                quote={open.voice.prompt}
                {...(open.voice.context ? { context: open.voice.context } : {})}
                options={open.voice.options}
                feedback={open.feedback}
                onChoose={choose}
                onContinue={close}
                continueLabel="Volver a la plaza"
                className="max-w-2xl"
              />
            ) : call?.near ? (
              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <KeyHint keys="E">Escuchar a {call.label}</KeyHint>
                <button type="button" className={STAGE_BUTTON} onClick={listenNow}>
                  Escuchar
                </button>
              </div>
            ) : call ? (
              <KeyHint keys="WASD">Acércate al aro dorado de {call.label}</KeyHint>
            ) : hud.charge >= 1 ? (
              <KeyHint keys="Espacio">Disparar el haz hacia la Bruma</KeyHint>
            ) : (
              <KeyHint keys="Mayús">Esquiva la niebla mientras alguien alza la voz</KeyHint>
            )}
          </div>
        </>
      }
    >
      <ArenaLights />
      <ArenaPlatform radius={13.4} ground={BUILD.paving} rim={ISLE.voxcivitas} />
      <mesh position-y={0.04} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[RADIUS - 0.08, RADIUS, 48]} />
        <meshBasicMaterial color={ISLE.voxcivitas} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <PlazaBackdrop radius={10.4} />
      <ArenaRig
        state={state}
        config={config}
        controls={controls}
        tint={tint}
        still={still}
        timeScale={timeScale}
        onEvents={onEvents}
      />
      <Crowd count={plaza.neighbors.length} read={readCrowd} still={still} />
      <VoiceMarker
        plaza={plaza}
        reach={reach}
        maxPatience={timing.patience}
        label={call?.label ?? open?.label ?? null}
        still={still}
      />
      <LightTrails plaza={plaza} player={state.player} />
      <Tick run={tick} />
    </GameStage>
  );
}

/** Ejecuta `run` en cada cuadro, después de las demás piezas. */
function Tick({ run }: { run: (dt: number) => void }) {
  useFrame((_, dt) => {
    run(dt);
  });
  return null;
}
