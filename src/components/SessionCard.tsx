import { Link } from 'react-router';
import { MapPin, Clock } from 'lucide-react';
import type { Session } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from './SportIcon';
import StatusBadge from './StatusBadge';
import PlayerAvatar from './PlayerAvatar';
import Countdown from './Countdown';
import { sportPhoto } from '@/lib/sportPhotos';

interface SessionCardProps {
  session: Session;
  className?: string;
}

/** Segmented player quota bar: one segment per spot, golden-hour glow on hover. */
function QuotaBar({ current, quota }: { current: number; quota: number }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${current}/${quota}`}>
      {Array.from({ length: quota }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 flex-1 rounded-full transition-all duration-300',
            i < current
              ? 'bg-[#0E8C7F] group-hover:bg-[linear-gradient(120deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)]'
              : 'bg-[#EADFC8]',
          )}
        />
      ))}
    </div>
  );
}

/** Ticket-style session card: sport image, status badge, quota bar, avatars, price, countdown. */
export default function SessionCard({ session, className }: SessionCardProps) {
  const { getVenue, getUser } = useStore();
  const { t, formatDate, formatTHB } = useI18n();
  const venue = getVenue(session.venueId);
  const players = session.playerIds.map((id) => getUser(id)).filter(Boolean);
  const spotsLeft = Math.max(0, session.quota - session.playerIds.length);
  const isLastSpot = session.status === 'open' && spotsLeft === 1;
  const active = session.status === 'open' || session.status === 'full';
  const deadlineMs = new Date(session.confirmationDeadline).getTime() - Date.now();
  const showCountdown = active && deadlineMs > 0 && deadlineMs < 48 * 3600_000;

  return (
    <Link
      to={`/session/${session.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white text-left',
        'shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)]',
        'transition-all duration-300 ease-expo hover:-translate-y-1.5 hover:shadow-[0_4px_12px_rgba(11,46,43,.08),0_24px_56px_rgba(11,46,43,.14)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E8C7F]',
        className,
      )}
    >
      {/* image 16:10 */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={sportPhoto(session.sport, session.id)}
          alt={t(`sport.${session.sport}`)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2E2B]/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={session.status} className="bg-white/90 backdrop-blur" />
          {isLastSpot && (
            <span className="inline-flex animate-pulse items-center rounded-full bg-[#FFB547] px-3 py-1 text-xs font-bold text-[#0B2E2B] shadow-[0_4px_12px_rgba(255,181,71,.5)]">
              {t('card.lastSpot')}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#0B2E2B] backdrop-blur">
          <SportIcon sport={session.sport} className="h-3.5 w-3.5 text-[#0E8C7F]" />
          {t(`sport.${session.sport}`)}
        </div>
      </div>

      {/* perforation */}
      <div className="relative border-t-2 border-dashed border-[#EADFC8]">
        <span className="absolute -left-[11px] -top-[11px] h-5 w-5 rounded-full border border-[#EADFC8] bg-[#FBF6EC]" />
        <span className="absolute -right-[11px] -top-[11px] h-5 w-5 rounded-full border border-[#EADFC8] bg-[#FBF6EC]" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug text-[#0B2E2B]">{session.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#0B2E2B]/60">
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-mono font-bold tabular-nums text-[#0B2E2B]">
              {session.playerIds.length}/{session.quota} <span className="font-medium text-[#0B2E2B]/50">{t('common.players')}</span>
            </span>
            {active && spotsLeft > 0 && (
              <span className={cn('font-medium', isLastSpot ? 'text-[#FF6B4A]' : 'text-[#0E8C7F]')}>
                {t(spotsLeft === 1 ? 'card.spotsLeft.one' : 'card.spotsLeft.other', { count: spotsLeft })}
              </span>
            )}
          </div>
          <QuotaBar current={session.playerIds.length} quota={session.quota} />
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[#EADFC8]/70 pt-3">
          <div className="flex -space-x-2">
            {players.slice(0, 5).map((u) => u && <PlayerAvatar key={u.id} user={u} size={28} />)}
            {players.length > 5 && (
              <span className="inline-flex h-7 items-center justify-center rounded-full bg-[#FBF6EC] px-1.5 text-[11px] font-bold text-[#0B2E2B]/60 ring-2 ring-white">
                +{players.length - 5}
              </span>
            )}
          </div>
          <span className="font-mono text-sm font-bold text-[#0B2E2B]">
            {formatTHB(session.pricePerPerson)}
            <span className="text-[11px] font-medium text-[#0B2E2B]/50"> {t('common.perPerson').replace('฿', '')}</span>
          </span>
        </div>

        {showCountdown && (
          <div className="flex items-center justify-between rounded-xl bg-[#FBF6EC] px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0B2E2B]/45">{t('countdown.label')}</span>
            <Countdown target={session.confirmationDeadline} compact />
          </div>
        )}
      </div>
    </Link>
  );
}
