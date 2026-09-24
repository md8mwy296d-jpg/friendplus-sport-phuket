import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Search, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { presenceLabel, useSocial } from '@/lib/social';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { FriendButton, MessageButton } from './FriendButton';
import PresenceAvatar from './PresenceAvatar';
import CertifiedBadge from '@/components/CertifiedBadge';
import RankInsignia from '@/components/rank/RankInsignia';
import { rankFor } from '@/lib/rank';
import { handleOf } from '@/lib/players';

function Row({ user, status, online, children }: { user: User; status?: string; online?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Link to={`/joueur/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PresenceAvatar userId={user.id} user={user} size={42} ring={false} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold text-[#0B2E2B]">{user.name}</span>
            <CertifiedBadge certified={user.certified} owner={user.isOwner} />
            <span aria-hidden>{user.nationality}</span>
            <RankInsignia rank={rankFor(user.score)} size={20} />
          </span>
          {user.username && <span className="block truncate text-xs font-semibold text-[#0A6E64]">{handleOf(user)}</span>}
          {status && (
            <span className={cn('block text-xs', online ? 'font-bold text-[#16A34A]' : 'text-[#0B2E2B]/45')}>{status}</span>
          )}
        </span>
      </Link>
      <span className="flex items-center gap-2">{children}</span>
    </li>
  );
}

/** Friend requests received, friends (searchable, online first) and requests sent, on the player's own profile. */
export default function FriendsPanel() {
  const { getUser } = useStore();
  const { friendIds, incomingIds, outgoingIds, isOnline, lastSeenOf } = useSocial();
  const { t } = useI18n();
  const { hash } = useLocation();
  const [query, setQuery] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const toUsers = (ids: string[]) => ids.map((id) => getUser(id)).filter((u): u is User => Boolean(u));
  const incoming = toUsers(incomingIds);
  const friends = toUsers(friendIds);
  const outgoing = toUsers(outgoingIds);
  const heading = 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45';
  const onlineCount = friends.filter((u) => isOnline(u.id)).length;

  // arriving from "Mes amis" (/profil#amis)
  useEffect(() => {
    if (hash !== '#amis') return;
    const id = window.setTimeout(() => document.getElementById('amis')?.scrollIntoView({ behavior: 'smooth' }), 350);
    return () => window.clearTimeout(id);
  }, [hash]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@+/, '');
    const seen = (u: User) => (isOnline(u.id) ? Infinity : new Date(lastSeenOf(u.id) ?? 0).getTime());
    return friends
      .filter((u) => (!onlyOnline || isOnline(u.id)) && (!q || u.name.toLowerCase().includes(q) || u.username.includes(q)))
      .sort((a, b) => seen(b) - seen(a) || a.name.localeCompare(b.name));
  }, [friends, query, onlyOnline, isOnline, lastSeenOf]);

  const chip = (active: boolean) => cn(
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
    active ? 'bg-[#0B2E2B] text-white' : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/70 hover:border-[#0E8C7F]',
  );

  return (
    <div className="space-y-5">
      {incoming.length > 0 && (
        <div className="rounded-2xl border border-[#FF6B4A]/30 bg-[#FF6B4A]/5 px-4 py-2">
          <p className={`${heading} pt-2 text-[#D14A2B]`}>{t('friends.requests')} · {incoming.length}</p>
          <ul className="divide-y divide-[#EADFC8]">
            {incoming.map((u) => <Row key={u.id} user={u}><FriendButton userId={u.id} size="sm" /></Row>)}
          </ul>
        </div>
      )}
      <div>
        <p className={heading}>{t('friends.title')} · {friends.length}</p>
        {friends.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-[#0B2E2B]/55">
            <Users className="h-4 w-4 text-[#0E8C7F]" /> {t('friends.empty')}
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex h-10 min-w-0 flex-1 basis-48 items-center gap-2 rounded-full border border-[#EADFC8] bg-white px-3.5 focus-within:border-[#0E8C7F]">
                <Search className="h-4 w-4 shrink-0 text-[#0B2E2B]/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('friends.search')}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#0B2E2B]/35"
                />
              </label>
              <button type="button" onClick={() => setOnlyOnline(false)} className={chip(!onlyOnline)}>{t('friends.filterAll')}</button>
              <button type="button" onClick={() => setOnlyOnline(true)} className={chip(onlyOnline)}>
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> {t('friends.filterOnline')} · {onlineCount}
              </button>
            </div>
            {shown.length === 0 ? (
              <p className="mt-4 text-sm text-[#0B2E2B]/55">{onlyOnline && !query ? t('quick.noneOnline') : t('friends.noMatch')}</p>
            ) : (
              <ul className="divide-y divide-[#EADFC8]">
                {shown.map((u) => (
                  <Row key={u.id} user={u} online={isOnline(u.id)} status={presenceLabel(t, isOnline(u.id), lastSeenOf(u.id))}>
                    <MessageButton userId={u.id} size="sm" iconOnly />
                  </Row>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {outgoing.length > 0 && (
        <div>
          <p className={heading}>{t('friends.sent')} · {outgoing.length}</p>
          <ul className="divide-y divide-[#EADFC8]">
            {outgoing.map((u) => <Row key={u.id} user={u}><FriendButton userId={u.id} size="sm" /></Row>)}
          </ul>
        </div>
      )}
    </div>
  );
}
