import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router';
import {
  ArrowRight, Car, Check, CheckCircle2, Clock, Coffee, Crown, CupSoda, Flower2,
  GraduationCap, Info, Layers, MapPin, ShowerHead, Shirt, Snowflake, Speaker,
  Sparkles, Star, Trophy, Users, Waves, X, Zap,
} from 'lucide-react';
import type { Session, Sport, Venue } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { SPORTS, hourlyPerPlayer } from '@/lib/sports';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const SPORT_CHIP: Record<Sport, string> = {
  futsal: 'bg-[#0E8C7F]/10 text-[#0A6E64]',
  padel: 'bg-[#5B7CFF]/10 text-[#3B5BDB]',
  dance: 'bg-[#FF6B4A]/10 text-[#D14A2B]',
  gym: 'bg-[#FFB547]/15 text-[#B97A0B]',
  golf: 'bg-[#1E5945]/10 text-[#1E5945]',
};

type SortMode = 'rating' | 'price' | 'az';

/** Map seed amenity labels (French, user content) to lucide icons. */
function amenityIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('douch')) return ShowerHead;
  if (l.includes('vestiaire') || l.includes('casier')) return Shirt;
  if (l.includes('parking')) return Car;
  if (l.includes('café')) return Coffee;
  if (l.includes('bar')) return CupSoda;
  if (l.includes('clim')) return Snowflake;
  if (l.includes('couvert') || l.includes('dôme')) return Crown;
  if (l.includes('mer') || l.includes('piscine')) return Waves;
  if (l.includes('spa') || l.includes('premium')) return Sparkles;
  if (l.includes('yoga')) return Flower2;
  if (l.includes('sono')) return Speaker;
  if (l.includes('coaching')) return GraduationCap;
  if (l.includes('tapis')) return Layers;
  if (l.includes('raquette')) return Trophy;
  if (l.includes('led') || l.includes('éclairage')) return Zap;
  if (l.includes('miroir')) return Sparkles;
  return CheckCircle2;
}

