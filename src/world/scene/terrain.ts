import { Color, ExtrudeGeometry, Shape, type BufferGeometry } from 'three';
import { TERRACE_HEIGHT, type Band } from '../geography';
import { ATLAS } from '../palette';

/** Profundidad bajo el agua de la terraza costera, para que la isla no flote. */
const UNDERWATER = 0.6;

const cache = new Map<string, BufferGeometry[]>();

/**
 * Geometrías de las terrazas de una isla, compartidas entre vistas.
 * El contorno (x, z) se extruye hacia arriba con caras planas: relieve low-poly.
 */
export function terraceGeometries(key: string, bands: Band[]): BufferGeometry[] {
  const cached = cache.get(key);
  if (cached) return cached;

  const geometries = bands.map((band) => {
    const shape = new Shape(band.outline.map(([x, z]) => ({ x, y: -z }) as never));
    const base = band.level === 0;
    const geometry = new ExtrudeGeometry(shape, {
      depth: TERRACE_HEIGHT + (base ? UNDERWATER : 0),
      bevelEnabled: false,
      curveSegments: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, base ? -UNDERWATER : band.level * TERRACE_HEIGHT, 0);
    geometry.computeVertexNormals();
    return geometry;
  });
  cache.set(key, geometries);
  return geometries;
}

/** Color de una terraza: hipsométrico pleno si la isla está encendida; con bruma si no. */
export function terraceColor(level: number, lit: number): Color {
  const base = new Color(ATLAS.land[level] ?? ATLAS.land[0]);
  return base.lerp(new Color(ATLAS.haze), (1 - lit) * 0.3);
}
