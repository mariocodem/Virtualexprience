import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from '@/app/SiteHeader';

function renderHeader() {
  render(
    <MemoryRouter initialEntries={['/pasaporte']}>
      <SiteHeader />
    </MemoryRouter>,
  );
}

describe('encabezado institucional', () => {
  it('tiene la barra superior y los menús del portal oficial', () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'UNIMINUTO' });
    for (const label of [
      'Sistema Uniminuto',
      'Conoce nuestra oferta académica',
      'Vida universitaria',
      'Proyección social',
    ]) {
      expect(within(nav).getByRole('button', { name: label })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    }
    expect(within(nav).getByRole('link', { name: /Portal I\+D\+I\+C/ })).toHaveAttribute(
      'href',
      'https://www.uniminuto.edu/portal-i-d-i-c',
    );
    expect(within(nav).getByRole('link', { name: /Haz tu donación/ })).toHaveAttribute(
      'href',
      'https://www.uniminuto.edu/donaciones-uniminuto',
    );
    expect(screen.getByRole('button', { name: /Inscríbete Gratis/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nuestras sedes/ })).toHaveAttribute(
      'href',
      'https://www.uniminuto.edu/encuentra-tu-sede',
    );
  });

  it('un menú se abre con clic, muestra sus enlaces y Esc lo cierra devolviendo el foco', async () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'UNIMINUTO' });
    const trigger = within(nav).getByRole('button', { name: 'Sistema Uniminuto' });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /^Historia/ })).toHaveAttribute(
      'href',
      'https://www.uniminuto.edu/historia-uniminuto',
    );

    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('abrir otro menú cierra el anterior', async () => {
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'UNIMINUTO' });
    const sistema = within(nav).getByRole('button', { name: 'Sistema Uniminuto' });
    const vida = within(nav).getByRole('button', { name: 'Vida universitaria' });
    await userEvent.click(sistema);
    await userEvent.click(vida);
    expect(sistema).toHaveAttribute('aria-expanded', 'false');
    expect(vida).toHaveAttribute('aria-expanded', 'true');
  });

  it('conserva la navegación propia de Archipiélago VirtuX', () => {
    renderHeader();
    const app = screen.getByRole('navigation', { name: 'Archipiélago VirtuX' });
    expect(within(app).getByRole('link', { name: 'Pasaporte' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(app).getByRole('link', { name: 'El mundo' })).toHaveAttribute('href', '/mundo');
  });

  it('en móvil, el botón Menú muestra la navegación completa', async () => {
    renderHeader();
    const toggle = screen.getByRole('button', { name: 'Menú' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('navigation', { name: 'UNIMINUTO' })).toHaveLength(2);
  });
});
