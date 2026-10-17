import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('rutas', () => {
  it.each([
    ['/', /Aprende explorando/],
    ['/mundo', /Carta del archipiélago/],
    ['/pasaporte', /Pasaporte del explorador/],
    ['/accesibilidad', /Diseñado para todos/],
    ['/no-existe', /Esta carta no existe/],
  ])('%s muestra su plancha', async (path, heading) => {
    renderAt(path);
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('todas las páginas ofrecen saltar al contenido y la navegación principal', async () => {
    renderAt('/pasaporte');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    );
    expect(screen.getByRole('navigation', { name: 'Archipiélago VirtuX' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'UNIMINUTO' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pasaporte' })).toHaveAttribute('aria-current', 'page');
  });
});
