import { Billboard } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { labelTexture, type LabelOptions } from './labelTexture';

/**
 * Rótulo en el mundo 3D que mira siempre a la cámara. `height` es su alto en
 * unidades del mundo; el ancho sale del texto. Decorativo: lo que importa para
 * lectores de pantalla se anuncia desde el HUD.
 */
export function Label({
  text,
  position,
  height = 0.3,
  billboard = true,
  ...options
}: {
  text: string;
  position: readonly [number, number, number];
  height?: number;
  billboard?: boolean;
} & LabelOptions) {
  const { size, fg, bg, maxWidth, weight, align } = options;
  const made = useMemo(
    () => labelTexture(text, { size, fg, bg, maxWidth, weight, align }),
    [text, size, fg, bg, maxWidth, weight, align],
  );
  useEffect(
    () => () => {
      made.texture.dispose();
    },
    [made],
  );
  const plane = (
    <mesh scale={[height * made.aspect, height, 1]} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={made.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
  return billboard ? (
    <Billboard position={[...position]}>{plane}</Billboard>
  ) : (
    <group position={[...position]}>{plane}</group>
  );
}
