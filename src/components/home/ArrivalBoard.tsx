import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Luggage, Martini, Motorbike, PlaneLanding, UserRound, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STEPS: { time: string; key: string; icon: LucideIcon }[] = [
  { time: '14:35', key: 's1', icon: PlaneLanding },
  { time: '14:50', key: 's2', icon: UserRound },
  { time: '15:05', key: 's3', icon: Motorbike },
  { time: '17:30', key: 's4', icon: Luggage },
  { time: '19:00', key: 's5', icon: Martini },
];
const TICK_MS = 1600;

/** Current time in Phuket (UTC+7), ticking every second. */
function usePhuketClock() {
  const read = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => setNow(read()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Split-flap style letters, flipping when the text changes. */
function Flap({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('inline-flex gap-[2px]', className)} aria-label={text}>
      {text.split('').map((c, i) => (
        <motion.span
          key={`${text}-${i}`}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex h-7 min-w-[18px] items-center justify-center rounded-[4px] bg-black/60 px-[3px] font-mono text-[13px] font-bold text-amber shadow-[inset_0_-1px_0_rgba(255,255,255,.06)] [transform-origin:50%_50%]"
          aria-hidden
        >
          {c === ' ' ? ' ' : c}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * The hero's signature: a private arrivals board where the guest's programme
 * lights up step by step (landing, welcome, scooter, luggage, dinner).
 */
export default function ArrivalBoard() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const clock = usePhuketClock();
  const [done, setDone] = useState(reduce ? STEPS.length : 0);

  useEffect(() => {
    if (reduce) return;
    // light up one step at a time, hold the full programme, then replay
    const id = window.setInterval(() => setDone((d) => (d >= STEPS.length + 2 ? 0 : d + 1)), TICK_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  const landed = done > 0;
  const progress = Math.min(done, STEPS.length) / STEPS.length;

  return (
    <div className="relative w-full max-w-[440px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 text-white shadow-[0_40px_120px_rgba(0,0,0,.55)] backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(140deg,rgba(217,192,138,.18),transparent_40%)]" aria-hidden />

      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber">{t('home.board.label')}</p>
        <p className="text-right">
          <span className="block font-mono text-sm font-bold tabular-nums text-white">{clock}</span>
          <span className="block text-[9px] uppercase tracking-[0.2em] text-white/45">{t('home.board.local')}</span>
        </p>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/10 bg-black/30 p-3">
        <Flap text="TG 201" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">BKK → HKT</span>
        <Flap
          key={landed ? 'landed' : 'approach'}
          text={landed ? t('home.board.landed') : t('home.board.approach')}
          className="ml-auto"
        />
      </div>

      <ol className="relative mt-5 grid gap-3.5 pl-1">
        {/* gold progress rail */}
        <span className="absolute bottom-3 left-[19px] top-3 w-px bg-white/10" aria-hidden />
        <motion.span
          className="absolute left-[19px] top-3 w-px origin-top bg-gradient-to-b from-amber to-lagoon"
          style={{ height: 'calc(100% - 24px)' }}
          animate={{ scaleY: progress }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
        {STEPS.map(({ time, key, icon: Icon }, i) => {
          const isDone = i < done;
          const isNext = i === done;
          return (
            <li key={key} className="relative flex items-center gap-3.5">
              <span
                className={cn(
                  'relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border transition-all duration-500',
                  isDone ? 'border-amber bg-amber text-ink shadow-[0_0_24px_rgba(217,192,138,.45)]' : 'border-white/15 bg-[#1b1814] text-white/40',
                )}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                {isNext && !reduce && <span className="absolute inset-0 animate-ping rounded-full border border-amber/60" aria-hidden />}
              </span>
              <span className={cn('min-w-0 flex-1 transition-colors duration-500', isDone ? 'text-white' : 'text-white/40')}>
                <span className="block font-mono text-[11px] tabular-nums tracking-wider text-amber/80">{time}</span>
                <span className="block truncate text-[14px] font-semibold">{t(`home.board.${key}`)}</span>
              </span>
              <span className={cn('text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity duration-500', isDone ? 'text-amber opacity-100' : 'opacity-0')}>
                {t('home.board.ready')}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
