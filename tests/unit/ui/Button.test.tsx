import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/ui/Button';

describe('Button', () => {
  it('es un botón de tipo "button" por defecto para no enviar formularios', () => {
    render(<Button>Zarpar</Button>);
    expect(screen.getByRole('button', { name: 'Zarpar' })).toHaveAttribute('type', 'button');
  });

  it('ejecuta la acción al hacer clic', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Zarpar</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Zarpar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('mientras carga queda ocupado y bloqueado', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardando
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Guardando' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
