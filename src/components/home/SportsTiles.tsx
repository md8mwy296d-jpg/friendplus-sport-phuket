import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { SPORTS, hourlyPerPlayer } from '@/lib/sports';
import SportIcon from '@/components/SportIcon';
import { sportPhoto } from '@/lib/sportPhotos';

/** Light 3D tilt (max 4°), desktop only. */
function Tilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [4, -4]), { stiffness: 200, damping: 25 });
  const ry = useSpring(useTransform(mx, [0, 1], [-4, 4]), { stiffness: 200, damping: 25 });

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', perspective: 800 }}
      onMouseMove={(e) => {
        if (!window.matchMedia('(pointer: fine)').matches) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        mx.set((e.clientX - rect.left) / rect.width);
        my.set((e.clientY - rect.top) / rect.height);
      }}
      onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
    >
      {children}
    </motion.div>
  );
}

export default function SportsTiles() {
  const { t, formatTHB } = useI18n();
  const { rates } = useStore();
  return (
    <section className="relative bg-lagoon-deep pb-24 pt-10 lg:pb-32">
      {/* wave divider on top (dark wave over the light section above) */}
      <div aria-hidden className="wave-mask -mt-10 h-[70px] w-full bg-[#0B2E2B] md:h-[110px]" />
      <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="relative mx-auto max-w-[1280px] px-6 pt-16 lg:px-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B4A]">{t('home.sports.eyebrow')}</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-white">
          {t('home.sports.title')}
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {SPORTS.map((sport, i) => (
            <motion.div
              key={sport}
              // odd count: the first tile (padel, the featured sport) spans the full row
              className={i === 0 && SPORTS.length % 2 === 1 ? 'md:col-span-2' : undefined}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <Tilt>
                <Link
                  to={`/explorer?sport=${sport}`}
                  className="group relative block min-h-[280px] overflow-hidden rounded-[20px] border-2 border-transparent transition-colors duration-500 hover:border-[#2FBFA5]/60"
                >
                  <img
                    src={sportPhoto(sport)}
                    alt={t(`sport.${sport}`)}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/85 via-[#0B2E2B]/25 to-transparent transition-opacity duration-500 group-hover:opacity-70" />
                  <div className="relative flex h-full min-h-[280px] flex-col justify-end p-6">
                    <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                      <SportIcon sport={sport} className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-[28px] font-bold text-white">{t(`sport.${sport}`)}</h3>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <p className="font-mono text-sm font-medium text-white/75">
                        {t(`home.sports.${sport}.quota`)} · {formatTHB(hourlyPerPlayer(rates, sport))} {t('create.price.perHour')}
                      </p>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-golden-hour text-[#0B2E2B] transition-transform duration-300 group-hover:translate-x-1.5">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Tilt>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
