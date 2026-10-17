import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ToastProvider } from '@/ui/ToastProvider';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
