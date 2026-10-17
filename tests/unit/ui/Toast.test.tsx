import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useToast } from '@/ui/toastContext';
import { ToastProvider } from '@/ui/ToastProvider';

function Trigger() {
  const { notify } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        notify({ title: 'Fragmento recuperado', description: 'ComunicArte', tone: 'success' });
      }}
    >
      Avisar
    </button>
  );
}

describe('ToastProvider', () => {
  it('anuncia el aviso en una región viva y permite descartarlo', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Fragmento recuperado');

    await userEvent.click(screen.getByRole('button', { name: 'Descartar aviso' }));
    expect(screen.getByRole('status')).not.toHaveTextContent('Fragmento recuperado');
  });

  it('el aviso desaparece solo después de unos segundos', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'Avisar' }).click();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Fragmento recuperado');
    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    vi.useRealTimers();
  });

  it('useToast falla con un mensaje claro fuera del proveedor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow('useToast debe usarse dentro de <ToastProvider>.');
  });
});
