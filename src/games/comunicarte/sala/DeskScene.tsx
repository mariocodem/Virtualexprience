import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Color,
  DoubleSide,
  Object3D,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
  PerspectiveCamera,
} from 'three';
import type { Signal } from '@/data/contentSchemas';
import type { Verdict } from '@/minigames/sala-de-redaccion/engine';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { clockHands, SIGNALS, TOOL_OF, VERDICTS, type Tray } from './desk';
import { Label } from '../Label';
import { arc, clamp01, deskFraming, easeOutCubic, type Vec3 } from './motion';

/**
 * El escritorio de Radio Puerto de noche: la nota baja por el tubo neumático,
 * se investiga con los objetos de la mesa, se sella y sale al aire, a la
 * papelera o a corrección. Solo dibuja: las reglas viven en `desk.ts`.
 */

export interface SealedNote {
  id: string;
  tray: Tray;
  slot: number;
}

const DESK_Y = 1.0;
const NOTE_REST: Vec3 = [0, DESK_Y + 0.07, 1.0];
const TUBE_MOUTH: Vec3 = [0, 4.4, -1.1];
const TOOL_AT: Record<Signal, Vec3> = {
  fuente: [-3.9, DESK_Y, -0.75],
  fecha: [-1.35, DESK_Y, -0.75],
  cita: [1.35, DESK_Y, -0.75],
  imagen: [3.9, DESK_Y, -0.75],
};
const STAMP_AT: Record<Verdict, Vec3> = {
  publicar: [-4.6, DESK_Y, 1.75],
  descartar: [-3.6, DESK_Y, 1.75],
  corregir: [-2.6, DESK_Y, 1.75],
};
const STAMP_COLOR: Record<Verdict, string> = {
  publicar: '#2c7a4b',
  descartar: ATLAS.route,
  corregir: ATLAS.sun,
};
const STAMP_LABEL: Record<Verdict, string> = {
  publicar: 'Publicar · A',
  descartar: 'Descartar · D',
  corregir: 'Corrección · C',
};
const TRAY_AT: Record<Tray, Vec3> = {
  correccion: [2.0, DESK_Y, 1.75],
  aire: [3.7, DESK_Y, 1.75],
  papelera: [6.0, 0, 1.9],
};
const TRAY_LABEL: Record<Tray, string> = {
  correccion: 'Corrección',
  aire: 'Al aire',
  papelera: 'Papelera',
};

const NIGHT = {
  wall: '#27497c',
  wallDark: '#1b365f',
  floor: '#3a2a22',
  sky: '#0b1d3d',
  lamp: '#ffd9a8',
  paper: ATLAS.plate,
  ink: ATLAS.ink,
  done: '#8fdc9c',
};

/** Encuadre y cámara: la mesa queda en el espacio que dejan libre los paneles. */
function DeskCamera() {
  const applied = useRef('');
  useFrame(({ camera, size }) => {
    const key = `${String(size.width)}x${String(size.height)}`;
    if (applied.current === key || !(camera instanceof PerspectiveCamera)) return;
    applied.current = key;
    const f = deskFraming(size.width, size.height);
    camera.fov = f.fov;
    camera.position.set(0, 1.5 + f.dist * 0.4, 0.3 + f.dist * 0.92);
    camera.lookAt(0, 1.5, 0.3);
    camera.setViewOffset(
      size.width,
      size.height,
      -f.panelX / 2,
      f.panelY / 2,
      size.width,
      size.height,
    );
    camera.updateProjectionMatrix();
  });
  return null;
}

/** El puntero de mano sobre los objetos que se pueden usar. */
const setCursor = (on: boolean) => {
  document.body.style.cursor = on ? 'pointer' : '';
};

/** Rótulo pequeño sobre un objeto de la mesa; decorativo (el HUD ya los nombra). */
function Tag({ position, children }: { position: Vec3; children: string }) {
  return <Label text={children} position={position} height={0.3} size={34} />;
}

