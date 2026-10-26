import type { BancoContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de ActivaTuIdea: su reto y su arena contra la Bruma. Mientras falte
 * alguno, se juega su versión accesible (y la arena de faros de respuesta).
 */
export const games: IslandGames<BancoContent> = {
  Minigame: null,
  arena: null,
};
