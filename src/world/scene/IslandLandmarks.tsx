import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import type { Island } from '@/types/domain';
import { islandLandmarks, type Landmark } from '../landmarks';
import { ATLAS, BUILD, ISLE } from '../palette';
import { islandKit, pieceGeometry, PLINTH_TOP, STATUE_MOTION, type Part } from './landmarkKit';

/** Las islas sin su fragmento quedan veladas por la bruma, también sus construcciones. */
const haze = (lit: number) => ({ emissive: ATLAS.haze, emissiveIntensity: (1 - lit) * 0.22 });

/**
 * Lo construido en una isla: una sola malla para lo estático y, aparte, lo que
 * se mueve (la radio que transmite, la cúpula del observatorio, la bandera del
 * cabildo, la grúa, las aspas, la bombilla, la ceiba que late y lo vivo de cada
 * monumento). Decorativo.
 */
export function IslandLandmarks({
  island,
  lit,
  still,
  landmarks: custom,
  kitKey,
}: {
  island: Island;
  lit: number;
  still: boolean;
  /** Otra disposición (el lugar de una estación en 3D); `kitKey` la distingue en la caché. */
  landmarks?: Landmark[];
  kitKey?: string;
}) {
  const landmarks = custom ?? islandLandmarks(island);
  const key = kitKey ?? island.id;
  const geometry = useMemo(() => islandKit(key, landmarks), [key, landmarks]);

  return (
    <group>
      {geometry && (
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.85} {...haze(lit)} />
        </mesh>
      )}
      {landmarks.map((l, i) =>
        MOVES.has(l.kind) ? (
          <group key={i} position={l.position} rotation-y={l.rotation} scale={l.scale}>
            <Moving landmark={l} lit={lit} still={still} />
          </group>
        ) : null,
      )}
    </group>
  );
}

const MOVES = new Set<Landmark['kind']>([
  'radio',
  'observatorio',
  'solido',
  'campanario',
  'grua',
  'aerogenerador',
  'bombilla',
  'ceiba',
  'cerebro',
  'libro',
  'balanza',
  'timon',
  'cohete',
  'corazon',
]);

function Moving({ landmark, lit, still }: { landmark: Landmark; lit: number; still: boolean }) {
  switch (landmark.kind) {
    case 'radio':
      return <RadioBeacon lit={lit} still={still} />;
    case 'observatorio':
      return <ObservatoryDome lit={lit} still={still} />;
    case 'solido':
      return <SpinningSolid variant={landmark.variant} lit={lit} still={still} />;
    case 'campanario':
      return <Flag lit={lit} still={still} />;
    case 'grua':
      return <CraneBoom lit={lit} still={still} />;
    case 'aerogenerador':
      return <Rotor lit={lit} still={still} />;
    case 'bombilla':
      return <Bulb still={still} />;
    case 'ceiba':
      return <Canopy lit={lit} still={still} />;
    case 'cerebro':
      return (
        <>
          <ThoughtWaves still={still} />
          <SpeechBubble lit={lit} still={still} />
        </>
      );
    case 'libro':
      return (
        <>
          <FloatingPi still={still} />
          <OrbitingGlyphs still={still} />
        </>
      );
    case 'balanza':
      return <ScaleBeam lit={lit} still={still} />;
    case 'timon':
      return <HelmWheel lit={lit} still={still} />;
    case 'cohete':
      return <Rocket lit={lit} still={still} />;
    case 'corazon':
      return <Heart still={still} />;
    default:
      return null;
  }
}

function Solid({ children, color, lit }: { children: ReactNode; color: string; lit: number }) {
  return (
    <mesh castShadow>
      {children}
      <meshStandardMaterial color={color} flatShading roughness={0.8} {...haze(lit)} />
    </mesh>
  );
}

