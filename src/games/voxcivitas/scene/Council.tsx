import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  MathUtils,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { AURA_COLD, AURA_WARM, PARCHMENT, SKINS } from '../palette';
import { auraRadius, frameDistance, TABLE_RADIUS, type Spot } from '../cabildo/session';
import { faceCenter } from './layout';
import { useLater } from './useLater';

export interface RepState {
  /** Confianza del grupo (0–100). */
  trust: number;
  /** Tiene la palabra: se ilumina. */
  speaking: boolean;
  /** Alza su farol en la votación. */
  lantern: boolean;
}

const cold = new Color(AURA_COLD);
const warm = new Color(AURA_WARM);

/**
 * El representante de un grupo, sentado en su puesto mirando a la mesa. Su
 * aura en el suelo es la confianza (la marca fina, el umbral para respaldar);
 * quien habla se ilumina y gesticula; en la votación levanta un farol.
 */
export function Representative({
  spot,
  ink,
  name,
  threshold,
  seed,
  get,
  delta,
  still,
}: {
  spot: Spot;
  ink: string;
  name: string;
  threshold: number;
  seed: number;
  get: () => RepState;
  /** Cambio de confianza de esta ronda, para mostrarlo un momento. */
  delta: number | null;
  still: boolean;
}) {
  const aura = useRef<Mesh>(null);
  const robe = useRef<MeshStandardMaterial>(null);
  const armR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const lantern = useRef<Group>(null);
  const body = useRef<Group>(null);
  const shown = useRef<number | null>(null);
  const lift = useRef(0);
  const glow = useRef(0);
  const labels = useLater();

  useFrame(({ clock }, dt) => {
    const s = get();
    const k = Math.min(1, dt * 3);
    shown.current =
      shown.current === null ? s.trust : shown.current + (s.trust - shown.current) * k;
    const radius = auraRadius(shown.current);
    if (aura.current) {
      aura.current.scale.set(radius, radius, 1);
      const material = aura.current.material as MeshStandardMaterial;
      const warmth = MathUtils.smoothstep(shown.current, threshold - 12, threshold + 8);
      material.color.copy(cold).lerp(warm, warmth);
      material.emissive.copy(material.color);
      material.emissiveIntensity = 0.25 + 0.5 * warmth;
      material.opacity = 0.5 + 0.2 * warmth;
    }
    glow.current += ((s.speaking ? 1 : 0) - glow.current) * Math.min(1, dt * 5);
    lift.current += ((s.lantern ? 1 : 0) - lift.current) * Math.min(1, dt * 4);
    if (robe.current) {
      robe.current.emissive.set(ink);
      robe.current.emissiveIntensity = 0.05 + 0.55 * glow.current;
    }
    const t = still ? 0 : clock.elapsedTime;
    if (body.current)
      body.current.position.y = still
        ? 0
        : glow.current * Math.abs(Math.sin(t * 2.2 + seed)) * 0.04;
    if (armR.current)
      armR.current.rotation.x =
        -0.2 - glow.current * (1.1 + (still ? 0 : Math.sin(t * 3 + seed) * 0.25));
    if (armL.current) armL.current.rotation.x = -0.2 - lift.current * 2.6;
    if (lantern.current) lantern.current.scale.setScalar(Math.max(0.0001, lift.current));
  });

  const rotY = faceCenter(spot.x, spot.z);
  const skin = SKINS[seed % SKINS.length] ?? SKINS[0];
  return (
    <group position={[spot.x, 0, spot.z]} rotation-y={rotY}>
      {/* Aura de confianza y marca del umbral */}
      <mesh ref={aura} position-y={0.03} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position-y={0.045} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[auraRadius(threshold) - 0.04, auraRadius(threshold), 40]} />
        <meshBasicMaterial color={ATLAS.ink} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <group ref={body}>
        <mesh position-y={0.45} castShadow>
          <cylinderGeometry args={[0.2, 0.32, 0.9, 8]} />
          <meshStandardMaterial ref={robe} color={ink} flatShading />
        </mesh>
        <mesh position-y={0.88} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.07, 8]} />
          <meshStandardMaterial color={ATLAS.plate} flatShading />
        </mesh>
        <mesh position-y={1.12} castShadow>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial color={skin} flatShading />
        </mesh>
        <mesh position-y={1.25} castShadow>
          <cylinderGeometry args={[0.2, 0.23, 0.12, 8]} />
          <meshStandardMaterial color={BUILD.woodDark} flatShading />
        </mesh>
        <group ref={armR} position={[-0.27, 0.8, 0]}>
          <mesh position-y={-0.2} castShadow>
            <boxGeometry args={[0.09, 0.4, 0.09]} />
            <meshStandardMaterial color={ink} flatShading />
          </mesh>
        </group>
        <group ref={armL} position={[0.27, 0.8, 0]}>
          <mesh position-y={-0.2} castShadow>
            <boxGeometry args={[0.09, 0.4, 0.09]} />
            <meshStandardMaterial color={ink} flatShading />
          </mesh>
          <group ref={lantern} position={[0, -0.46, 0.04]} scale={0.0001}>
            <mesh>
              <icosahedronGeometry args={[0.15, 1]} />
              <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={2} />
            </mesh>
            <mesh>
              <icosahedronGeometry args={[0.34, 1]} />
              <meshBasicMaterial
                color={ATLAS.sun}
                transparent
                opacity={0.22}
                depthWrite={false}
                blending={AdditiveBlending}
              />
            </mesh>
          </group>
        </group>
        {labels && (
          <Html center position={[0, 1.75, 0]} zIndexRange={[5, 0]}>
            <span
              aria-hidden="true"
              className="pointer-events-none flex items-center gap-1 border-[1.5px] border-ink bg-plate px-2 py-0.5 font-display text-xs font-extrabold whitespace-nowrap text-ink"
            >
              {name}
              {delta !== null && delta !== 0 && (
                <span className={delta > 0 ? 'text-isle-latidosocial' : 'text-route'}>
                  {delta > 0 ? '+' : '−'}
                  {Math.abs(delta)}
                </span>
              )}
            </span>
          </Html>
        )}
      </group>
    </group>
  );
}

