import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Check, Clock, Loader2, MessageCircle, UserCheck, UserPlus, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useSocial } from '@/lib/social';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const BASE = 'inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition-colors disabled:opacity-60';
const SIZE = { sm: 'h-9 px-3.5 text-xs', md: 'h-11 px-5 text-sm' } as const;

interface Props {
  userId: string;
  size?: keyof typeof SIZE;
  className?: string;
}

/** Add / pending / accept / friends button for another player. */
export function FriendButton({ userId, size = 'md', className }: Props) {
  const { currentUser, isAuthenticated } = useStore();
  const { statusWith, sendRequest, respond, removeFriend } = useSocial();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  if (!userId || userId === currentUser.id) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };
  const cls = (tone: 'primary' | 'outline' | 'soft') => cn(
    BASE, SIZE[size],
    tone === 'primary' && 'bg-[#0E8C7F] text-white hover:bg-[#0A6E64]',
    tone === 'outline' && 'border border-[#EADFC8] bg-white text-[#0B2E2B] hover:bg-[#FBF6EC]',
    tone === 'soft' && 'bg-[#22C55E]/12 text-[#15803D] hover:bg-[#22C55E]/20',
    className,
  );

  if (!isAuthenticated) {
    return (
      <Link to={`/connexion?next=${encodeURIComponent(pathname)}`} className={cls('primary')}>
        <UserPlus className="h-4 w-4" /> {t('friends.add')}
      </Link>
    );
  }

  const status = statusWith(userId);
  if (status === 'incoming') {
    return (
      <span className={cn('inline-flex gap-2', className)}>
        <button disabled={busy} onClick={() => void run(() => respond(userId, true))} className={cls('primary')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t('friends.accept')}
        </button>
        <button disabled={busy} onClick={() => void run(() => respond(userId, false))} className={cls('outline')} aria-label={t('friends.decline')}>
          <X className="h-4 w-4" />
        </button>
      </span>
    );
  }
  if (status === 'friends') {
    return (
      <button
        disabled={busy}
        title={t('friends.remove')}
        onClick={() => { if (window.confirm(`${t('friends.remove')} ?`)) void run(() => removeFriend(userId)); }}
        className={cls('soft')}
      >
        <UserCheck className="h-4 w-4" /> {t('friends.isFriend')}
      </button>
    );
  }
  if (status === 'outgoing') {
    return (
      <button
        disabled={busy}
        title={t('friends.cancel')}
        onClick={() => { if (window.confirm(`${t('friends.cancel')} ?`)) void run(() => removeFriend(userId)); }}
        className={cls('outline')}
      >
        <Clock className="h-4 w-4" /> {t('friends.pending')}
      </button>
    );
  }
  return (
    <button disabled={busy} onClick={() => void run(() => sendRequest(userId))} className={cls('primary')}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {t('friends.add')}
    </button>
  );
}

/** Opens (or creates) the private conversation with a player. */
export function MessageButton({ userId, size = 'md', className, iconOnly = false }: Props & { iconOnly?: boolean }) {
  const { currentUser, isAuthenticated } = useStore();
  const club = useClub();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  if (!userId || userId === currentUser.id) return null;

  const open = async () => {
    if (!isAuthenticated) { navigate(`/connexion?next=${encodeURIComponent(pathname)}`); return; }
    setBusy(true);
    const conv = await club.startDirect(userId);
    setBusy(false);
    if (conv) navigate(`/club/${conv}`);
  };
  return (
    <button
      onClick={() => void open()}
      disabled={busy}
      aria-label={t('player.message')}
      className={cn(BASE, iconOnly ? (size === 'sm' ? 'h-9 w-9' : 'h-11 w-11') : SIZE[size], 'bg-[#0B2E2B] text-white hover:bg-[#1E5945]', className)}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {!iconOnly && t('player.message')}
    </button>
  );
}
