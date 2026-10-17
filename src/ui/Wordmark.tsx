import { cx } from './cx';

/**
 * Wordmark de texto. Se reemplaza por el logo oficial de UNIMINUTO cuando
 * Mario suministre el archivo (CLAUDE.md §5).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('toponym text-[0.8125rem]', className)}>
      UNIMINUTO <span aria-hidden="true">·</span> VirtuX
    </span>
  );
}
