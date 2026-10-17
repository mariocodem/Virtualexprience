import logo from '@/assets/brand/uniminuto-logo.png';
import { cx } from './cx';

/**
 * Logo oficial de UNIMINUTO, tal como lo suministró Mario: sin redibujar,
 * recolorear ni recortar. Su texto es negro, así que sobre fondos oscuros va
 * en una placa clara.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      width={1335}
      height={337}
      alt="UNIMINUTO, Corporación Universitaria Minuto de Dios"
      className={cx('h-10 w-auto', className)}
      decoding="async"
    />
  );
}
