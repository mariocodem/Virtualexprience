import { describe, expect, it } from 'vitest';
import { brumaLocalLine, localFeedback, localReflection } from '@/ai/brujula';
import type { BossContent, QuizItem, ReflexionarContent } from '@/data/contentSchemas';

const bruma: BossContent['bruma'] = {
  name: 'Bruma de los rumores',
  nature: 'Difunde lo que no se ha verificado.',
  intro: 'Nadie revisa nada aquí.',
  victory: 'Te retiras: el rumor gana hoy.',
  defeat: 'Me disipo… la verdad abre el cielo.',
  taunts: { phase1: ['f1'], phase2: ['f2'], phase3: ['f3'], hit: ['golpe'], miss: ['espeso'] },
};

const reflection: ReflexionarContent = {
  kind: 'reflexionar',
  prompt: '¿Cómo decidiste?',
  guidance: ['Cuenta un caso'],
  minChars: 40,
  rubric: [
    {
      id: 'criterio',
      label: 'Nombra un criterio de verificación',
      keywords: ['fuente', 'fecha', 'cita'],
    },
    { id: 'caso', label: 'Cuenta un caso concreto', keywords: ['noticia', 'titular'] },
    {
      id: 'mejora',
      label: 'Propone qué haría distinto',
      keywords: ['la próxima', 'haría distinto'],
    },
  ],
};

describe('Brújula sin conexión', () => {
  it('la Bruma tiene una línea para cada momento de la batalla', () => {
    expect(brumaLocalLine(bruma, 'intro', 1)).toBe(bruma.intro);
    expect(brumaLocalLine(bruma, 'fase', 3)).toBe('f3');
    expect(brumaLocalLine(bruma, 'acierto', 2)).toBe('golpe');
    expect(brumaLocalLine(bruma, 'victoria', 3)).toBe(bruma.defeat);
  });

  it('la retroalimentación usa la de la opción elegida o avisa del tiempo agotado', () => {
    const item: QuizItem = {
      id: 'x',
      tier: 1,
      prompt: '¿?',
      options: [
        { id: 'a', text: 'Sí', correct: true, feedback: 'Correcto porque…' },
        { id: 'b', text: 'No', correct: false, feedback: 'No, porque…' },
      ],
      explanation: 'Explicación.',
    };
    expect(localFeedback(item, 'b').feedback).toBe('No, porque…');
    expect(localFeedback(item, null).feedback).toMatch(/tiempo/);
  });

  it('lee la reflexión por criterios, sin importar tildes ni mayúsculas', () => {
    const reading = localReflection(
      'Revisé la FUENTE de cada noticia. La próxima vez compararé también la fecha antes de publicar.',
      reflection,
    );
    expect(reading.met).toEqual(['criterio', 'caso', 'mejora']);
    expect(reading.score).toBe(1);
    expect(reading.source).toBe('local');
  });

  it('una reflexión corta o sin criterios recibe una sugerencia concreta', () => {
    const reading = localReflection('Lo hice bien.', reflection);
    expect(reading.score).toBe(0);
    expect(reading.suggestion).toMatch(/criterio de verificación/);
  });
});
