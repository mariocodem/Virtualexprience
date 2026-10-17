import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { getStation, world } from '@/data';
import { hasProgress } from '@/progress/selectors';
import { pickProgress, useProgress } from '@/progress/store';
import type { Progress } from '@/progress/types';
import type { IslandId } from '@/types/domain';
import { ComoFunciona } from './ComoFunciona';
import { CTAFinal } from './CTAFinal';
import { DuaSection } from './DuaSection';
import { Hero3D } from './Hero3D';
import { IASection } from './IASection';
import './landing.css';
import { LandingFooter } from './LandingFooter';
import { Manifiesto } from './Manifiesto';
import { PasaportePreview } from './PasaportePreview';
import { RouteSegment } from './RouteSegment';
import { RutasShowcase } from './RutasShowcase';
import { useSmoothScroll } from './useSmoothScroll';
import { hasWebGL2 } from './webgl';

const LandingCanvas = lazy(() => import('./scene/LandingCanvas'));

/** ¿Dónde quedó la expedición? La isla de la última actividad registrada. */
function lastIsland(progress: Progress): IslandId | null {
  for (const entry of [...progress.journal].reverse()) {
    if (entry.kind === 'isla-visitada' || entry.kind === 'fragmento') return entry.ref as IslandId;
    const station = getStation(entry.ref);
    if (station) return station.islandId;
  }
  return progress.visitedIslands.at(-1) ?? null;
}

export default function LandingPage() {
  const reduced = useReducedMotion();
  const [enable3D, setEnable3D] = useState(false);
  const progress = useProgress((s) => s);
  const litIslands = progress.fragments;

  const resume = useMemo(() => {
    const snapshot = pickProgress(progress);
    if (!hasProgress(snapshot)) return null;
    const islandId = lastIsland(snapshot) ?? 'ecos';
    const island = world.islands.find((i) => i.id === islandId);
    return island ? { islandId, islandName: island.name } : null;
  }, [progress]);

  useSmoothScroll(!reduced);

  // El relieve 3D llega después del primer pintado: la plancha SVG y el título ya están en pantalla.
  useEffect(() => {
    if (!hasWebGL2()) return;
    const start = () => {
      setEnable3D(true);
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(start, { timeout: 800 });
      return () => {
        window.cancelIdleCallback(id);
      };
    }
    const timer = setTimeout(start, 200);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative">
      <title>Archipiélago VirtuX · Aprende explorando</title>
      {enable3D && (
        <Suspense fallback={null}>
          <LandingCanvas />
        </Suspense>
      )}
      <Hero3D enable3D={enable3D} reduced={reduced} litIslands={litIslands} resume={resume} />
      <RouteSegment reduced={reduced}>
        <Manifiesto reduced={reduced} />
      </RouteSegment>
      <RutasShowcase enable3D={enable3D} reduced={reduced} litIslands={litIslands} />
      <RouteSegment reduced={reduced}>
        <ComoFunciona reduced={reduced} />
        <IASection reduced={reduced} />
        <DuaSection />
        <PasaportePreview reduced={reduced} />
        <CTAFinal
          resumeTo={resume ? `/mundo/${resume.islandId}` : null}
          enable3D={enable3D}
          reduced={reduced}
          litIslands={litIslands}
        />
      </RouteSegment>
      <LandingFooter />
    </div>
  );
}
