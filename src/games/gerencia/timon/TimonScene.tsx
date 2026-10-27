import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Object3D,
  RingGeometry,
  Shape,
  ShapeGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three';
import { BUILD, ATLAS, ISLE } from '@/world/palette';
import {
  bearingToBruma,
  aimTolerance,
  ISLET_RADIUS,
  MIN_ORBIT,
  SEA_RADIUS,
  STATIONS,
  tempo,
  type ShipConfig,
  type ShipState,
} from './ship';

/**
 * Escenografía y barco de «Llevar el timón». Todo lee del estado puro del
 * barco en cada cuadro (sin volver a renderizar React) y agrupa lo repetido en
 * mallas instanciadas.
 */

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const SEA = '#3f7fb8';

/** Cielo de amanecer, niebla de mar y luces cálidas. */
export function SeaLights({ tint }: { tint: string }) {
  return (
    <>
      <color attach="background" args={['#a9cde3']} />
      <fog attach="fog" args={['#b9d4e4', 34, 78]} />
      <hemisphereLight args={['#eaf4fb', '#2a5a92', 1.15]} />
      <directionalLight
        position={[-14, 20, 10]}
        color={ATLAS.dawn}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0005}
      />
      <ambientLight intensity={0.25} color={tint} />
    </>
  );
}