function Tool({
  signal,
  done,
  active,
  still,
  onUse,
  children,
}: {
  signal: Signal;
  done: boolean;
  active: boolean;
  still: boolean;
  onUse: () => void;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const hover = useRef(false);
  const lift = useRef(0);
  const at = TOOL_AT[signal];
  useFrame((_, dt) => {
    const node = group.current;
    if (!node) return;
    const target = hover.current && active && !done ? 0.18 : 0;
    lift.current += (target - lift.current) * Math.min(1, dt * 10);
    node.position.y = at[1] + (still ? 0 : lift.current);
  });
  return (
    <group
      ref={group}
      position={[at[0], at[1], at[2]]}
      onClick={(event) => {
        event.stopPropagation();
        if (active && !done) onUse();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        hover.current = true;
        if (active && !done) setCursor(true);
      }}
      onPointerOut={() => {
        hover.current = false;
        setCursor(false);
      }}
    >
      {children}
      <mesh position={[0, 1.55, 0]}>
        <icosahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial
          color={done ? NIGHT.done : '#44566e'}
          emissive={done ? NIGHT.done : '#000000'}
          emissiveIntensity={done ? 1.4 : 0}
          flatShading
        />
      </mesh>
      <Tag
        position={[0, 1.95, 0]}
      >{`${TOOL_OF[signal]} · ${String(SIGNALS.indexOf(signal) + 1)}`}</Tag>
    </group>
  );
}

const wood = BUILD.wood;
const woodDark = BUILD.woodDark;

function Lupa() {
  return (
    <group>
      <mesh position={[0, 0.45, 0]} rotation={[0.35, 0, 0]} castShadow>
        <torusGeometry args={[0.55, 0.07, 6, 18]} />
        <meshStandardMaterial color={BUILD.metal} flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.52, 0.52, 0.03, 18]} />
        <meshStandardMaterial color={BUILD.glass} transparent opacity={0.45} flatShading />
      </mesh>
      <mesh position={[0.1, 0.1, 0.62]} rotation={[1.1, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.8, 6]} />
        <meshStandardMaterial color={woodDark} flatShading />
      </mesh>
      <mesh position={[-0.2, 0.06, -0.2]} castShadow>
        <boxGeometry args={[0.9, 0.12, 0.2]} />
        <meshStandardMaterial color={woodDark} flatShading />
      </mesh>
    </group>
  );
}

function Calendario() {
  return (
    <group>
      <mesh position={[0, 0.08, 0.1]} castShadow>
        <boxGeometry args={[1.2, 0.16, 0.7]} />
        <meshStandardMaterial color={woodDark} flatShading />
      </mesh>
      <mesh position={[0, 0.7, 0]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[1.1, 1.0, 0.1]} />
        <meshStandardMaterial color={NIGHT.paper} flatShading />
      </mesh>
      <mesh position={[0, 1.08, 0.06]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[1.1, 0.26, 0.06]} />
        <meshStandardMaterial color={ATLAS.route} flatShading />
      </mesh>
      {[-0.35, -0.12, 0.12, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.55, 0.07]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.16, 0.16, 0.03]} />
          <meshStandardMaterial color="#c9d3dc" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Archivador() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.3, 1.1, 0.9]} />
        <meshStandardMaterial color={BUILD.metal} flatShading />
      </mesh>
      {[0.22, 0.55, 0.88].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.46]}>
            <boxGeometry args={[1.18, 0.26, 0.04]} />
            <meshStandardMaterial color={BUILD.stoneDark} flatShading />
          </mesh>
          <mesh position={[0, y + 0.03, 0.5]}>
            <boxGeometry args={[0.4, 0.06, 0.04]} />
            <meshStandardMaterial color={ATLAS.sun} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MesaDeLuz({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[1.6, 0.32, 1.1]} />
        <meshStandardMaterial color={BUILD.metal} flatShading />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 0.9]} />
        <meshStandardMaterial
          color="#e8f4ff"
          emissive="#bfe0ff"
          emissiveIntensity={lit ? 1.3 : 0.45}
        />
      </mesh>
      <mesh position={[0.15, 0.36, 0.05]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[0.6, 0.45]} />
        <meshStandardMaterial color="#26466f" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function Stamp({
  verdict,
  held,
  active,
  still,
  onUse,
}: {
  verdict: Verdict;
  held: boolean;
  active: boolean;
  still: boolean;
  onUse: () => void;
}) {
  const group = useRef<Group>(null);
  const hover = useRef(false);
  const home = STAMP_AT[verdict];
  useFrame(({ clock }, dt) => {
    const node = group.current;
    if (!node) return;
    const goal: Vec3 = held
      ? [
          NOTE_REST[0] + 0.5,
          NOTE_REST[1] + 0.95 + (still ? 0 : Math.sin(clock.elapsedTime * 3) * 0.04),
          NOTE_REST[2] - 0.2,
        ]
      : [home[0], home[1] + (hover.current && active ? 0.2 : 0), home[2]];
    const s = still ? 1 : Math.min(1, dt * 9);
    node.position.x += (goal[0] - node.position.x) * s;
    node.position.y += (goal[1] - node.position.y) * s;
    node.position.z += (goal[2] - node.position.z) * s;
  });
  return (
    <group
      ref={group}
      position={[home[0], home[1], home[2]]}
      onClick={(event) => {
        event.stopPropagation();
        if (active) onUse();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        hover.current = true;
        if (active) setCursor(true);
      }}
      onPointerOut={() => {
        hover.current = false;
        setCursor(false);
      }}
    >
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.4, 0.14, 8]} />
        <meshStandardMaterial color={STAMP_COLOR[verdict]} flatShading />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.17, 0.4, 6]} />
        <meshStandardMaterial color={woodDark} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={wood} flatShading />
      </mesh>
      {!held && <Tag position={[0, 1.0, 0]}>{STAMP_LABEL[verdict]}</Tag>}
    </group>
  );
}

