import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Group } from 'three';
import type { Bridge } from '@/data/contentSchemas';
import type { TestOutcome } from '@/minigames/puentes-de-fractal/engine';
import { seeded } from '@/boss/engine';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import {
  archAt,
  cartLaunchSpeed,
  cartX,
  CANYON,
  hasCollapsed,
  testScript,
  worldPerMeter,
  type TestScript,
} from './canyon';
import { launch } from './debris';
import { Label } from './Label';
import { useCompact } from './useCompact';
import { DebrisField, Plank, type Falling, type PlankLook } from './parts';
import { plankSpots } from './workbench';

const DECK_WIDTH = 1.5;
const CART_Y = 0.46;

/** Una prueba en curso (o ya terminada) de la vagoneta. */
export interface CanyonRun {
  serial: number;
  outcome: TestOutcome;
  /** Metros que suman los tramos puestos. */
  total: number;
}

interface Vis {
  serial: number;
  t: number;
  done: boolean;
  collapsed: boolean;
  script: TestScript | null;
  cart: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Los acantilados geométricos, el agua y el observatorio. */
function Cliffs({ still }: { still: boolean }) {
  const rocks = [
    [-11.4, -2.6, 3.4, 2.4],
    [-6.8, -3.6, -3.6, 1.8],
    [11.8, -2.2, 2.6, 2.7],
    [6.6, -3.8, -3.8, 1.9],
  ] as const;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 8.6, 0, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[9, 0.3, 9]} />
            <meshStandardMaterial color={ATLAS.land[0]} flatShading />
          </mesh>
          <mesh position={[0, -2.6, 0]} castShadow>
            <boxGeometry args={[8.8, 4.6, 8.8]} />
            <meshStandardMaterial color={BUILD.stone} flatShading roughness={1} />
          </mesh>
          <mesh position={[side * -0.35, -5.4, 0]}>
            <boxGeometry args={[8.2, 2.8, 8.2]} />
            <meshStandardMaterial color={BUILD.stoneDark} flatShading roughness={1} />
          </mesh>
        </group>
      ))}
      {/* Terraza de enfrente: el estante de piezas */}
      <group position={[0, 0, 8.4]}>
        <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[30, 0.3, 8]} />
          <meshStandardMaterial color={ATLAS.land[0]} flatShading />
        </mesh>
        <mesh position={[0, -3.1, 0]}>
          <boxGeometry args={[29.8, 5.6, 7.8]} />
          <meshStandardMaterial color={BUILD.stone} flatShading roughness={1} />
        </mesh>
      </group>
      {rocks.map(([x, y, z, r]) => (
        <mesh key={`${String(x)}${String(z)}`} position={[x, y, z]} rotation={[x, z, 0]} castShadow>
          <dodecahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={BUILD.stoneDark} flatShading roughness={1} />
        </mesh>
      ))}
      {/* Agua del fondo y el mar lejano */}
      <mesh rotation-x={-Math.PI / 2} position-y={CANYON.water} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color={ATLAS.sea[2]} roughness={0.55} />
      </mesh>
      {[-22, 18].map((x, i) => (
        <mesh key={x} position={[x, -2.4, -22 - i * 4]} castShadow>
          <coneGeometry args={[6 + i * 2, 11 + i * 3, 6]} />
          <meshStandardMaterial color={BUILD.stoneDark} flatShading />
        </mesh>
      ))}
      {/* Rieles de la vagoneta a ambos lados */}
      {[-1, 1].flatMap((side) =>
        [-0.42, 0.42].map((z) => (
          <mesh key={`${String(side)}${String(z)}`} position={[side * 5.6, 0.03, z]}>
            <boxGeometry args={[3.2, 0.05, 0.07]} />
            <meshStandardMaterial color={BUILD.metal} flatShading />
          </mesh>
        )),
      )}
      {/* Observatorio */}
      <group position={[9.6, 0, -2.2]}>
        <mesh position-y={0.7} castShadow>
          <cylinderGeometry args={[1.5, 1.7, 1.4, 8]} />
          <meshStandardMaterial color={BUILD.wall} flatShading />
        </mesh>
        <mesh position-y={1.4} castShadow>
          <sphereGeometry args={[1.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={ISLE.neuromath} flatShading />
        </mesh>
        <mesh position={[0.5, 2.1, 0.7]} rotation-z={-0.6}>
          <cylinderGeometry args={[0.1, 0.16, 1.2, 6]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
      </group>
      <Sparks still={still} />
    </group>
  );
}

/** Motas de luz sobre el agua: se detienen con movimiento reducido. */
function Sparks({ still }: { still: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current && !still) group.current.rotation.y = clock.elapsedTime * 0.05;
  });
  return (
    <group ref={group} position-y={CANYON.water + 0.06}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.cos(i * 1.7) * (5 + i), 0, Math.sin(i * 1.7) * (5 + i)]}
          rotation-x={-Math.PI / 2}
        >
          <ringGeometry args={[0.5, 0.6, 6]} />
          <meshBasicMaterial color={ATLAS.plate} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Encuadre del cañón: se aleja en pantallas angostas para que se vea el puente entero. */