/** El mar en anillo: aguas hondas, bajíos claros alrededor del islote, boyas y el muro de niebla. */
export function Sea({ still }: { still: boolean }) {
  const buoys = useRef<InstancedMesh>(null);
  const foam = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const FOAM = 56;

  useLayoutEffect(() => {
    const mesh = buoys.current;
    if (!mesh) return;
    const color = (i: number) => (i % 2 === 0 ? ATLAS.route : ATLAS.plate);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * (SEA_RADIUS - 0.1), 0.15, Math.sin(a) * (SEA_RADIUS - 0.1));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new Color(color(i)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy]);

  useFrame(({ clock }) => {
    const mesh = foam.current;
    if (!mesh) return;
    const t = still ? 0 : clock.elapsedTime;
    for (let i = 0; i < FOAM; i++) {
      const h = Math.sin(i * 12.9898) * 43758.5453;
      const r = h - Math.floor(h);
      const a = r * Math.PI * 2 + t * (0.02 + (i % 4) * 0.006);
      const d = MIN_ORBIT - 1.5 + ((r * 977) % 1) * (SEA_RADIUS - MIN_ORBIT);
      dummy.position.set(Math.cos(a) * d, 0.04, Math.sin(a) * d);
      dummy.rotation.set(0, -a + 1.2, 0);
      dummy.scale.set(1 + (i % 3) * 0.5, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh position-y={-0.05} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[SEA_RADIUS * 4, 48]} />
        <meshStandardMaterial color={SEA} roughness={0.7} />
      </mesh>
      {/* Bajíos claros alrededor del islote */}
      <mesh position-y={0} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[ISLET_RADIUS * 0.8, MIN_ORBIT - 0.4, 40]} />
        <meshStandardMaterial color={ATLAS.sea[0]} roughness={0.8} />
      </mesh>
      <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[MIN_ORBIT - 0.4, MIN_ORBIT - 0.15, 40]} />
        <meshBasicMaterial color={ATLAS.plate} transparent opacity={0.55} />
      </mesh>
      <instancedMesh ref={buoys} args={[undefined, undefined, 32]}>
        <coneGeometry args={[0.28, 0.9, 6]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      {/* Muro de niebla del borde del mar */}
      <mesh position-y={2.4}>
        <cylinderGeometry args={[SEA_RADIUS + 0.4, SEA_RADIUS + 0.4, 5, 40, 1, true]} />
        <meshBasicMaterial
          color="#dfe9ee"
          transparent
          opacity={0.35}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh ref={foam} args={[undefined, undefined, FOAM]} frustumCulled={false}>
        <boxGeometry args={[0.7, 0.02, 0.1]} />
        <meshBasicMaterial color="#e9f3f8" transparent opacity={0.55} />
      </instancedMesh>
    </group>
  );
}

/** El islote de la Bruma: roca, arena y un faro apagado. */
export function Islet({ tint }: { tint: string }) {
  return (
    <group>
      <mesh position-y={0.2} castShadow receiveShadow>
        <cylinderGeometry args={[ISLET_RADIUS, ISLET_RADIUS + 0.9, 0.9, 9]} />
        <meshStandardMaterial color="#e3dccb" flatShading />
      </mesh>
      <mesh position-y={0.9} castShadow>
        <cylinderGeometry args={[ISLET_RADIUS - 0.7, ISLET_RADIUS - 0.2, 1, 8]} />
        <meshStandardMaterial color={ATLAS.land[0]} flatShading />
      </mesh>
      <mesh position={[-0.9, 1.9, 0.5]} castShadow>
        <coneGeometry args={[1.5, 2.2, 6]} />
        <meshStandardMaterial color={BUILD.stoneDark} flatShading />
      </mesh>
      <mesh position={[1.1, 1.6, -0.7]} castShadow>
        <coneGeometry args={[1.1, 1.7, 5]} />
        <meshStandardMaterial color={BUILD.stone} flatShading />
      </mesh>
      {/* Faro apagado */}
      <mesh position={[0.9, 1.7, 1.2]} castShadow>
        <cylinderGeometry args={[0.28, 0.42, 1.6, 7]} />
        <meshStandardMaterial color={BUILD.wall} flatShading />
      </mesh>
      <mesh position={[0.9, 2.65, 1.2]}>
        <coneGeometry args={[0.38, 0.45, 7]} />
        <meshStandardMaterial color={ISLE.gerencia} flatShading />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[ISLET_RADIUS + 0.2, ISLET_RADIUS + 0.8, 24]} />
        <meshBasicMaterial color={tint} transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

const SAILOR_COLORS = [ATLAS.route, ATLAS.sun, ATLAS.plate] as const;

/** Puesto de cada estación en la cubierta (x hacia la proa, z hacia estribor). */
const POSTS = {
  velas: { x: 0.15, z: 0.55 },
  bomba: { x: -1.35, z: 0.0 },
  linterna: { x: 1.35, z: 0.0 },
} as const;

function postFor(station: (typeof STATIONS)[number], k: number, n: number) {
  const base = POSTS[station];
  const spread = n > 1 ? (k - (n - 1) / 2) * 0.55 : 0;
  return station === 'velas'
    ? { x: base.x + spread * 0.4, z: k % 2 === 0 ? 0.55 : -0.55 }
    : { x: base.x, z: base.z + spread };
}

/** El barco: casco, mástil y vela, bomba, linterna y los tres marineros en su puesto. */
export function ShipModel({ state, still }: { state: ShipState; still: boolean }) {
  const root = useRef<Group>(null);
  const lean = useRef<Group>(null);
  const boom = useRef<Group>(null);
  const flag = useRef<Mesh>(null);
  const lantern = useRef<Mesh>(null);
  const lever = useRef<Mesh>(null);
  const hull = useRef<MeshStandardMaterial>(null);
  const sailors = useRef<(Group | null)[]>([null, null, null]);
  const local = useRef([
    { x: 0.15, z: 0.55 },
    { x: -1.35, z: 0 },
    { x: 1.35, z: 0 },
  ]);

  const sailShape = useMemo(() => {
    const s = new Shape();
    s.moveTo(0.05, 0.3);
    s.lineTo(0.05, 3.25);
    s.lineTo(-1.5, 0.3);
    s.closePath();
    return new ShapeGeometry(s);
  }, []);
  const jibShape = useMemo(() => {
    const s = new Shape();
    s.moveTo(0.2, 3.1);
    s.lineTo(0.2, 0.4);
    s.lineTo(1.8, 0.4);
    s.closePath();
    return new ShapeGeometry(s);
  }, []);

  useFrame(({ clock }, dt) => {
    const node = root.current;
    if (!node) return;
    const t = still ? 0 : clock.elapsedTime;
    node.position.set(state.x, -state.water * 0.3 + Math.sin(t * 1.6) * 0.05, state.z);
    node.rotation.y = -state.heading;
    if (lean.current) {
      lean.current.rotation.x = still ? 0 : -state.rudder * 0.1 * Math.min(1, state.speed / 4);
      lean.current.rotation.z = still ? 0 : Math.sin(t * 1.3) * 0.02;
    }
    if (boom.current) {
      const rel = angleDiff(state.wind, state.heading);
      boom.current.rotation.y = Math.max(-0.9, Math.min(0.9, Math.sin(rel) * 0.9));
      boom.current.scale.set(0.5 + 0.5 * state.trim, 0.4 + 0.6 * state.trim, 1);
      boom.current.visible = state.crew.velas > 0 || state.trim > 0.05;
    }
    if (flag.current) flag.current.rotation.y = still ? 0 : Math.sin(t * 6) * 0.25 + 0.2;
    if (lantern.current) {
      const material = lantern.current.material as MeshStandardMaterial;
      const lit = state.crew.linterna > 0 ? Math.min(1, 0.25 + state.charge * 0.5) : 0.05;
      material.emissiveIntensity = 0.3 + lit * 2.2;
    }
    if (lever.current)
      lever.current.rotation.z = state.crew.bomba > 0 && !still ? Math.sin(t * 5) * 0.45 : 0;
    if (hull.current) {
      hull.current.emissive.set(ATLAS.route);
      hull.current.emissiveIntensity =
        state.shield > 0 ? 0.35 + 0.25 * Math.sin(clock.elapsedTime * 8) : 0;
    }
    // Marineros: cada uno va a su estación.
    const order = STATIONS.flatMap((s) => Array.from({ length: state.crew[s] }, () => s));
    const counts = { velas: 0, bomba: 0, linterna: 0 };
    order.forEach((station, i) => {
      const k = counts[station]++;
      const post = postFor(station, k, state.crew[station]);
      const cur = local.current[i];
      const g = sailors.current[i];
      if (!cur || !g) return;
      const s = Math.min(1, dt * 4);
      cur.x += (post.x - cur.x) * s;
      cur.z += (post.z - cur.z) * s;
      const work = station === 'bomba' && !still ? Math.abs(Math.sin(t * 5 + i)) * 0.14 : 0;
      const sway = station === 'velas' && !still ? Math.sin(t * 1.8 + i) * 0.12 : 0;
      g.position.set(cur.x, 0.55 + work, cur.z);
      g.rotation.set(sway, 0, 0);
    });
  });

  return (
    <group ref={root}>
      <group ref={lean}>
        {/* Casco */}
        <mesh position={[-0.35, 0.3, 0]} castShadow>
          <boxGeometry args={[2.6, 0.7, 1.3]} />
          <meshStandardMaterial ref={hull} color={BUILD.wood} flatShading />
        </mesh>
        <mesh
          position={[1.35, 0.3, 0]}
          rotation-z={-Math.PI / 2}
          rotation-x={Math.PI / 4}
          castShadow
        >
          <coneGeometry args={[0.66, 1.4, 4]} />
          <meshStandardMaterial color={BUILD.wood} flatShading />
        </mesh>
        <mesh position={[-0.35, 0.02, 0]}>
          <boxGeometry args={[2.4, 0.16, 1.05]} />
          <meshStandardMaterial color={BUILD.woodDark} flatShading />
        </mesh>
        <mesh position={[-0.35, 0.5, 0]}>
          <boxGeometry args={[2.62, 0.1, 1.32]} />
          <meshStandardMaterial color={ISLE.gerencia} flatShading />
        </mesh>
        <mesh position={[-0.35, 0.56, 0]}>
          <boxGeometry args={[2.3, 0.04, 1.0]} />
          <meshStandardMaterial color={BUILD.thatch} flatShading />
        </mesh>
        {/* Mástil, vela y bandera */}
        <mesh position={[0, 1.9, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 3.2, 6]} />
          <meshStandardMaterial color={BUILD.woodDark} flatShading />
        </mesh>
        <group ref={boom} position={[0, 0, 0]}>
          <mesh geometry={sailShape} castShadow>
            <meshStandardMaterial color={ATLAS.plate} side={DoubleSide} flatShading />
          </mesh>
        </group>
        <mesh geometry={jibShape} castShadow>
          <meshStandardMaterial color={ISLE.gerencia} side={DoubleSide} flatShading />
        </mesh>
        <mesh ref={flag} position={[0.2, 3.45, 0]}>
          <boxGeometry args={[0.4, 0.22, 0.02]} />
          <meshStandardMaterial color={ATLAS.route} flatShading />
        </mesh>
        {/* Bomba de achique en popa */}
        <mesh position={[-1.6, 0.8, 0]}>
          <boxGeometry args={[0.22, 0.5, 0.3]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
        <mesh ref={lever} position={[-1.6, 1.12, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.06]} />
          <meshStandardMaterial color={BUILD.woodDark} flatShading />
        </mesh>
        {/* Linterna en proa */}
        <mesh position={[1.75, 0.75, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 5]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
        <mesh ref={lantern} position={[1.75, 1.1, 0]}>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={0.5} />
        </mesh>
        {/* Marineros */}
        {SAILOR_COLORS.map((color, i) => (
          <group
            key={color}
            ref={(g) => {
              sailors.current[i] = g;
            }}
          >
            <mesh position-y={0.27} castShadow>
              <cylinderGeometry args={[0.15, 0.2, 0.55, 6]} />
              <meshStandardMaterial color={color} flatShading />
            </mesh>
            <mesh position-y={0.7}>
              <icosahedronGeometry args={[0.15, 0]} />
              <meshStandardMaterial color="#d9a77c" flatShading />
            </mesh>
            <mesh position-y={0.84}>
              <cylinderGeometry args={[0.1, 0.17, 0.1, 6]} />
              <meshStandardMaterial color={ATLAS.ink} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

const MAX_ROCKS = 8;
const MAX_WHIRLS = 5;
const MAX_WAVES = 4;

/** Rocas que caen con su sombra de aviso, remolinos que se forman y olas en arco. */
export function Hazards({ state, config }: { state: ShipState; config: ShipConfig }) {
  const rocks = useRef<InstancedMesh>(null);
  const shadows = useRef<InstancedMesh>(null);
  const fills = useRef<InstancedMesh>(null);
  const whirlRings = useRef<InstancedMesh>(null);
  const whirlCores = useRef<InstancedMesh>(null);
  const walls = useRef<InstancedMesh>(null);
  const crests = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const half = tempo(config).waveHalf;
  const wallGeometry = useMemo(
    () => new CylinderGeometry(1, 1, 0.8, 18, 1, true, Math.PI / 2 - half, half * 2),
    [half],
  );
  const crestGeometry = useMemo(() => {
    const g = new RingGeometry(0.92, 1, 18, 1, -half, half * 2);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [half]);
  const swirlGeometry = useMemo(() => {
    const g = new RingGeometry(0.78, 1, 20, 1, 0, Math.PI * 1.55);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const hide = (mesh: InstancedMesh | null, from: number, to: number) => {
      if (!mesh) return;
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      for (let i = from; i < to; i++) mesh.setMatrixAt(i, dummy.matrix);
    };
    const flush = (mesh: InstancedMesh | null) => {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    };

    const nr = Math.min(MAX_ROCKS, state.rocks.length);
    for (let i = 0; i < nr; i++) {
      const rock = state.rocks[i];
      if (!rock) continue;
      const k = Math.max(0, rock.warn) / rock.total;
      const falling = rock.warn > 0;
      if (rocks.current) {
        dummy.position.set(rock.x, falling ? 0.5 + Math.pow(k, 1.6) * 11 : 0.5, rock.z);
        dummy.rotation.set(t * 2 + i, t + i, 0);
        dummy.scale.setScalar(falling ? 0.9 : Math.max(0, rock.active / 0.35) * 0.9);
        dummy.updateMatrix();
        rocks.current.setMatrixAt(i, dummy.matrix);
      }
      if (shadows.current) {
        dummy.position.set(rock.x, 0.05, rock.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(rock.r * (falling ? 1 : 1 + (0.35 - rock.active) * 3));
        dummy.updateMatrix();
        shadows.current.setMatrixAt(i, dummy.matrix);
      }
      if (fills.current) {
        dummy.position.set(rock.x, 0.06, rock.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(rock.r * (falling ? 1 - k : 1));
        dummy.updateMatrix();
        fills.current.setMatrixAt(i, dummy.matrix);
      }
    }
    hide(rocks.current, nr, MAX_ROCKS);
    hide(shadows.current, nr, MAX_ROCKS);
    hide(fills.current, nr, MAX_ROCKS);
    flush(rocks.current);
    flush(shadows.current);
    flush(fills.current);

    const nw = Math.min(MAX_WHIRLS, state.whirls.length);
    for (let i = 0; i < nw; i++) {
      const whirl = state.whirls[i];
      if (!whirl) continue;
      const form = whirl.warn > 0 ? 1 - whirl.warn / 1.8 : 1;
      const fade = Math.min(1, whirl.life / 0.8);
      const size = whirl.r * Math.max(0.2, form) * fade;
      for (let r = 0; r < 3; r++) {
        if (!whirlRings.current) break;
        dummy.position.set(whirl.x, 0.08 + r * 0.01, whirl.z);
        dummy.rotation.set(0, -t * (1.6 + r * 0.9) + r * 2, 0);
        dummy.scale.setScalar(size * (1.5 - r * 0.35));
        dummy.updateMatrix();
        whirlRings.current.setMatrixAt(i * 3 + r, dummy.matrix);
      }
      if (whirlCores.current) {
        dummy.position.set(whirl.x, 0.07, whirl.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(size * 0.5);
        dummy.updateMatrix();
        whirlCores.current.setMatrixAt(i, dummy.matrix);
      }
    }
    hide(whirlRings.current, nw * 3, MAX_WHIRLS * 3);
    hide(whirlCores.current, nw, MAX_WHIRLS);
    flush(whirlRings.current);
    flush(whirlCores.current);

    const nv = Math.min(MAX_WAVES, state.waves.length);
    for (let i = 0; i < nv; i++) {
      const wave = state.waves[i];
      if (!wave) continue;
      dummy.position.set(0, 0.4, 0);
      dummy.rotation.set(0, -wave.angle, 0);
      dummy.scale.setScalar(wave.radius);
      dummy.updateMatrix();
      walls.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(0, 0.06, 0);
      dummy.updateMatrix();
      crests.current?.setMatrixAt(i, dummy.matrix);
    }
    hide(walls.current, nv, MAX_WAVES);
    hide(crests.current, nv, MAX_WAVES);
    flush(walls.current);
    flush(crests.current);
  });

  return (
    <group>
      <instancedMesh
        ref={rocks}
        args={[undefined, undefined, MAX_ROCKS]}
        frustumCulled={false}
        castShadow
      >
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={BUILD.stoneDark} flatShading />
      </instancedMesh>
      <instancedMesh ref={shadows} args={[undefined, undefined, MAX_ROCKS]} frustumCulled={false}>
        <ringGeometry args={[0.86, 1, 28]} />
        <meshBasicMaterial color={ATLAS.route} transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={fills} args={[undefined, undefined, MAX_ROCKS]} frustumCulled={false}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color={ATLAS.route} transparent opacity={0.3} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={whirlRings}
        args={[swirlGeometry, undefined, MAX_WHIRLS * 3]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color="#f1f7fa"
          transparent
          opacity={0.8}
          side={DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={whirlCores}
        args={[undefined, undefined, MAX_WHIRLS]}
        frustumCulled={false}
      >
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color={ATLAS.sea[4]} transparent opacity={0.8} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={walls} args={[wallGeometry, undefined, MAX_WAVES]} frustumCulled={false}>
        <meshBasicMaterial
          color="#e6f1f6"
          transparent
          opacity={0.6}
          side={DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={crests}
        args={[crestGeometry, undefined, MAX_WAVES]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          side={DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

const DOTS = 16;

/** Guía de puntería: puntos desde la proa en el rumbo; se encienden al apuntar a la Bruma con carga. */
export function AimGuide({ state, config }: { state: ShipState; config: ShipConfig }) {
  const dots = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const mesh = dots.current;
    if (!mesh) return;
    const { angle, distance } = bearingToBruma(state);
    const aligned = Math.abs(angle) <= aimTolerance(config.calm, state.crew.linterna, distance);
    const ready = state.charge >= 1 && state.crew.linterna > 0;
    const color = (mesh.material as MeshBasicMaterial).color;
    color.set(aligned && ready ? ATLAS.sun : aligned ? '#ffffff' : '#c9dbe7');
    const reach = Math.min(distance - 1, SEA_RADIUS);
    for (let i = 0; i < DOTS; i++) {
      const d = 2.2 + i * 1.3;
      dummy.position.set(
        state.x + Math.cos(state.heading) * d,
        0.3,
        state.z + Math.sin(state.heading) * d,
      );
      dummy.scale.setScalar(d > reach + 3 ? 0 : aligned && ready ? 1.4 : 0.9);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (ring.current) {
      ring.current.visible = aligned && ready;
      ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.05);
    }
  });
  return (
    <group>
      <instancedMesh ref={dots} args={[undefined, undefined, DOTS]} frustumCulled={false}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshBasicMaterial color="#c9dbe7" transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
      <mesh ref={ring} position-y={0.12} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[ISLET_RADIUS + 0.9, ISLET_RADIUS + 1.2, 40]} />
        <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Cámara alta que mantiene al barco y a la Bruma en cuadro: se coloca detrás
 * del barco respecto al islote y mira un punto entre ambos. Con movimiento
 * reducido queda fija y encuadra todo el mar.
 */
export function SeaCamera({ state, still }: { state: ShipState; still: boolean }) {
  const look = useMemo(() => new Vector3(), []);
  const size = useThree((s) => s.size);
  useFrame(({ camera }, dt) => {
    const aspect = size.width / Math.max(1, size.height);
    const wide = 1 + Math.max(0, 1 - aspect) * 0.7;
    let tx: number;
    let ty: number;
    let tz: number;
    let lx = 0;
    let lz = 0;
    if (still) {
      const far = Math.min(62, (SEA_RADIUS * 1.45) / Math.max(0.55, Math.min(aspect, 1.3)) + 14);
      tx = 0;
      ty = far * 0.82;
      tz = far * 0.62;
    } else {
      const d = Math.hypot(state.x, state.z) || 1;
      const out = 11 * wide;
      tx = state.x + (state.x / d) * out * 0.8;
      tz = state.z + (state.z / d) * out + 2;
      ty = 15 * wide;
      lx = state.x * 0.55;
      lz = state.z * 0.55;
    }
    const s = Math.min(1, dt * 2.2);
    camera.position.x += (tx - camera.position.x) * s;
    camera.position.y += (ty - camera.position.y) * s;
    camera.position.z += (tz - camera.position.z) * s;
    look.set(lx, 0, lz);
    camera.lookAt(look);
  });
  return null;
}
