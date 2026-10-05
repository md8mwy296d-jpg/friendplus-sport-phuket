import { useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Luggage, Motorbike, PlaneLanding, Search } from 'lucide-react';
import { CATEGORIES } from '@/lib/catalog';
import { contactHref } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import OfferCard from '@/components/offer/OfferCard';
import ArrivalBoard from '@/components/home/ArrivalBoard';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const ROMAN = ['I', 'II', 'III'];

/** Thin gold L-shaped corner marks framing a dark section. */
function Corners() {
  const base = 'pointer-events-none absolute h-6 w-6 border-amber/40';
  return (
    <>
      <span className={`${base} left-4 top-[84px] border-l border-t sm:left-6`} aria-hidden />
      <span className={`${base} right-4 top-[84px] border-r border-t sm:right-6`} aria-hidden />
      <span className={`${base} bottom-4 left-4 border-b border-l sm:left-6`} aria-hidden />
      <span className={`${base} bottom-4 right-4 border-b border-r sm:right-6`} aria-hidden />
    </>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { offers, offersReady } = useStore();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState('');
  const heroRef = useRef<HTMLElement>(null);

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

  // a soft champagne light follows the pointer over the hero
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', `${e.clientX - r.left}px`);
    el.style.setProperty('--gy', `${e.clientY - r.top}px`);
  };

  const words = t('home.hero.title').split(' ');
  const marquee = CATEGORIES.map((c) => t(`cat.${c.id}`));

  return (
    <div className="bg-sand">
      {/* ───────────── hero: the private arrivals board ───────────── */}
      <section
        ref={heroRef}
        onMouseMove={onMove}
        className="relative -mt-[68px] overflow-hidden bg-lagoon-deep pt-[68px] text-white [--gx:70%] [--gy:30%]"
      >
        <div className="palm-texture absolute inset-0 bg-white/[0.035]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-300"
          style={{ background: 'radial-gradient(520px circle at var(--gx) var(--gy), rgba(217,192,138,.16), transparent 60%)' }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(168,132,74,.22),transparent_65%)] blur-2xl" aria-hidden />
        <Corners />

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 pb-20 pt-14 sm:px-8 md:pb-28 md:pt-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em] text-amber"
            >
              <span className="h-px w-10 bg-amber/70" aria-hidden /> {t('home.hero.eyebrow')}
            </motion.p>
            <h1 className="mt-6 font-display text-[52px] font-semibold leading-[0.95] tracking-[-0.02em] sm:text-[76px] lg:text-[92px]">
              {words.map((w, i) => (
                <motion.span
                  key={`${w}-${i}`}
                  initial={reduce ? false : { opacity: 0, y: 28, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE }}
                  className={`mr-[0.22em] inline-block ${i === words.length - 1 ? 'italic text-amber' : ''}`}
                >
                  {w}
                </motion.span>
              ))}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
              className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/65 md:text-lg"
            >
              {t('home.hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.65, ease: EASE }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Link
                to="/mon-arrivee"
                className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-gradient-to-r from-[#E6D3A3] to-[#B08D57] px-7 text-[15px] font-bold text-ink shadow-[0_12px_40px_rgba(217,192,138,.25)] transition-transform hover:scale-[1.02]"
              >
                {t('arrival.cta')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/explorer"
                className="inline-flex h-[52px] items-center rounded-full border border-white/20 px-7 text-[15px] font-semibold text-white/85 transition-colors hover:border-amber hover:text-white"
              >
                {t('home.hero.cta2')}
              </Link>
            </motion.div>

            <motion.form
              onSubmit={search}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-10 flex max-w-xl items-center gap-3 border-b border-white/20 pb-3 focus-within:border-amber"
              role="search"
            >
              <Search className="h-4 w-4 shrink-0 text-amber" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('home.search.placeholder')}
                aria-label={t('home.search.placeholder')}
                className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40"
              />
              <button type="submit" className="shrink-0 text-[12px] font-bold uppercase tracking-[0.2em] text-amber hover:text-white">
                {t('home.search.cta')}
              </button>
            </motion.form>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
            className="flex min-w-0 justify-center [perspective:1200px] lg:justify-end"
          >
            <ArrivalBoard />
          </motion.div>
        </div>
      </section>

      {/* ───────────── marquee of services ───────────── */}
      <section className="marquee-paused overflow-hidden border-y border-sand-dark bg-sand py-6" aria-hidden>
        <div className="animate-marquee flex w-max items-center whitespace-nowrap">
          {[...marquee, ...marquee].map((w, i) => (
            <span key={i} className="flex items-center font-display text-3xl italic text-ink/80 md:text-5xl">
              {w}
              <span className="mx-8 text-lg not-italic text-lagoon md:mx-12">✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* ───────────── the arrival ritual ───────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pt-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.6fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-lagoon">{t('arrival.eyebrow')}</p>
            <h2 className="mt-4 font-display text-[40px] font-semibold leading-[1.02] text-ink md:text-[56px]">{t('home.ritual.title')}</h2>
            <Link to="/mon-arrivee" className="group mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-ink">
              {t('arrival.cta')}
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 transition-colors group-hover:border-lagoon group-hover:bg-ink group-hover:text-amber">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-[24px] border border-sand-dark bg-sand-dark sm:grid-cols-3">
            {[
              { icon: PlaneLanding, key: 'welcome' },
              { icon: Motorbike, key: 'ride' },
              { icon: Luggage, key: 'bags' },
            ].map(({ icon: Icon, key }, i) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                className="relative bg-white p-6"
              >
                <span className="font-display text-6xl font-semibold leading-none text-transparent [-webkit-text-stroke:1px_#A8844A]">{ROMAN[i]}</span>
                <Icon className="absolute right-6 top-7 h-5 w-5 text-lagoon" />
                <p className="mt-5 font-display text-xl font-semibold text-ink">{t(`arrival.step.${key}`)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{t(`arrival.step.${key}.body`)}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── services, editorial index ───────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pt-24 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-[40px] font-semibold leading-none text-ink md:text-[56px]">{t('home.categories.title')}</h2>
          <Link to="/explorer" className="hidden items-center gap-1.5 text-sm font-bold uppercase tracking-[0.16em] text-ink/70 hover:text-ink sm:inline-flex">
            {t('common.seeAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="mt-10 grid border-t border-sand-dark sm:grid-cols-2">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.id} className="border-b border-sand-dark sm:odd:border-r">
                <Link
                  to={`/explorer?cat=${c.id}`}
                  className="group relative flex items-center gap-5 overflow-hidden px-2 py-6 transition-colors duration-500 hover:bg-ink sm:px-6"
                >
                  <span className="w-8 font-mono text-[12px] font-bold text-lagoon">{String(i + 1).padStart(2, '0')}</span>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-500 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl font-semibold leading-tight text-ink transition-colors duration-500 group-hover:text-white">{t(`cat.${c.id}`)}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink/50 transition-colors duration-500 group-hover:text-amber">{t(`cat.${c.id}.tagline`)}</span>
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-ink/30 transition-all duration-500 group-hover:rotate-45 group-hover:text-amber" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ───────────── promise ───────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pt-24 sm:px-8">
        <div className="grid gap-px overflow-hidden rounded-[28px] bg-ink/90 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-ink p-8 text-white md:p-10">
              <p className="font-display text-[64px] font-semibold leading-none text-amber">{t(`home.promise.${n}.value`)}</p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/80">{t(`home.promise.${n}.label`)}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{t(`home.promise.${n}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── the selection ───────────── */}
      {(featured.length > 0 || !offersReady) && (
        <section className="mx-auto max-w-[1200px] px-6 pt-24 sm:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-lagoon">{t('home.selection.eyebrow')}</p>
              <h2 className="mt-3 font-display text-[40px] font-semibold leading-none text-ink md:text-[56px]">{t('home.featured.title')}</h2>
            </div>
            <Link to="/explorer" className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.16em] text-ink/70 hover:text-ink">
              {t('common.seeAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {!offersReady
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[330px] animate-pulse rounded-[20px] bg-sand-dark/50" />)
              : featured.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        </section>
      )}

      {/* ───────────── bespoke request ───────────── */}
      <section className="mx-auto max-w-[1200px] px-6 py-24 sm:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-golden-hour p-10 text-white md:p-16">
          <div className="palm-texture absolute inset-0 bg-white/[0.04]" aria-hidden />
          <div className="pointer-events-none absolute inset-3 rounded-[24px] border border-amber/25" aria-hidden />
          <div className="relative max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-amber">{t('home.bespoke.eyebrow')}</p>
            <h2 className="mt-4 font-display text-[40px] font-semibold leading-[1.02] md:text-[60px]">{t('home.cta.title')}</h2>
            <p className="mt-5 text-white/70 md:text-lg">{t('home.cta.body')}</p>
            <a
              href={contactHref('My Phuket Key')}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex h-[52px] items-center gap-2 rounded-full bg-gradient-to-r from-[#E6D3A3] to-[#B08D57] px-7 text-[15px] font-bold text-ink"
            >
              {t('home.cta.button')} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