function CanyonCamera() {
  const size = useThree((s) => s.size);
  const look = useMemo(() => new Vector3(0, -0.6, 1.2), []);
  useFrame(({ camera }) => {
    const aspect = size.width / size.height;
    const k = Math.min(2.7, Math.max(1, 1.5 / aspect));
    camera.position.set(0, 4.2 * k + 1, 12.2 * k);
    camera.lookAt(look);
  });
  return null;
}

/** La vagoneta de prueba, con su farol. */
function Cart({ x, visible }: { x: number; visible: boolean }) {
  return (
    <group position={[x, CART_Y, 0]} visible={visible}>
      <mesh castShadow>
        <boxGeometry args={[1.1, 0.4, 0.8]} />
        <meshStandardMaterial color={ATLAS.route} flatShading />
      </mesh>
      <mesh position-y={0.24}>
        <boxGeometry args={[0.9, 0.08, 0.62]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading />
      </mesh>
      {[-0.34, 0.34].flatMap((dx) =>
        [-0.42, 0.42].map((dz) => (
          <mesh
            key={`${String(dx)}${String(dz)}`}
            position={[dx, -0.22, dz]}
            rotation-x={Math.PI / 2}
          >
            <cylinderGeometry args={[0.17, 0.17, 0.08, 8]} />
            <meshStandardMaterial color={BUILD.woodDark} flatShading />
          </mesh>
        )),
      )}
      <mesh position={[0.52, 0.34, 0]}>
        <icosahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function ShelfPiece({
  index,
  count,
  label,
  placedAt,
  clickable,
  onPiece,
}: {
  index: number;
  count: number;
  label: string;
  placedAt: number;
  clickable: boolean;
  onPiece: () => void;
}) {
  const compact = useCompact();
  const spacing = Math.min(2.5, 17 / count);
  const x = (index - (count - 1) / 2) * spacing;
  const used = placedAt >= 0;
  return (
    <group position={[x, 0, 5.8]}>
      <mesh
        position-y={0.2}
        castShadow
        onClick={
          clickable
            ? (event) => {
                event.stopPropagation();
                onPiece();
              }
            : undefined
        }
      >
        <boxGeometry args={[Math.min(1.9, spacing - 0.3), 0.4, 1]} />
        <meshStandardMaterial
          color={BUILD.wallWarm}
          flatShading
          transparent={used}
          opacity={used ? 0.35 : 1}
        />
      </mesh>
      <mesh position-y={0.42}>
        <boxGeometry args={[Math.min(1.7, spacing - 0.5), 0.03, 0.2]} />
        <meshStandardMaterial color={ISLE.neuromath} flatShading />
      </mesh>
      <Label
        text={`${label}${used ? ` · tramo ${String(placedAt + 1)}` : ''}`}
        badge={String(index + 1)}
        position={[0, 1.05, 0]}
        height={0.3}
        compact={compact}
      />
    </group>
  );
}

/**
 * El cañón de Puentes de Fractal: acantilados, estante de piezas, tramos a
 * escala sobre el hueco y la vagoneta que los pone a prueba. Solo dibuja:
 * el estado viene del motor y la prueba se anuncia con `onDone`.
 */
export function CanyonScene({
  bridge,
  selected,
  target,
  run,
  clickable,
  still,
  onPiece,
  onTarget,
  onDone,
}: {
  bridge: Bridge;
  selected: readonly string[];
  target: number;
  run: CanyonRun | null;
  clickable: boolean;
  still: boolean;
  onPiece: (pieceId: string) => void;
  onTarget: (slot: number) => void;
  onDone: (serial: number) => void;
}) {
  const compact = useCompact();
  const wpm = worldPerMeter(bridge.gap);
  const spots = useMemo(() => plankSpots(bridge, selected), [bridge, selected]);
  const vis = useRef<Vis>({
    serial: 0,
    t: 0,
    done: true,
    collapsed: false,
    script: null,
    cart: CANYON.cartStart,
  });
  const debris = useRef<Falling[]>([]);
  const cartNode = useRef<Group>(null);
  const random = useMemo(() => seeded(bridge.id.length * 7919 + 11), [bridge.id]);

  const xs = spots.map((s) => ({
    ...s,
    x0: CANYON.left + s.start * wpm,
    x1: CANYON.left + s.end * wpm,
  }));
  const builtEnd = xs.at(-1)?.x1 ?? CANYON.left;
  const empty = Math.max(0, bridge.slots - spots.length);
  const room = Math.max(0, CANYON.right - builtEnd);
  const ghostLength = empty > 0 ? room / empty : 0;
  const targetX = (() => {
    const hit = xs[target];
    if (hit) return (hit.x0 + hit.x1) / 2;
    return builtEnd + ghostLength / 2;
  })();

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const v = vis.current;
    if (!run) {
      v.serial = 0;
      v.script = null;
      v.done = true;
      v.collapsed = false;
      v.t = 0;
      v.cart = CANYON.cartStart;
      debris.current = [];
    } else {
      if (v.serial !== run.serial) {
        v.serial = run.serial;
        v.t = 0;
        v.done = false;
        v.collapsed = false;
        v.script = testScript(run.outcome, CANYON.left + run.total * wpm, still);
        debris.current = [];
      }
      const script = v.script;
      if (script) {
        if (!v.done) v.t += dt;
        v.cart = cartX(script, v.t);
        if (!v.collapsed && hasCollapsed(script, v.t)) {
          v.collapsed = true;
          if (!still) {
            const items: Falling[] = xs.map((s) => ({
              body: launch((s.x0 + s.x1) / 2, 0.05, 0, random, { vy: 1.2 }),
              length: s.x1 - s.x0,
              width: DECK_WIDTH,
              axis: 'x',
              color: BUILD.wood,
            }));
            if (script.outcome === 'corto')
              items.push({
                body: launch(v.cart, CART_Y, 0, random, {
                  vx: cartLaunchSpeed(script),
                  vy: 0.4,
                  spin: 0.6,
                }),
                length: 1.1,
                width: 0.8,
                axis: 'x',
                color: ATLAS.route,
              });
            debris.current = items;
          }
        }
        if (!v.done && v.t >= script.doneAt) {
          v.done = true;
          onDone(run.serial);
        }
      }
    }
    if (cartNode.current) {
      cartNode.current.position.x = v.cart;
      cartNode.current.visible = !(v.collapsed && v.script?.outcome === 'corto');
    }
  });

  const lookFor =
    (x0: number, x1: number): (() => PlankLook) =>
    () => {
      const v = vis.current;
      if (v.collapsed) return { lit: 0, hidden: true };
      const script = v.script;
      if (!script) return { lit: 0 };
      if (script.outcome === 'resiste')
        return { lit: v.done ? 1 : clamp01((v.cart - x0) / Math.max(0.01, x1 - x0)) };
      if (script.outcome === 'largo') return { lit: 0, arch: archAt(script, v.t) };
      return { lit: 0 };
    };

  return (
    <group>
      <CanyonCamera />
      <Cliffs still={still} />
      {xs.map((s) => (
        <group key={s.pieceId}>
          <Plank
            length={s.x1 - s.x0}
            width={DECK_WIDTH}
            axis="x"
            position={[(s.x0 + s.x1) / 2, -0.12, 0]}
            look={lookFor(s.x0, s.x1)}
            onSelect={() => {
              onTarget(s.slot);
            }}
          />
          <Label
            text={s.label}
            badge={String(s.slot + 1)}
            position={[(s.x0 + s.x1) / 2, 0.9, 0]}
            height={0.32}
            compact={compact}
          />
        </group>
      ))}
      {ghostLength > 0.25 &&
        Array.from({ length: empty }, (_, i) => (
          <Plank
            key={`g${String(i)}`}
            length={ghostLength}
            width={DECK_WIDTH}
            axis="x"
            position={[builtEnd + ghostLength * (i + 0.5), -0.12, 0]}
            look={() => ({ lit: 0, ghost: true, hidden: vis.current.collapsed })}
            tone={ISLE.neuromath}
            onSelect={() => {
              onTarget(spots.length + i);
            }}
          />
        ))}
      {/* Marca de la ranura elegida */}
      {!run && (
        <mesh position={[targetX, 1.15, 0]} rotation-x={Math.PI}>
          <coneGeometry args={[0.22, 0.45, 4]} />
          <meshStandardMaterial
            color={ATLAS.sun}
            emissive={ATLAS.sun}
            emissiveIntensity={0.9}
            flatShading
          />
        </mesh>
      )}
      <group ref={cartNode} position={[CANYON.cartStart, 0, 0]}>
        <Cart x={0} visible />
      </group>
      {bridge.pieces.map((piece, i) => (
        <ShelfPiece
          key={piece.id}
          index={i}
          count={bridge.pieces.length}
          label={piece.label}
          placedAt={selected.indexOf(piece.id)}
          clickable={clickable}
          onPiece={() => {
            onPiece(piece.id);
          }}
        />
      ))}
      <DebrisField items={debris} floor={CANYON.water} />
    </group>
  );
}
