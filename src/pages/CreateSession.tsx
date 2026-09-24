import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, ArrowRight, Check, Clock, MapPin, PartyPopper, Search, Send, Star, X,
} from 'lucide-react';
import type { Level, Sport } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import { FIXED_QUOTA, SPORTS, durationsFor, hourlyPerPlayer, pricePerPlayer } from '@/lib/sports';
import PlayerAvatar from '@/components/PlayerAvatar';
import SessionCard from '@/components/SessionCard';
import Countdown from '@/components/Countdown';
import InviteModal from '@/components/InviteModal';
import { sportPhoto } from '@/lib/sportPhotos';

const DRAFT_KEY = 'friendplus.draft';
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const TROPICAL = ['#FF6B4A', '#FFB547', '#0E8C7F', '#2FBFA5', '#22C55E'];

type Mix = 'mixed' | 'women' | 'men';

interface Draft {
  sport: Sport | null;
  venueId: string | null;
  title: string;
  date: string; // yyyy-mm-dd (local)
  time: string; // hh:mm (local)
  durationMin: number;
  quota: number;
  confirmHours: 24 | 48;
  level: Level | 'all';
  mix: Mix;
  description: string;
  invitedIds: string[];
  message: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function defaultDraft(): Draft {
  const base = new Date(Date.now() + 3 * 24 * 3600_000);
  base.setHours(19, 0, 0, 0);
  return {
    sport: null, venueId: null, title: '',
    date: toDateInput(base), time: toTimeInput(base),
    durationMin: 60, quota: 10, confirmHours: 48,
    level: 'all', mix: 'mixed', description: '',
    invitedIds: [], message: '',
  };
}

function loadDraft(): Partial<Draft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as Partial<Draft>;
  } catch { /* ignore */ }
  return null;
}

function draftToDate(d: Draft): Date {
  const dt = new Date(`${d.date}T${d.time || '19:00'}`);
  return Number.isNaN(dt.getTime()) ? new Date(Date.now() + 72 * 3600_000) : dt;
}

/* ---------------------------------- stepper ---------------------------------- */

