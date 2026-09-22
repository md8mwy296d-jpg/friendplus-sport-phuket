import { useEffect, useRef, useState } from 'react';

/** Count-up number (Space Grotesk tabular) — starts when `start` becomes true. */
export default function CountUp({ value, suffix = '', duration = 1200, start = true, className }: {
  value: number;
  suffix?: string;
  duration?: number;
  start?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!start || started.current) return;
    started.current = true;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, value, duration]);

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}{suffix}
    </span>
  );
}
