import { lazy } from 'react';
import type { BancoContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de ActivaTuIdea: el banco de pruebas en el taller y la arena
 * «Prototipar el cañón de luz». La versión accesible de ambos sigue disponible.
 */
export const games: IslandGames<BancoContent> = {
  Minigame: lazy(async () => ({
    default: (await import('./banco/BancoDePruebas3D')).BancoDePruebas3D,
  })),
  arena: {
    Component: lazy(async () => ({
      default: (await import('./canon/PrototiparCanon')).PrototiparCanon,
    })),
    verb: 'Prototipar el cañón de luz',
    howTo: [
      'Los comentarios de quienes prueban el cañón flotan por el taller como burbujas: acércate a una y pulsa E para recogerla (cargarla te frena).',
      'Llévala al banco de trabajo si se repite (varias personas dicen lo mismo): el cañón mejora y carga tu linterna.',
      'Si es un caso aislado o una ocurrencia ajena al problema, tírala a la papelera. Llevarla al banco atasca el cañón y fortalece a la Bruma.',
      'Dispara el haz con Espacio o clic mientras esquivas los ataques de la Bruma.',
    ],
  },
};
