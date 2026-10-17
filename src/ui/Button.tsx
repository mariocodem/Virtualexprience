import type { ComponentPropsWithRef } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';
import { IconSpinner } from './icons';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra la aguja de carga y bloquea el botón mientras dura la acción. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={Boolean(disabled) || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <IconSpinner size={18} />}
      {children}
    </button>
  );
}
