import type { Island } from '@/types/domain';
import { ArchipelagoPlate2D } from '@/world/ArchipelagoPlate2D';

/**
 * Fondo del escenario: la isla vista de cerca en la carta, con la bruma que la
 * cubre mientras no recupere su fragmento. Decorativo.
 */
export function StageBackdrop({ island, lit }: { island: Island; lit: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <ArchipelagoPlate2D
        fit="cover"
        focus={{ x: island.position.x, z: island.position.z, span: island.radius * 4.2 }}
        litIslands={lit ? [island.id] : []}
        activeIsland={island.id}
        className="absolute inset-0 size-full scale-110"
      />
      <div className="absolute inset-0 bg-sea-950/72" />
      {!lit && <div className="absolute inset-0 stage-fog" />}
    </div>
  );
}
