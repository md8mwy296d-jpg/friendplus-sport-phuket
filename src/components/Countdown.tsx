import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

interface CountdownProps {
  target: string; // ISO
  compact?: boolean;
  className?: string;
}

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s, total };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** JJ : HH : MM : SS countdown in Space Grotesk, flip animation, coral pulse < 6h, red alert < 1h. */
export default function Countdown({ target, compact = false, className }: CountdownProps) {
  const now = useNow();
  const reduced = usePrefersReducedMotion();
  const { t } = useI18n();
  const { d, h, m, s, total } = split(new Date(target).getTime() - now);

  const urgency = total <= 0 ? 'done' : total < 3600 ? 'lastHour' : total < 21600 ? 'soon' : 'normal';

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums',
          urgency === 'lastHour' || urgency === 'done' ? 'text-[#F05252]' : urgency === 'soon' ? 'text-[#FF6B4A]' : 'text-[#0B2E2B]/70',
          (urgency === 'soon') && 'animate-pulse',
          className,
        )}
      >
        {(urgency === 'lastHour' || urgency === 'done') && (
          <span className="rounded bg-[#F05252]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F05252]">
            {t('countdown.lastHour')}
          </span>
        )}
        {d > 0 ? `${d}${t('countdown.days').toLowerCase()} ` : ''}{pad(h)}:{pad(m)}:{pad(s)}
      </span>
    );
  }

  const units = [
    { value: pad(d), label: t('countdown.days') },
    { value: pad(h), label: t('countdown.hours') },
    { value: pad(m), label: t('countdown.minutes') },
    { value: pad(s), label: t('countdown.seconds') },
  ];

  return (
    <div className={cn('flex items-end gap-2', className)}>
      {units.map((u, i) => (
        <div key={u.label} className="flex items-end gap-2">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'relative min-w-[2ch] overflow-hidden rounded-xl border bg-white px-2 py-1 text-center font-mono font-bold tabular-nums shadow-sm',
                'text-[clamp(1.6rem,4vw,2.5rem)]',
                urgency === 'lastHour' || urgency === 'done'
                  ? 'border-[#F05252]/40 text-[#F05252]'
                  : urgency === 'soon'
                    ? 'animate-pulse border-[#FF6B4A]/40 text-[#FF6B4A]'
                    : 'border-[#EADFC8] text-[#0B2E2B]',
              )}
            >
              {reduced ? (
                <span>{u.value}</span>
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={u.value}
                    initial={{ y: '60%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-60%', opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-block"
                  >
                    {u.value}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/40">{u.label}</span>
          </div>
          {i < units.length - 1 && (
            <span className={cn('pb-5 font-mono text-xl font-bold', urgency === 'normal' ? 'text-[#0B2E2B]/25' : 'text-current opacity-40')}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
