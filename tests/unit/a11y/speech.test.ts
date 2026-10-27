import { describe, expect, it } from 'vitest';
import { chunks, readableText } from '@/a11y/speech';

describe('lectura en voz alta', () => {
  it('lee el texto del panel sin botones ni decoración, con una pausa por bloque', () => {
    const panel = document.createElement('section');
    panel.innerHTML = `
      <button>Cerrar estación</button>
      <h2>La imprenta del puerto</h2>
      <p><svg aria-hidden="true"></svg>Disponible</p>
      <p>Qué convierte un texto en noticia: hechos y fuentes.</p>
      <a data-no-read href="/mundo">Carta del archipiélago</a>
      <dl><dt>Duración</dt><dd>6 min</dd></dl>`;
    expect(readableText(panel)).toBe(
      'La imprenta del puerto. Disponible. Qué convierte un texto en noticia: hechos y fuentes. Duración. 6 min.',
    );
  });

  it('parte los textos largos en frases que la voz no corta', () => {
    const sentence = 'Una frase corta de prueba para la voz. ';
    const parts = chunks(sentence.repeat(12), 120);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 120)).toBe(true);
    expect(parts.join(' ')).toBe(sentence.repeat(12).trim());
  });
});