/** Una nota de papel: hoja con renglones de tinta. */
function Paper({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.04, 2.2]} />
        <meshStandardMaterial color={NIGHT.paper} flatShading />
      </mesh>
      <mesh position={[0, 0.025, -0.82]}>
        <boxGeometry args={[1.3, 0.012, 0.22]} />
        <meshStandardMaterial color={NIGHT.ink} flatShading />
      </mesh>
      {[-0.4, -0.12, 0.16, 0.44, 0.72].map((z, i) => (
        <mesh key={z} position={[i % 2 ? -0.1 : 0, 0.025, z]}>
          <boxGeometry args={[i % 2 ? 1.1 : 1.3, 0.012, 0.07]} />
          <meshStandardMaterial color="#7d93ad" flatShading />
        </mesh>
      ))}
      <mesh position={[0.5, 0.025, -0.4]}>
        <boxGeometry args={[0.4, 0.012, 0.4]} />
        <meshStandardMaterial color="#b9c8d6" flatShading />
      </mesh>
    </group>
  );
}

/** La nota actual: baja por el tubo y se posa en el centro de la mesa. */
function CurrentNote({
  index,
  visible,
  still,
}: {
  index: number;
  visible: boolean;
  still: boolean;
}) {
  const group = useRef<Group>(null);
  const seen = useRef({ index: -1, t0: 0 });
  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    if (seen.current.index !== index) seen.current = { index, t0: clock.elapsedTime };
    const t = still ? 1 : clamp01((clock.elapsedTime - seen.current.t0) / 0.9);
    const k = easeOutCubic(t);
    node.visible = visible;
    node.position.set(
      NOTE_REST[0],
      TUBE_MOUTH[1] + (NOTE_REST[1] - TUBE_MOUTH[1]) * k,
      TUBE_MOUTH[2] + (NOTE_REST[2] - TUBE_MOUTH[2]) * k,
    );
    node.rotation.set((-Math.PI / 2) * (1 - k) * 0.9, 0, (1 - k) * 0.5);
  });
  return (
    <group ref={group}>
      <Paper />
    </group>
  );
}

/** Una nota sellada que vuela a su bandeja y se queda apilada. */
function SealedPaper({ note, still }: { note: SealedNote; still: boolean }) {
  const group = useRef<Group>(null);
  const t0 = useRef<number | null>(null);
  const to = useMemo<Vec3>(() => {
    const base = TRAY_AT[note.tray];
    return [base[0], base[1] + 0.12 + note.slot * 0.05, base[2]];
  }, [note.tray, note.slot]);
  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    t0.current ??= clock.elapsedTime;
    const t = still ? 1 : clamp01((clock.elapsedTime - t0.current) / 0.95);
    const [x, y, z] = arc(NOTE_REST, to, t, note.tray === 'papelera' ? 1.1 : 1.8);
    node.position.set(x, y, z);
    node.rotation.set(0, (note.slot % 3) * 0.12 - 0.12, note.tray === 'papelera' ? t * 2.4 : 0);
    const s = 1 - 0.45 * easeOutCubic(t);
    node.scale.setScalar(s);
  });
  return (
    <group ref={group} position={[NOTE_REST[0], NOTE_REST[1], NOTE_REST[2]]}>
      <Paper />
    </group>
  );
}

