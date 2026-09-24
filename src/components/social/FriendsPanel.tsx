import { Link } from 'react-router';
import { Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useSocial } from '@/lib/social';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/lib/types';
import PlayerAvatar from '@/components/PlayerAvatar';
import { FriendButton, MessageButton } from './FriendButton';

function Row({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Link to={`/joueur/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PlayerAvatar user={user} size={42} ring={false} />
        <span className="truncate text-[15px] font-bold text-[#0B2E2B]">{user.name} {user.nationality}</span>
      </Link>
      <span className="flex items-center gap-2">{children}</span>
    </li>
  );
}

/** Friend requests received, friends and requests sent, on the player's own profile. */
export default function FriendsPanel() {
  const { getUser } = useStore();
  const { friendIds, incomingIds, outgoingIds } = useSocial();
  const { t } = useI18n();
  const toUsers = (ids: string[]) => ids.map((id) => getUser(id)).filter((u): u is User => Boolean(u));
  const incoming = toUsers(incomingIds);
  const friends = toUsers(friendIds);
  const outgoing = toUsers(outgoingIds);
  const heading = 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45';

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
          <ul className="divide-y divide-[#EADFC8]">
            {friends.map((u) => <Row key={u.id} user={u}><MessageButton userId={u.id} size="sm" iconOnly /></Row>)}
          </ul>
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
