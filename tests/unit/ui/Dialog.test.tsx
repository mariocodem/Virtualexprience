import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/ui/Dialog';

describe('Dialog', () => {
  it('se nombra con su título y su descripción', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Bitácora" description="Tu historial de actividades.">
        <p>Contenido</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Bitácora' });
    expect(dialog).toHaveAccessibleDescription('Tu historial de actividades.');
  });

  it('el botón Cerrar avisa al dueño del estado', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Bitácora" />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('no se muestra cuando está cerrado', () => {
    render(<Dialog open={false} onClose={vi.fn()} title="Bitácora" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
