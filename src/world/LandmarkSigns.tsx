import { STATUES, type Landmark } from './landmarks';
import { ATLAS, BUILD, ISLE } from './palette';

const STROKE = 0.03;
/** Escala del medallión de los monumentos en la carta. */
const MONUMENT_SIGN = 2.2;
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
          // Los monumentos se leen derechos y a tamaño de leyenda, sin importar su escala en 3D.
          transform={`translate(${l.position[0].toFixed(2)} ${l.position[2].toFixed(2)}) ${STATUES.has(l.kind) ? `scale(${String(MONUMENT_SIGN)})` : `rotate(${deg(-l.rotation).toFixed(1)}) scale(${l.scale.toFixed(2)})`}`}
        >
          <Sign landmark={l} />
        </g>
      ))}
    </g>
  );
}

/** Pictograma blanco de cada monumento, dentro de su medallón (radio 0.26). */
const MONUMENT_GLYPH: Partial<Record<Landmark['kind'], string>> = {
  // Dos lóbulos con la cisura al medio.
  cerebro:
    'M0 -0.12C-0.06 -0.16 -0.15 -0.12 -0.15 -0.03C-0.15 0.06 -0.08 0.1 0 0.09C0.08 0.1 0.15 0.06 0.15 -0.03C0.15 -0.12 0.06 -0.16 0 -0.12ZM0 -0.12V0.09',
  // Libro abierto.
  libro: 'M0 -0.06L-0.16 -0.12V0.08L0 0.13L0.16 0.08V-0.12ZM0 -0.06V0.13',
  // Balanza: astil, fiel y platillos.
  balanza: 'M0 -0.15V0.13M-0.12 0.13H0.12M-0.15 -0.08H0.15M-0.2 0.02H-0.1M0.1 0.02H0.2',
  // Rueda de timón.
  timon:
    'M0 -0.17V0.17M-0.17 0H0.17M-0.12 -0.12L0.12 0.12M-0.12 0.12L0.12 -0.12M0.1 0A0.1 0.1 0 1 1 -0.1 0A0.1 0.1 0 1 1 0.1 0',
  // Cohete.
  cohete:
    'M0 -0.17C0.07 -0.1 0.07 0.02 0.05 0.08H-0.05C-0.07 0.02 -0.07 -0.1 0 -0.17ZM-0.05 0.04L-0.1 0.12M0.05 0.04L0.1 0.12',
  // Corazón.
  corazon:
    'M0 0.13L-0.13 0C-0.2 -0.07 -0.14 -0.16 -0.06 -0.14C-0.03 -0.13 -0.01 -0.11 0 -0.09C0.01 -0.11 0.03 -0.13 0.06 -0.14C0.14 -0.16 0.2 -0.07 0.13 0Z',
};

/** Medallón del monumento: el acento de su isla y el pictograma de la estatua. */
function Monument({ glyph, accent }: { glyph: string; accent: string }) {
  return (
    <>
      <circle r={0.26} fill={accent} stroke={ATLAS.plate} strokeWidth={0.05} />
      <path
        d={glyph}
        fill="none"
        stroke={ATLAS.plate}
        strokeWidth={0.045}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

const MONUMENT_ACCENT: Partial<Record<Landmark['kind'], string>> = {
  cerebro: ISLE.comunicarte,
  libro: ISLE.neuromath,
  balanza: ISLE.voxcivitas,
  timon: ISLE.gerencia,
  cohete: ISLE.activatuidea,
  corazon: ISLE.latidosocial,
};

/** Rectángulo con el frente hacia el mar (+y local). */
function Block({ w, d, fill }: { w: number; d: number; fill: string }) {
  return <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={fill} />;
}

function Sign({ landmark }: { landmark: Landmark }) {
  const glyph = MONUMENT_GLYPH[landmark.kind];
  const accent = MONUMENT_ACCENT[landmark.kind];
  if (glyph && accent) return <Monument glyph={glyph} accent={accent} />;
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
