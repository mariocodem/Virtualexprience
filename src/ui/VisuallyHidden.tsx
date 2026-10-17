import type { ComponentPropsWithRef } from 'react';

/** Texto solo para lectores de pantalla. */
export function VisuallyHidden(props: ComponentPropsWithRef<'span'>) {
  return <span className="sr-only" {...props} />;
}
