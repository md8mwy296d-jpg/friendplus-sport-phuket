import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import SessionCard from '@/components/SessionCard';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function FeaturedSessions() {
  const { sessions } = useStore();
  const { t } = useI18n();

  // open sessions closest to filling up (fewest spots left first), max 6
  const featured = sessions
    .filter((s) => s.status === 'open' || s.status === 'full')
    .sort((a, b) => (a.quota - a.playerIds.length) - (b.quota - b.playerIds.length))
    .slice(0, 6);

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B4A]">{t('home.featured.eyebrow')}</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-[#0B2E2B]">
              {t('home.featured.title')}
            </h2>
          </div>
          <Link
            to="/explorer"
            className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#0E8C7F] transition-colors hover:text-[#0A6E64]"
          >
            {t('home.featured.link')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid snap-x snap-mandatory auto-cols-[85%] grid-flow-col gap-6 overflow-x-auto pb-4 sm:auto-cols-[46%] md:auto-cols-auto md:grid-flow-row md:grid-cols-2 md:overflow-visible lg:grid-cols-3"
        >
          {featured.map((s) => (
            <motion.div key={s.id} variants={item} className="snap-start">
              <SessionCard session={s} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
