import { useEffect, useMemo } from 'react';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { KIT, partGeometry } from '@/world/scene/landmarkKit';
import { backdropLayout } from './layout';

/**
 * El marco de la plaza: el cabildo, el campanario, casonas y árboles del kit
 * del mundo, fundidos en una sola malla (una llamada de dibujo) con color por
 * vértice. Se queda en el borde para que el centro quede libre.
 */
export function PlazaBackdrop({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const parts = backdropLayout(radius).flatMap((item) => {
      const matrix = new Matrix4().compose(
        new Vector3(item.x, 0, item.z),
        new Quaternion().setFromEuler(new Euler(0, item.rotY, 0)),
        new Vector3(item.scale, item.scale, item.scale),
      );
      return KIT[item.kind]({ variant: item.variant, drop: 0 }).map((part) =>
        partGeometry(part, matrix),
      );
    });
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    merged.computeVertexNormals();
    return merged;
  }, [radius]);
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} />
    </mesh>
  );
}
