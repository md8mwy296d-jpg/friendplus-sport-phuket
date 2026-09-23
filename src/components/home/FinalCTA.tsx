import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function FinalCTA() {
  const { t } = useI18n();
  return (
    <section className="bg-[#FBF6EC] px-6 py-20 lg:px-12 lg:py-28">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[32px] bg-golden-hour px-6 py-20 text-center lg:py-28"
      >
        <div aria-hidden className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.06]" />
        {/* giant palm silhouette */}
        <motion.div
          aria-hidden
          initial={{ y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="palm-texture pointer-events-none absolute -right-10 -top-16 h-[460px] w-[460px] bg-[#0B2E2B] opacity-10 lg:right-4"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#0B2E2B]">
            {t('home.final.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#0B2E2B]/75">
            {t('home.final.subtitle')}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/creer"
              className="inline-flex h-14 items-center gap-2 rounded-full bg-[#0B2E2B] px-8 text-base font-bold text-white shadow-[0_12px_30px_rgba(11,46,43,.35)] transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" />
              {t('home.final.cta1')}
            </Link>
            <Link
              to="/explorer"
              className="inline-flex h-14 items-center gap-2 rounded-full border border-[#0B2E2B]/20 bg-white/40 px-8 text-base font-bold text-[#0B2E2B] backdrop-blur transition-all hover:scale-105 hover:bg-white/60"
            >
              {t('home.final.cta2')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-7 text-[13px] font-medium text-[#0B2E2B]/60">{t('home.final.note')}</p>
        </div>
      </motion.div>
    </section>
  );
}
