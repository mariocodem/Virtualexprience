import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/ui/cx';
import { ScrollTrigger } from './motion';

interface Geometry {
  d: string;
  height: number;
  markers: number[];
}

const LINE_X = 52;
const SWAY = 9;

/**
 * Tramo de la ruta de navegación: una línea punteada recorre el margen y une
 * los títulos marcados con `data-escala`. Se dibuja con el scroll; el rojo
 * (tinta de «en curso») marca hasta dónde has llegado.
 */
export function RouteSegment({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const traveled = useRef<SVGPathElement>(null);
  const maskId = useId();
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [reached, setReached] = useState(-1);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const top = element.getBoundingClientRect().top;
      const markers = [...element.querySelectorAll<HTMLElement>('[data-escala]')].map(
        (heading) => heading.getBoundingClientRect().top - top + 18,
      );
      const height = element.offsetHeight;
      const points = [0, ...markers, height].map((y, i) => ({
        x: LINE_X + (i % 2 === 0 ? -SWAY : SWAY) * (i === 0 ? 0 : 1),
        y,
      }));
      const d = points.reduce((path, point, i) => {
        const previous = points[i - 1];
        if (!previous) return `M${String(point.x)},${String(point.y)}`;
        const dy = (point.y - previous.y) / 2;
        return `${path} C${String(previous.x)},${String(previous.y + dy)} ${String(point.x)},${String(point.y - dy)} ${String(point.x)},${String(point.y)}`;
      }, '');
      setGeometry({ d, height, markers });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const element = root.current;
    const path = traveled.current;
    if (!element || !path || !geometry) return;
    // Sin getTotalLength (entornos sin motor SVG), la ruta casi vertical mide cerca de su altura.
    const length =
      typeof path.getTotalLength === 'function' ? path.getTotalLength() : geometry.height * 1.05;
    path.style.strokeDasharray = String(length);

    const update = (drawnY: number) => {
      const fraction = Math.min(1, Math.max(0, drawnY / geometry.height));
      path.style.strokeDashoffset = String(length * (1 - fraction));
      setReached(geometry.markers.filter((y) => y <= drawnY + 2).length - 1);
    };

    if (reduced) {
      update(geometry.height);
      return;
    }
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: 'top 70%',
      end: 'bottom 70%',
      onUpdate: (self) => {
        update(self.progress * geometry.height);
      },
    });
    update(trigger.progress * geometry.height);
    return () => {
      trigger.kill();
    };
  }, [geometry, reduced]);

  return (
    <div ref={root} className="relative lg:[&>section]:pl-28">
      {geometry && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-[2] hidden lg:block"
          width={LINE_X * 2}
          height={geometry.height}
        >
          <defs>
            <mask id={maskId}>
              <path ref={traveled} d={geometry.d} fill="none" stroke="white" strokeWidth={8} />
            </mask>
          </defs>
          <path
            d={geometry.d}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={0.22}
            strokeWidth={1.5}
            strokeDasharray="6 7"
          />
          <path
            d={geometry.d}
            fill="none"
            stroke="var(--route)"
            strokeWidth={2.5}
            strokeDasharray="10 8"
            mask={`url(#${maskId})`}
          />
          {geometry.markers.map((y, i) => {
            const x = LINE_X + (i % 2 === 0 ? SWAY : -SWAY);
            const current = i === reached;
            return (
              <g key={i}>
                {current && (
                  <circle
                    cx={x}
                    cy={y}
                    r={11}
                    fill="none"
                    stroke="var(--route)"
                    strokeWidth={1.5}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  className={cx('transition-colors duration-(--dur-base)')}
                  fill={i <= reached ? 'var(--route)' : 'var(--plate)'}
                  stroke={i <= reached ? 'var(--route)' : 'var(--ink)'}
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>
      )}
      {children}
    </div>
  );
}
