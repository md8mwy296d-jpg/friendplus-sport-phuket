import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Globe,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  X,
} from 'lucide-react';
import type { Session } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import QuotaRing from '@/components/QuotaRing';
import Countdown from '@/components/Countdown';
import PlayerAvatar from '@/components/PlayerAvatar';
import InviteModal from '@/components/InviteModal';
import SessionCard from '@/components/SessionCard';
import EmptyState from '@/components/EmptyState';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

type StepState = 'done' | 'active' | 'pending' | 'error';

function StepDot({ state }: { state: StepState }) {
  if (state === 'done')
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0E8C7F] text-white">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  if (state === 'active')
    return (
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0E8C7F] bg-white">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E8C7F] opacity-25" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-[#0E8C7F]" />
      </span>
    );
  if (state === 'error')
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F05252] text-white">
        <X className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-[#EADFC8] bg-[#FBF6EC] text-[#0B2E2B]/35">
      <Lock className="h-3.5 w-3.5" />
    </span>
  );
}

export default function SessionDetail() {
  const { id } = useParams();
  const { getSession, getVenue, getUser, sessions, invitations, currentUser, joinSession, leaveSession, respondInvitation, ready } =
    useStore();
  const { t, formatDate, formatTHB } = useI18n();
  const club = useClub();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [copied, setCopied] = useState(false);

  const session = getSession(id ?? '');
  const venue = session ? getVenue(session.venueId) : undefined;
  const creator = session ? getUser(session.creatorId) : undefined;

  const similar = useMemo(() => {
    if (!session) return [];
    return sessions
      .filter(
        (s) =>
          s.id !== session.id &&
          s.status === 'open' &&
          (s.sport === session.sport || getVenue(s.venueId)?.area === venue?.area),
      )
      .slice(0, 4);
  }, [session, sessions, getVenue, venue]);

  if (!session && !ready) {
    return <p className="py-24 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>;
  }

  if (!session) {
    return (
      <div className="container py-16">
        <EmptyState
          title={t('detail.notFound.title')}
          body={t('detail.notFound.body')}
          ctaLabel={t('detail.notFound.cta')}
          ctaTo="/explorer"
        />
      </div>
    );
  }

  const count = session.playerIds.length;
  const spotsLeft = Math.max(0, session.quota - count);
  const active = session.status === 'open' || session.status === 'full';
  const meIn = session.playerIds.includes(currentUser.id);
  const meWaitlisted = session.waitlistIds.includes(currentUser.id);
  const canChat = club.enabled && (meIn || meWaitlisted || session.creatorId === currentUser.id);
  const myInvite = currentUser.id
    ? invitations.find((i) => i.sessionId === session.id && i.toUserId === currentUser.id && i.status === 'pending')
    : undefined;
  const openChat = async () => {
    setOpeningChat(true);
    const conv = await club.openSessionChat(session.id);
    setOpeningChat(false);
    if (conv) navigate(`/club/${conv}`);
  };
  const messagePlayer = async (userId: string) => {
    const conv = await club.startDirect(userId);
    if (conv) navigate(`/club/${conv}`);
  };
  const hoursBefore = Math.round(
    (new Date(session.date).getTime() - new Date(session.confirmationDeadline).getTime()) / 3_600_000,
  );
  const players = session.playerIds.map((pid) => getUser(pid)).filter(Boolean);
  const waitlisted = session.waitlistIds.map((pid) => getUser(pid)).filter(Boolean);
  const endDate = new Date(new Date(session.date).getTime() + session.durationMin * 60_000);
  const timeRange = `${formatDate(session.date, { hour: '2-digit', minute: '2-digit' })}–${formatDate(
    endDate.toISOString(),
    { hour: '2-digit', minute: '2-digit' },
  )}`;

  const steps: { key: string; state: StepState; title: string; sub?: string }[] = [
    {
      key: 'created',
      state: 'done',
      title: t('detail.timeline.created'),
      sub: `${t('detail.timeline.by', { name: creator?.name.split(' ')[0] ?? '' })} · ${formatDate(
        session.createdAt,
        { day: 'numeric', month: 'short' },
      )}`,
    },
    {
      key: 'waiting',
      state: session.status === 'open' ? 'active' : 'done',
      title: t('detail.timeline.waiting'),
      sub: t('detail.timeline.registered', { count, quota: session.quota }),
    },
    {
      key: 'quota',
      state:
        session.status === 'full'
          ? 'active'
          : session.status === 'confirmed'
            ? 'done'
            : session.status === 'cancelled'
              ? 'error'
              : 'pending',
      title:
        session.status === 'full' || session.status === 'confirmed'
          ? t('detail.timeline.quotaReached')
          : t('detail.timeline.waitingQuota'),
    },
    {
      key: 'confirmation',
      state:
        session.status === 'confirmed' ? 'done' : session.status === 'cancelled' ? 'error' : 'pending',
      title:
        session.status === 'cancelled'
          ? t('detail.timeline.cancelled')
          : t('detail.timeline.confirmation'),
      sub:
        session.status === 'cancelled'
          ? undefined
          : formatDate(session.confirmationDeadline, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
    },
    {
      key: 'kickoff',
      state: 'pending',
      title: t('detail.timeline.kickoff'),
      sub: formatDate(session.date, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ];

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    if (window.confirm(t('detail.action.leaveConfirm'))) leaveSession(session.id);
  };

  return (
    <div className="bg-[#FBF6EC]">
      {/* Section 1 — hero */}
      <section className="relative min-h-[420px] overflow-hidden">
        <motion.img
          src={`/sport-${session.sport}.jpg`}
          alt={t(`sport.${session.sport}`)}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <div className="absolute inset-0 bg-lagoon-deep opacity-75" aria-hidden />
        <div className="grain-overlay absolute inset-0 opacity-[0.06]" aria-hidden />

        <div className="container relative flex min-h-[420px] items-end gap-10 py-12">
          <div className="flex-1">
            <motion.nav
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-white/60"
              aria-label="breadcrumb"
            >
              <Link to="/explorer" className="transition-colors hover:text-white">
                {t('nav.explore')}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to={`/explorer?sport=${session.sport}`} className="transition-colors hover:text-white">
                {t(`sport.${session.sport}`)}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-white/85">{session.title}</span>
            </motion.nav>

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
              className="mt-4 flex flex-wrap items-center gap-2"
            >
              <StatusBadge status={session.status} className="bg-white/90 backdrop-blur" />
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {session.level === 'all' ? t('common.level.all') : t(`common.level.${session.level}`)}
              </span>
              {session.mixed && (
                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {t('detail.mixed')}
                </span>
              )}
            </motion.div>

            <motion.h1
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.16 }}
              className="mt-4 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] text-white md:text-[52px]"
            >
              {session.title}
            </motion.h1>

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.24 }}
              className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85"
            >
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#FFB547]" />
                {formatDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {timeRange}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#FF6B4A]" />
                {venue ? `${venue.name}, ${venue.area}` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-[#2FBFA5]" />
                {t('detail.languages')}
              </span>
            </motion.div>
          </div>

          {/* floating glass quota card (desktop) */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.32 }}
            className="hidden shrink-0 flex-col items-center gap-2 rounded-[24px] border border-white/20 bg-white/10 px-8 py-6 backdrop-blur-md lg:flex"
          >
            <QuotaRing current={count} quota={session.quota} size={160} strokeWidth={10} />
            <p className="text-center text-[13px] font-semibold text-white/80">
              {spotsLeft > 0
                ? t('detail.spotsLeftLabel', { count: spotsLeft })
                : t('status.full')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Section 2 — confirmation countdown banner */}
      <section
        className={cn(
          'border-y transition-colors duration-700',
          session.status === 'open' && 'border-[#EADFC8] bg-[#FFFDF8]',
          session.status === 'full' && 'border-[#FFB547]/40 bg-[#FFB547]/12',
          session.status === 'confirmed' && 'border-[#22C55E]/30 bg-[#22C55E]/12',
          session.status === 'cancelled' && 'border-[#F05252]/25 bg-[#F05252]/10',
        )}
      >
        <div className="container flex flex-col items-center gap-4 py-10 text-center">
          {active && (
            <>
              <p
                className={cn(
                  'text-xs font-bold uppercase tracking-[0.18em]',
                  session.status === 'open' ? 'text-[#5B7CFF]' : 'text-[#B97A0B]',
                )}
              >
                {session.status === 'open' ? t('detail.confirmIn') : t('detail.fullTitle')}
              </p>
              {session.status === 'full' && (
                <p className="text-sm font-medium text-[#0B2E2B]/70">{t('detail.fullBody')}</p>
              )}
              <Countdown target={session.confirmationDeadline} />
              {session.status === 'open' && (
                <p className="max-w-xl text-sm leading-relaxed text-[#0B2E2B]/60">
                  {t('detail.pendingBody', { quota: session.quota, hours: hoursBefore })}
                </p>
              )}
            </>
          )}

          {session.status === 'confirmed' && (
            <>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-[0_8px_24px_rgba(34,197,94,.4)]"
              >
                <Check className="h-7 w-7" strokeWidth={3} />
              </motion.span>
              <h2 className="font-display text-2xl font-bold text-[#15803D]">
                {t('detail.confirmedTitle')}
              </h2>
              <p className="text-sm font-medium text-[#0B2E2B]/70">
                {t('detail.confirmedBody', {
                  date: formatDate(session.date, {
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </p>
            </>
          )}

          {session.status === 'cancelled' && (
            <>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F05252] text-white shadow-[0_8px_24px_rgba(240,82,82,.35)]"
              >
                <X className="h-7 w-7" strokeWidth={3} />
              </motion.span>
              <h2 className="font-display text-2xl font-bold text-[#D03838]">
                {t('detail.cancelledTitle')}
              </h2>
              <p className="text-sm font-medium text-[#0B2E2B]/70">{t('detail.cancelledBody')}</p>
              <Link
                to={`/explorer?sport=${session.sport}`}
                className="mt-1 inline-flex items-center gap-2 rounded-full bg-coral-pop px-6 py-3 text-sm font-bold text-white shadow-coral transition-transform hover:scale-[1.03]"
              >
                {t('detail.seeSimilar')}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Section 3 — body 2 columns */}
      <section className="container grid grid-cols-1 gap-8 py-12 lg:grid-cols-3 lg:py-16">
        {/* main column */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Bloc A — timeline */}
          <div className="rounded-[20px] border border-[#EADFC8] bg-white p-6 shadow-paper md:p-8">
            <h2 className="font-display text-xl font-semibold text-[#0B2E2B]">
              {t('detail.timeline.title')}
            </h2>
            <div className="relative mt-6">
              <motion.span
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.9, ease: EASE }}
                className="absolute bottom-5 left-[15px] top-5 w-0.5 origin-top bg-[#EADFC8]"
                aria-hidden
              />
              <ol className="relative flex flex-col gap-6">
                {steps.map((step, i) => (
                  <motion.li
                    key={step.key}
                    initial={{ x: -16, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.45, ease: EASE, delay: i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <StepDot state={step.state} />
                    <div className="pt-1">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          step.state === 'pending'
                            ? 'text-[#0B2E2B]/45'
                            : step.state === 'error'
                              ? 'text-[#D03838]'
                              : 'text-[#0B2E2B]',
                        )}
                      >
                        {step.title}
                      </p>
                      {step.sub && (
                        <p className="mt-0.5 font-mono text-[13px] tabular-nums text-[#0B2E2B]/50">
                          {step.sub}
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>

          {/* Bloc B — players */}
          <div className="rounded-[20px] border border-[#EADFC8] bg-white p-6 shadow-paper md:p-8">
            <h2 className="font-display text-xl font-semibold text-[#0B2E2B]">
              {t('detail.team.title', { count, quota: session.quota })}
            </h2>
            <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
              {players.map(
                (u, i) =>
                  u && (
                    <motion.div
                      key={u.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
                      className="flex flex-col items-center gap-1.5 text-center"
                    >
                      <PlayerAvatar user={u} size={64} />
                      <p className="max-w-full truncate text-[13px] font-semibold text-[#0B2E2B]">
                        {u.name.split(' ')[0]} <span aria-hidden>{u.nationality}</span>
                      </p>
                      <p className="text-[11px] text-[#0B2E2B]/50">{t(`common.level.${u.level}`)}</p>
                      {club.enabled && u.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => void messagePlayer(u.id)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-[#0A6E64] hover:bg-[#0E8C7F]/10"
                        >
                          <MessageCircle className="h-3 w-3" /> {t('club.messagePlayer')}
                        </button>
                      )}
                      <div className="flex flex-wrap justify-center gap-1">
                        {u.id === session.creatorId && (
                          <span className="rounded-full bg-[#0E8C7F]/10 px-2 py-0.5 text-[10px] font-bold text-[#0A6E64]">
                            {t('detail.team.organizer')}
                          </span>
                        )}
                        {invitations.some(
                          (inv) =>
                            inv.sessionId === session.id &&
                            inv.toUserId === u.id &&
                            inv.status === 'accepted',
                        ) && (
                          <span className="rounded-full bg-[#5B7CFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#3B5BDB]">
                            {t('detail.team.viaInvite')}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ),
              )}
              {Array.from({ length: spotsLeft }).map((_, i) => (
                <button
                  key={`free-${i}`}
                  type="button"
                  onClick={() => active && setInviteOpen(true)}
                  disabled={!active}
                  className={cn(
                    'flex flex-col items-center gap-1.5',
                    active ? 'group cursor-pointer' : 'cursor-default opacity-60',
                  )}
                  aria-label={t('detail.team.freeSpot')}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#EADFC8] font-display text-xl font-bold text-[#0B2E2B]/30 transition-colors group-hover:border-[#0E8C7F] group-hover:text-[#0E8C7F]">
                    ?
                  </span>
                  <span className="text-[11px] font-medium text-[#0B2E2B]/40 transition-colors group-hover:text-[#0E8C7F]">
                    {t('detail.team.freeSpot')}
                  </span>
                </button>
              ))}
            </div>

            {waitlisted.length > 0 && (
              <div className="mt-6 border-t border-[#EADFC8] pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                  {t('detail.team.waitlist')} ({waitlisted.length})
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {waitlisted.map(
                    (u) =>
                      u && (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-2 rounded-full bg-[#FBF6EC] py-1 pl-1 pr-3 text-[13px] font-medium text-[#0B2E2B]/70"
                        >
                          <PlayerAvatar user={u} size={26} />
                          {u.name.split(' ')[0]}
                        </span>
                      ),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bloc C — description & practical info */}
          <div className="rounded-[20px] border border-[#EADFC8] bg-white p-6 shadow-paper md:p-8">
            <h2 className="font-display text-xl font-semibold text-[#0B2E2B]">{t('detail.info.title')}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#0B2E2B]/70">{session.description}</p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {venue && venue.amenities.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                    {t('detail.info.amenities')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {venue.amenities.map((a) => (
                      <span
                        key={a}
                        className="rounded-[10px] bg-[#0E8C7F]/10 px-2.5 py-1 text-xs font-semibold text-[#0A6E64]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                  {t('detail.info.rules')}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[#0B2E2B]/70">
                  <li className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B4A]" />
                    {t('detail.info.rule1')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
                    {t('detail.info.rule2')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB547]" />
                    {t('detail.info.expectedLevel')} :{' '}
                    {session.level === 'all' ? t('common.level.all') : t(`common.level.${session.level}`)}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* sidebar */}
        <motion.aside
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col gap-6 self-start lg:sticky lg:top-24"
        >
          {/* action card */}
          <div className="overflow-hidden rounded-[24px] border border-[#EADFC8] bg-white shadow-[0_4px_12px_rgba(11,46,43,.08),0_24px_56px_rgba(11,46,43,.14)]">
            <div className="h-1 bg-golden-hour" aria-hidden />
            <div className="flex flex-col gap-5 p-6">
              <div>
                <p className="font-mono text-[32px] font-bold leading-none tabular-nums text-[#0B2E2B]">
                  {formatTHB(session.pricePerPerson)}
                  <span className="ml-1 text-sm font-medium text-[#0B2E2B]/50">
                    {t('detail.action.perPerson')}
                  </span>
                </p>
                <p className="mt-1 text-[13px] text-[#0B2E2B]/50">{t('detail.action.payOnSite')}</p>
              </div>

              <div className="flex items-center gap-4">
                <QuotaRing current={count} quota={session.quota} size={72} strokeWidth={7} />
                <div className="text-[13px] font-medium text-[#0B2E2B]/60">
                  <p className="font-mono text-base font-bold tabular-nums text-[#0B2E2B]">
                    {count}/{session.quota} {t('common.players')}
                  </p>
                  {active && spotsLeft > 0 && (
                    <p className="text-[#0E8C7F]">
                      {t(spotsLeft === 1 ? 'card.spotsLeft.one' : 'card.spotsLeft.other', { count: spotsLeft })}
                    </p>
                  )}
                </div>
              </div>

              {active && (
                <div className="flex items-center justify-between rounded-xl bg-[#FBF6EC] px-3 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0B2E2B]/45">
                    {t('countdown.label')}
                  </span>
                  <Countdown target={session.confirmationDeadline} compact />
                </div>
              )}

              {/* main CTA by state */}
              {session.status === 'cancelled' ? (
                <>
                  <span className="flex h-14 items-center justify-center rounded-full bg-[#0B2E2B]/10 text-sm font-bold text-[#0B2E2B]/45">
                    {t('status.cancelled')}
                  </span>
                  <Link
                    to={`/explorer?sport=${session.sport}`}
                    className="text-center text-sm font-semibold text-[#0E8C7F] hover:underline"
                  >
                    {t('detail.seeSimilar')}
                  </Link>
                </>
              ) : meIn ? (
                <>
                  <span className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#22C55E]/12 text-sm font-bold text-[#15803D]">
                    <Check className="h-4 w-4" strokeWidth={3} />
                    {t('detail.action.joined')}
                  </span>
                  {session.status !== 'confirmed' && (
                    <button
                      onClick={handleLeave}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#F05252]/40 text-sm font-semibold text-[#D03838] transition-colors hover:bg-[#F05252]/10"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('detail.action.leave')}
                    </button>
                  )}
                </>
              ) : meWaitlisted ? (
                <span className="flex h-14 items-center justify-center rounded-full bg-[#FFB547]/15 text-sm font-bold text-[#B97A0B]">
                  {t('detail.action.onWaitlist')}
                </span>
              ) : session.status === 'confirmed' ? (
                <span className="flex h-14 items-center justify-center rounded-full bg-[#0B2E2B]/10 text-sm font-bold text-[#0B2E2B]/45">
                  {t('status.confirmed')}
                </span>
              ) : session.status === 'full' ? (
                <button
                  onClick={() => joinSession(session.id)}
                  className="h-14 rounded-full bg-[#FFB547] text-sm font-bold text-[#0B2E2B] shadow-[0_8px_24px_rgba(255,181,71,.4)] transition-transform hover:scale-[1.02]"
                >
                  {t('detail.action.waitlist')}
                </button>
              ) : (
                <button
                  onClick={() => joinSession(session.id)}
                  className="h-14 rounded-full bg-golden-hour text-sm font-bold text-white shadow-coral transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t('detail.action.join')}
                </button>
              )}

              {canChat && (
                <button
                  onClick={() => void openChat()}
                  disabled={openingChat}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0B2E2B] text-sm font-bold text-white transition-colors hover:bg-[#1E5945] disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t('club.sessionChat')}
                </button>
              )}

              {session.status !== 'cancelled' && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#0E8C7F]/40 text-sm font-bold text-[#0A6E64] transition-colors hover:bg-[#0E8C7F]/5"
                >
                  <Mail className="h-4 w-4" />
                  {t('detail.action.invite')}
                </button>
              )}

              <button
                onClick={share}
                className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#0B2E2B]/45 transition-colors hover:text-[#0E8C7F]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? t('detail.action.linkCopied') : t('detail.action.share')}
              </button>
            </div>
          </div>

          {/* venue card */}
          {venue && (
            <div className="overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white shadow-paper">
              <div className="relative aspect-video overflow-hidden">
                <img src={venue.photo} alt={venue.name} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[#0B2E2B] backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-[#FFB547] text-[#FFB547]" />
                  {venue.rating.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-5">
                <h3 className="font-display text-lg font-semibold text-[#0B2E2B]">{venue.name}</h3>
                <p className="inline-flex items-center gap-1 text-[13px] text-[#0B2E2B]/55">
                  <MapPin className="h-3.5 w-3.5 text-[#FF6B4A]" />
                  {venue.address} · {venue.area}
                </p>
                <Link
                  to="/salles"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0E8C7F] hover:underline"
                >
                  {t('detail.venue.view')}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </motion.aside>
      </section>

      {/* Section 4 — similar sessions */}
      {similar.length > 0 && (
        <section className="container pb-20 md:pb-24">
          <h2 className="font-display text-2xl font-bold text-[#0B2E2B]">{t('detail.similar.title')}</h2>
          <div className="-mx-6 mt-6 flex gap-6 overflow-x-auto px-6 pb-4 lg:mx-0 lg:px-0">
            {similar.map((s: Session, i: number) => (
              <motion.div
                key={s.id}
                initial={{ y: 32, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
                className="w-[300px] shrink-0 md:w-[320px]"
              >
                <SessionCard session={s} className="h-full" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* phones: the join button lives far down the page, so keep the main action pinned above the tab bar */}
      {active && (
        <>
          <div className="h-24 lg:hidden" aria-hidden />
          <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-[#EADFC8] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(11,46,43,.08)] backdrop-blur-[12px] lg:hidden">
            <div className="mx-auto flex max-w-lg items-center gap-3">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-display text-lg font-bold text-[#0B2E2B]">
                  {formatTHB(session.pricePerPerson)}
                  <span className="text-xs font-medium text-[#0B2E2B]/50"> {t('detail.action.perPerson')}</span>
                </p>
                <p className="truncate text-xs font-semibold text-[#0A6E64]">
                  {count}/{session.quota} · {spotsLeft > 0 ? t('detail.spotsLeftLabel', { count: spotsLeft }) : t('status.full')}
                </p>
              </div>
              {meIn || meWaitlisted ? (
                canChat ? (
                  <button
                    onClick={() => void openChat()}
                    disabled={openingChat}
                    className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#0B2E2B] px-5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('club.sessionChat')}
                  </button>
                ) : (
                  <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#22C55E]/12 px-5 text-sm font-bold text-[#15803D]">
                    <Check className="h-4 w-4" strokeWidth={3} />
                    {meIn ? t('detail.action.joined') : t('detail.action.onWaitlist')}
                  </span>
                )
              ) : myInvite ? (
                <button
                  onClick={() => respondInvitation(myInvite.id, true)}
                  className="h-12 shrink-0 rounded-full bg-golden-hour px-6 text-sm font-bold text-white shadow-coral active:scale-[0.98]"
                >
                  {t('detail.action.acceptInvite')}
                </button>
              ) : (
                <button
                  onClick={() => joinSession(session.id)}
                  className={cn(
                    'h-12 shrink-0 rounded-full px-6 text-sm font-bold active:scale-[0.98]',
                    session.status === 'full'
                      ? 'bg-[#FFB547] text-[#0B2E2B]'
                      : 'bg-golden-hour text-white shadow-coral',
                  )}
                >
                  {session.status === 'full' ? t('detail.action.waitlist') : t('detail.action.join')}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <InviteModal session={session} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
