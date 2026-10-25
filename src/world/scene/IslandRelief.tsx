import { useMemo } from 'react';
import type { Band } from '../geography';
import { terraceColor, terraceGeometries } from './terrain';

export interface IslandReliefProps {
  id: string;
  bands: Band[];
  /** Altura de cada terraza. */
  height?: number;
  /** 0 = con bruma, 1 = color pleno (fragmento recuperado). */
  lit: number;
}

export function IslandRelief({ id, bands, height, lit }: IslandReliefProps) {
  const geometries = useMemo(() => terraceGeometries(id, bands, height), [id, bands, height]);
  return (
    <group>
      {geometries.map((geometry, level) => (
        <mesh key={level} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial color={terraceColor(level, lit)} flatShading roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}