/** Luz roja que parpadea en lo alto del mástil y ondas que se abren al transmitir. */
function RadioBeacon({ lit, still }: { lit: number; still: boolean }) {
  const light = useRef<MeshStandardMaterial>(null);
  const waves = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.emissiveIntensity = still || t % 1.2 < 0.6 ? 1.4 : 0.15;
    waves.current.forEach((wave, i) => {
      if (!wave) return;
      const k = still ? 0.5 : (t * 0.45 + i * 0.5) % 1;
      wave.scale.setScalar(0.4 + k * 3.2);
      (wave.material as MeshStandardMaterial).opacity = still ? 0 : 0.5 * (1 - k);
    });
  });
  return (
    <group position={[0, 1.96, -0.16]}>
      <mesh>
        <icosahedronGeometry args={[0.045, 0]} />
        <meshStandardMaterial ref={light} color={ATLAS.route} emissive={ATLAS.route} flatShading />
      </mesh>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            waves.current[i] = mesh;
          }}
          rotation-x={Math.PI / 2}
        >
          <torusGeometry args={[0.12, 0.006, 3, 24]} />
          <meshStandardMaterial
            color={ATLAS.plate}
            emissive={ATLAS.plate}
            emissiveIntensity={0.4 + (1 - lit) * 0.2}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Cúpula con su ranura y el telescopio: gira despacio buscando estrellas. */
function ObservatoryDome({ lit, still }: { lit: number; still: boolean }) {
  const dome = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (dome.current) dome.current.rotation.y = still ? 0.4 : clock.elapsedTime * 0.12;
  });
  return (
    <group ref={dome} position-y={0.32}>
      <Solid color="#dfe7ea" lit={lit}>
        <sphereGeometry args={[0.25, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Solid>
      <mesh position={[0, 0.12, 0.17]} rotation-x={-0.75}>
        <boxGeometry args={[0.07, 0.2, 0.03]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <Solid color={ISLE.neuromath} lit={lit}>
        <cylinderGeometry args={[0.03, 0.045, 0.34, 6]} />
      </Solid>
    </group>
  );
}

const SOLIDS = [
  <icosahedronGeometry key="ico" args={[0.1, 0]} />,
  <octahedronGeometry key="octa" args={[0.11, 0]} />,
  <tetrahedronGeometry key="tetra" args={[0.12, 0]} />,
  <dodecahedronGeometry key="dodeca" args={[0.1, 0]} />,
];

/** Sólido platónico sobre su pedestal, girando sobre dos ejes. */
function SpinningSolid({ variant, lit, still }: { variant: number; lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || still) return;
    const t = clock.elapsedTime + variant * 1.7;
    ref.current.rotation.set(t * 0.3, t * 0.5, 0);
  });
  return (
    <group ref={ref} position-y={0.24} rotation={[0.4, variant, 0]}>
      <Solid color={variant % 2 ? ATLAS.sun : ISLE.neuromath} lit={lit}>
        {SOLIDS[variant % SOLIDS.length]}
      </Solid>
    </group>
  );
}

/** Bandera en lo alto del campanario del cabildo. */
function Flag({ lit, still }: { lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.rotation.y = still ? 0.2 : Math.sin(clock.elapsedTime * 2.2) * 0.35;
  });
  return (
    <group position-y={0.94}>
      <mesh position-y={0.13}>
        <cylinderGeometry args={[0.008, 0.008, 0.26, 4]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <group ref={ref} position-y={0.21}>
        <Solid color={ISLE.voxcivitas} lit={lit}>
          <boxGeometry args={[0.16, 0.09, 0.006]} />
        </Solid>
      </group>
    </group>
  );
}