function TrayBox({ tray }: { tray: Tray }) {
  const at = TRAY_AT[tray];
  if (tray === 'papelera') {
    return (
      <group position={[at[0], at[1], at[2]]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.55, 0.9, 8, 1, true]} />
          <meshStandardMaterial color={BUILD.metal} flatShading side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.04, 8]} />
          <meshStandardMaterial color={BUILD.stoneDark} flatShading />
        </mesh>
        <Tag position={[0, 1.3, 0]}>{`${TRAY_LABEL[tray]} · D`}</Tag>
      </group>
    );
  }
  const color = tray === 'aire' ? '#2c7a4b' : ATLAS.sun;
  return (
    <group position={[at[0], at[1], at[2]]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[1.5, 0.06, 1.8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.72, 0.12, 0]}>
          <boxGeometry args={[0.06, 0.2, 1.8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.12, 0.87]}>
        <boxGeometry args={[1.5, 0.2, 0.06]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <Tag position={[0, 0.75, 1.1]}>{TRAY_LABEL[tray]}</Tag>
    </group>
  );
}

/** Reloj de pared: las manecillas siguen los minutos que quedan hasta el cierre. */
function WallClock({ clock }: { clock: number }) {
  const hands = clockHands(clock);
  return (
    <group position={[-3.4, 4.5, -3.12]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.12, 20]} />
        <meshStandardMaterial color={woodDark} flatShading />
      </mesh>
      <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.04, 20]} />
        <meshStandardMaterial
          color="#f3ecd8"
          emissive="#6c5a3a"
          emissiveIntensity={0.25}
          flatShading
        />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin((i / 12) * Math.PI * 2) * 0.68,
            Math.cos((i / 12) * Math.PI * 2) * 0.68,
            0.1,
          ]}
        >
          <boxGeometry args={[0.06, i % 3 === 0 ? 0.16 : 0.09, 0.02]} />
          <meshStandardMaterial color={NIGHT.ink} flatShading />
        </mesh>
      ))}
      <group position={[0, 0, 0.13]} rotation={[0, 0, -hands.hour]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.07, 0.42, 0.02]} />
          <meshStandardMaterial color={NIGHT.ink} flatShading />
        </mesh>
      </group>
      <group position={[0, 0, 0.16]} rotation={[0, 0, -hands.minute]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.05, 0.62, 0.02]} />
          <meshStandardMaterial color={ATLAS.route} flatShading />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
        <meshStandardMaterial color={ATLAS.route} flatShading />
      </mesh>
    </group>
  );
}

/** Letrero «AL AIRE»: se enciende unos segundos cuando una nota sale a emisión. */
function OnAirSign({ pulse, still }: { pulse: number; still: boolean }) {
  const lamp = useRef<Mesh>(null);
  const seen = useRef({ pulse: 0, t0: -99 });
  useFrame(({ clock }) => {
    if (seen.current.pulse !== pulse) seen.current = { pulse, t0: clock.elapsedTime };
    const age = clock.elapsedTime - seen.current.t0;
    const on = age < 4;
    const fade = on ? 1 - clamp01((age - 3) / 1) : 0;
    const material = lamp.current?.material as MeshStandardMaterial | undefined;
    if (material) {
      material.emissiveIntensity = 0.12 + fade * (still ? 1.6 : 1.8 + Math.sin(age * 2) * 0.2);
    }
  });
  return (
    <group position={[-3.4, 6.0, -3.1]}>
      <mesh ref={lamp}>
        <boxGeometry args={[2.3, 0.7, 0.14]} />
        <meshStandardMaterial
          color="#9c1f26"
          emissive="#ff3b3f"
          emissiveIntensity={0.12}
          flatShading
        />
      </mesh>
      <Label
        text="AL AIRE"
        position={[0, 0, 0.1]}
        height={0.4}
        size={44}
        fg="#ffffff"
        bg="rgba(0,0,0,0)"
        billboard={false}
      />
    </group>
  );
}

const LIGHTS = Array.from({ length: 22 }, (_, i) => ({
  x: -3.6 + ((i * 37) % 29) * 0.25,
  y: 3.0 + (((i * 53) % 7) / 7) * 0.5,
  warm: i % 3 === 0,
}));

