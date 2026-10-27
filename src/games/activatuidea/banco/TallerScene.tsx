import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type Group, type InstancedMesh } from 'three';
import type { FeedbackKind } from '@/data/contentSchemas';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { TextLabel } from '../labels';
import type { PartKind, PersonLook } from './model';
import { shapesFor, type PartShape } from './parts3d';
import { BASKET_COLOR } from './sceneData';
import { KIND_LABEL } from './session';

/**
 * El taller de ActivaTuIdea en 3D: la pared de herramientas, el banco con el
 * prototipo giratorio, quienes lo prueban, las canastas de comentarios, el
 * estante de mejoras y la bandeja de materiales. Aquí solo se dibuja: las
 * reglas viven en `session.ts` y en el motor del banco de pruebas.
 */

function Shape({ shape, ghost }: { shape: PartShape; ghost?: boolean }) {
  const [a = 1, b = 1, c = 1] = shape.size;
  return (
    <mesh position={[...shape.pos]} rotation={shape.rot ? [...shape.rot] : [0, 0, 0]} castShadow>
      {shape.geo === 'box' && <boxGeometry args={[a, b, c]} />}
      {shape.geo === 'cyl' && <cylinderGeometry args={[a, a, b, 10]} />}
      {shape.geo === 'sphere' && <sphereGeometry args={[a, 10, 8]} />}
      {shape.geo === 'cone' && <coneGeometry args={[a, b, 10]} />}
      <meshStandardMaterial
        color={shape.color}
        flatShading
        emissive={shape.glow ? shape.color : '#000000'}
        emissiveIntensity={shape.glow ? 0.35 : 0}
        transparent={ghost}
        opacity={ghost ? 0.55 : 1}
      />
    </mesh>
  );
}

/** El prototipo: un bolso de lona de vela con las piezas que se le han agregado. */
export function Prototype({
  built,
  ghost = [],
  still,
  wet = false,
}: {
  built: readonly PartKind[];
  /** Piezas elegidas que aún no se construyen: se ven translúcidas. */
  ghost?: readonly PartKind[];
  still: boolean;
  /** Tras la prueba de agua, la lona se ve más oscura. */
  wet?: boolean;
}) {
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (root.current) root.current.rotation.y = still ? 0.55 : clock.elapsedTime * 0.45;
  });
  const canvas = wet ? '#b7a77f' : '#e3d3ab';
  return (
    <group ref={root} position={[0, 0.92, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.5, 1, 0.7]} />
        <meshStandardMaterial color={canvas} flatShading />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[1.52, 0.18, 0.74]} />
        <meshStandardMaterial color={wet ? '#a89a72' : '#cdb98a'} flatShading />
      </mesh>
      <mesh position={[0, 0.4, 0.39]}>
        <boxGeometry args={[1.1, 0.5, 0.1]} />
        <meshStandardMaterial color={wet ? '#b0a07a' : '#d9c797'} flatShading />
      </mesh>
      <mesh position={[-0.3, 1.2, 0]}>
        <boxGeometry args={[0.1, 0.34, 0.5]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      <mesh position={[0.3, 1.2, 0]}>
        <boxGeometry args={[0.1, 0.34, 0.5]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      {built.map((kind, i) =>
        shapesFor(kind).map((shape, j) => (
          <Shape key={`${String(i)}-${String(j)}`} shape={shape} />
        )),
      )}
      {ghost.map((kind, i) =>
        shapesFor(kind).map((shape, j) => (
          <Shape key={`g${String(i)}-${String(j)}`} shape={shape} ghost />
        )),
      )}
    </group>
  );
}

