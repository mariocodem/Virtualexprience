import { createElement, type HTMLAttributes, type Ref } from 'react';
import { cx } from './cx';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'aside' | 'article';
  tone?: 'plate' | 'sunk';
  ref?: Ref<HTMLElement>;
}

/** Cartela: recuadro de plancha con filete, la unidad de agrupación del atlas. */
export function Panel({ as = 'div', tone = 'plate', className, ...rest }: PanelProps) {
  return createElement(as, {
    className: cx(
      'p-6 plate-rule sm:p-8',
      tone === 'plate' ? 'bg-plate' : 'bg-plate-sunk',
      className,
    ),
    ...rest,
  });
}