function Stepper({ step }: { step: number }) {
  const { t } = useI18n();
  const labels = [t('create.step.sport'), t('create.step.venue'), t('create.step.details'), t('create.step.invites')];
  return (
    <div className="sticky top-[72px] z-30 -mx-4 bg-[#FBF6EC]/90 px-4 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center">
        {labels.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className={cn('flex items-center', i < labels.length - 1 && 'flex-1')}>
              <div className="flex flex-col items-center gap-1.5">
                <motion.span
                  layout
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    done && 'bg-[#22C55E] text-white',
                    active && 'bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)] text-white shadow-[0_4px_14px_rgba(14,140,127,.4)]',
                    !done && !active && 'border border-[#EADFC8] bg-white text-[#0B2E2B]/40',
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </motion.span>
                <span className={cn(
                  'hidden text-[11px] font-bold uppercase tracking-[0.1em] sm:block',
                  active ? 'text-[#0B2E2B]' : done ? 'text-[#15803D]' : 'text-[#0B2E2B]/35',
                )}>
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div className="relative mx-2 mb-0 h-1 flex-1 overflow-hidden rounded-full bg-[#EADFC8] sm:mb-5">
                  <motion.div
                    className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)]"
                    initial={false}
                    animate={{ scaleX: i < step ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- ghost recap -------------------------------- */

function GhostRecap({ draft }: { draft: Draft }) {
  const { t, formatDate, formatTHB } = useI18n();
  const { getVenue, rates } = useStore();
  const venue = draft.venueId ? getVenue(draft.venueId) : undefined;
  const when = draftToDate(draft);
  const price = draft.sport ? pricePerPlayer(rates, draft.sport, draft.durationMin, draft.quota) : 0;
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#FBF6EC]">
        {draft.sport ? (
          <img src={sportPhoto(draft.sport)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(120deg,#0E8C7F22,#FFB54733,#FF6B4A22)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5B7CFF]/30 bg-white/90 px-3 py-1 text-xs font-semibold text-[#3B5BDB] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#5B7CFF]" />
            {t('status.open')}
          </span>
        </div>
        {draft.sport && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#0B2E2B] backdrop-blur">
            <SportIcon sport={draft.sport} className="h-3.5 w-3.5 text-[#0E8C7F]" />
            {t(`sport.${draft.sport}`)}
          </div>
        )}
      </div>
      <div className="relative border-t-2 border-dashed border-[#EADFC8]">
        <span className="absolute -left-[11px] -top-[11px] h-5 w-5 rounded-full border border-[#EADFC8] bg-[#FBF6EC]" />
        <span className="absolute -right-[11px] -top-[11px] h-5 w-5 rounded-full border border-[#EADFC8] bg-[#FBF6EC]" />
      </div>
      <div className="space-y-3 p-5">
        <h3 className={cn('font-display text-lg font-semibold leading-snug', draft.title ? 'text-[#0B2E2B]' : 'text-[#0B2E2B]/30')}>
          {draft.title || t('create.recap.defaultTitle')}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#0B2E2B]/60">
          <span className={cn('inline-flex items-center gap-1', !venue && 'opacity-40')}>
            <MapPin className="h-3.5 w-3.5 text-[#FF6B4A]" />
            {venue ? `${venue.name} · ${venue.area}` : '—'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-[#0E8C7F]" />
            {formatDate(when.toISOString())}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-mono font-bold tabular-nums text-[#0B2E2B]">
              1/{draft.quota} <span className="font-medium text-[#0B2E2B]/50">{t('common.players')}</span>
            </span>
            <span className="font-mono text-sm font-bold text-[#0B2E2B]">{formatTHB(price)}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: draft.quota }).map((_, i) => (
              <motion.span
                key={i}
                layout
                className={cn(
                  'h-2 flex-1 rounded-full',
                  i === 0 ? 'bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5)]' : 'bg-[#EADFC8]',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------ page ------------------------------------ */

export default function CreateSession() {
  const { venues, rates, users, currentUser, createSession, sendInvitation, getSession } = useStore();
  const { t, formatDate, formatTHB } = useI18n();
  const location = useLocation();
  const navState = (location.state ?? {}) as { prefill?: Partial<Draft>; step?: number; fromTitle?: string };

  const [draft, setDraft] = useState<Draft>(() => ({
    ...defaultDraft(),
    ...(loadDraft() ?? {}),
    ...(navState.prefill ?? {}),
    invitedIds: [],
    message: '',
  }));
  const [step, setStep] = useState(() => (navState.prefill ? Math.min(navState.step ?? 0, 2) : 0));
  const [dir, setDir] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [shake, setShake] = useState(false);
  const [venueQuery, setVenueQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [playerQuery, setPlayerQuery] = useState('');
  const [onlySportFans, setOnlySportFans] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const createdRef = useRef(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // persist draft (until success)
  useEffect(() => {
    if (step >= 4) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
  }, [draft, step]);

  // confetti on success
  useEffect(() => {
    if (step !== 4) return;
    const timer = window.setTimeout(() => {
      confetti({
        particleCount: 80, spread: 100, startVelocity: 38, gravity: 0.9, ticks: 200,
        origin: { x: 0.5, y: 0.35 }, colors: TROPICAL, shapes: ['circle', 'square'],
        scalar: 0.95, disableForReducedMotion: true,
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [step]);

  const when = draftToDate(draft);
  const whenMs = when.getTime();
  const deadlineMs = whenMs - draft.confirmHours * 3600_000;
  const deadlineIso = new Date(deadlineMs).toISOString();
  const minDate = toDateInput(new Date(Date.now() + draft.confirmHours * 3600_000));

  const titleValid = draft.title.trim().length >= 3 && draft.title.trim().length <= 40;
  const dateValid = whenMs >= Date.now() + draft.confirmHours * 3600_000;

  const stepValid = (s: number): boolean => {
    if (s === 0) return draft.sport !== null;
    if (s === 1) return draft.venueId !== null;
    if (s === 2) return titleValid && dateValid;
    return true;
  };

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setAttempted(false);
    setStep(next);
  };

  const onContinue = () => {
    if (stepValid(step)) {
      goTo(step + 1);
    } else {
      setAttempted(true);
      setShake(true);
    }
  };

  const selectSport = (sport: Sport) => {
    setDraft((d) => {
      const quota = FIXED_QUOTA[sport] ?? (FIXED_QUOTA[d.sport ?? 'futsal'] ? 12 : d.quota);
      const venueStillOk = d.venueId && venues.find((v) => v.id === d.venueId)?.sports.includes(sport);
      const lengths = durationsFor(sport);
      const durationMin = lengths.includes(d.durationMin) ? d.durationMin : lengths[0];
      return { ...d, sport, quota, durationMin, venueId: venueStillOk ? d.venueId : null };
    });
  };

  const finish = (withInvites: boolean) => {
    if (createdRef.current || !draft.sport || !draft.venueId) return;
    createdRef.current = true;
    const session = createSession({
      sport: draft.sport,
      title: draft.title.trim(),
      venueId: draft.venueId,
      date: when.toISOString(),
      durationMin: draft.durationMin,
      quota: draft.quota,
      level: draft.level,
      mixed: draft.mix === 'mixed',
      description: draft.description.trim(),
      confirmHoursBefore: draft.confirmHours,
    });
    if (withInvites) {
      for (const id of draft.invitedIds) sendInvitation(session.id, id, draft.message.trim());
    }
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setCreatedId(session.id);
    setDir(1);
    setStep(4);
  };

  /* ------------------------------ derived lists ------------------------------ */

  const sportVenues = useMemo(
    () => venues.filter((v) => draft.sport && v.sports.includes(draft.sport)),
    [venues, draft.sport],
  );
  const areas = useMemo(() => [...new Set(sportVenues.map((v) => v.area))], [sportVenues]);
  const visibleVenues = useMemo(() => sportVenues.filter((v) => {
    if (areaFilter && v.area !== areaFilter) return false;
    if (venueQuery && !v.name.toLowerCase().includes(venueQuery.toLowerCase())) return false;
    return true;
  }), [sportVenues, areaFilter, venueQuery]);

  // fixed by FRIEND+ (public.sport_rates), never chosen by the organiser
  const price = draft.sport ? pricePerPlayer(rates, draft.sport, draft.durationMin, draft.quota) : 0;

  const candidates = useMemo(() => users
    .filter((u) => u.id !== currentUser.id)
    .filter((u) => !onlySportFans || (draft.sport ? u.sports.includes(draft.sport) : true))
    .filter((u) => u.name.toLowerCase().includes(playerQuery.toLowerCase()))
    .sort((a, b) => {
      const as = draft.sport && a.sports.includes(draft.sport) ? 0 : 1;
      const bs = draft.sport && b.sports.includes(draft.sport) ? 0 : 1;
      return as - bs || (b.score ?? -1) - (a.score ?? -1);
    }),
  [users, currentUser.id, playerQuery, onlySportFans, draft.sport]);

  const toggleInvite = (id: string) =>
    setDraft((d) => ({
      ...d,
      invitedIds: d.invitedIds.includes(id) ? d.invitedIds.filter((x) => x !== id) : [...d.invitedIds, id],
    }));

  const created = createdId ? getSession(createdId) : undefined;

  /* ---------------------------------- render ---------------------------------- */

  const stepVariants = {
    enter: (d: number) => ({ x: d * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d * -40, opacity: 0 }),
  };

  const fieldContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };
  const fieldItem = {
    hidden: { y: 18, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
  };

  if (step === 4) {
    if (!created) return null;
    return (
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#0B2E2B,#1E5945)]" />
        <div className="palm-texture pointer-events-none absolute inset-0 bg-white/5" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
          {/* animated check ring */}
          <motion.svg
            width="120" height="120" viewBox="0 0 120 120" className="mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <defs>
              <linearGradient id="success-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0E8C7F" />
                <stop offset="45%" stopColor="#2FBFA5" />
                <stop offset="78%" stopColor="#FFB547" />
                <stop offset="100%" stopColor="#FF6B4A" />
              </linearGradient>
            </defs>
            <motion.circle
              cx="60" cy="60" r="52" fill="none" stroke="url(#success-grad)" strokeWidth="6" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }}
            />
            <motion.path
              d="M38 62 L54 78 L84 44" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
            />
          </motion.svg>

          <motion.h2
            className="font-display text-4xl font-bold text-white"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
          >
            {t('create.success.title')}
          </motion.h2>

          <motion.div
            className="mt-8 w-full max-w-md text-left"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
          >
            <SessionCard session={created} />
          </motion.div>

          <motion.div
            className="mt-8 flex flex-col items-center gap-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.5 }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              {t('create.success.countdown')}
            </span>
            <div className="[&_.uppercase]:!text-white/60">
              <Countdown target={created.confirmationDeadline} />
            </div>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.35, duration: 0.5, ease: EASE }}
          >
            <Link
              to={`/session/${created.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)] px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,74,.35)] transition-transform hover:scale-[1.03]"
            >
              {t('create.success.view')}
            </Link>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <Send className="h-4 w-4" />
              {t('create.success.inviteMore')}
            </button>
            <Link
              to="/mes-sessions"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              {t('create.success.mySessions')}
            </Link>
          </motion.div>
        </div>
        <InviteModal session={created} open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[880px] px-4 pb-24 sm:px-6">
      {/* header */}
      <div className="pt-12 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('create.eyebrow')}</p>
        <h1 className="mt-2 font-display text-[40px] font-bold leading-tight tracking-[-0.02em] text-[#0B2E2B]">
          {t('create.title')}
        </h1>
        {navState.fromTitle && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FFB547]/15 px-4 py-1.5 text-[13px] font-semibold text-[#B97A0B]">
            <PartyPopper className="h-3.5 w-3.5" />
            {t('create.editMode', { title: navState.fromTitle })}
          </p>
        )}
      </div>

      <Stepper step={step} />

      <motion.div
        animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={() => setShake(false)}
        className="mt-8"
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: EASE }}
          >
            {/* ------------------------------ STEP 1: sport ------------------------------ */}
            {step === 0 && (
              <section>
                <h3 className="font-display text-2xl font-semibold text-[#0B2E2B]">{t('create.step1.title')}</h3>
                {attempted && !draft.sport && <p className="mt-2 text-sm font-semibold text-[#F05252]">{t('create.err.sport')}</p>}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {SPORTS.map((sport, i) => {
                    const selected = draft.sport === sport;
                    return (
                      <motion.button
                        key={sport}
                        type="button"
                        onClick={() => selectSport(sport)}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'group relative overflow-hidden rounded-[20px] text-left transition-transform',
                          selected ? 'scale-[1.02] shadow-[0_16px_40px_rgba(11,46,43,.18)]' : 'shadow-[0_2px_8px_rgba(11,46,43,.06)] hover:scale-[1.01]',
                        )}
                      >
                        <span className={cn(
                          'pointer-events-none absolute inset-0 z-10 rounded-[20px] transition-all',
                          selected
                            ? 'border-[3px] border-transparent [background:linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)_border-box] [mask:linear-gradient(#fff,#fff)_padding-box,linear-gradient(#fff,#fff)] [mask-composite:exclude]'
                            : 'border border-[#EADFC8]',
                        )} />
                        <span className="relative block aspect-[16/9]">
                          <img src={sportPhoto(sport)} alt={t(`sport.${sport}`)} className="h-full w-full object-cover" />
                          <span className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/85 via-[#0B2E2B]/25 to-transparent" />
                          <span className="absolute bottom-0 left-0 right-0 p-4">
                            <span className="flex items-center gap-2 font-display text-xl font-semibold text-white">
                              <SportIcon sport={sport} className="h-5 w-5 text-[#FFB547]" />
                              {t(`sport.${sport}`)}
                            </span>
                            <span className="mt-1 block text-[13px] text-white/75">
                              {FIXED_QUOTA[sport] ? t(`create.sportMeta.${sport}`) : t('create.sportMeta.class')}
                              {' · '}{formatTHB(hourlyPerPlayer(rates, sport))} {t('create.price.perHour')}
                            </span>
                          </span>
                          <AnimatePresence>
                            {selected && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B4A] text-white shadow-[0_4px_12px_rgba(255,107,74,.5)]"
                              >
                                <Check className="h-4 w-4" strokeWidth={3.5} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ------------------------------ STEP 2: venue ------------------------------ */}
            {step === 1 && (
              <section>
                <h3 className="font-display text-2xl font-semibold text-[#0B2E2B]">{t('create.step2.title')}</h3>
                {attempted && !draft.venueId && <p className="mt-2 text-sm font-semibold text-[#F05252]">{t('create.err.venue')}</p>}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2 rounded-full border border-[#EADFC8] bg-white px-4 py-2.5">
                    <Search className="h-4 w-4 text-[#0B2E2B]/40" />
                    <input
                      value={venueQuery}
                      onChange={(e) => setVenueQuery(e.target.value)}
                      placeholder={t('create.step2.search')}
                      className="w-full bg-transparent text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAreaFilter(null)}
                      className={cn(
                        'rounded-full px-4 py-2 text-xs font-bold transition-colors',
                        areaFilter === null ? 'bg-[#0B2E2B] text-white' : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/60 hover:border-[#0E8C7F]',
                      )}
                    >
                      {t('create.step2.allAreas')}
                    </button>
                    {areas.map((area) => (
                      <button
                        key={area}
                        onClick={() => setAreaFilter(areaFilter === area ? null : area)}
                        className={cn(
                          'rounded-full px-4 py-2 text-xs font-bold transition-colors',
                          areaFilter === area ? 'bg-[#0B2E2B] text-white' : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/60 hover:border-[#0E8C7F]',
                        )}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {visibleVenues.map((venue, i) => {
                    const selected = draft.venueId === venue.id;
                    return (
                      <motion.button
                        key={venue.id}
                        type="button"
                        onClick={() => set('venueId', venue.id)}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.4, ease: EASE }}
                        whileHover={{ y: -2 }}
                        className={cn(
                          'flex w-full items-center gap-4 rounded-[20px] border p-3 text-left transition-colors',
                          selected
                            ? 'border-[#0E8C7F] bg-[#0E8C7F]/[.06] ring-2 ring-[#0E8C7F]/40'
                            : 'border-[#EADFC8] bg-white hover:border-[#0E8C7F]/50',
                        )}
                      >
                        <img src={venue.photo} alt={venue.name} className="h-24 w-24 shrink-0 rounded-2xl object-cover" loading="lazy" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-display text-base font-semibold text-[#0B2E2B]">{venue.name}</span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#B97A0B]">
                              <Star className="h-3.5 w-3.5 fill-[#FFB547] text-[#FFB547]" />
                              {venue.rating.toFixed(1)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-[13px] text-[#0B2E2B]/55">
                            <MapPin className="h-3.5 w-3.5 text-[#FF6B4A]" />
                            {venue.area} · {t('common.from')} {formatTHB(venue.priceFrom)} {t('common.perPerson')}
                          </span>
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {venue.sports.map((s) => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-[#FBF6EC] px-2 py-0.5 text-[11px] font-semibold text-[#0B2E2B]/60">
                                <SportIcon sport={s} className="h-3 w-3 text-[#0E8C7F]" />
                                {t(`sport.${s}`)}
                              </span>
                            ))}
                            {venue.amenities.slice(0, 3).map((a) => (
                              <span key={a} className="rounded-full border border-[#EADFC8] px-2 py-0.5 text-[11px] text-[#0B2E2B]/45">{a}</span>
                            ))}
                          </span>
                        </span>
                        <span className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          selected ? 'border-[#0E8C7F] bg-[#0E8C7F] text-white' : 'border-[#EADFC8] bg-white',
                        )}>
                          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
                        </span>
                      </motion.button>
                    );
                  })}
                  {visibleVenues.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-[#EADFC8] py-10 text-center text-sm text-[#0B2E2B]/45">
                      {t('create.step2.empty')}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* ----------------------------- STEP 3: details ----------------------------- */}
            {step === 2 && (
              <section>
                <h3 className="font-display text-2xl font-semibold text-[#0B2E2B]">{t('create.step3.title')}</h3>
                <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_320px]">
                  <motion.div variants={fieldContainer} initial="hidden" animate="show" className="space-y-5">
                    {/* title */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-[#0B2E2B]">
                        {t('create.field.title')}
                        <span className={cn('font-mono text-xs tabular-nums', draft.title.length > 40 ? 'text-[#F05252]' : 'text-[#0B2E2B]/40')}>
                          {draft.title.length}/40
                        </span>
                      </label>
                      <input
                        value={draft.title}
                        onChange={(e) => set('title', e.target.value)}
                        placeholder={t('create.field.titlePh')}
                        maxLength={60}
                        className="w-full rounded-2xl border border-[#EADFC8] bg-white px-4 py-3 text-sm text-[#0B2E2B] outline-none transition-colors placeholder:text-[#0B2E2B]/35 focus:border-[#0E8C7F] focus:ring-2 focus:ring-[#0E8C7F]/25"
                      />
                      {attempted && !titleValid && <p className="mt-1.5 text-xs font-semibold text-[#F05252]">{t('create.err.title')}</p>}
                    </motion.div>

                    {/* date & time */}
                    <motion.div variants={fieldItem} className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.date')}</label>
                        <input
                          type="date"
                          value={draft.date}
                          min={minDate}
                          onChange={(e) => set('date', e.target.value)}
                          className="w-full rounded-2xl border border-[#EADFC8] bg-white px-4 py-3 font-mono text-sm text-[#0B2E2B] outline-none focus:border-[#0E8C7F] focus:ring-2 focus:ring-[#0E8C7F]/25"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.time')}</label>
                        <input
                          type="time"
                          value={draft.time}
                          onChange={(e) => set('time', e.target.value)}
                          className="w-full rounded-2xl border border-[#EADFC8] bg-white px-4 py-3 font-mono text-sm text-[#0B2E2B] outline-none focus:border-[#0E8C7F] focus:ring-2 focus:ring-[#0E8C7F]/25"
                        />
                      </div>
                    </motion.div>
                    <motion.p variants={fieldItem} className="rounded-2xl bg-[#FFB547]/15 px-4 py-3 text-[13px] font-medium leading-relaxed text-[#B97A0B]">
                      {t('create.field.dateHint')}
                    </motion.p>
                    {attempted && !dateValid && <p className="-mt-2 text-xs font-semibold text-[#F05252]">{t('create.err.date', { hours: draft.confirmHours })}</p>}

                    {/* duration */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.duration')}</label>
                      <div className="flex gap-2">
                        {durationsFor(draft.sport).map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => set('durationMin', min)}
                            className={cn(
                              'flex-1 rounded-full py-2.5 font-mono text-sm font-bold transition-colors',
                              draft.durationMin === min
                                ? 'bg-[#0B2E2B] text-white'
                                : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/60 hover:border-[#0E8C7F]',
                            )}
                          >
                            {t(`create.duration.${min}`)}
                          </button>
                        ))}
                      </div>
                    </motion.div>

                    {/* quota */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.quota')}</label>
                      {draft.sport && FIXED_QUOTA[draft.sport] ? (
                        <div className="rounded-2xl border border-[#EADFC8] bg-[#FBF6EC] px-4 py-3">
                          <span className="font-mono text-xl font-bold text-[#0B2E2B]">{draft.quota}</span>
                          <span className="ml-2 text-[13px] text-[#0B2E2B]/55">{t('create.quota.fixed', { count: draft.quota })}</span>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[#EADFC8] bg-white px-4 py-3">
                          <div className="flex items-center gap-4">
                            <input
                              type="range" min={8} max={15} step={1}
                              value={draft.quota}
                              onChange={(e) => set('quota', Number(e.target.value))}
                              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[#EADFC8] accent-[#0E8C7F]"
                            />
                            <span className="w-8 text-right font-mono text-xl font-bold tabular-nums text-[#0B2E2B]">{draft.quota}</span>
                          </div>
                          <p className="mt-1.5 text-xs text-[#0B2E2B]/50">{t('create.quota.range')}</p>
                        </div>
                      )}
                      {/* live quota segments */}
                      <div className="mt-2 flex gap-1">
                        {Array.from({ length: draft.quota }).map((_, i) => (
                          <motion.span
                            key={i}
                            layout
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.02, duration: 0.3, ease: EASE }}
                            className={cn('h-2 flex-1 origin-bottom rounded-full', i === 0 ? 'bg-[#0E8C7F]' : 'bg-[#EADFC8]')}
                          />
                        ))}
                      </div>
                    </motion.div>

                    {/* confirmation window */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.confirmWindow')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {([24, 48] as const).map((hours) => {
                          const active = draft.confirmHours === hours;
                          return (
                            <button
                              key={hours}
                              type="button"
                              onClick={() => set('confirmHours', hours)}
                              className={cn(
                                'rounded-2xl border p-4 text-left transition-all',
                                active
                                  ? 'border-[#0E8C7F] bg-[#0E8C7F]/[.06] ring-2 ring-[#0E8C7F]/30'
                                  : 'border-[#EADFC8] bg-white hover:border-[#0E8C7F]/50',
                              )}
                            >
                              <span className="font-mono text-lg font-bold text-[#0B2E2B]">T-{hours}h</span>
                              <span className="mt-0.5 block text-xs text-[#0B2E2B]/55">{t(`create.window.h${hours}`)}</span>
                              {/* mini timeline */}
                              <span className="mt-3 flex items-center">
                                <span className="h-2 w-2 rounded-full bg-[#0B2E2B]/25" />
                                <motion.span
                                  layout
                                  className={cn('h-[3px] rounded-full', active ? 'bg-[linear-gradient(90deg,#0E8C7F,#FFB547)]' : 'bg-[#EADFC8]')}
                                  style={{ flexGrow: hours === 24 ? 1 : 2 }}
                                />
                                <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-[#0E8C7F]' : 'bg-[#0B2E2B]/25')} />
                                <motion.span
                                  layout
                                  className={cn('h-[3px] rounded-full', active ? 'bg-[linear-gradient(90deg,#FFB547,#FF6B4A)]' : 'bg-[#EADFC8]')}
                                  style={{ flexGrow: hours === 24 ? 2 : 1 }}
                                />
                                <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-[#FF6B4A]' : 'bg-[#0B2E2B]/25')} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={deadlineIso}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0E8C7F]/10 px-3 py-1.5 text-xs font-semibold text-[#0A6E64]"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {t('create.window.deadline', {
                            date: formatDate(deadlineIso, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
                          })}
                        </motion.p>
                      </AnimatePresence>
                    </motion.div>

                    {/* level */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.level')}</label>
                      <div className="flex flex-wrap gap-2">
                        {(['beginner', 'intermediate', 'advanced', 'all'] as const).map((lv) => (
                          <button
                            key={lv}
                            type="button"
                            onClick={() => set('level', lv)}
                            className={cn(
                              'rounded-full px-4 py-2 text-xs font-bold transition-colors',
                              draft.level === lv
                                ? 'bg-[#0B2E2B] text-white'
                                : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/60 hover:border-[#0E8C7F]',
                            )}
                          >
                            {t(`common.level.${lv}`)}
                          </button>
                        ))}
                      </div>
                    </motion.div>

                    {/* mix */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.mix')}</label>
                      <div className="flex flex-wrap gap-2">
                        {(['mixed', 'women', 'men'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => set('mix', m)}
                            className={cn(
                              'rounded-full px-4 py-2 text-xs font-bold transition-colors',
                              draft.mix === m
                                ? 'bg-[#0B2E2B] text-white'
                                : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/60 hover:border-[#0E8C7F]',
                            )}
                          >
                            {t(`create.mix.${m}`)}
                          </button>
                        ))}
                      </div>
                    </motion.div>

                    {/* price */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-[#0B2E2B]">
                        {t('create.field.price')}
                        <span className="font-mono text-lg font-bold tabular-nums text-[#0B2E2B]">{formatTHB(price)}</span>
                      </label>
                      <p className="rounded-2xl border border-[#EADFC8] bg-[#FBF6EC] px-4 py-3 text-xs leading-relaxed text-[#0B2E2B]/60">
                        {draft.sport && rates[draft.sport].per === 'court'
                          ? t('create.price.court', { amount: formatTHB(rates[draft.sport].amount), players: draft.quota })
                          : t('create.price.player', { amount: formatTHB(draft.sport ? rates[draft.sport].amount : 0) })}
                      </p>
                    </motion.div>

                    {/* description */}
                    <motion.div variants={fieldItem}>
                      <label className="mb-1.5 block text-sm font-semibold text-[#0B2E2B]">{t('create.field.desc')}</label>
                      <textarea
                        value={draft.description}
                        onChange={(e) => set('description', e.target.value)}
                        placeholder={t('create.field.descPh')}
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-[#EADFC8] bg-white px-4 py-3 text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35 focus:border-[#0E8C7F] focus:ring-2 focus:ring-[#0E8C7F]/25"
                      />
                    </motion.div>
                  </motion.div>

                  {/* live recap */}
                  <div className="lg:sticky lg:top-36 lg:self-start">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0E8C7F]">{t('create.recap.title')}</p>
                    <GhostRecap draft={draft} />
                  </div>
                </div>
              </section>
            )}

            {/* ----------------------------- STEP 4: invites ----------------------------- */}
            {step === 3 && (
              <section>
                <h3 className="font-display text-2xl font-semibold text-[#0B2E2B]">{t('create.step4.title')}</h3>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#0B2E2B]/60">{t('create.step4.text')}</p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2 rounded-full border border-[#EADFC8] bg-white px-4 py-2.5">
                    <Search className="h-4 w-4 text-[#0B2E2B]/40" />
                    <input
                      value={playerQuery}
                      onChange={(e) => setPlayerQuery(e.target.value)}
                      placeholder={t('invite.search')}
                      className="w-full bg-transparent text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35"
                    />
                  </div>
                  {draft.sport && (
                    <button
                      onClick={() => setOnlySportFans((v) => !v)}
                      className={cn(
                        'rounded-full px-4 py-2 text-xs font-bold transition-colors',
                        onlySportFans ? 'bg-[#0B2E2B] text-white' : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/60 hover:border-[#0E8C7F]',
                      )}
                    >
                      {t('create.step4.onlySport', { sport: t(`sport.${draft.sport}`) })}
                    </button>
                  )}
                </div>

                {/* selected chips */}
                <div className="mt-3 flex min-h-[44px] flex-wrap items-center gap-2">
                  <AnimatePresence>
                    {draft.invitedIds.map((id) => {
                      const u = users.find((x) => x.id === id);
                      if (!u) return null;
                      return (
                        <motion.button
                          key={id}
                          layout
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                          onClick={() => toggleInvite(id)}
                          className="flex items-center gap-2 rounded-full bg-[#0E8C7F]/10 py-1 pl-1 pr-3 text-xs font-semibold text-[#0B2E2B] ring-1 ring-[#0E8C7F]/30"
                        >
                          <motion.span layoutId={`invite-avatar-${id}`}>
                            <PlayerAvatar user={u} size={26} />
                          </motion.span>
                          {u.name.split(' ')[0]}
                          <X className="h-3 w-3 text-[#0B2E2B]/40" />
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                  {draft.invitedIds.length > 0 && (
                    <span className="text-xs font-semibold text-[#0E8C7F]">
                      {t(draft.invitedIds.length === 1 ? 'invite.selected.one' : 'invite.selected.other', { count: draft.invitedIds.length })}
                    </span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {candidates.map((u, i) => {
                    const isSel = draft.invitedIds.includes(u.id);
                    return (
                      <motion.button
                        key={u.id}
                        layout
                        type="button"
                        onClick={() => toggleInvite(u.id)}
                        initial={{ y: 16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.35, ease: EASE }}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                          isSel ? 'border-[#0E8C7F] bg-[#0E8C7F]/[.06]' : 'border-[#EADFC8] bg-white hover:border-[#0E8C7F]/50',
                        )}
                      >
                        {!isSel && (
                          <motion.span layoutId={`invite-avatar-${u.id}`}>
                            <PlayerAvatar user={u} size={38} />
                          </motion.span>
                        )}
                        {isSel && <PlayerAvatar user={u} size={38} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#0B2E2B]">
                            {u.name} <span className="font-normal">{u.nationality}</span>
                          </span>
                          <span className="block truncate text-xs text-[#0B2E2B]/50">
                            {u.sports.map((s) => t(`sport.${s}`)).join(' · ')} — {t(`common.level.${u.level}`)}
                          </span>
                        </span>
                        <span className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                          isSel ? 'border-[#0E8C7F] bg-[#0E8C7F] text-white' : 'border-[#EADFC8]',
                        )}>
                          {isSel && <Check className="h-3 w-3" strokeWidth={3.5} />}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <textarea
                  value={draft.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder={t('invite.messagePlaceholder')}
                  rows={2}
                  className="mt-4 w-full resize-none rounded-2xl border border-[#EADFC8] bg-white px-4 py-3 text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35 focus:border-[#0E8C7F] focus:ring-2 focus:ring-[#0E8C7F]/25"
                />
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {/* footer nav */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              onClick={() => goTo(step - 1)}
              className="inline-flex items-center gap-2 rounded-full border border-[#EADFC8] bg-white px-6 py-3 text-sm font-semibold text-[#0B2E2B]/70 transition-colors hover:border-[#0E8C7F] hover:text-[#0B2E2B]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('create.back')}
            </button>
          ) : <span />}

          {step < 3 ? (
            <button
              onClick={onContinue}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white transition-all',
                stepValid(step)
                  ? 'bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)] shadow-[0_8px_24px_rgba(14,140,127,.35)] hover:scale-[1.03]'
                  : 'bg-[#0B2E2B]/20',
              )}
            >
              {t('create.continue')}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => finish(false)}
                className="text-sm font-semibold text-[#0B2E2B]/50 underline-offset-4 transition-colors hover:text-[#0B2E2B] hover:underline"
              >
                {t('create.step4.skip')}
              </button>
              <button
                onClick={() => finish(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#FF6B4A,#FFB547)] px-7 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,74,.35)] transition-transform hover:scale-[1.03]"
              >
                <Send className="h-4 w-4" />
                {t('create.finish')}
                {draft.invitedIds.length > 0 && (
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs">{draft.invitedIds.length}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
