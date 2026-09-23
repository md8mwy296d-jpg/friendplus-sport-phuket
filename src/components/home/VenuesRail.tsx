import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { Link } from 'react-router';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import VenueCard from '@/components/VenueCard';
import { cn } from '@/lib/utils';

export default function VenuesRail() {
  const { venues } = useStore();
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);
  const [progress, setProgress] = useState(0);
  const x = useMotionValue(0);

  const goTo = (p: number) => {
    const clamped = Math.min(1, Math.max(0, p));
    setProgress(clamped);
    animate(x, -clamped * maxDrag, { type: 'spring', stiffness: 120, damping: 24 });
  };

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const inner = innerRef.current;
      if (!track || !inner) return;
      const max = Math.max(0, inner.scrollWidth - track.clientWidth);
      setMaxDrag(max);
      x.set(-progress * max);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues.length]);

  const page = (dir: 1 | -1) => goTo(progress + dir * 0.34);

  return (
    <section className="overflow-hidden bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('home.venues.eyebrow')}</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-[#0B2E2B]">
              {t('home.venues.title')}
            </h2>
          </div>
          <Link to="/salles" className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#0E8C7F] transition-colors hover:text-[#0A6E64]">
            {t('home.venues.link')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <motion.div
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-[1280px] px-6 lg:px-12"
      >
        <div ref={trackRef} className="overflow-hidden">
          <motion.div
            ref={innerRef}
            drag={maxDrag > 0 ? 'x' : false}
            dragConstraints={{ left: -maxDrag, right: 0 }}
            dragElastic={0.08}
            animate={{ x: -progress * maxDrag }}
            transition={{ type: 'spring', stiffness: 120, damping: 24 }}
            onDragEnd={(_, info) => {
              const x = (info.point.x, 0);
              void x;
            }}
            className="flex w-max cursor-grab gap-6 pb-2 active:cursor-grabbing"
          >
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </motion.div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => {
              const activeDot = Math.round(progress * 2) === i;
              return (
                <span key={i} className={cn('h-2 rounded-full transition-all duration-300', activeDot ? 'w-6 bg-[#0E8C7F]' : 'w-2 bg-[#EADFC8]')} />
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => page(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFC8] text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC] disabled:opacity-30"
              disabled={progress <= 0.01}
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => page(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFC8] text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC] disabled:opacity-30"
              disabled={progress >= 0.99}
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
