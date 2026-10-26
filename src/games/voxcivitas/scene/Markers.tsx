import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import type { Vec2 } from '@/games/shared/arena/core';
import { ATLAS } from '@/world/palette';
import type { PlazaState } from '../arena/plaza';
import { useLater } from './useLater';

const MAX_TRAILS = 4;

/**
 * Marca de quien alza la voz: una gota de luz que flota sobre su cabeza, el
 * rótulo con su nombre, el aro del suelo donde hay que pararse a escucharlo y
 * un arco que se acorta con su paciencia. Con movimiento reducido no flota.
 */
export function VoiceMarker({
  plaza,
  reach,
  maxPatience,
  label,
  still,
}: {
  plaza: PlazaState;
  reach: number;
  maxPatience: number;
  label: string | null;
  still: boolean;
}) {
  const root = useRef<Group>(null);
  const drop = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const patience = useRef<Mesh>(null);
  const later = useLater();

  useFrame(({ clock }) => {
    const node = root.current;
    if (!node) return;
    const n = plaza.speaker === null ? undefined : plaza.neighbors[plaza.speaker];
    const calling = n?.mood === 'alza-la-voz';
    const listening = n?.mood === 'escuchando';
    node.visible = Boolean(n && (calling || listening));
    if (!n || !node.visible) return;
    node.position.set(n.x, 0, n.z);
    const t = still ? 0 : clock.elapsedTime;
    if (drop.current) {
      drop.current.position.y = 2.15 + (still ? 0 : Math.sin(t * 2.4) * 0.1);
      drop.current.visible = calling;
    }
    if (ring.current) {
      ring.current.visible = calling;
      const pulse = still ? 1 : 1 + Math.sin(t * 2.6) * 0.03;
      ring.current.scale.setScalar(pulse);
    }
    if (patience.current) {
      const left = Math.max(0.04, Math.min(1, plaza.patience / maxPatience));
      patience.current.visible = calling;
      patience.current.scale.set(left, left, 1);
      (patience.current.material as MeshBasicMaterial).color.set(
        left < 0.3 ? ATLAS.route : ATLAS.sun,
      );
    }
  });

  return (
    <group ref={root} visible={false}>
      <mesh ref={drop} position-y={2.15} rotation-x={Math.PI}>
        <coneGeometry args={[0.22, 0.46, 5]} />
        <meshStandardMaterial
          color={ATLAS.sun}
          emissive={ATLAS.sun}
          emissiveIntensity={1.5}
          flatShading
        />
      </mesh>
      <mesh ref={ring} position-y={0.05} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[reach - 0.1, reach, 40]} />
        <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh ref={patience} position-y={0.06} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.62, 0.7, 28]} />
        <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {label && later && (
        <Html center position={[0, 2.85, 0]} zIndexRange={[5, 0]}>
          <span
            aria-hidden="true"
            className="pointer-events-none border-[1.5px] border-ink bg-plate px-2 py-0.5 font-display text-xs font-extrabold whitespace-nowrap text-ink"
          >
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}

/** La estela de luz que viaja del farol de un vecino a la linterna del explorador. */
export function LightTrails({ plaza, player }: { plaza: PlazaState; player: Vec2 }) {
  const orbs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    for (let i = 0; i < MAX_TRAILS; i++) {
      const orb = orbs.current[i];
      if (!orb) continue;
      const trail = plaza.trails[i];
      const from = trail ? plaza.neighbors[trail.from] : undefined;
      orb.visible = Boolean(trail && from);
      if (!trail || !from) continue;
      const t = trail.t;
      orb.position.set(
        from.x + (player.x - from.x) * t,
        1.5 + (0.9 - 1.5) * t + Math.sin(Math.PI * t) * 1.3,
        from.z + (player.z - from.z) * t,
      );
      orb.scale.setScalar(0.6 + 0.6 * Math.sin(Math.PI * t));
    }
  });
  return (
    <group>
      {Array.from({ length: MAX_TRAILS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            orbs.current[i] = m;
          }}
          visible={false}
        >
          <icosahedronGeometry args={[0.2, 1]} />
          <meshBasicMaterial
            color="#fff1a8"
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