/** Pluma de la grúa del astillero, que va y viene sobre los barcos. */
function CraneBoom({ lit, still }: { lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.rotation.y = still ? 0.6 : Math.sin(clock.elapsedTime * 0.25) * 0.9;
  });
  return (
    <group ref={ref} position-y={1.12}>
      <mesh position-y={0.04}>
        <boxGeometry args={[0.14, 0.12, 0.14]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading {...haze(lit)} />
      </mesh>
      <Solid color={ATLAS.sun} lit={lit}>
        <boxGeometry args={[1.0, 0.05, 0.06]} />
      </Solid>
      <mesh position-x={-0.4}>
        <boxGeometry args={[0.14, 0.1, 0.1]} />
        <meshStandardMaterial color={BUILD.stoneDark} flatShading />
      </mesh>
      <mesh position={[0.42, -0.25, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.5, 3]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <mesh position={[0.42, -0.52, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial color={ATLAS.route} flatShading />
      </mesh>
    </group>
  );
}

/** Aspas del aerogenerador del taller. */
function Rotor({ lit, still }: { lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = still ? 0.3 : clock.elapsedTime * 1.1;
  });
  return (
    <group ref={ref} position={[0, 1.5, 0.11]}>
      <mesh>
        <icosahedronGeometry args={[0.045, 0]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading />
      </mesh>
      {[0, 1, 2].map((k) => (
        <group key={k} rotation-z={(k * Math.PI * 2) / 3}>
          <mesh position-y={0.3} castShadow>
            <boxGeometry args={[0.035, 0.58, 0.012]} />
            <meshStandardMaterial color={ATLAS.plate} flatShading {...haze(lit)} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** La bombilla de la idea: respira con una luz cálida. */
function Bulb({ still }: { still: boolean }) {
  const ref = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.emissiveIntensity = still
        ? 0.6
        : 0.45 + 0.4 * (Math.sin(clock.elapsedTime * 1.6) + 1) * 0.5;
    }
  });
  return (
    <mesh position-y={0.33} castShadow>
      <icosahedronGeometry args={[0.13, 1]} />
      <meshStandardMaterial
        ref={ref}
        color={ATLAS.sun}
        emissive={ATLAS.sun}
        flatShading
        roughness={0.4}
      />
    </mesh>
  );
}

/** Latido doble (lub-dub) cada 1,6 s: lo comparten la ceiba y el corazón de LatidoSocial. */
function heartbeat(time: number): number {
  const t = time % 1.6;
  return Math.exp(-((t - 0.1) ** 2) / 0.003) + 0.6 * Math.exp(-((t - 0.32) ** 2) / 0.003);
}

const CANOPY = [
  { at: [0, 0.06, 0] as const, r: 0.36, color: BUILD.leaf[0] },
  { at: [0.22, 0, 0.08] as const, r: 0.26, color: BUILD.leaf[1] },
  { at: [-0.2, 0.02, -0.06] as const, r: 0.28, color: BUILD.leaf[2] },
  { at: [0.04, 0.12, -0.18] as const, r: 0.24, color: BUILD.leaf[0] },
];

/** Copa ancha de la ceiba del encuentro: late, como el corazón de la isla. */
function Canopy({ lit, still }: { lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.scale.setScalar(still ? 1 : 1 + heartbeat(clock.elapsedTime) * 0.035);
  });
  return (
    <group ref={ref} position-y={0.62}>
      {CANOPY.map((c, i) => (
        <mesh key={i} position={c.at} scale={[1, 0.5, 1]} castShadow>
          <icosahedronGeometry args={[c.r, 0]} />
          <meshStandardMaterial color={c.color} flatShading roughness={0.9} {...haze(lit)} />
        </mesh>
      ))}
    </group>
  );
}

/** Pieza móvil de un monumento: varias partes fundidas en una malla con color por vértice. */
function Piece({ name, parts, lit }: { name: string; parts: () => readonly Part[]; lit: number }) {
  return (
    <mesh geometry={pieceGeometry(name, parts)} castShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.8} {...haze(lit)} />
    </mesh>
  );
}

const DOTS = [-0.075, 0, 0.075];

/** Globo de diálogo junto al cerebro: flota y sus tres puntos escriben, como quien va a hablar. */
function SpeechBubble({ lit, still }: { lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  const dots = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current)
      ref.current.position.y = PLINTH_TOP + 0.74 + (still ? 0 : Math.sin(t * 1.3) * 0.025);
    dots.current.forEach((dot, k) => {
      dot?.scale.setScalar(still ? 1 : 1 + 0.55 * Math.max(0, Math.sin(t * 4.2 - k * 0.9)));
    });
  });
  return (
    <group ref={ref} position={[0.3, PLINTH_TOP + 0.74, 0.04]}>
      <Piece name="bubble" parts={STATUE_MOTION.bubble} lit={lit} />
      {DOTS.map((x, k) => (
        <mesh
          key={x}
          ref={(mesh) => {
            dots.current[k] = mesh;
          }}
          position-x={x}
          rotation-x={Math.PI / 2}
        >
          <cylinderGeometry args={[0.026, 0.026, 0.07, 8]} />
          <meshStandardMaterial color={ISLE.comunicarte} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Ondas de pensamiento: anillos que se abren alrededor del cerebro, como la radio del puerto. */
function ThoughtWaves({ still }: { still: boolean }) {
  const waves = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    waves.current.forEach((wave, i) => {
      if (!wave) return;
      const k = (clock.elapsedTime * 0.32 + i / 3) % 1;
      wave.scale.setScalar(1 + k * 1.25);
      (wave.material as MeshStandardMaterial).opacity = still ? 0 : 0.5 * (1 - k) ** 1.6;
    });
  });
  return (
    <group position-y={PLINTH_TOP + 0.4}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            waves.current[i] = mesh;
          }}
          rotation-x={Math.PI / 2}
        >
          <torusGeometry args={[0.32, 0.012, 3, 40]} />
          <meshStandardMaterial
            color={BRAIN_WAVE}
            emissive={BRAIN_WAVE}
            emissiveIntensity={0.6}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

const BRAIN_WAVE = '#f2a7c0';

/** Signos que orbitan el libro: más, por y igual, cada uno girando sobre sí. */
const GLYPHS = [
  {
    name: 'mas',
    color: ATLAS.sun,
    parts: [
      [0.16, 0.045],
      [0.045, 0.16],
    ],
  },
  {
    name: 'por',
    color: ATLAS.plate,
    parts: [
      [0.16, 0.045],
      [0.045, 0.16],
    ],
    tilt: Math.PI / 4,
  },
  {
    name: 'igual',
    color: ATLAS.sun,
    parts: [
      [0.16, 0.04, 0.035],
      [0.16, 0.04, -0.035],
    ],
  },
] as const;

function OrbitingGlyphs({ still }: { still: boolean }) {
  const ring = useRef<Group>(null);
  const spins = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.y = still ? 0.6 : t * 0.35;
    spins.current.forEach((g, i) => {
      if (g && !still) g.rotation.y = -t * 0.35 + Math.sin(t * 1.2 + i) * 0.4;
    });
  });
  return (
    <group ref={ring} position-y={PLINTH_TOP + 0.62}>
      {GLYPHS.map((glyph, i) => {
        const a = (i / GLYPHS.length) * Math.PI * 2;
        return (
          <group
            key={glyph.name}
            ref={(g) => {
              spins.current[i] = g;
            }}
            position={[Math.cos(a) * 0.55, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.55]}
          >
            <group rotation-z={'tilt' in glyph ? glyph.tilt : 0}>
              {glyph.parts.map(([w, h, y = 0], k) => (
                <mesh key={k} position-y={y} castShadow>
                  <boxGeometry args={[w, h, 0.045]} />
                  <meshStandardMaterial
                    color={glyph.color}
                    emissive={glyph.color}
                    emissiveIntensity={0.3}
                    flatShading
                  />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** La π dorada que gira y flota sobre el libro abierto. */
function FloatingPi({ still }: { still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = still ? 0 : Math.sin(t * 0.5) * 0.9;
    ref.current.position.y = PLINTH_TOP + 0.92 + (still ? 0 : Math.sin(t * 1.1) * 0.03);
  });
  return (
    <group ref={ref} position={[0, PLINTH_TOP + 0.92, -0.1]}>
      <mesh geometry={pieceGeometry('pi', STATUE_MOTION.pi)} castShadow>
        <meshStandardMaterial
          color={ATLAS.sun}
          emissive={ATLAS.sun}
          emissiveIntensity={0.55}
          flatShading
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

/** Astil de la balanza que oscila; los platillos cuelgan siempre a plomo. */
function ScaleBeam({ lit, still }: { lit: number; still: boolean }) {
  const beam = useRef<Group>(null);
  const pans = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const tilt = still ? 0.06 : Math.sin(clock.elapsedTime * 0.7) * 0.13;
    if (beam.current) beam.current.rotation.z = tilt;
    for (const pan of pans.current) if (pan) pan.rotation.z = -tilt;
  });
  return (
    <group ref={beam} position={[0, PLINTH_TOP + 0.62, 0.05]}>
      <Piece name="beam" parts={STATUE_MOTION.beam} lit={lit} />
      {([-1, 1] as const).map((side, k) => (
        <group
          key={side}
          ref={(group) => {
            pans.current[k] = group;
          }}
          position-x={side * 0.4}
        >
          <Piece name={`pan${String(side)}`} parts={() => STATUE_MOTION.pan(side)} lit={lit} />
        </group>
      ))}
    </group>
  );
}

/** Rueda del timón: va y viene, como quien corrige el rumbo. */
function HelmWheel({ lit, still }: { lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.rotation.z = still ? 0.2 : Math.sin(clock.elapsedTime * 0.45) * 1.1;
  });
  return (
    <group ref={ref} position={[0, PLINTH_TOP + 0.5, 0.05]}>
      <Piece name="wheel" parts={STATUE_MOTION.wheel} lit={lit} />
    </group>
  );
}

/** El cohete flota sobre su engranaje con la llama encendida. */
function Rocket({ lit, still }: { lit: number; still: boolean }) {
  const ref = useRef<Group>(null);
  const flame = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current)
      ref.current.position.y = PLINTH_TOP + 0.13 + (still ? 0 : Math.sin(t * 1.5) * 0.03);
    if (flame.current)
      flame.current.scale.y = still
        ? 1
        : 0.8 + 0.35 * Math.abs(Math.sin(t * 13) * Math.sin(t * 7.3));
  });
  return (
    <group ref={ref} position={[0, PLINTH_TOP + 0.13, 0]}>
      <Piece name="rocket" parts={STATUE_MOTION.rocket} lit={lit} />
      <group ref={flame}>
        <mesh position-y={-0.075} rotation-x={Math.PI}>
          <coneGeometry args={[0.055, 0.15, 6]} />
          <meshStandardMaterial
            color={ATLAS.sun}
            emissive="#ff8a1f"
            emissiveIntensity={0.9}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
}

/** El corazón entre las manos, que late con la ceiba de la isla. */
function Heart({ still }: { still: boolean }) {
  const ref = useRef<Group>(null);
  const glow = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const beat = still ? 0 : heartbeat(clock.elapsedTime);
    ref.current?.scale.setScalar(1 + beat * 0.09);
    if (glow.current) glow.current.emissiveIntensity = 0.18 + beat * 0.55;
  });
  return (
    <group ref={ref} position={[0, PLINTH_TOP + 0.6, 0.02]}>
      {/* Brilla con cada latido: se ve desde cualquier punto del archipiélago. */}
      <mesh geometry={pieceGeometry('heart', STATUE_MOTION.heart)} castShadow>
        <meshStandardMaterial
          ref={glow}
          color={ATLAS.route}
          emissive={ATLAS.route}
          emissiveIntensity={0.18}
          flatShading
          roughness={0.55}
        />
      </mesh>
    </group>
  );
}