/** Persona que prueba el prototipo: da un paso al frente al hablar y reacciona a la prueba. */
export function Person({
  look,
  spot,
  speaking,
  mood,
  still,
  children,
}: {
  look: PersonLook;
  spot: [number, number];
  speaking: boolean;
  /** −1 decepcionada, 0 neutra, 1 contenta (tras la prueba). */
  mood: -1 | 0 | 1;
  still: boolean;
  children?: React.ReactNode;
}) {
  const root = useRef<Group>(null);
  useFrame(({ clock }, dt) => {
    const node = root.current;
    if (!node) return;
    const k = Math.min(1, dt * 5);
    const z = spot[1] + (speaking ? 1.5 : 0);
    node.position.z += (z - node.position.z) * k;
    const t = clock.elapsedTime;
    const hop = mood > 0 && !still ? Math.abs(Math.sin(t * 6 + spot[0])) * 0.22 : 0;
    node.position.y = hop;
    node.rotation.x = mood < 0 ? -0.18 : 0;
    node.rotation.z = !still && mood === 0 ? Math.sin(t * 1.4 + spot[0]) * 0.03 : 0;
  });
  return (
    <group ref={root} position={[spot[0], 0, spot[1]]}>
      <mesh position-y={0.5} castShadow>
        <cylinderGeometry args={[0.22, 0.36, 1, 7]} />
        <meshStandardMaterial color={look.coat} flatShading />
      </mesh>
      <mesh position-y={0.92} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.1, 7]} />
        <meshStandardMaterial color={look.trim} flatShading />
      </mesh>
      <mesh position-y={1.2} castShadow>
        <sphereGeometry args={[0.25, 10, 8]} />
        <meshStandardMaterial color={look.skin} flatShading />
      </mesh>
      {look.prop === 'sombrero' ? (
        <mesh position-y={1.4} castShadow>
          <coneGeometry args={[0.42, 0.22, 10]} />
          <meshStandardMaterial color={look.hair} flatShading />
        </mesh>
      ) : (
        <mesh position-y={1.24} castShadow>
          <sphereGeometry args={[0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={look.hair} flatShading />
        </mesh>
      )}
      {look.prop === 'portatil' && (
        <mesh position={[0, 0.7, 0.36]} rotation-x={-0.3}>
          <boxGeometry args={[0.5, 0.06, 0.36]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
      )}
      {look.prop === 'carpeta' && (
        <mesh position={[0.34, 0.65, 0.2]} rotation-z={0.2}>
          <boxGeometry args={[0.1, 0.5, 0.4]} />
          <meshStandardMaterial color={ATLAS.route} flatShading />
        </mesh>
      )}
      {look.prop === 'camara' && (
        <mesh position={[0.1, 0.85, 0.32]}>
          <boxGeometry args={[0.34, 0.22, 0.2]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
      )}
      {children}
    </group>
  );
}

/** Canastas para clasificar los comentarios, con su tecla visible. */
export function Baskets({ highlight }: { highlight: FeedbackKind | null }) {
  const kinds: FeedbackKind[] = ['patron', 'aislado', 'fuera'];
  return (
    <group position={[-5.3, 0, 1.6]} rotation-y={0.35}>
      {kinds.map((kind, i) => (
        <group key={kind} position={[i * 1.45, 0, 0]}>
          <mesh position-y={0.28} castShadow>
            <cylinderGeometry args={[0.55, 0.42, 0.56, 8]} />
            <meshStandardMaterial color={BUILD.thatch} flatShading />
          </mesh>
          <mesh position-y={0.58} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.55, 0.05, 5, 10]} />
            <meshStandardMaterial
              color={BASKET_COLOR[kind]}
              emissive={BASKET_COLOR[kind]}
              emissiveIntensity={highlight === kind ? 0.9 : 0.15}
              flatShading
            />
          </mesh>
          <TextLabel
            position={[0, 0.8, 0]}
            anchor={-1}
            text={`${String(i + 1)} · ${KIND_LABEL[kind]}`}
            bg={ATLAS.plate}
            fg={ATLAS.ink}
            font={22}
            bold
            wrap={600}
          />
        </group>
      ))}
    </group>
  );
}

export interface ShelfItem {
  id: string;
  kind: PartKind;
  picked: boolean;
}

