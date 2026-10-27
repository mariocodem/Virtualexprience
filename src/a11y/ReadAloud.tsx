import { useEffect, useId, type RefObject } from 'react';
import { cx } from '@/ui/cx';
import { IconSpeaker } from '@/ui/icons';
import { canSpeak, readableText, useSpeech } from './speech';

/**
 * Lectura en voz alta de un panel (DUA, representación): lee el texto visible
 * del elemento `target` con la voz del sistema. Sin voz disponible no aparece.
 */
export function ReadAloud({
  target,
  label = 'Escuchar',
  className,
}: {
  target: RefObject<HTMLElement | null>;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const speaking = useSpeech((s) => s.speaking === id);
  const speak = useSpeech((s) => s.speak);
  const stop = useSpeech((s) => s.stop);

  // Al desmontarse el panel, la voz no sigue leyendo algo que ya no se ve.
  useEffect(
    () => () => {
      if (useSpeech.getState().speaking === id) useSpeech.getState().stop();
    },
    [id],
  );

  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      onClick={() => {
        if (speaking) stop();
        else if (target.current) speak(id, readableText(target.current));
      }}
      className={cx(
        'inline-flex min-h-11 items-center gap-2 font-display text-sm font-bold underline decoration-[1.5px] underline-offset-[0.22em] hover:decoration-route',
        className,
      )}
    >
      <IconSpeaker size={20} />
      {speaking ? 'Detener lectura' : label}
    </button>
  );
}
