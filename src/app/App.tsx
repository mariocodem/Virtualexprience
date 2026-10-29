import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { PreferencesEffect } from '@/a11y/PreferencesEffect';
import { ToastProvider } from '@/ui/ToastProvider';
import { routes } from './routes';

// Bajo GitHub Pages la app vive en /<repositorio>/: las rutas se resuelven desde ahí.
const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
});

export function App() {
  return (
    <ToastProvider>
      <PreferencesEffect />
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