/** La ventana al puerto: luna, casas con luces, el mástil de la radio y el mar. */
function PortWindow({ still }: { still: boolean }) {
  const lights = useRef<InstancedMesh>(null);
  const beacon = useRef<Mesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const warm = useMemo(() => new Color(NIGHT.lamp), []);
  const cool = useMemo(() => new Color('#bfe0ff'), []);
  useEffect(() => {
    const mesh = lights.current;
    if (!mesh) return;
    LIGHTS.forEach((l, i) => {
      dummy.position.set(l.x, l.y, 0.05);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, l.warm ? warm : cool);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy, warm, cool]);
  useFrame(({ clock }) => {
    const material = beacon.current?.material as MeshStandardMaterial | undefined;
    if (material)
      material.emissiveIntensity = still
        ? 1
        : 0.6 + 0.6 * Math.abs(Math.sin(clock.elapsedTime * 1.2));
  });
  return (
    <group position={[2.6, 0, -3.14]}>
      <mesh position={[0, 3.9, 0]}>
        <boxGeometry args={[4.6, 3.0, 0.1]} />
        <meshStandardMaterial color={NIGHT.sky} emissive="#142b52" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-1.3, 5.0, 0.08]}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color="#fff3d2" emissive="#fff3d2" emissiveIntensity={1.2} />
      </mesh>
      {[
        [-1.4, 2.65, 1.1, 0.7],
        [-0.2, 2.7, 0.9, 0.9],
        [1.3, 2.65, 1.3, 0.6],
      ].map(([x, y, w, h]) => (
        <mesh key={String(x)} position={[x ?? 0, y ?? 0, 0.07]}>
          <boxGeometry args={[w ?? 1, h ?? 1, 0.04]} />
          <meshStandardMaterial color="#10264a" flatShading />
        </mesh>
      ))}
      <instancedMesh ref={lights} args={[undefined, undefined, LIGHTS.length]}>
        <boxGeometry args={[0.07, 0.07, 0.03]} />
        <meshBasicMaterial />
      </instancedMesh>
      <mesh position={[1.7, 4.2, 0.08]}>
        <cylinderGeometry args={[0.03, 0.07, 1.7, 5]} />
        <meshStandardMaterial color="#0a1730" flatShading />
      </mesh>
      <mesh ref={beacon} position={[1.7, 5.08, 0.08]}>
        <icosahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color="#ff5a5f" emissive="#ff3b3f" emissiveIntensity={1} />
      </mesh>
      {/* Marco */}
      {[
        [0, 5.45, 4.8, 0.14],
        [0, 2.35, 4.8, 0.14],
      ].map(([x, y, w, h]) => (
        <mesh key={String(y)} position={[x ?? 0, y ?? 0, 0.1]}>
          <boxGeometry args={[w ?? 1, h ?? 1, 0.14]} />
          <meshStandardMaterial color={woodDark} flatShading />
        </mesh>
      ))}
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={x} position={[x, 3.9, 0.1]}>
          <boxGeometry args={[0.14, 3.2, 0.14]} />
          <meshStandardMaterial color={woodDark} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Room() {
  return (
    <group>
      <mesh position={[0, 3.4, -3.2]} receiveShadow>
        <boxGeometry args={[22, 7.4, 0.2]} />
        <meshStandardMaterial color={NIGHT.wall} flatShading />
      </mesh>
      <mesh position={[0, 0.45, -3.05]}>
        <boxGeometry args={[22, 0.9, 0.12]} />
        <meshStandardMaterial color={NIGHT.wallDark} flatShading />
      </mesh>
      <mesh position={[0, -0.05, 2]} receiveShadow>
        <boxGeometry args={[22, 0.1, 12]} />
        <meshStandardMaterial color={NIGHT.floor} flatShading />
      </mesh>
      {/* Escritorio */}
      <mesh position={[0, DESK_Y - 0.09, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[12.2, 0.18, 4.4]} />
        <meshStandardMaterial color={wood} flatShading />
      </mesh>
      <mesh position={[0, DESK_Y - 0.55, 2.4]}>
        <boxGeometry args={[12.2, 0.9, 0.1]} />
        <meshStandardMaterial color={woodDark} flatShading />
      </mesh>
      {[-5.8, 5.8].map((x) => (
        <mesh key={x} position={[x, 0.4, 0.3]} castShadow>
          <boxGeometry args={[0.4, 0.9, 4.0]} />
          <meshStandardMaterial color={woodDark} flatShading />
        </mesh>
      ))}
      {/* Tubo neumático */}
      <mesh position={[0, 5.9, -1.1]}>
        <cylinderGeometry args={[0.55, 0.55, 3.2, 10, 1, true]} />
        <meshStandardMaterial color={BUILD.metal} flatShading side={DoubleSide} />
      </mesh>
      <mesh position={[0, 4.3, -1.1]}>
        <cylinderGeometry args={[0.72, 0.55, 0.3, 10]} />
        <meshStandardMaterial color={ISLE.comunicarte} flatShading />
      </mesh>
      <mesh position={[0, 7.5, -1.9]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 2.4, 10, 1, true]} />
        <meshStandardMaterial color={BUILD.metal} flatShading side={DoubleSide} />
      </mesh>
      {/* Lámpara de mesa */}
      <group position={[-5.0, DESK_Y, -1.2]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 0.12, 8]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.7, 5]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
        <mesh position={[0.3, 1.75, 0.2]} rotation={[0.5, 0, -0.5]}>
          <coneGeometry args={[0.5, 0.6, 8, 1, true]} />
          <meshStandardMaterial color={ISLE.comunicarte} flatShading side={DoubleSide} />
        </mesh>
      </group>
      {/* Micrófono */}
      <group position={[5.1, DESK_Y, 0.6]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.3, 0.34, 0.1, 8]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.3, 5]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
        <mesh position={[0, 1.45, 0]}>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={BUILD.stoneDark} flatShading />
        </mesh>
      </group>
    </group>
  );
}

