import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { personName } from '../banco/model';
import { TextLabel } from '../labels';
import { BENCH, BENCH_REACH, BIN, BIN_REACH, MAX_UPGRADES, type Bubble } from './collect';

/** Escenografía de la arena «Prototipar el cañón de luz»: banco, papelera, burbujas y taller. */

/** Una burbuja de comentario: flota y se mece; la que se lleva viaja sobre el explorador. */
export function BubbleOrb({
  bubble,
  player,
  near,
  still,
}: {
  bubble: Bubble;
  player: () => { x: number; z: number };
  near: boolean;
  still: boolean;
}) {
  const root = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const node = root.current;
    if (!node) return;
    const t = still ? 0 : clock.elapsedTime;
    if (bubble.held) {
      const p = player();
      node.position.set(p.x, 2.15 + Math.sin(t * 3) * 0.05, p.z);
    } else {
      node.position.set(bubble.x, 1.2 + Math.sin(t * 1.6 + bubble.id) * 0.12, bubble.z);
    }
    // Avisa que va a reventar: parpadea lento (menos de 3 veces por segundo).
    const dying = !bubble.held && bubble.life < 4 && !still;
    node.visible = !dying || Math.floor(clock.elapsedTime * 2) % 2 === 0;
    if (ring.current) ring.current.visible = near || bubble.held;
  });
  return (
    <group ref={root}>
      <mesh castShadow>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial
          color={ATLAS.plate}
          emissive={ATLAS.sun}
          emissiveIntensity={0.3}
          transparent
          opacity={0.72}
          flatShading
        />
      </mesh>
      <mesh position={[0.18, -0.46, 0]} rotation-z={Math.PI + 0.4}>
        <coneGeometry args={[0.13, 0.28, 6]} />
        <meshStandardMaterial color={ATLAS.plate} transparent opacity={0.72} flatShading />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.52, 0.62, 20]} />
        <meshBasicMaterial color={ATLAS.sun} />
      </mesh>
      <TextLabel
        position={[0, 0.62, 0]}
        anchor={-1}
        text={personName(bubble.userId)}
        bg={ATLAS.plate}
        fg={ATLAS.ink}
        font={22}
        bold
        wrap={400}
      />
    </group>
  );
}

/** Banco de trabajo con el cañón: crece con cada patrón y se atasca con una ocurrencia. */
export function CannonBench({
  level,
  charge,
  jammed,
  held,
  still,
}: {
  level: number;
  charge: () => number;
  jammed: () => boolean;
  held: boolean;
  still: boolean;
}) {
  const muzzle = useRef<Mesh>(null);
  const smoke = useRef<Group>(null);
  const barrelMat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const c = Math.min(2, charge());
    const jam = jammed();
    const mat = muzzle.current?.material as MeshStandardMaterial | undefined;
    if (mat) mat.emissiveIntensity = jam ? 0 : 0.15 + 0.45 * c;
    if (barrelMat.current) barrelMat.current.color.set(jam ? '#6b3a32' : BUILD.metal);
    if (smoke.current) {
      smoke.current.visible = jam;
      if (jam && !still)
        smoke.current.children.forEach((puff, i) => {
          const k = (clock.elapsedTime * 0.5 + i / 3) % 1;
          puff.position.y = 1.5 + k * 1.3;
          puff.scale.setScalar(0.5 + k * 0.7);
        });
    }
  });
  const length = 1.1 + 0.35 * level;
  return (
    <group position={[BENCH.x, 0, BENCH.z]}>
      <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[BENCH_REACH - 0.1, BENCH_REACH, 28]} />
        <meshBasicMaterial color={ATLAS.sun} transparent opacity={held ? 0.9 : 0.35} />
      </mesh>
      <TextLabel
        position={[0, 2.9, 0]}
        anchor={-1}
        text="Banco de trabajo"
        bg={ATLAS.plate}
        fg={ATLAS.ink}
        font={22}
        bold
        wrap={600}
      />
      <group rotation-y={0.53}>
        <mesh position-y={0.45} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.9, 1.3]} />
          <meshStandardMaterial color={BUILD.wood} flatShading />
        </mesh>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[2.5, 0.1, 1.4]} />
          <meshStandardMaterial color={BUILD.woodDark} flatShading />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.6, 0.4, 0.6]} />
          <meshStandardMaterial color={ISLE.activatuidea} flatShading />
        </mesh>
        <mesh position={[0.5 * length, 1.28, 0]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.16 + 0.03 * level, 0.2 + 0.03 * level, length, 8]} />
          <meshStandardMaterial ref={barrelMat} color={BUILD.metal} flatShading />
        </mesh>
        <mesh ref={muzzle} position={[length + 0.05, 1.28, 0]}>
          <icosahedronGeometry args={[0.2 + 0.03 * level, 1]} />
          <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={0.2} />
        </mesh>
        {Array.from({ length: MAX_UPGRADES }, (_, i) =>
          i < level ? (
            <mesh key={i} position={[0.35 + i * 0.35, 1.28, 0]} rotation-y={Math.PI / 2}>
              <torusGeometry args={[0.24 + 0.03 * level, 0.04, 5, 12]} />
              <meshStandardMaterial
                color={ATLAS.sun}
                emissive={ATLAS.sun}
                emissiveIntensity={0.5}
              />
            </mesh>
          ) : null,
        )}
        <group ref={smoke} visible={false}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.2 * i - 0.2, 1.6, 0]}>
              <sphereGeometry args={[0.25, 7, 6]} />
              <meshStandardMaterial color="#59616b" transparent opacity={0.6} flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Papelera donde se descarta lo que no es evidencia. */
export function Bin({ held }: { held: boolean }) {
  return (
    <group position={[BIN.x, 0, BIN.z]}>
      <mesh position-y={0.55} castShadow>
        <cylinderGeometry args={[0.7, 0.55, 1.1, 8, 1, true]} />
        <meshStandardMaterial color={BUILD.stoneDark} flatShading side={2} />
      </mesh>
      <mesh position-y={0.04} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.55, 8]} />
        <meshStandardMaterial color="#2b3038" flatShading />
      </mesh>
      <mesh position-y={1.1} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.7, 0.05, 5, 12]} />
        <meshStandardMaterial color={ATLAS.route} flatShading />
      </mesh>
      <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[BIN_REACH - 0.1, BIN_REACH, 28]} />
        <meshBasicMaterial color={ATLAS.route} transparent opacity={held ? 0.9 : 0.35} />
      </mesh>
      <TextLabel
        position={[0, 1.55, 0]}
        anchor={-1}
        text="Papelera"
        bg={ATLAS.plate}
        fg={ATLAS.ink}
        font={22}
        bold
        wrap={600}
      />
    </group>
  );
}

/** Cajas y carretes en el borde del taller, para que la arena se lea como un taller. */
export function ShopProps() {
  const crates: [number, number, number, number][] = [
    [-7.4, -2.5, 0.9, 0.3],
    [-6.6, -4.2, 0.7, -0.4],
    [7.2, -3, 0.9, 0.5],
    [6.2, -4.9, 0.7, 0.1],
    [0, -8, 1.1, 0],
  ];
  return (
    <group>
      {crates.map(([x, z, s, r], i) => (
        <mesh key={i} position={[x, s / 2, z]} rotation-y={r} castShadow>
          <boxGeometry args={[s, s, s]} />
          <meshStandardMaterial color={i % 2 ? BUILD.wood : BUILD.thatch} flatShading />
        </mesh>
      ))}
      <mesh position={[3.5, 0.45, -7.4]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.9, 10]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
    </group>
  );
}
