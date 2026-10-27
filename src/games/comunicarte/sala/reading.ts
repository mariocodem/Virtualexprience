import type { NewsroomReport } from '@/minigames/sala-de-redaccion/engine';

/** Lectura de Brújula sobre la edición, con las mismas reglas que la versión accesible. */
export function newsroomReading(result: NewsroomReport, falseAired: number) {
  const highlights = [
    `Decisiones correctas: ${String(Math.round(result.accuracy * 100))} %.`,
    `Justificaciones con la señal decisiva: ${String(Math.round(result.criteria * 100))} %.`,
    `Señales distintas investigadas: ${String(result.toolsUsed)} de 4.`,
    `Notas sin revisar al cierre: ${String(result.unreviewed)}.`,
    `Notas falsas o imprecisas que salieron al aire: ${String(falseAired)}.`,
  ];
  const parts: string[] = [];
  if (falseAired > 0)
    parts.push(
      'Algunas notas salieron al aire sin sostenerse: en una radio, un error difundido llega lejos.',
    );
  else if (result.accuracy >= 0.75)
    parts.push('Tu edición protegió a la audiencia: lo que salió al aire se sostiene.');
  if (result.criteria < result.accuracy)
    parts.push('A veces acertaste por intuición: nombra la señal que de verdad decide el caso.');
  else if (result.criteria >= 0.75)
    parts.push(
      'Justificaste con criterio, que es lo que hace confiable a una editora o un editor.',
    );
  if (result.toolsUsed < 3)
    parts.push(
      'Prueba las herramientas que no usaste: cada una detecta un tipo distinto de engaño.',
    );
  if (result.unreviewed > 0)
    parts.push('Administra el reloj: investiga primero la señal más dudosa de cada nota.');
  return {
    text: parts.join(' ') || 'Edición cerrada. Revisa nota por nota qué señal decidía cada caso.',
    highlights,
  };
}
