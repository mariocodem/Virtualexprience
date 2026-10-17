import { useId } from 'react';
import type { Badge } from '@/types/domain';
import { stampInk } from './stampInk';

const CATEGORY_LABEL: Record<Badge['category'], string> = {
  competencia: 'Competencia',
  exploracion: 'Exploración',
  accesibilidad: 'Accesibilidad',
  constancia: 'Constancia',
};

function seedOf(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return sum % 97;
}

/** Sello de insignia: anillo doble con el nombre en arco, como un sello de aduana. */
export function Stamp({ badge, size = 132 }: { badge: Badge; size?: number }) {
  const id = useId();
  const ink = stampInk(badge);
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Insignia ${badge.name}: ${badge.description}`}
      style={{ color: ink }}
    >
      <defs>
        <filter id={`${id}-ink`} x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={seedOf(badge.id)}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.4"
            xChannelSelector="R"
            yChannelSelector="G"
            result="pressed"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35"
            result="speckle"
          />
          <feComposite in="pressed" in2="speckle" operator="in" />
        </filter>
        <path id={`${id}-top`} d="M18,60 A42,42 0 0 1 102,60" />
        <path id={`${id}-bottom`} d="M22,64 A38,38 0 0 0 98,64" />
      </defs>
      <g filter={`url(#${id}-ink)`}>
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="60" cy="60" r="49" fill="none" stroke="currentColor" strokeWidth="1" />
        <text
          fill="currentColor"
          fontSize="10.5"
          fontWeight="700"
          letterSpacing="1.6"
          style={{ fontFamily: 'var(--type-display)', fontStretch: '100%' }}
        >
          <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
            {badge.name.toUpperCase()}
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontSize="7.5"
          letterSpacing="1.4"
          style={{ fontFamily: 'var(--type-display)' }}
        >
          <textPath
            href={`#${id}-bottom`}
            startOffset="50%"
            textAnchor="middle"
            dominantBaseline="hanging"
          >
            {CATEGORY_LABEL[badge.category].toUpperCase()}
          </textPath>
        </text>
        <path d="M60 40l5 13h13l-10.5 8 4 13L60 66l-11.5 8 4-13L42 53h13z" fill="currentColor" />
      </g>
    </svg>
  );
}
