import { useEffect } from 'react';
import { TEXT_SCALES, usePreferences } from './preferences';

/** Refleja las preferencias en <html> para que el CSS y los tokens las apliquen. */
export function PreferencesEffect() {
  const { textStep, contrast, motion, font, spacing } = usePreferences();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--text-scale', String(TEXT_SCALES[textStep]));
    root.dataset.contrast = contrast === 'alto' ? 'high' : 'normal';
    if (motion === 'reducido') root.dataset.motion = 'reduced';
    else delete root.dataset.motion;
    if (font === 'estandar') delete root.dataset.font;
    else root.dataset.font = font;
    if (spacing === 'amplio') root.dataset.spacing = 'wide';
    else delete root.dataset.spacing;
  }, [textStep, contrast, motion, font, spacing]);

  return null;
}
