import { create } from 'zustand';

/** ¿Hay voz del sistema (Web Speech API)? */
export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

const BLOCKS = 'p,li,h1,h2,h3,h4,h5,h6,dt,dd,div,section,tr,figcaption,legend';
const SKIP = '[aria-hidden="true"],[data-no-read],button,svg,kbd,canvas,script,style';

/**
 * El texto legible de un elemento, en frases: sin lo decorativo ni los botones,
 * con un punto al final de cada bloque para que la voz haga la pausa.
 */
export function readableText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(SKIP).forEach((node) => {
    node.remove();
  });
  clone.querySelectorAll(BLOCKS).forEach((node) => {
    node.append('\n');
  });
  return clone.textContent
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => (/[.!?…:;»"]$/.test(line) ? line : `${line}.`))
    .join(' ');
}

/** Frases de hasta ~220 caracteres: Chrome corta las locuciones muy largas. */
export function chunks(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]*\s*/g) ?? [text];
  const out: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      out.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'es-CO') ??
    voices.find((v) => /^es[-_](419|MX|US)/.test(v.lang)) ??
    voices.find((v) => v.lang.startsWith('es'))
  );
}

interface SpeechState {
  /** Qué se está leyendo (un id por botón), o `null`. */
  speaking: string | null;
  speak: (id: string, text: string) => void;
  stop: () => void;
}

/** Una sola voz para toda la app: empezar a leer algo detiene lo anterior. */
export const useSpeech = create<SpeechState>()((set, get) => ({
  speaking: null,
  speak: (id, text) => {
    if (!canSpeak()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const parts = chunks(text);
    if (parts.length === 0) return;
    const voice = spanishVoice();
    set({ speaking: id });
    parts.forEach((part, i) => {
      const utterance = new SpeechSynthesisUtterance(part);
      utterance.lang = voice?.lang ?? 'es-CO';
      if (voice) utterance.voice = voice;
      if (i === parts.length - 1) {
        utterance.onend = () => {
          if (get().speaking === id) set({ speaking: null });
        };
      }
      synth.speak(utterance);
    });
  },
  stop: () => {
    if (canSpeak()) window.speechSynthesis.cancel();
    set({ speaking: null });
  },
}));
