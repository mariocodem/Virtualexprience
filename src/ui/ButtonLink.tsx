import { Link, type LinkProps } from 'react-router';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Enlace de navegación con aspecto de botón: navega, no ejecuta acciones. */
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...rest} />;
}
