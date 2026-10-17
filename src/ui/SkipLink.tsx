export function SkipLink({ target = 'contenido' }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="on-sea sr-only z-[100] bg-sea-900 px-5 py-3 font-display font-bold text-land-sun focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      Saltar al contenido
    </a>
  );
}
