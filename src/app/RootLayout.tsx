import { Outlet, ScrollRestoration, useMatches } from 'react-router';
import { DemoLoader } from '@/progress/DemoLoader';
import { SkipLink } from '@/ui/SkipLink';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

function useHandle(key: 'immersive' | 'bare'): boolean {
  return useMatches().some((match) => {
    const handle = match.handle as Partial<Record<'immersive' | 'bare', boolean>> | undefined;
    return handle?.[key] === true;
  });
}

export function RootLayout() {
  const immersive = useHandle('immersive');
  const bare = useHandle('bare');
  return (
    <>
      <SkipLink />
      {!bare && <SiteHeader />}
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      {!immersive && <SiteFooter />}
      <ScrollRestoration />
      <DemoLoader />
    </>
  );
}
