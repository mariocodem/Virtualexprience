import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { seeded } from '@/boss/engine';
import {
  brumaDensity,
  stepArena,
  type ArenaConfig,
  type ArenaEvent,
  type ArenaState,
} from '../arena/core';
import type { Controls } from '../controls';
import { ArenaCamera, PointerAim } from './ArenaScenery';
import { Bruma3D } from './Bruma3D';
import { Explorer } from './Explorer';
import { DangerZones, FogOrbs, LightBeam } from './Hazards';

/**
 * El combate base de una arena: avanza el núcleo en cada cuadro con los mandos
 * y dibuja al explorador, a la Bruma, sus ataques, el haz y la cámara. La
 * mecánica de cada isla va al lado, como hermana dentro del mismo lienzo.
 */
export function ArenaRig({
  state,
  config,
  controls,
  tint,
  eyes = 2,
  still,
  timeScale = 1,
  onEvents,
  seed,
}: {
  state: ArenaState;
  config: ArenaConfig;
  controls: Controls;
  tint: string;
  eyes?: number;
  still: boolean;
  /** Ritmo del combate: 1 normal, menos para la pausa táctica (0 lo detiene). */
  timeScale?: number | (() => number);
  onEvents: (events: ArenaEvent[]) => void;
  seed?: number;
}) {
  const random = useMemo(() => (seed === undefined ? Math.random : seeded(seed)), [seed]);

  useFrame((_, dt) => {
    const scale = typeof timeScale === 'function' ? timeScale() : timeScale;
    if (scale <= 0) return;
    const input = {
      move: controls.move(),
      aim: controls.aim,
      fire: controls.take('fire'),
      dash: controls.take('dash'),
    };
    const events = stepArena(state, config, input, Math.min(0.05, dt) * scale, random);
    if (events.length > 0) onEvents(events);
  });

  return (
    <>
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
          };
        }}
        glow={() => Math.min(1, state.charge / 2)}
        still={still}
      />
      <Bruma3D
        get={() => ({
          x: state.bruma.x,
          z: state.bruma.z,
          density: brumaDensity(state, config),
          stagger: state.bruma.stagger,
        })}
        tint={tint}
        eyes={eyes}
        look={() => state.player}
        still={still}
      />
      <FogOrbs get={() => state.orbs} tint={tint} />
      <DangerZones get={() => state.zones} />
      <LightBeam get={() => state.beam} />
      <ArenaCamera follow={() => state.player} still={still} />
      <PointerAim controls={controls} />
    </>
  );
}
