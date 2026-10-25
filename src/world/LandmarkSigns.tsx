import type { Landmark } from './landmarks';
import { ATLAS, BUILD, ISLE } from './palette';

const STROKE = 0.03;
const deg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Las construcciones de una isla como signos de carta, vistos desde arriba:
 * los mismos lugares que en el relieve 3D, para que la carta 2D no pierda nada.
 * Decorativo: va dentro de la plancha, que ya está oculta a lectores de pantalla.
 */
export function LandmarkSigns({ landmarks }: { landmarks: readonly Landmark[] }) {
  return (
    <g strokeWidth={STROKE} stroke={ATLAS.ink} strokeLinejoin="miter">
      {landmarks.map((l, i) => (
        <g
          key={i}
          transform={`translate(${l.position[0].toFixed(2)} ${l.position[2].toFixed(2)}) rotate(${deg(-l.rotation).toFixed(1)}) scale(${l.scale.toFixed(2)})`}
        >
          <Sign landmark={l} />
        </g>
      ))}
    </g>
  );
}

/** Rectángulo con el frente hacia el mar (+y local). */
function Block({ w, d, fill }: { w: number; d: number; fill: string }) {
  return <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={fill} />;
}

function Sign({ landmark }: { landmark: Landmark }) {
  switch (landmark.kind) {
    case 'arbol':
      return <circle r={0.12} fill={BUILD.leaf[landmark.variant % 4]} />;
    case 'ceiba':
      return <circle r={0.36} fill={BUILD.leaf[0]} />;
    case 'casa':
    case 'casona':
      return (
        <Block w={0.26} d={0.22} fill={landmark.kind === 'casa' ? ISLE.comunicarte : BUILD.roof} />
      );
    case 'imprenta':
      return <Block w={0.62} d={0.36} fill={ISLE.comunicarte} />;
    case 'cabildo':
      return <Block w={0.9} d={0.36} fill={BUILD.roof} />;
    case 'bodega':
      return <Block w={0.5} d={0.3} fill={ISLE.gerencia} />;
    case 'taller':
      return <Block w={0.66} d={0.4} fill={BUILD.metal} />;
    case 'puesto':
      return <Block w={0.28} d={0.2} fill={ATLAS.sun} />;
    case 'cajas':
    case 'panel':
      return (
        <Block w={0.24} d={0.16} fill={landmark.kind === 'panel' ? BUILD.panel : BUILD.wood} />
      );
    case 'huerta':
      return (
        <>
          <Block w={0.42} d={0.24} fill={BUILD.soil} />
          <path d="M-0.18 -0.06H0.18M-0.18 0.06H0.18" stroke={BUILD.leaf[1]} strokeWidth={0.05} />
        </>
      );
    case 'observatorio':
    case 'domo':
    case 'maloca':
      return (
        <circle
          r={landmark.kind === 'observatorio' ? 0.27 : 0.26}
          fill={
            landmark.kind === 'maloca'
              ? BUILD.thatch
              : landmark.kind === 'domo'
                ? BUILD.glass
                : ATLAS.plate
          }
        />
      );
    case 'plaza':
      return <circle r={0.78} fill={BUILD.paving} fillOpacity={0.85} stroke={ISLE.voxcivitas} />;
    case 'campanario':
      return <Block w={0.2} d={0.2} fill={ATLAS.plate} />;
    case 'solido':
      return <path d="M0 -0.13L0.13 0L0 0.13L-0.13 0Z" fill={ISLE.neuromath} />;
    case 'bombilla':
      return <circle r={0.13} fill={ATLAS.sun} />;
    case 'radio':
    case 'aerogenerador':
    case 'grua':
      // Signo de torre: triángulo con punto central.
      return (
        <>
          <path
            d="M0 -0.2L0.18 0.14H-0.18Z"
            fill={landmark.kind === 'radio' ? ATLAS.route : ATLAS.plate}
          />
          <circle r={0.035} fill={ATLAS.ink} stroke="none" />
        </>
      );
    case 'muelle':
    case 'puente':
    case 'astillero':
      // Se asoman al mar: una línea desde la costa hacia fuera.
      return (
        <>
          <path
            d={`M0 0V${landmark.kind === 'puente' ? '1.45' : '1.1'}`}
            stroke={landmark.kind === 'astillero' ? BUILD.stone : ATLAS.plate}
            strokeWidth={landmark.kind === 'astillero' ? 0.3 : 0.16}
          />
          {landmark.kind === 'puente' && <circle cy={1.72} r={0.3} fill={BUILD.stone} />}
        </>
      );
  }
}
