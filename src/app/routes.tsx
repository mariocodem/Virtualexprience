import type { RouteObject } from 'react-router';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

/** Cada ruta se carga bajo demanda: la landing no espera al mundo 3D. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/landing/LandingPage')).default }),
      },
      {
        // Una sola ruta para la carta y cada isla: el mundo no se desmonta y la cámara vuela.
        path: 'mundo/:isla?',
        handle: { immersive: true },
        lazy: async () => ({ Component: (await import('@/world/WorldPage')).default }),
      },
      {
        path: 'pasaporte',
        lazy: async () => ({ Component: (await import('@/routes/PassportRoute')).default }),
      },
      {
        path: 'accesibilidad',
        lazy: async () => ({ Component: (await import('@/routes/AccessibilityRoute')).default }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/routes/NotFoundRoute')).default }),
      },
    ],
  },
];
