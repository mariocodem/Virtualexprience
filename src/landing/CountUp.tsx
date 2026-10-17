import { useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/** Cifra que cuenta al entrar en pantalla; el lector de pantalla oye solo el valor final. */
export function CountUp({ value, reduced }: { value: number; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced || !inView) return;
    const start = performance.now();
    const duration = 1100;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - t) ** 4)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [inView, reduced, value]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {reduced ? value : shown}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