export interface DeskSceneProps {
  /** Posición de la nota actual en la cola (cambia al llegar una nueva). */
  index: number;
  /** ¿Hay una nota en la mesa? */
  hasNote: boolean;
  clock: number;
  /** Señales ya investigadas de la nota actual. */
  revealed: readonly Signal[];
  /** Sello en la mano, a la espera de justificar. */
  held: Verdict | null;
  sealed: readonly SealedNote[];
  /** Sube cada vez que una nota sale al aire (enciende el letrero). */
  airPulse: number;
  still: boolean;
  interactive: boolean;
  onInvestigate: (signal: Signal) => void;
  onStamp: (verdict: Verdict) => void;
}

export function DeskScene({
  index,
  hasNote,
  clock,
  revealed,
  held,
  sealed,
  airPulse,
  still,
  interactive,
  onInvestigate,
  onStamp,
}: DeskSceneProps) {
  const canInvestigate = interactive && hasNote && held === null;
  const canStamp = interactive && hasNote;
  return (
    <>
      <color attach="background" args={['#0a1a36']} />
      <fog attach="fog" args={['#0a1a36', 26, 60]} />
      <hemisphereLight args={['#8fb4e8', '#2b1d18', 0.55]} />
      <directionalLight
        position={[-6, 12, 6]}
        color="#9bb8e6"
        intensity={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <pointLight
        position={[-3.8, 3.9, -0.4]}
        color={NIGHT.lamp}
        intensity={38}
        distance={14}
        decay={1.6}
      />
      <pointLight
        position={[0.5, 3.2, 3]}
        color="#ffe2b8"
        intensity={14}
        distance={12}
        decay={1.6}
      />
      <DeskCamera />
      <Room />
      <PortWindow still={still} />
      <WallClock clock={clock} />
      <OnAirSign pulse={airPulse} still={still} />

      <Tool
        signal="fuente"
        done={revealed.includes('fuente')}
        active={canInvestigate}
        still={still}
        onUse={() => {
          onInvestigate('fuente');
        }}
      >
        <Lupa />
      </Tool>
      <Tool
        signal="fecha"
        done={revealed.includes('fecha')}
        active={canInvestigate}
        still={still}
        onUse={() => {
          onInvestigate('fecha');
        }}
      >
        <Calendario />
      </Tool>
      <Tool
        signal="cita"
        done={revealed.includes('cita')}
        active={canInvestigate}
        still={still}
        onUse={() => {
          onInvestigate('cita');
        }}
      >
        <Archivador />
      </Tool>
      <Tool
        signal="imagen"
        done={revealed.includes('imagen')}
        active={canInvestigate}
        still={still}
        onUse={() => {
          onInvestigate('imagen');
        }}
      >
        <MesaDeLuz lit={revealed.includes('imagen')} />
      </Tool>

      {VERDICTS.map((v) => (
        <Stamp
          key={v}
          verdict={v}
          held={held === v}
          active={canStamp}
          still={still}
          onUse={() => {
            onStamp(v);
          }}
        />
      ))}
      {(Object.keys(TRAY_AT) as Tray[]).map((tray) => (
        <TrayBox key={tray} tray={tray} />
      ))}
      <CurrentNote index={index} visible={hasNote} still={still} />
      {sealed.map((note) => (
        <SealedPaper key={note.id} note={note} still={still} />
      ))}
    </>
  );
}
