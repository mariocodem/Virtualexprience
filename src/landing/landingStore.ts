import { create } from 'zustand';
import type { IslandId } from '@/types/domain';

interface LandingState {
  /** Isla enfocada en la sección «Seis islas»; `null` = vista general. */
  activeIsland: IslandId | null;
  /** La escena 3D ya pintó su primer cuadro: la plancha SVG puede retirarse. */
  sceneReady: boolean;
  setActiveIsland: (id: IslandId | null) => void;
  setSceneReady: () => void;
}

export const useLanding = create<LandingState>()((set) => ({
  activeIsland: null,
  sceneReady: false,
  setActiveIsland: (activeIsland) => {
    set({ activeIsland });
  },
  setSceneReady: () => {
    set({ sceneReady: true });
  },
}));
