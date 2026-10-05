import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Headset, Luggage, MapPinned, Motorbike, PlaneLanding, Search, ShieldCheck } from 'lucide-react';
import { CATEGORIES } from '@/lib/catalog';
import { contactHref } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import OfferCard from '@/components/offer/OfferCard';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Home() {
  const { t } = useI18n();
  const { offers, offersReady } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const featured = useMemo(() => {
    const live = offers.filter((o) => o.active);
    const top = live.filter((o) => o.featured);
    return (top.length >= 3 ? top : live).slice(0, 6);
  }, [offers]);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/explorer?q=${encodeURIComponent(q)}` : '/explorer');
  };

  return (
    <div className="bg-sand">
      {/* hero (sits under the transparent navbar) */}
      <section className="relative -mt-[68px] overflow-hidden bg-lagoon-deep pt-[68px] text-white">
        <div className="palm-texture absolute inset-0 bg-white/[0.05]" aria-hidden />
        <div
          className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FFB547, transparent 65%)' }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-[1200px] px-4 pb-20 pt-14 sm:px-6 md:pb-28 md:pt-24">
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="text-xs font-bold uppercase tracking-[0.2em] text-amber"
          >
            {t('home.hero.eyebrow')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            className="mt-4 max-w-3xl font-display text-[40px] font-bold leading-[1.05] tracking-[-0.02em] md:text-6xl"
          >
            {t('home.hero.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/75 md:text-lg"
          >
            {t('home.hero.subtitle')}
          </motion.p>
          <motion.form
            onSubmit={search}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-white p-1.5 shadow-[0_20px_50px_rgba(0,0,0,.25)]"
            role="search"
          >
            <Search className="ml-3 h-5 w-5 shrink-0 text-ink/40" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('home.search.placeholder')}
              aria-label={t('home.search.placeholder')}
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/40"
            />
            <button type="submit" className="h-11 shrink-0 rounded-full bg-coral-pop px-5 text-sm font-bold text-white shadow-coral">
              {t('home.search.cta')}
            </button>
          </motion.form>
        </div>
      </section>

      {/* airport concierge: everything ready on landing */}
      <section className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6">
        <Link
          to="/mon-arrivee"
          className="group grid gap-5 rounded-[24px] border border-sand-dark bg-white p-6 shadow-paper transition-transform hover:-translate-y-0.5 md:grid-cols-[1fr_auto] md:items-center md:p-8"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">{t('arrival.eyebrow')}</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">{t('arrival.title')}</h2>
            <ul className="mt-4 grid gap-2 text-sm text-ink/70 sm:grid-cols-3">
              {[
                { icon: PlaneLanding, key: 'welcome' },
                { icon: Motorbike, key: 'ride' },
                { icon: Luggage, key: 'bags' },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-lagoon" /> {t(`arrival.step.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <span className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-coral-pop px-6 text-sm font-bold text-white shadow-coral">
            {t('arrival.cta')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-[1200px] px-4 pt-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">{t('home.categories.title')}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.03, ease: EASE }}
              >
                <Link
                  to={`/explorer?cat=${c.id}`}
                  className="group flex h-full flex-col gap-3 rounded-[20px] border border-sand-dark bg-white p-4 shadow-paper transition-transform hover:-translate-y-0.5"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-display text-[15px] font-semibold leading-tight text-ink">{t(`cat.${c.id}`)}</span>
                    <span className="mt-1 block text-[12px] leading-snug text-ink/55">{t(`cat.${c.id}.tagline`)}</span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* featured */}
      {(featured.length > 0 || !offersReady) && (
        <section className="mx-auto max-w-[1200px] px-4 pt-14 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">{t('home.featured.title')}</h2>
            <Link to="/explorer" className="inline-flex items-center gap-1 text-sm font-bold text-lagoon-deep hover:underline">
              {t('common.seeAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {!offersReady
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[330px] animate-pulse rounded-[20px] bg-sand-dark/50" />)
              : featured.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        </section>
      )}

      {/* how it works */}
      <section className="mx-auto max-w-[1200px] px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">{t('home.how.title')}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="rounded-[20px] border border-sand-dark bg-white p-6 shadow-paper">
              <span className="font-display text-3xl font-bold text-coral">0{n}</span>
              <p className="mt-2 font-display text-lg font-semibold text-ink">{t(`home.how.${n}.title`)}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{t(`home.how.${n}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* trust */}
      <section className="mx-auto max-w-[1200px] px-4 pt-12 sm:px-6">
        <div className="grid gap-4 rounded-[24px] bg-white p-6 shadow-paper md:grid-cols-3 md:p-8">
          {[
            { icon: ShieldCheck, key: 'secure' },
            { icon: MapPinned, key: 'local' },
            { icon: Headset, key: 'support' },
          ].map(({ icon: Icon, key }) => (
            <div key={key} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lagoon/10 text-lagoon-deep">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{t(`home.trust.${key}`)}</p>
                <p className="mt-0.5 text-sm text-ink/60">{t(`home.trust.${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* special request */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] bg-golden-hour p-8 text-white md:p-12">
          <h2 className="font-display text-3xl font-bold">{t('home.cta.title')}</h2>
          <p className="mt-3 max-w-xl text-white/90">{t('home.cta.body')}</p>
          <a
            href={contactHref('My Phuket Key')}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-bold text-ink"
          >
            {t('home.cta.button')}
          </a>
        </div>
      </section>
    </div>
  );
}
