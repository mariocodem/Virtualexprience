import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Svg>
  );
}

/** Más: abre una sección plegada; girado 45° se lee como cerrar. */
export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

/** Rosa de los vientos: el emblema de Brújula. */
export function IconCompass(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 3.5l1.8 6.7L12 12l-1.8-1.8L12 3.5z" fill="currentColor" />
      <path d="M12 20.5l-1.8-6.7L12 12l1.8 1.8-1.8 6.7z" />
      <path d="M3.5 12l6.7-1.8L12 12l-1.8 1.8L3.5 12zM20.5 12l-6.7 1.8L12 12l1.8-1.8 6.7 1.8z" />
    </Svg>
  );
}

export function IconLighthouse(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21l1.2-12h3.6L15 21M8 21h8M10.2 9V6.5h3.6V9M12 3v1.5M6 7.2l2.2.8M18 7.2l-2.2.8M10.6 13.5h2.8" />
    </Svg>
  );
}

/** Aguja que gira: indicador de carga en el idioma del mundo. */
export function IconSpinner(props: IconProps) {
  return (
    <Svg {...props} className={['animate-spin', props.className].filter(Boolean).join(' ')}>
      <circle cx="12" cy="12" r="8" strokeOpacity="0.3" />
      <path d="M12 4a8 8 0 0 1 8 8" />
    </Svg>
  );
}
