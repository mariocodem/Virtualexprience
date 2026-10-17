import { Outlet, ScrollRestoration } from 'react-router';
import { SkipLink } from '@/ui/SkipLink';
import { SiteHeader } from './SiteHeader';

export function RootLayout() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  );
}
