import { create } from 'zustand';

interface WorldUiState {
  /** Isla, estación o `faro` resaltado por foco o puntero: la lista y el mapa lo comparten. */
  highlight: string | null;
  setHighlight: (id: string | null) => void;
}

export const useWorldUi = create<WorldUiState>()((set) => ({
  highlight: null,
  setHighlight: (highlight) => {
    set({ highlight });
  },
}));
