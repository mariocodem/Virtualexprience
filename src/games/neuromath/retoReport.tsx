import { useState } from 'react';
import type { BridgeReport } from '@/minigames/puentes-de-fractal/engine';
import { GameReport } from '@/minigames/shared/GameReport';
import { CONCEPT_LABEL } from './concepts';

/**
 * Informe del cañón: las mismas cifras y criterios que el de la versión
 * accesible (mismo motor), con la lectura de Brújula sobre cómo se construyó.
 */
export function BridgesReport({
  result,
  competency,
  back,
  onComplete,
  onRetry,
}: {
  result: BridgeReport;
  competency: string;
  back: string;
  onComplete: () => void;
  onRetry: () => void;
}) {
  const total = result.results.length;
  const solved = result.results.filter((r) => r.solved);
  const firstTry = solved.filter((r) => r.tries === 1).length;
  const concepts = [...new Set(result.results.map((r) => r.bridge.concept))];
  const [brujula] = useState(() => {
    const parts: string[] = [];
    if (solved.length === total)
      parts.push('Todos tus puentes resisten: el observatorio vuelve a estar unido.');
    else parts.push(`Resistieron ${String(solved.length)} de ${String(total)} puentes.`);
    if (firstTry < solved.length)
      parts.push(
        'Algunos los resolviste probando: convierte cada pieza a metros antes de cargar la vagoneta.',
      );
    else if (firstTry > 0)
      parts.push('Calculaste antes de probar: así se ahorran cargas y materiales.');
    const weak = concepts.filter((c) => !solved.some((r) => r.bridge.concept === c));
    if (weak.length > 0)
      parts.push(
        `Repasa ${weak.map((c) => CONCEPT_LABEL[c].toLowerCase()).join(' y ')} en «Escalas y proporciones».`,
      );
    return {
      text: parts.join(' '),
      highlights: [
        `Puentes que resistieron: ${String(solved.length)} de ${String(total)}.`,
        `Resueltos en la primera prueba: ${String(firstTry)}.`,
        `Conceptos dominados: ${String(result.toolsUsed)} de ${String(concepts.length)}.`,
        ...result.results.map(
          (r) =>
            `${CONCEPT_LABEL[r.bridge.concept]}: ${r.solved ? `resistió en ${String(r.tries)} prueba(s)` : 'se derrumbó'}.`,
        ),
      ],
    };
  });

  return (
    <GameReport
      title={solved.length === total ? 'Todos los puentes resisten' : 'El cañón cierra por hoy'}
      score={result.score}
      figures={[
        { label: 'Puentes en pie', value: `${String(solved.length)} de ${String(total)}` },
        { label: 'A la primera', value: `${String(firstTry)} de ${String(total)}` },
        { label: 'Conceptos', value: `${String(result.toolsUsed)} de ${String(concepts.length)}` },
      ]}
      criteria={[
        {
          label: 'Cubriste cada hueco con exactitud',
          met: result.accuracy >= 0.75,
          detail: 'Sumar medidas escritas de formas distintas exige pasarlas a una misma unidad.',
        },
        {
          label: 'Calculaste antes de probar',
          met: result.criteria >= 0.5,
          detail: `${String(firstTry)} puente(s) resistieron en la primera prueba.`,
        },
        ...concepts.map((c) => ({
          label: CONCEPT_LABEL[c],
          met: solved.some((r) => r.bridge.concept === c),
        })),
      ]}
      brujula={brujula}
      game="Puentes de Fractal"
      competency={competency}
      back={back}
      onComplete={onComplete}
      onRetry={onRetry}
    />
  );
}