/** Local toast stack (store does not expose a pushToast action). */
function LocalToasts({ items, onDismiss }: { items: { id: number; text: string }[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[110] flex flex-col items-end gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: { id: number; text: string }; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), 3500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return (
    <motion.div
      layout="position"
      initial={{ x: 80, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 80, opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: EASE }}
      role="status"
      className="pointer-events-auto flex w-[320px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-2xl border border-[#5B7CFF]/40 bg-white/95 p-4 text-[#5B7CFF] shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.12)] backdrop-blur"
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-semibold text-[#0B2E2B]">{item.text}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="rounded-full p-1 text-[#0B2E2B]/40 transition-colors hover:bg-[#FBF6EC] hover:text-[#0B2E2B]"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/** Filter chip with spring-selected state. */
function Chip({ active, onClick, children, ariaLabel }: { active: boolean; onClick: () => void; children: ReactNode; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
        active
          ? 'border-[#0B2E2B] bg-[#0B2E2B] text-white'
          : 'border-[#EADFC8] bg-white text-[#0B2E2B]/70 hover:border-[#0E8C7F]/50 hover:text-[#0B2E2B]',
      )}
    >
      {children}
    </button>
  );
}

/** Rich venue card per venues.md anatomy. */
function VenueGridCard({ venue, upcoming, onDetails, index }: {
  venue: Venue;
  upcoming: number;
  onDetails: () => void;
  index: number;
}) {
  const { t, formatTHB } = useI18n();
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.6, ease: EASE, delay: (index % 2) * 0.1 }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-[24px] border border-[#EADFC8] bg-white',
        'shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)]',
        'transition-shadow duration-300 ease-expo hover:-translate-y-1.5 hover:shadow-[0_4px_12px_rgba(11,46,43,.08),0_24px_56px_rgba(11,46,43,.14)]',
      )}
    >
      <button type="button" onClick={onDetails} className="relative block aspect-[3/2] w-full overflow-hidden text-left">
        <img
          src={venue.photo}
          alt={venue.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          <MapPin className="h-3 w-3" />
          {venue.area}
        </span>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[#0B2E2B] backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-[#FFB547] text-[#FFB547]" />
          {venue.rating.toFixed(1)}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-[22px] font-semibold leading-snug text-[#0B2E2B]">{venue.name}</h3>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-[#0B2E2B]/55">
            <MapPin className="h-3.5 w-3.5 text-[#FF6B4A]" />
            {venue.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {venue.sports.map((s) => (
            <span key={s} className={cn('inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-semibold', SPORT_CHIP[s])}>
              <SportIcon sport={s} className="h-3 w-3" />
              {t(`sport.${s}`)}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {venue.amenities.slice(0, 4).map((a) => {
            const Icon = amenityIcon(a);
            return (
              <span key={a} className="inline-flex items-center gap-1.5 text-xs text-[#0B2E2B]/60">
                <Icon className="h-3.5 w-3.5 text-[#0E8C7F]" />
                {a}
              </span>
            );
          })}
        </div>
        <p className="font-mono text-sm font-bold text-[#0B2E2B]">
          {t('common.from')} {formatTHB(venue.priceFrom)}
          <span className="text-[11px] font-medium text-[#0B2E2B]/50">/h</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EADFC8]/70 px-5 py-4">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0B2E2B]/60">
          <Users className="h-4 w-4 text-[#0E8C7F]" />
          {t(upcoming === 1 ? 'venues.upcoming.one' : 'venues.upcoming.other', { count: upcoming })}
        </span>
        <span className="flex items-center gap-2">
          <Link
            to={`/explorer?quartier=${encodeURIComponent(venue.area)}`}
            className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0E8C7F] transition-colors hover:text-[#0A6E64]"
          >
            {t('venues.viewSessions')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={onDetails}
            className="rounded-full border border-[#EADFC8] px-3.5 py-1.5 text-[13px] font-semibold text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC]"
          >
            {t('venues.details')}
          </button>
        </span>
      </div>
    </motion.article>
  );
}

/** Mini session row inside the venue detail modal. */
function MiniSessionRow({ session, onNavigate }: { session: Session; onNavigate: () => void }) {
  const { t, formatDate } = useI18n();
  return (
    <Link
      to={`/session/${session.id}`}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-2xl border border-[#EADFC8] bg-[#FBF6EC]/60 px-4 py-3 transition-colors hover:border-[#0E8C7F]/50 hover:bg-[#FBF6EC]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0E8C7F] shadow-sm">
        <SportIcon sport={session.sport} className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0B2E2B]">{session.title}</span>
        <span className="block text-xs text-[#0B2E2B]/55">
          {formatDate(session.date)} · <span className="font-mono font-semibold">{session.playerIds.length}/{session.quota}</span> {t('common.players')}
        </span>
      </span>
      <StatusBadge status={session.status} />
    </Link>
  );
}

/** Venue detail modal: gallery, info, amenities, rules, upcoming sessions, CTAs. */
function VenueModal({ venue, onClose, onToast }: { venue: Venue; onClose: () => void; onToast: (text: string) => void }) {
  const { sessions } = useStore();
  const { t, formatTHB } = useI18n();
  const gallery = useMemo(
    () => [venue.photo, ...venue.sports.map((s) => `/sport-${s}.jpg`)].slice(0, 3),
    [venue],
  );
  const [photo, setPhoto] = useState(gallery[0]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const upcoming = useMemo(
    () => sessions
      .filter((s) => s.venueId === venue.id && s.status !== 'cancelled' && new Date(s.date).getTime() > Date.now())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3),
    [sessions, venue.id],
  );

  const { rates } = useStore();
  const priceFor = (s: Sport) => hourlyPerPlayer(rates, s);

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0B2E2B]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={venue.name}
        className="flex max-h-[88dvh] w-full max-w-[900px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]"
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* gallery */}
        <div className="relative shrink-0">
          <div className="relative aspect-[16/8] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={photo}
                src={photo}
                alt={venue.name}
                className="h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
            <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <MapPin className="h-3 w-3" />
              {venue.area}
            </span>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white backdrop-blur transition-colors hover:bg-black/70"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute -bottom-5 left-5 flex gap-2">
            {gallery.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setPhoto(g)}
                className={cn(
                  'h-12 w-16 overflow-hidden rounded-lg border-2 bg-white shadow-md transition-all',
                  photo === g ? 'border-[#FF6B4A]' : 'border-white opacity-80 hover:opacity-100',
                )}
                aria-label={venue.name}
              >
                <img src={g} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-9 sm:p-8 sm:pt-10">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-7"
          >
            {/* header */}
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B2E2B] sm:text-3xl">{venue.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFB547]/15 px-2.5 py-1 text-xs font-bold text-[#B97A0B]">
                  <Star className="h-3.5 w-3.5 fill-[#FFB547] text-[#FFB547]" />
                  {venue.rating.toFixed(1)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[#0B2E2B]/60">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#FF6B4A]" />
                  {venue.address} · {venue.area}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#0E8C7F]" />
                  {t('venues.modal.hours')} : <span className="font-mono font-semibold text-[#0B2E2B]">{venue.hours}</span>
                </span>
              </div>
            </motion.div>

            {/* prices per sport */}
            <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('venues.modal.prices')}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {venue.sports.map((s) => (
                  <span key={s} className={cn('inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold', SPORT_CHIP[s])}>
                    <SportIcon sport={s} className="h-4 w-4" />
                    {t(`sport.${s}`)}
                    <span className="font-mono font-bold">{formatTHB(priceFor(s))}<span className="font-medium opacity-60">{t('common.perPerson').replace('฿', '')}</span></span>
                  </span>
                ))}
              </div>
            </motion.section>

            {/* amenities */}
            <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('venues.modal.amenities')}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {venue.amenities.map((a) => {
                  const Icon = amenityIcon(a);
                  return (
                    <span key={a} className="inline-flex items-center gap-2 rounded-xl border border-[#EADFC8] bg-[#FBF6EC]/60 px-3 py-2.5 text-[13px] font-medium text-[#0B2E2B]">
                      <Icon className="h-4 w-4 shrink-0 text-[#0E8C7F]" />
                      {a}
                    </span>
                  );
                })}
              </div>
            </motion.section>

            {/* house rules */}
            <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('venues.modal.rules')}</h3>
              <ul className="mt-3 space-y-2">
                {(['venues.modal.rule1', 'venues.modal.rule2', 'venues.modal.rule3'] as const).map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-[#0B2E2B]/75">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={3} />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </motion.section>

            {/* upcoming sessions */}
            <motion.section variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('venues.modal.upcoming')}</h3>
              <div className="mt-3 space-y-2">
                {upcoming.map((s) => (
                  <MiniSessionRow key={s.id} session={s} onNavigate={onClose} />
                ))}
                {upcoming.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-[#EADFC8] px-4 py-5 text-center text-sm text-[#0B2E2B]/50">
                    {t('venues.modal.noSessions')}
                  </p>
                )}
              </div>
            </motion.section>

            {/* CTAs */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
              className="flex flex-col gap-3 border-t border-[#EADFC8] pt-5 sm:flex-row"
            >
              <Link
                to={`/creer?venue=${venue.id}`}
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FF6B4A,#FFB547)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,74,.35)] transition-transform hover:scale-[1.02]"
              >
                {t('venues.modal.createHere')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => onToast(t('venues.modal.mapToast'))}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#EADFC8] px-6 py-3.5 text-sm font-bold text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC]"
              >
                <MapPin className="h-4 w-4 text-[#0E8C7F]" />
                {t('venues.modal.map')}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Venues() {
  const { venues, sessions } = useStore();
  const { t } = useI18n();
  const [area, setArea] = useState<string>('all');
  const [sport, setSport] = useState<Sport | 'all'>('all');
  const [sort, setSort] = useState<SortMode>('rating');
  const [selected, setSelected] = useState<Venue | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  const pushToast = (text: string) => setToasts((prev) => [...prev.slice(-2), { id: Date.now() + Math.random(), text }]);
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));

  const areas = useMemo(() => Array.from(new Set(venues.map((v) => v.area))), [venues]);

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (s.status !== 'cancelled' && new Date(s.date).getTime() > now) {
        map.set(s.venueId, (map.get(s.venueId) ?? 0) + 1);
      }
    }
    return map;
  }, [sessions]);

  const filtered = useMemo(() => {
    const list = venues
      .filter((v) => area === 'all' || v.area === area)
      .filter((v) => sport === 'all' || v.sports.includes(sport));
    return [...list].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'price') return a.priceFrom - b.priceFrom;
      return a.name.localeCompare(b.name);
    });
  }, [venues, area, sport, sort]);

  return (
    <div className="bg-[#FBF6EC]">
      {/* Header */}
      <section className="relative overflow-hidden bg-lagoon-deep">
        <div className="palm-texture pointer-events-none absolute inset-0 bg-white opacity-[0.05]" />
        <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="relative mx-auto max-w-[1280px] px-6 py-16 lg:px-12 lg:py-20">
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B4A]"
          >
            {t('home.venues.eyebrow')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.07 }}
            className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.02em] text-white"
          >
            {t('venues.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
            className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/70"
          >
            {t('venues.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-[72px] z-40 border-b border-[#EADFC8] bg-[#FBF6EC]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 lg:px-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('venues.filter.area')}</span>
            <Chip active={area === 'all'} onClick={() => setArea('all')}>{t('venues.all')}</Chip>
            {areas.map((a) => (
              <Chip key={a} active={area === a} onClick={() => setArea(a)}>{a}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('venues.filter.sport')}</span>
            <Chip active={sport === 'all'} onClick={() => setSport('all')}>{t('venues.all')}</Chip>
            {SPORTS.map((s) => (
              <Chip key={s} active={sport === s} onClick={() => setSport(s)} ariaLabel={t(`sport.${s}`)}>
                <SportIcon sport={s} className="h-4 w-4" />
              </Chip>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[13px] font-bold tabular-nums text-[#0E8C7F]">
              {t(filtered.length === 1 ? 'venues.count.one' : 'venues.count.other', { count: filtered.length })}
            </span>
            <label className="inline-flex items-center gap-2 text-[13px] text-[#0B2E2B]/60">
              <span className="hidden font-semibold sm:inline">{t('venues.sort.label')}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="h-9 rounded-full border border-[#EADFC8] bg-white px-3 text-[13px] font-semibold text-[#0B2E2B] outline-none focus:border-[#0E8C7F]"
              >
                <option value="rating">{t('venues.sort.rating')}</option>
                <option value="price">{t('venues.sort.price')}</option>
                <option value="az">{t('venues.sort.az')}</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-[1280px] px-6 py-12 lg:px-12 lg:py-16">
        {filtered.length > 0 ? (
          <motion.div layout className="grid gap-6 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((v, i) => (
                <VenueGridCard
                  key={v.id}
                  venue={v}
                  index={i}
                  upcoming={upcomingCount.get(v.id) ?? 0}
                  onDetails={() => setSelected(v)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div>
            <EmptyState title={t('venues.empty.title')} body={t('venues.empty.body')} />
            <div className="-mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => { setArea('all'); setSport('all'); }}
                className="rounded-full border border-[#EADFC8] bg-white px-6 py-3 text-sm font-semibold text-[#0B2E2B] transition-all hover:scale-[1.03] hover:bg-[#FBF6EC]"
              >
                {t('venues.empty.cta')}
              </button>
            </div>
          </div>
        )}

        {/* Partner banner */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative mt-16 overflow-hidden rounded-[24px] bg-golden-hour p-8 sm:p-12"
        >
          <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.06]" />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t('venues.partner.title')}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/85">
                {t('venues.partner.text')}
              </p>
            </div>
            <motion.button
              type="button"
              onClick={() => pushToast(t('venues.partner.toast'))}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#FF6B4A] shadow-[0_8px_24px_rgba(11,46,43,.25)] transition-transform hover:scale-[1.05]"
            >
              {t('venues.partner.cta')}
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <VenueModal venue={selected} onClose={() => setSelected(null)} onToast={pushToast} />
        )}
      </AnimatePresence>

      <LocalToasts items={toasts} onDismiss={dismissToast} />
    </div>
  );
}