/** La mesa redonda del cabildo, con la rosa de los vientos al centro. */
export function RoundTable() {
  return (
    <group>
      <mesh position-y={0.62} castShadow receiveShadow>
        <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.12, 36]} />
        <meshStandardMaterial color={BUILD.wood} flatShading />
      </mesh>
      <mesh position-y={0.3} castShadow>
        <cylinderGeometry args={[0.4, 0.62, 0.6, 10]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      <mesh position-y={0.685} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.55, 0.62, 36]} />
        <meshStandardMaterial color={ISLE.voxcivitas} flatShading />
      </mesh>
      <mesh position-y={0.69} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.3, 4]} />
        <meshStandardMaterial color={ATLAS.sun} flatShading />
      </mesh>
    </group>
  );
}

/** El acta: un pergamino sobre la mesa que se alarga con cada acuerdo. */
export function ActaScroll({ agreements }: { agreements: number }) {
  const sheet = useRef<Mesh>(null);
  const left = useRef<Mesh>(null);
  const right = useRef<Mesh>(null);
  const width = useRef(0.8);
  const target = Math.min(2.5, 0.8 + 0.34 * agreements);
  useFrame((_, dt) => {
    width.current += (target - width.current) * Math.min(1, dt * 4);
    const w = width.current;
    if (sheet.current) sheet.current.scale.x = w;
    if (left.current) left.current.position.x = -w / 2;
    if (right.current) right.current.position.x = w / 2;
  });
  const lines = Math.min(7, agreements);
  return (
    <group position={[0, 0.7, 0.86]}>
      <mesh ref={sheet} position-y={0.01} receiveShadow>
        <boxGeometry args={[1, 0.02, 0.5]} />
        <meshStandardMaterial color={PARCHMENT} flatShading />
      </mesh>
      <mesh ref={left} position-y={0.04} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 0.56, 8]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      <mesh ref={right} position-y={0.04} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 0.56, 8]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      {Array.from({ length: lines }, (_, i) => (
        <mesh key={i} position={[-0.3 + (i - (lines - 1) / 2) * 0.32 + 0.3, 0.025, 0]}>
          <boxGeometry args={[0.2, 0.004, 0.3]} />
          <meshBasicMaterial color={ATLAS.ink} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** Luz cálida sobre quien tiene la palabra: sigue su puesto con suavidad. */
export function SpeakerLight({ get }: { get: () => Spot | null }) {
  const light = useRef<Group>(null);
  useFrame((_, dt) => {
    const node = light.current;
    if (!node) return;
    const spot = get();
    const k = Math.min(1, dt * 4);
    if (spot) {
      node.position.x += (spot.x * 0.92 - node.position.x) * k;
      node.position.z += (spot.z * 0.92 - node.position.z) * k;
    }
    node.visible = spot !== null;
  });
  return (
    <group ref={light} position={[0, 2.4, 0]}>
      <pointLight color={ATLAS.sun} intensity={9} distance={5} decay={1.7} />
    </group>
  );
}

/**
 * Cámara de la sesión: detrás de quien modera, mirando la mesa. En pantallas
 * verticales se aleja para que quepan los cuatro grupos; con movimiento
 * reducido queda fija.
 */
export function CouncilCamera({ still }: { still: boolean }) {
  const size = useThree((s) => s.size);
  const aim = useMemo(() => new Vector3(0, 0.6, 0.2), []);
  useFrame(({ camera, clock }, dt) => {
    const aspect = size.width / Math.max(1, size.height);
    const distance = frameDistance(aspect, 42, 4.4, 8.2);
    const sway = still ? 0 : Math.sin(clock.elapsedTime * 0.16) * 0.7;
    const s = Math.min(1, dt * 3);
    camera.position.x += (sway - camera.position.x) * s;
    camera.position.y += (distance * 0.62 - camera.position.y) * s;
    camera.position.z += (distance * 0.88 - camera.position.z) * s;
    camera.lookAt(aim);
  });
  return null;
}
