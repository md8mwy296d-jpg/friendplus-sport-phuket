import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Clock, Info, Lightbulb, MapPin, Navigation, Pencil, RotateCcw, UserPlus, X,
} from 'lucide-react';
import type { Invitation, Session } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import PlayerAvatar from '@/components/PlayerAvatar';
import StatusBadge from '@/components/StatusBadge';
import Countdown from '@/components/Countdown';
import EmptyState from '@/components/EmptyState';
import SessionCard from '@/components/SessionCard';
import InviteModal from '@/components/InviteModal';
import CountUp from '@/components/home/CountUp';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const CANCELLED_KEY = 'friendplus.cancelled';

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

type TabId = 'upcoming' | 'organizing' | 'invitations' | 'history';

/* ------------------------------ local toast ------------------------------ */

interface LocalToast { id: number; kind: 'success' | 'info'; title: string }

/* ------------------------------ wide card ------------------------------ */

interface WideCardProps {
  session: Session;
  cancelled: boolean;
  flash: boolean;
  organizing: boolean;
  pendingInvites: number;
  index: number;
  onInvite: (s: Session) => void;
  onEdit: (s: Session) => void;
  onCancelAsk: (s: Session) => void;
  onMaps: () => void;
}

function WideSessionCard({ session, cancelled, flash, organizing, pendingInvites, index, onInvite, onEdit, onCancelAsk, onMaps }: WideCardProps) {
  const { getVenue, getUser } = useStore();
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const venue = getVenue(session.venueId);
  const status = cancelled ? 'cancelled' : session.status;
  const spotsLeft = Math.max(0, session.quota - session.playerIds.length);
  const daysLeft = Math.max(0, Math.ceil((new Date(session.date).getTime() - Date.now()) / 86400_000));
  const players = session.playerIds.map((id) => getUser(id)).filter(Boolean);

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: Math.min(index, 8) * 0.07, duration: 0.5, ease: EASE }}
    >
      <motion.div
        animate={flash ? { boxShadow: ['0 0 0 0 rgba(14,140,127,0)', '0 0 0 6px rgba(14,140,127,.45)', '0 0 0 0 rgba(14,140,127,0)', '0 0 0 6px rgba(14,140,127,.45)', '0 0 0 0 rgba(14,140,127,0)'] } : undefined}
        transition={{ duration: 2 }}
        onClick={() => navigate(`/session/${session.id}`)}
        className={cn(
          'group flex cursor-pointer flex-col gap-4 rounded-[20px] border border-[#EADFC8] bg-white p-4 shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(11,46,43,.08),0_24px_56px_rgba(11,46,43,.14)] sm:flex-row sm:items-stretch',
          status === 'cancelled' && 'opacity-60 grayscale-[.4]',
        )}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/session/${session.id}`); }}
      >
        {/* image */}
        <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-2xl sm:h-auto sm:w-40">
          <img src={`/sport-${session.sport}.jpg`} alt={t(`sport.${session.sport}`)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/40 to-transparent" />
          <div className="absolute left-2 top-2 flex gap-1.5">
            <StatusBadge status={status} className="bg-white/90 backdrop-blur" />
          </div>
          {organizing && (
            <span className="absolute bottom-2 left-2 rounded-full bg-[linear-gradient(135deg,#FF6B4A,#FFB547)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {t('dash.organizer')}
            </span>
          )}
        </div>

        {/* content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold leading-snug text-[#0B2E2B]">{session.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#0B2E2B]/60">
              <span className="inline-flex items-center gap-1">
                <SportIcon sport={session.sport} className="h-3.5 w-3.5 text-[#0E8C7F]" />
                {t(`sport.${session.sport}`)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#FF6B4A]" />
                {venue ? `${venue.name} · ${venue.area}` : ''}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#0E8C7F]" />
                {formatDate(session.date)}
              </span>
            </div>
          </div>

          {/* quota bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-mono font-bold tabular-nums text-[#0B2E2B]">
                {session.playerIds.length}/{session.quota} <span className="font-medium text-[#0B2E2B]/50">{t('common.players')}</span>
              </span>
              {(status === 'open' || status === 'full') && spotsLeft > 0 && (
                <span className={cn('font-medium', spotsLeft === 1 ? 'text-[#FF6B4A]' : 'text-[#0E8C7F]')}>
                  {t(spotsLeft === 1 ? 'card.spotsLeft.one' : 'card.spotsLeft.other', { count: spotsLeft })}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: session.quota }).map((_, i) => (
                <span key={i} className={cn('h-2 flex-1 rounded-full', i < session.playerIds.length ? 'bg-[#0E8C7F]' : 'bg-[#EADFC8]')} />
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="flex -space-x-2">
              {players.slice(0, 5).map((u) => u && <PlayerAvatar key={u.id} user={u} size={26} />)}
              {players.length > 5 && (
                <span className="inline-flex h-[26px] items-center justify-center rounded-full bg-[#FBF6EC] px-1.5 text-[11px] font-bold text-[#0B2E2B]/60 ring-2 ring-white">
                  +{players.length - 5}
                </span>
              )}
            </div>
            {organizing && pendingInvites > 0 && (
              <span className="text-xs font-semibold text-[#B97A0B]">{t('dash.pendingInvites', { count: pendingInvites })}</span>
            )}
          </div>

          {/* organizer management row */}
          {organizing && status !== 'cancelled' && (
            <div className="flex flex-wrap gap-2 border-t border-[#EADFC8]/70 pt-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onInvite(session)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0E8C7F] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0A6E64]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t('dash.invite')}
              </button>
              <button
                onClick={() => onEdit(session)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EADFC8] px-4 py-2 text-xs font-bold text-[#0B2E2B]/70 transition-colors hover:border-[#0E8C7F] hover:text-[#0B2E2B]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('dash.edit')}
              </button>
              <button
                onClick={() => onCancelAsk(session)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#F05252]/40 px-4 py-2 text-xs font-bold text-[#D03838] transition-colors hover:bg-[#F05252]/10"
              >
                <X className="h-3.5 w-3.5" />
                {t('dash.cancel')}
              </button>
            </div>
          )}
        </div>

        {/* right contextual module */}
        <div
          className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-dashed border-[#EADFC8] pt-3 sm:w-44 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          {(status === 'open' || status === 'full') && (
            <>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('countdown.label')}</span>
                <Countdown target={session.confirmationDeadline} compact />
              </div>
              {!organizing && (
                <button
                  onClick={() => onInvite(session)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#FF6B4A,#FFB547)] px-4 py-2 text-xs font-bold text-white shadow-[0_6px_16px_rgba(255,107,74,.3)] transition-transform hover:scale-[1.04]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t('dash.invite')}
                </button>
              )}
            </>
          )}
          {status === 'confirmed' && (
            <>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/12 px-2.5 py-1 text-[11px] font-bold text-[#15803D]">
                  {t('status.confirmed')}
                </span>
                <span className="font-mono text-sm font-bold text-[#0B2E2B]">
                  {t('dash.daysShort', { count: daysLeft })} · {formatDate(session.date, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={onMaps}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0B2E2B] px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.04]"
              >
                <Navigation className="h-3.5 w-3.5" />
                {t('dash.directions')}
              </button>
            </>
          )}
          {status === 'cancelled' && (
            <Link
              to="/explorer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EADFC8] bg-white px-4 py-2 text-xs font-bold text-[#0B2E2B]/70 transition-colors hover:border-[#0E8C7F]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('dash.findReplacement')}
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------ invitation card ------------------------------ */

function ReceivedInvitation({ invitation, expired, index, onRespond }: {
  invitation: Invitation;
  expired: boolean;
  index: number;
  onRespond: (inv: Invitation, accept: boolean) => void;
}) {
  const { getUser, getSession, getVenue } = useStore();
  const { t, formatDate } = useI18n();
  const from = getUser(invitation.fromUserId);
  const session = getSession(invitation.sessionId);
  const venue = session ? getVenue(session.venueId) : undefined;
  if (!from || !session) return null;

  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ height: 0, opacity: 0, marginBottom: -12, overflow: 'hidden' }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: EASE }}
      className={cn(
        'rounded-[20px] border bg-white p-4 shadow-[0_2px_8px_rgba(11,46,43,.06)]',
        expired ? 'border-[#EADFC8] opacity-55 grayscale-[.5]' : 'border-[#EADFC8]',
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <PlayerAvatar user={from} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#0B2E2B]">
            <span className="font-semibold">{from.nationality} {from.name}</span>{' '}
            <span className="text-[#0B2E2B]/60">{t('dash.inv.invitesYou')}</span>{' '}
            <Link to={`/session/${session.id}`} className="font-semibold text-[#0E8C7F] hover:underline">{session.title}</Link>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-[#0B2E2B]/55">
            <span className="inline-flex items-center gap-1">
              <SportIcon sport={session.sport} className="h-3.5 w-3.5 text-[#0E8C7F]" />
              {t(`sport.${session.sport}`)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(session.date)}
            </span>
            {venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#FF6B4A]" />
                {venue.name}
              </span>
            )}
            <span className="font-mono font-bold tabular-nums">{session.playerIds.length}/{session.quota}</span>
          </p>
          {invitation.message && (
            <p className="mt-2 rounded-xl bg-[#FBF6EC] px-3 py-2 text-[13px] italic text-[#0B2E2B]/70">« {invitation.message} »</p>
          )}
        </div>
        {expired ? (
          <span className="rounded-full bg-[#0B2E2B]/8 px-3 py-1.5 text-xs font-bold text-[#0B2E2B]/45">{t('dash.inv.expired')}</span>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onRespond(invitation, true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)] px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_rgba(14,140,127,.3)] transition-transform hover:scale-[1.04]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('dash.inv.accept')}
            </button>
            <button
              onClick={() => onRespond(invitation, false)}
              className="rounded-full border border-[#EADFC8] px-5 py-2.5 text-xs font-bold text-[#0B2E2B]/60 transition-colors hover:border-[#F05252]/50 hover:text-[#D03838]"
            >
              {t('dash.inv.decline')}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* --------------------------------- page --------------------------------- */

export default function Dashboard() {
  const { sessions, invitations, currentUser, getSession, getUser, getVenue, respondInvitation, pendingInvitesForMe, cancelSession } = useStore();
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>('upcoming');
  const [inviteSession, setInviteSession] = useState<Session | null>(null);
  const [cancelAsk, setCancelAsk] = useState<Session | null>(null);
  const [cancelledIds, setCancelledIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CANCELLED_KEY) ?? '[]') as string[]; } catch { return []; }
  });
  const [localToasts, setLocalToasts] = useState<LocalToast[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const toastId = useRef(0);
  const prevInvStatus = useRef<Map<string, string>>(new Map());

  const pushLocal = (kind: LocalToast['kind'], title: string) => {
    const id = ++toastId.current;
    setLocalToasts((prev) => [...prev, { id, kind, title }]);
    window.setTimeout(() => setLocalToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  };

  // flash upcoming cards when a sent invitation gets accepted while visiting
  useEffect(() => {
    const prev = prevInvStatus.current;
    const newlyAccepted: string[] = [];
    for (const inv of invitations) {
      const before = prev.get(inv.id);
      if (before === 'pending' && inv.status === 'accepted' && inv.fromUserId === currentUser.id) {
        newlyAccepted.push(inv.sessionId);
      }
      prev.set(inv.id, inv.status);
    }
    if (newlyAccepted.length > 0) {
      setFlashIds((s) => new Set([...s, ...newlyAccepted]));
      window.setTimeout(() => {
        setFlashIds((s) => {
          const next = new Set(s);
          newlyAccepted.forEach((id) => next.delete(id));
          return next;
        });
      }, 2200);
    }
  }, [invitations, currentUser.id]);

  const me = currentUser.id;
  const now = Date.now();
  const isCancelled = (s: Session) => cancelledIds.includes(s.id) || s.status === 'cancelled';
  const isMine = (s: Session) => s.playerIds.includes(me) || s.creatorId === me;

  const upcoming = useMemo(
    () => sessions.filter((s) => isMine(s) && new Date(s.date).getTime() > now).sort((a, b) => a.date.localeCompare(b.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, me, now],
  );
  const organizing = useMemo(
    () => upcoming.filter((s) => s.creatorId === me),
    [upcoming, me],
  );
  const history = useMemo(
    () => sessions.filter((s) => isMine(s) && new Date(s.date).getTime() <= now).sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, me, now],
  );

  const sentInvites = useMemo(
    () => invitations.filter((i) => i.fromUserId === me).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [invitations, me],
  );

  const receivedAll = useMemo(() => {
    const pending = pendingInvitesForMe;
    return pending.map((inv) => {
      const s = getSession(inv.sessionId);
      const expired = !s || isCancelled(s) || new Date(s.date).getTime() <= now;
      return { inv, expired };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInvitesForMe, getSession, cancelledIds, now]);

  // stats
  const myFinal = sessions.filter((s) => isMine(s) && (s.status === 'confirmed' || s.status === 'cancelled'));
  const confirmRate = myFinal.length > 0
    ? Math.round((myFinal.filter((s) => s.status === 'confirmed').length / myFinal.length) * 100)
    : 100;
  const organizedCount = sessions.filter((s) => s.creatorId === me).length;
  const acceptedSent = sentInvites.filter((i) => i.status === 'accepted').length;

  const pendingForSession = (sessionId: string) =>
    invitations.filter((i) => i.sessionId === sessionId && i.fromUserId === me && i.status === 'pending').length;

  /* ------------------------------- actions ------------------------------- */

  const prefillFrom = (s: Session, jumpToDetails: boolean) => {
    const d = new Date(s.date);
    const future = d.getTime() > now ? d : new Date(now + 3 * 86400_000);
    if (d.getTime() <= now) future.setHours(d.getHours(), d.getMinutes(), 0, 0);
    const hoursBefore = Math.round((new Date(s.date).getTime() - new Date(s.confirmationDeadline).getTime()) / 3600_000);
    navigate('/creer', {
      state: {
        fromTitle: s.title,
        step: jumpToDetails ? 2 : 0,
        prefill: {
          sport: s.sport,
          venueId: s.venueId,
          title: s.title,
          date: toDateInput(future),
          time: toTimeInput(d),
          durationMin: s.durationMin,
          quota: s.quota,
          confirmHours: hoursBefore >= 36 ? 48 : 24,
          level: s.level,
          mix: s.mixed ? 'mixed' : 'mixed',
          price: s.pricePerPerson,
          description: s.description,
        },
      },
    });
  };

  const confirmCancel = async () => {
    if (!cancelAsk) return;
    const target = cancelAsk;
    setCancelAsk(null);
    if (!(await cancelSession(target.id))) return;
    const next = [...cancelledIds, target.id];
    setCancelledIds(next);
    try { localStorage.setItem(CANCELLED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    pushLocal('info', t('dash.cancelledToast'));
  };

  const onRespond = (inv: Invitation, accept: boolean) => {
    respondInvitation(inv.id, accept);
    pushLocal(accept ? 'success' : 'info', t(accept ? 'dash.joinedToast' : 'dash.declinedToast'));
  };

  /* -------------------------------- render -------------------------------- */

  const firstName = currentUser.name.split(' ')[0];
  const greeting = new Date().getHours() < 18 ? t('dash.greet.day', { name: firstName }) : t('dash.greet.evening', { name: firstName });
  const waitingCount = upcoming.filter((s) => !isCancelled(s) && (s.status === 'open' || s.status === 'full')).length;

  const stats = [
    { label: t('dash.stat.played'), value: currentUser.joinedCount, suffix: '' },
    { label: t('dash.stat.organized'), value: organizedCount, suffix: '' },
    { label: t('dash.stat.confirmRate'), value: confirmRate, suffix: '%' },
    { label: t('dash.stat.invAccepted'), value: acceptedSent, suffix: `/${sentInvites.length}` },
  ];

  const recommended = sessions
    .filter((s) => s.status === 'open' && !s.playerIds.includes(me) && s.creatorId !== me && new Date(s.date).getTime() > now)
    .sort((a, b) => {
      const af = currentUser.sports.includes(a.sport) ? 0 : 1;
      const bf = currentUser.sports.includes(b.sport) ? 0 : 1;
      return af - bf || a.date.localeCompare(b.date);
    })
    .slice(0, 2);

  const TABS: { id: TabId; label: string; count?: number; coral?: boolean }[] = [
    { id: 'upcoming', label: t('dash.tab.upcoming'), count: upcoming.length },
    { id: 'organizing', label: t('dash.tab.organizing'), count: organizing.length },
    { id: 'invitations', label: t('dash.tab.invitations'), count: pendingInvitesForMe.length, coral: true },
    { id: 'history', label: t('dash.tab.history') },
  ];

  // history grouped by month
  const historyGroups = useMemo(() => {
    const groups = new Map<string, Session[]>();
    for (const s of history) {
      const key = s.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups.entries()];
  }, [history]);

  return (
    <div>
      {/* ------------------------------ header ------------------------------ */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative overflow-hidden bg-[linear-gradient(180deg,#0B2E2B,#1E5945)]"
      >
        <div className="palm-texture pointer-events-none absolute inset-0 bg-white/5" />
        <div className="relative mx-auto max-w-[1280px] px-6 py-10 lg:px-12">
          <div className="flex items-center gap-5">
            <PlayerAvatar user={currentUser} size={72} ring={false} className="ring-4 ring-white/20" />
            <div>
              <h1 className="font-display text-3xl font-bold text-white sm:text-[40px] sm:leading-tight">{greeting}</h1>
              <p className="mt-1 text-sm text-white/70">
                {t('dash.subtitle', { upcoming: upcoming.length, waiting: waitingCount, invites: pendingInvitesForMe.length })}
              </p>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: EASE }}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 backdrop-blur-md"
              >
                <p className="font-mono text-2xl font-bold tabular-nums text-white">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white/65">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.header>

      <div className="mx-auto max-w-[1280px] px-6 pb-24 lg:px-12">
        {/* ------------------------------- tabs ------------------------------- */}
        <div className="sticky top-[72px] z-30 -mx-6 bg-[#FBF6EC]/90 px-6 py-4 backdrop-blur-md lg:-mx-12 lg:px-12">
          <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-[#EADFC8] bg-white p-1">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  tab === tb.id ? 'text-white' : 'text-[#0B2E2B]/60 hover:text-[#0B2E2B]',
                )}
              >
                {tab === tb.id && (
                  <motion.span layoutId="dash-tab-pill" className="absolute inset-0 rounded-full bg-[#0B2E2B]" transition={{ duration: 0.35, ease: EASE }} />
                )}
                <span className="relative z-10">{tb.label}</span>
                {tb.count !== undefined && tb.count > 0 && (
                  <span className={cn(
                    'relative z-10 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none',
                    tab === tb.id ? 'bg-white/20 text-white' : tb.coral ? 'bg-[#FF6B4A] text-white' : 'bg-[#0E8C7F]/12 text-[#0A6E64]',
                  )}>
                    {tb.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-6"
          >
            {/* ------------------------------ upcoming ------------------------------ */}
            {tab === 'upcoming' && (
              <div className="space-y-4">
                {upcoming.map((s, i) => (
                  <WideSessionCard
                    key={s.id}
                    session={s}
                    index={i}
                    cancelled={cancelledIds.includes(s.id)}
                    flash={flashIds.has(s.id)}
                    organizing={s.creatorId === me}
                    pendingInvites={pendingForSession(s.id)}
                    onInvite={setInviteSession}
                    onEdit={(ss) => prefillFrom(ss, true)}
                    onCancelAsk={setCancelAsk}
                    onMaps={() => pushLocal('info', t('dash.mapsDemo'))}
                  />
                ))}
                {upcoming.length === 0 && (
                  <>
                    <EmptyState body={t('dash.upcoming.emptyBody')} />
                    {recommended.length > 0 && (
                      <div>
                        <h3 className="mb-4 font-display text-xl font-semibold text-[#0B2E2B]">{t('dash.recommended')}</h3>
                        <div className="grid gap-6 sm:grid-cols-2">
                          {recommended.map((s) => <SessionCard key={s.id} session={s} />)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ----------------------------- organizing ----------------------------- */}
            {tab === 'organizing' && (
              <div className="space-y-4">
                {organizing.map((s, i) => (
                  <WideSessionCard
                    key={s.id}
                    session={s}
                    index={i}
                    cancelled={cancelledIds.includes(s.id)}
                    flash={flashIds.has(s.id)}
                    organizing
                    pendingInvites={pendingForSession(s.id)}
                    onInvite={setInviteSession}
                    onEdit={(ss) => prefillFrom(ss, true)}
                    onCancelAsk={setCancelAsk}
                    onMaps={() => pushLocal('info', t('dash.mapsDemo'))}
                  />
                ))}
                {organizing.length === 0 && (
                  <EmptyState
                    title={t('dash.organizing.emptyTitle')}
                    body={t('dash.organizing.emptyBody')}
                    ctaLabel={t('dash.organizing.emptyCta')}
                    ctaTo="/creer"
                  />
                )}
              </div>
            )}

            {/* ----------------------------- invitations ---------------------------- */}
            {tab === 'invitations' && (
              <div className="space-y-8">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold text-[#0B2E2B]">
                    {t('dash.inv.received')}
                    {receivedAll.filter((r) => !r.expired).length > 0 && (
                      <span className="rounded-full bg-[#FF6B4A] px-2 py-0.5 font-mono text-xs font-bold text-white">
                        {receivedAll.filter((r) => !r.expired).length}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {receivedAll.map(({ inv, expired }, i) => (
                        <ReceivedInvitation key={inv.id} invitation={inv} expired={expired} index={i} onRespond={onRespond} />
                      ))}
                    </AnimatePresence>
                    {receivedAll.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-[#EADFC8] py-8 text-center text-sm text-[#0B2E2B]/45">
                        {t('dash.inv.emptyReceived')}
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 font-display text-xl font-semibold text-[#0B2E2B]">{t('dash.inv.sent')}</h3>
                  <div className="space-y-2">
                    {sentInvites.map((inv, i) => {
                      const to = getUser(inv.toUserId);
                      const session = getSession(inv.sessionId);
                      if (!to || !session) return null;
                      return (
                        <motion.div
                          key={inv.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.35, ease: EASE }}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#EADFC8] bg-white px-4 py-3"
                        >
                          <PlayerAvatar user={to} size={34} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#0B2E2B]">{to.name}</p>
                            <p className="truncate text-xs text-[#0B2E2B]/50">
                              {session.title} · {formatDate(session.date)}
                            </p>
                          </div>
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={inv.status}
                              initial={{ rotateX: 90, opacity: 0 }}
                              animate={{ rotateX: 0, opacity: 1 }}
                              exit={{ rotateX: -90, opacity: 0 }}
                              transition={{ duration: 0.3, ease: EASE }}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
                                inv.status === 'pending' && 'animate-pulse bg-[#5B7CFF]/12 text-[#3B5BDB]',
                                inv.status === 'accepted' && 'bg-[#22C55E]/12 text-[#15803D]',
                                inv.status === 'declined' && 'bg-[#F05252]/10 text-[#D03838]',
                              )}
                            >
                              {inv.status === 'accepted' && '✅ '}
                              {inv.status === 'declined' && '❌ '}
                              {t(`dash.inv.${inv.status}`)}
                            </motion.span>
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                    {sentInvites.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-[#EADFC8] py-8 text-center text-sm text-[#0B2E2B]/45">
                        {t('dash.inv.emptySent')}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ------------------------------- history ------------------------------ */}
            {tab === 'history' && (
              <div className="space-y-8">
                {historyGroups.map(([month, list], gi) => (
                  <motion.section
                    key={month}
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: gi * 0.1, duration: 0.5, ease: EASE }}
                  >
                    <h3 className="mb-3 font-display text-lg font-semibold capitalize text-[#0B2E2B]">
                      {formatDate(`${month}-15T12:00:00`, { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white">
                      {list.map((s, si) => {
                        const venue = getVenue(s.venueId);
                        const cancelled = isCancelled(s);
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              'flex flex-wrap items-center gap-3 px-4 py-3.5',
                              si < list.length - 1 && 'border-b border-[#EADFC8]/70',
                            )}
                          >
                            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#FBF6EC] font-mono">
                              <span className="text-sm font-bold leading-none text-[#0B2E2B]">{new Date(s.date).getDate()}</span>
                              <span className="mt-0.5 text-[9px] font-bold uppercase text-[#0B2E2B]/45">
                                {formatDate(s.date, { weekday: 'short' })}
                              </span>
                            </div>
                            <SportIcon sport={s.sport} className="h-5 w-5 shrink-0 text-[#0E8C7F]" />
                            <div className="min-w-0 flex-1">
                              <Link to={`/session/${s.id}`} className="block truncate text-sm font-semibold text-[#0B2E2B] hover:text-[#0E8C7F]">
                                {s.title}
                              </Link>
                              <p className="truncate text-xs text-[#0B2E2B]/50">{venue ? `${venue.name} · ${venue.area}` : ''}</p>
                            </div>
                            <span className={cn(
                              'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                              s.creatorId === me ? 'bg-[#FF6B4A]/12 text-[#D0502F]' : 'bg-[#0E8C7F]/10 text-[#0A6E64]',
                            )}>
                              {t(s.creatorId === me ? 'dash.role.organizer' : 'dash.role.player')}
                            </span>
                            <span className={cn(
                              'text-xs font-bold',
                              cancelled ? 'text-[#D03838]' : 'text-[#15803D]',
                            )}>
                              {t(cancelled ? 'dash.history.cancelled' : 'dash.history.played')}
                            </span>
                            <button
                              onClick={() => prefillFrom(s, false)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#EADFC8] px-3.5 py-1.5 text-xs font-bold text-[#0B2E2B]/70 transition-colors hover:border-[#0E8C7F] hover:text-[#0B2E2B]"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              {t('dash.history.recreate')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.section>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ------------------------------ reminder ------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-14 flex flex-col items-start gap-3 rounded-[20px] bg-[#EADFC8]/60 p-5 sm:flex-row sm:items-center"
        >
          <Lightbulb className="h-5 w-5 shrink-0 text-[#B97A0B]" />
          <p className="flex-1 text-sm leading-relaxed text-[#0B2E2B]/75">{t('dash.reminder')}</p>
          <Link to="/" className="shrink-0 rounded-full border border-[#0B2E2B]/15 px-4 py-2 text-xs font-bold text-[#0B2E2B] transition-colors hover:bg-white">
            {t('dash.reminder.link')}
          </Link>
        </motion.div>
      </div>

      {/* cancel confirm dialog */}
      <AnimatePresence>
        {cancelAsk && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0B2E2B]/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCancelAsk(null)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F05252]/12">
                <AlertTriangle className="h-6 w-6 text-[#D03838]" />
              </div>
              <h3 className="mt-4 text-center font-display text-xl font-semibold text-[#0B2E2B]">{t('dash.cancelTitle')}</h3>
              <p className="mt-1 text-center text-sm font-semibold text-[#0E8C7F]">{cancelAsk.title}</p>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-[#0B2E2B]/55">{t('dash.cancelBody')}</p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setCancelAsk(null)}
                  className="flex-1 rounded-full border border-[#EADFC8] py-3 text-sm font-bold text-[#0B2E2B]/70 transition-colors hover:border-[#0E8C7F]"
                >
                  {t('dash.cancelKeep')}
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 rounded-full bg-[#F05252] py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(240,82,82,.35)] transition-transform hover:scale-[1.02]"
                >
                  {t('dash.cancelConfirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* local toasts (bottom-left) */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[100] flex flex-col items-start gap-2">
        <AnimatePresence>
          {localToasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout="position"
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -80, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border bg-white/95 px-4 py-3 shadow-[0_2px_8px_rgba(11,46,43,.08),0_16px_40px_rgba(11,46,43,.12)] backdrop-blur"
              role="status"
            >
              {toast.kind === 'success'
                ? <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                : <Info className="h-5 w-5 text-[#5B7CFF]" />}
              <p className="text-sm font-semibold text-[#0B2E2B]">{toast.title}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {inviteSession && (
        <InviteModal session={getSession(inviteSession.id) ?? inviteSession} open onClose={() => setInviteSession(null)} />
      )}
    </div>
  );
}
