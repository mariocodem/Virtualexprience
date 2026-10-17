import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { PreferencesEffect } from '@/a11y/PreferencesEffect';
import { ToastProvider } from '@/ui/ToastProvider';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ToastProvider>
      <PreferencesEffect />
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
