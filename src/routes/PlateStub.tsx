import type { ReactNode } from 'react';
import { Panel } from '@/ui/Panel';

/** Plancha provisional para rutas cuyo contenido llega en fases posteriores. */
export function PlateStub({
  title,
  documentTitle,
  children,
}: {
  title: string;
  documentTitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-8 sm:py-20">
      <title>{`${documentTitle} · Archipiélago VirtuX`}</title>
      <Panel as="section" aria-labelledby="plancha-titulo" className="max-w-3xl">
        <h1 id="plancha-titulo" className="display text-[clamp(2.5rem,6vw,4.5rem)]">
          {title}
        </h1>
        <div className="mt-6 max-w-[65ch] space-y-4 text-lg text-ink-soft">{children}</div>
      </Panel>
    </div>
  );
}
