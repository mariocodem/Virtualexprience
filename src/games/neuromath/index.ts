import type { PuentesContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de NeuroMath: su reto y su arena contra la Bruma. Mientras falte
 * alguno, se juega su versión accesible (y la arena de faros de respuesta).
 */
export const games: IslandGames<PuentesContent> = {
  Minigame: null,
  arena: null,
};
