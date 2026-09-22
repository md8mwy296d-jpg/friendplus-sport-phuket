import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import PlayerAvatar from '@/components/PlayerAvatar';

const TESTIMONIALS = [
  { userId: 'u-marco', quoteKey: 'home.testi.1.quote', nameKey: 'home.testi.1.name', trKey: 'home.testi.1.tr' },
  { userId: 'u-anastasia', quoteKey: 'home.testi.2.quote', nameKey: 'home.testi.2.name', trKey: 'home.testi.2.tr' },
  { userId: 'u-nok', quoteKey: 'home.testi.3.quote', nameKey: 'home.testi.3.name', trKey: 'home.testi.3.tr' },
];

export default function Testimonials() {
  const { t } = useI18n();
  const { getUser } = useStore();
  return (
    <section className="relative overflow-hidden bg-lagoon-deep py-20 lg:py-28">
      <div aria-hidden className="palm-texture pointer-events-none absolute inset-0 bg-white opacity-[0.05]" />
      <div aria-hidden className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2FBFA5]">{t('home.testi.eyebrow')}</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-white">
          {t('home.testi.title')}
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((tst, i) => {
            const user = getUser(tst.userId);
            return (
              <motion.figure
                key={tst.userId}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[20px] border border-white/15 bg-white/[0.08] p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/40"
              >
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-[#FFB547] text-[#FFB547]" />
                  ))}
                </div>
                <blockquote className="mt-4 text-[16px] leading-relaxed text-white/90">
                  {t(tst.quoteKey)}
                </blockquote>
                <p className="mt-1.5 text-[13px] italic text-white/45">{t(tst.trKey)}</p>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  {user && <PlayerAvatar user={user} size={40} ring={false} />}
                  <span className="text-sm font-semibold text-white">
                    {t(tst.nameKey)} {user?.nationality}
                  </span>
                </figcaption>
              </motion.figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
