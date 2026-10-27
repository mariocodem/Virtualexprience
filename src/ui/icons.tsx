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

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"
        fill="currentColor"
      />
      <circle cx="12" cy="10" r="2.4" fill="var(--uni-navy)" stroke="none" />
    </Svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6z" fill="currentColor" />
    </Svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M6.6 3.5l2.6 3.9-1.7 2.1a12.5 12.5 0 0 0 7 7l2.1-1.7 3.9 2.6-1.3 3.1c-.3.6-1 1-1.7.9C10 20.6 3.4 14 2.6 6.6c-.1-.7.3-1.4.9-1.7z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
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

/** Altavoz: lectura en voz alta. */
export function IconSpeaker(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </Svg>
  );
}

/** Persona con los brazos abiertos: el símbolo universal de accesibilidad. */
export function IconAccessibility(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="4.5" r="1.75" />
      <path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3 6M12 14.5l3 6" />
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
