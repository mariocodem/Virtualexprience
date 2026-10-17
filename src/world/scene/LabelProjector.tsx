import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, type RefObject } from 'react';
import { Vector3 } from 'three';

export interface LabelAnchor {
  id: string;
  position: readonly [number, number, number];
}

export interface LabelProjectorProps {
  anchors: LabelAnchor[];
  /** Contenedor DOM que ocupa la misma caja que la vista 3D. */
  container: RefObject<HTMLElement | null>;
  /** Rótulos DOM por id; se posicionan con transform en cada cuadro. */
  labels: RefObject<Map<string, HTMLElement>>;
}

const EDGE = 6;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Proyecta anclas 3D a la caja DOM de la vista y mueve los rótulos HTML: texto
 * real sobre el relieve. Un rótulo nunca se recorta: se acomoda contra el borde
 * de la plancha y, si un recuadro (`data-map-obstacle`) lo taparía, se oculta.
 */
export function LabelProjector({ anchors, container, labels }: LabelProjectorProps) {
  const camera = useThree((s) => s.camera);
  const vector = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const box = container.current;
    if (!box) return;

    // Lecturas primero (sin escrituras intercaladas) para no forzar reflujos.
    const frame = box.getBoundingClientRect();
    const obstacles: Box[] = [
      ...(box.closest('section')?.querySelectorAll<HTMLElement>('[data-map-obstacle]') ?? []),
    ].map((element) => {
      const r = element.getBoundingClientRect();
      return {
        left: r.left - frame.left,
        top: r.top - frame.top,
        right: r.right - frame.left,
        bottom: r.bottom - frame.top,
      };
    });
    const sizes = anchors.map((anchor) => {
      const element = labels.current.get(anchor.id);
      return element ? { element, width: element.offsetWidth, height: element.offsetHeight } : null;
    });

    anchors.forEach((anchor, i) => {
      const size = sizes[i];
      if (!size) return;
      vector.set(...anchor.position).project(camera);
      const inView = vector.z < 1 && Math.abs(vector.x) < 1.1 && Math.abs(vector.y) < 1.1;
      const half = size.width / 2;
      const x = clamp(((vector.x + 1) / 2) * frame.width, half + EDGE, frame.width - half - EDGE);
      const y = clamp(((1 - vector.y) / 2) * frame.height, size.height + EDGE, frame.height - EDGE);
      const rect = { left: x - half, right: x + half, top: y - size.height, bottom: y };
      const covered = obstacles.some((o) => overlaps(rect, o));
      size.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      size.element.style.opacity = inView && !covered ? '1' : '0';
    });
  });

  return null;
}
