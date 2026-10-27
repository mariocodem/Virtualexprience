import { useState } from 'react';
import type { ReflexionarContent } from '@/data/contentSchemas';
import type { ProgressEvent } from '@/progress/types';
import { ReflexionarStation } from '@/stations/ReflexionarStation';
import type { Island } from '@/types/domain';
import { ISLE } from '@/world/palette';
import { FormatPanel } from './Explorar3D';
import type { Spot } from './plaza';
import { PlazaStage } from './PlazaStage';
import { JournalDesk, SpotProp } from './StationSet';

const DESK: Spot = { id: 'bitacora', x: 0, z: -3 };

/**
 * Reflexionar en 3D: al fondo de la plaza espera la bitácora, bajo su lámpara.
 * Allí se escribe la reflexión, que Brújula lee con la misma rúbrica.
 */
export default function Reflexionar3D({
  stationId,
  content,
  island,
  onEvents,
  onComplete,
}: {
  stationId: string;
  content: ReflexionarContent;
  island: Island;
  onEvents: (events: ProgressEvent[]) => void;
  onComplete: (score: number) => void;
}) {
  const [near, setNear] = useState<Spot | undefined>();
  const [open, setOpen] = useState(false);
  return (
    <PlazaStage
      island={island}
      label={`Reflexionar en 3D: la bitácora en ${island.name}`}
      spots={[DESK]}
      near={near}
      onNear={setNear}
      onUse={() => {
        setOpen(true);
      }}
      hint={() => 'Abrir la bitácora'}
      goal={
        <>
          <p className="toponym text-[0.625rem] text-sea-100">Reflexionar · {island.name}</p>
          <p className="mt-1 text-sm text-plate">{content.prompt}</p>
          <p className="mt-2 text-xs text-sea-100">
            Camina hasta la bitácora, al fondo de la plaza, y pulsa E para escribir.
          </p>
        </>
      }
      overlay={
        open ? (
          <FormatPanel
            title="Bitácora"
            onClose={() => {
              setOpen(false);
            }}
          >
            <ReflexionarStation
              stationId={stationId}
              content={content}
              onEvents={onEvents}
              onComplete={onComplete}
            />
          </FormatPanel>
        ) : null
      }
      onCloseOverlay={() => {
        setOpen(false);
      }}
      props={
        <SpotProp spot={DESK} label="Bitácora">
          <JournalDesk accent={ISLE[island.id]} />
        </SpotProp>
      }
    />
  );
}
