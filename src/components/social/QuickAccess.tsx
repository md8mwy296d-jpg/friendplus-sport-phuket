import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Store, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useSocial } from '@/lib/social';
import { useClubPages } from '@/lib/posts';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/lib/types';
import { conversationTitle } from '@/lib/club-format';
import { ConversationAvatar, UnreadBadge } from '@/components/club/ClubUI';
import SportIcon from '@/components/SportIcon';
import PresenceAvatar from './PresenceAvatar';

const BUBBLE = 52;

function Bubble({ to, onClick, label, badge = 0, children }: {
  to?: string; onClick?: () => void; label: string; badge?: number; children: ReactNode;
}) {
  const body = (
    <>
      <span className="relative">
        {children}
        {badge > 0 && <UnreadBadge count={badge} className="absolute -right-1.5 -top-1 ring-2 ring-white" />}
      </span>
      <span className="w-full truncate text-center text-[11px] font-semibold text-[#0B2E2B]/75">{label}</span>
    </>
  );
  const cls = 'flex w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-2xl py-1 transition-colors hover:bg-[#FBF6EC]';
  return to
    ? <Link to={to} className={cls}>{body}</Link>
    : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

function Row({ title, count, more, children }: { title: string; count?: number; more?: { to: string; label: string }; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
          {title}{count !== undefined && ` · ${count}`}
        </p>
        {more && <Link to={more.to} className="ml-auto text-xs font-bold text-[#0A6E64]">{more.label} →</Link>}
      </div>
      <div className="-mx-1 mt-1 flex gap-1 overflow-x-auto px-1 pb-1 pt-1.5">{children}</div>
    </div>
  );
}

/**
 * Shortcuts for a signed-in player: friends online, private messages, private groups and own Pages.
 * Shown on the Club and Explore pages.
 */
export default function QuickAccess({ className = '' }: { className?: string }) {
  const { currentUser, getUser } = useStore();
  const club = useClub();
  const social = useSocial();
  const { pages } = useClubPages();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!club.enabled || !social.enabled) return null;

  const friends = social.friendIds.map((id) => getUser(id)).filter((u): u is User => Boolean(u));
  const online = friends.filter((u) => social.isOnline(u.id));
  const directs = club.conversations.filter((c) => c.kind === 'direct').slice(0, 15);
  const groups = club.conversations.filter((c) => c.kind === 'group' && c.isPrivate);
  const myPages = pages.filter((p) => p.ownerId === currentUser.id);
  const firstName = (name: string) => name.split(' ')[0];

  const openChat = async (userId: string) => {
    const id = await club.startDirect(userId);
    if (id) navigate(`/club/${id}`);
  };

  return (
    <section className={`space-y-4 rounded-[24px] border border-[#EADFC8] bg-white p-4 shadow-paper ${className}`}>
      <Row title={t('quick.friendsOnline')} count={online.length} more={{ to: '/profil#amis', label: t('quick.myFriends') }}>
        {online.length === 0 ? (
          <p className="flex items-center gap-2 px-1 py-2 text-sm text-[#0B2E2B]/55">
            <Users className="h-4 w-4 shrink-0 text-[#0E8C7F]" />
            {friends.length === 0 ? t('quick.noFriends') : t('quick.noneOnline')}
          </p>
        ) : online.map((u) => (
          <Bubble key={u.id} label={firstName(u.name)} onClick={() => void openChat(u.id)}>
            <PresenceAvatar userId={u.id} user={u} size={BUBBLE} ring={false} />
          </Bubble>
        ))}
      </Row>

      {directs.length > 0 && (
        <Row title={t('quick.direct')} more={{ to: '/club?f=direct', label: t('quick.seeAll') }}>
          {directs.map((c) => {
            const other = c.otherUserId ? getUser(c.otherUserId) : undefined;
            return (
              <Bubble key={c.id} to={`/club/${c.id}`} badge={c.unread}
                label={firstName(conversationTitle(c, other, t('club.unknownPlayer')))}>
                <ConversationAvatar kind="direct" sport={null} other={other} otherId={c.otherUserId ?? undefined} size={BUBBLE} />
              </Bubble>
            );
          })}
        </Row>
      )}

      {groups.length > 0 && (
        <Row title={t('quick.groups')} count={groups.length}>
          {groups.map((c) => (
            <Bubble key={c.id} to={`/club/${c.id}`} badge={c.unread} label={c.name}>
              <ConversationAvatar kind="group" sport={c.sport} isPrivate size={BUBBLE} />
            </Bubble>
          ))}
        </Row>
      )}

      {myPages.length > 0 && (
        <Row title={t('quick.pages')}>
          {myPages.map((p) => (
            <Bubble key={p.id} to={`/club?tab=pages&page=${p.id}`} label={p.name}>
              <span className="flex items-center justify-center rounded-full bg-[#0B2E2B] text-[#2FBFA5]" style={{ width: BUBBLE, height: BUBBLE }}>
                {p.sport ? <SportIcon sport={p.sport} className="h-6 w-6" /> : <Store className="h-6 w-6" />}
              </span>
            </Bubble>
          ))}
        </Row>
      )}
    </section>
  );
}