/** Estante con una pieza por cambio; las elegidas se levantan y brillan. */
export function Shelf({ items, still }: { items: readonly ShelfItem[]; still: boolean }) {
  return (
    <group position={[4.9, 0, 0.4]} rotation-y={-0.5}>
      <mesh position={[0, 1.2, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 2.4, 0.16]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      {[0.5, 1.45].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.1, 0.8]} />
          <meshStandardMaterial color={BUILD.wood} flatShading />
        </mesh>
      ))}
      {items.map((item, i) => {
        const x = ((i % 2) - 0.5) * 1.5;
        const y = i < 2 ? 0.55 : 1.5;
        const lift = item.picked && !still ? 0.18 : 0;
        return (
          <group key={item.id} position={[x, y + lift, 0.05]} scale={0.55}>
            {shapesFor(item.kind).map((shape, j) => (
              <Shape key={j} shape={shape} />
            ))}
            {item.picked && (
              <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.95, 1.1, 20]} />
                <meshBasicMaterial color={ATLAS.sun} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

const COIN_STACK = 5;
const COIN_VALUE = 5;

/** Bandeja de materiales: una moneda por cada 5 de presupuesto; las que se gastarían se marcan. */
export function Coins({
  budget,
  total,
  preview,
}: {
  budget: number;
  total: number;
  /** Materiales que gastaría la elección actual. */
  preview: number;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const count = Math.ceil(total / COIN_VALUE);
  const dummy = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const have = Math.round(budget / COIN_VALUE);
    const spend = Math.min(have, Math.ceil(preview / COIN_VALUE));
    for (let i = 0; i < count; i++) {
      const stack = Math.floor(i / COIN_STACK);
      const level = i % COIN_STACK;
      dummy.position.set(stack * 0.55 - 0.9, 0.1 + level * 0.085, 0);
      dummy.scale.setScalar(i < have ? 1 : 0.001);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
      const marked = i < have && i >= have - spend;
      node.setColorAt(i, new Color(marked ? ATLAS.route : ATLAS.sun));
    }
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  }, [budget, preview, count, dummy]);
  return (
    <group position={[-5.4, 0.78, -0.6]}>
      <mesh position-y={-0.4} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.8, 1]} />
        <meshStandardMaterial color={BUILD.wood} flatShading />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.07, 10]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

const DROPS = 36;

/** Prueba de agua: gotas que caen sobre el bolso y un charco que crece. */
export function Rain({ active, still }: { active: boolean; still: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const puddle = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const node = mesh.current;
    if (!node) return;
    if (active && start.current === null) start.current = clock.elapsedTime;
    if (!active) start.current = null;
    const age = start.current === null ? -1 : clock.elapsedTime - start.current;
    for (let i = 0; i < DROPS; i++) {
      const seed = ((i * 7919) % 97) / 97;
      const cycle = (age * 1.6 + seed * 1.4) % 1.4;
      const live = !still && age >= 0 && age < 3.2;
      dummy.position.set(
        Math.cos(i * 2.4) * (0.2 + seed * 0.9),
        3.6 - cycle * 2.4,
        Math.sin(i * 2.4) * 0.35,
      );
      dummy.scale.setScalar(live ? 1 : 0.001);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
    }
    node.instanceMatrix.needsUpdate = true;
    if (puddle.current)
      puddle.current.scale.setScalar(
        !active ? 0.001 : still ? 1 : Math.min(1, Math.max(0.001, age / 2.5)),
      );
  });
  return (
    <group position={[0, 0.8, 0]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, DROPS]}>
        <sphereGeometry args={[0.07, 6, 5]} />
        <meshStandardMaterial
          color={ATLAS.sea[0]}
          emissive={ATLAS.sea[1]}
          emissiveIntensity={0.4}
        />
      </instancedMesh>
      <group ref={puddle}>
        <mesh position-y={0.075} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[1.3, 16]} />
          <meshStandardMaterial color={ATLAS.sea[1]} transparent opacity={0.55} />
        </mesh>
      </group>
    </group>
  );
}

/** Taller: piso, pared de herramientas, banco con plato giratorio y lámparas. */
export function Workshop() {
  return (
    <group>
      <mesh position-y={-0.15} receiveShadow>
        <cylinderGeometry args={[9, 9.3, 0.3, 32]} />
        <meshStandardMaterial color="#b98f60" flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, 3, -5.8]} receiveShadow>
        <boxGeometry args={[18, 6, 0.3]} />
        <meshStandardMaterial color={BUILD.wallWarm} flatShading />
      </mesh>
      {/* Tablero de herramientas */}
      <mesh position={[0, 3.1, -5.6]}>
        <boxGeometry args={[11, 3, 0.1]} />
        <meshStandardMaterial color={BUILD.wood} flatShading />
      </mesh>
      {[-4, -2.2, -0.4, 1.4, 3.2].map((x, i) => (
        <mesh key={x} position={[x, 3.2 + (i % 2) * 0.35, -5.48]} rotation-z={i * 0.25 - 0.4}>
          <boxGeometry args={[0.18, 1.1 + (i % 3) * 0.3, 0.08]} />
          <meshStandardMaterial color={i % 2 ? BUILD.metal : ISLE.activatuidea} flatShading />
        </mesh>
      ))}
      {/* Banco con plato giratorio */}
      <mesh position-y={0.4} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.8, 1.9]} />
        <meshStandardMaterial color={BUILD.wood} flatShading />
      </mesh>
      <mesh position-y={0.84} castShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.1, 18]} />
        <meshStandardMaterial color={ATLAS.sea[4]} flatShading />
      </mesh>
      {/* Lámparas colgantes */}
      {[-3, 3].map((x) => (
        <group key={x} position={[x, 5.2, -2]}>
          <mesh position-y={0.4}>
            <cylinderGeometry args={[0.02, 0.02, 1.6, 4]} />
            <meshStandardMaterial color={BUILD.metal} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.28, 10, 8]} />
            <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
