import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'sun' | 'quiet';
export type ButtonSize = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2.5 border-[1.5px] font-display font-bold select-none ' +
  'transition-[background-color,border-color,color,transform] duration-(--dur-fast) ease-out ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-45';

const variants: Record<ButtonVariant, string> = {
  primary: 'border-sea-900 bg-sea-900 text-land-sun hover:border-sea-800 hover:bg-sea-800',
  secondary: 'border-ink bg-transparent text-ink hover:bg-plate-sunk',
  sun: 'border-land-sun bg-land-sun text-sea-950 hover:border-plate hover:bg-plate',
  quiet:
    'border-transparent bg-transparent px-0 text-left text-ink underline decoration-[1.5px] underline-offset-[0.22em] hover:decoration-route',
};

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 whitespace-nowrap px-5 text-base leading-none',
  lg: 'min-h-14 whitespace-nowrap px-7 text-xl leading-none',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
}): string {
  return cx(
    base,
    variants[variant],
    variant === 'quiet' ? 'min-h-11 text-base leading-snug' : sizes[size],
    className,
  );
}
