import type { ThreeEvent } from '@react-three/fiber';
import type { StationStatus } from '@/progress/types';
import { ATLAS } from '../palette';

const BEAD: Record<StationStatus, string> = {
  bloqueada: '#4b5d78',
  disponible: ATLAS.plate,
  'en-curso': ATLAS.route,
  completada: ATLAS.ink,
  'en-preparacion': '#9aa8ba',
};

export interface StopMarkerProps {
  position: readonly [number, number, number];
  status: StationStatus;
  /** Resaltada por foco o puntero desde la lista o el mapa. */
  highlighted: boolean;
  /** Estación abierta en el panel. */
  selected: boolean;
  onSelect: () => void;
  onHover: (over: boolean) => void;
}

/**
 * Parada del sendero: mástil de tinta con una cuenta del color de su estado y
 * un disco en el suelo. El símbolo exacto de la convención va en el rótulo HTML.
 */
export function StopMarker({
  position,
  status,
  highlighted,
  selected,
  onSelect,
  onHover,
}: StopMarkerProps) {
  const scale = selected ? 1.35 : highlighted ? 1.2 : 1;
  return (
    <group
      position={[position[0], position[1], position[2]]}
      scale={scale}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHover(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
        onHover(false);
      }}
    >
      <mesh position-y={0.02} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[0.34, 20]} />
        <meshStandardMaterial color={selected ? ATLAS.route : ATLAS.plate} flatShading />
      </mesh>
      <mesh position-y={0.42} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.8, 6]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <mesh position-y={0.9} castShadow>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial
          color={BEAD[status]}
          emissive={status === 'en-curso' ? ATLAS.route : '#000000'}
          emissiveIntensity={status === 'en-curso' ? 0.35 : 0}
          flatShading
        />
      </mesh>
    </group>
  );
}
