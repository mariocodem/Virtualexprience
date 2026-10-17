import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ButtonLink } from '@/ui/ButtonLink';
import { Panel } from '@/ui/Panel';

/** Error inesperado al cargar una ruta: explica qué pasó y ofrece volver. */
export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${String(error.status)} · ${error.statusText}`
    : 'La carta no se pudo cargar.';

  return (
    <main id="contenido" className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <title>Perdimos el rumbo · Archipiélago VirtuX</title>
      <Panel as="section" aria-labelledby="error-titulo">
        <h1 id="error-titulo" className="display text-5xl">
          Perdimos el rumbo
        </h1>
        <p className="mt-4 text-ink-soft">
          {detail} Recarga la página o vuelve al puerto de partida; tu progreso sigue guardado.
        </p>
        <div className="mt-8">
          <ButtonLink to="/" reloadDocument>
            Volver al inicio
          </ButtonLink>
        </div>
      </Panel>
    </main>
  );
}
