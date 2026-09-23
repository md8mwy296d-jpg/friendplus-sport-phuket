import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface QuotaRingProps {
  current: number;
  quota: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

/** SVG quota ring with golden-hour gradient stroke, animated dashoffset + count-up number. */
export default function QuotaRing({ current, quota, size = 96, strokeWidth = 8, className, showLabel = true }: QuotaRingProps) {
  const target = Math.min(current, quota);
  const [display, setDisplay] = useState(0);
  const animated = useRef(false);

  // count-up on mount + on value change
  useEffect(() => {
    const from = animated.current ? display : 0;
    animated.current = true;
    if (from === target) { setDisplay(target); return; }
    const start = performance.now();
    const duration = 800;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = quota > 0 ? display / quota : 0;
  const gradientId = `quota-grad-${useId()}`;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0E8C7F" />
            <stop offset="45%" stopColor="#2FBFA5" />
            <stop offset="78%" stopColor="#FFB547" />
            <stop offset="100%" stopColor="#FF6B4A" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EADFC8" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute font-mono font-bold tabular-nums text-[#0B2E2B]"
          style={{ fontSize: Math.round(size * 0.2) }}
        >
          {display}
          <span className="text-[#0B2E2B]/40" style={{ fontSize: Math.round(size * 0.15) }}>/{quota}</span>
        </span>
      )}
    </div>
  );
}
