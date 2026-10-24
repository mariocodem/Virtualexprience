import type { BrujulaMessage } from '@/stations/BrujulaBubble';
import type { ProgressEvent } from '@/progress/types';
import type { Island } from '@/types/domain';

/** Contrato común de los minijuegos: el escenario de estación les da contenido y oídos. */
export interface MinigameProps<C> {
  content: C;
  island: Island;
  onBrujula: (message: BrujulaMessage | null) => void;
  onEvents: (events: ProgressEvent[]) => void;
  onComplete: (score: number, epilogue?: string) => void;
  onFail: (score: number) => void;
}

/** Resultado mínimo para superar un reto (proporción de 0 a 1). */
export const PASSING_SCORE = 0.6;

export interface ReportCriterion {
  label: string;
  met: boolean;
  detail?: string;
}

export interface ReportFigure {
  label: string;
  value: string;
}
