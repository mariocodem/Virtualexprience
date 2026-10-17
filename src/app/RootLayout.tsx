import { Outlet, ScrollRestoration, useMatches } from 'react-router';
import { SkipLink } from '@/ui/SkipLink';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

function useImmersive(): boolean {
  return useMatches().some((match) => {
    const handle = match.handle as { immersive?: boolean } | undefined;
    return handle?.immersive === true;
  });
}

export function RootLayout() {
  const immersive = useImmersive();
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      {!immersive && <SiteFooter />}
      <ScrollRestoration />
    </>
  );
}
