import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { AtSign, Bell, MessageCircle, MessageCirclePlus, Plus, Search, UserPlus, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useClub, type Conversation } from '@/lib/club';
import { presenceLabel, useSocial } from '@/lib/social';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { conversationTitle, useListTime } from '@/lib/club-format';
import { handleOf, searchPlayers } from '@/lib/players';
import { useMentionFeed } from '@/lib/mentions';
import { ConversationAvatar } from '@/components/club/ClubUI';
import { FriendButton } from './FriendButton';
import PresenceAvatar from './PresenceAvatar';

type Panel = 'messages' | 'groups' | 'friends' | 'mentions';

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F05252] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#FBF6EC]">
      {n > 99 ? '99+' : n}
    </span>
  );
}

function ConversationItem({ c, onGo }: { c: Conversation; onGo: () => void }) {
  const { getUser, currentUser } = useStore();
  const social = useSocial();
  const { t } = useI18n();
  const listTime = useListTime();
  const other = c.otherUserId ? getUser(c.otherUserId) : undefined;
  const title = conversationTitle(c, other, t('club.unknownPlayer'));
  const mine = c.lastSenderId === currentUser.id;
  const preview = c.lastDeleted ? t('club.deleted') : c.lastBody || (c.lastHasImage ? t('club.photo') : null);
  const sub = preview
    ? `${mine ? `${t('club.you')} : ` : ''}${preview}`
    : c.kind === 'direct' && c.otherUserId && social.friendIds.includes(c.otherUserId)
      ? presenceLabel(t, social.isOnline(c.otherUserId), social.lastSeenOf(c.otherUserId))
      : t(c.memberCount === 1 ? 'club.members.one' : 'club.members.other', { count: c.memberCount });
  return (
    <Link to={`/club/${c.id}`} onClick={onGo} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#FBF6EC]">
      <ConversationAvatar kind={c.kind} sport={c.sport} other={other} otherId={c.otherUserId ?? undefined} isPrivate={c.kind === 'group' && c.isPrivate} size={48} />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[15px] text-[#0B2E2B]', c.unread > 0 ? 'font-bold' : 'font-semibold')}>{title}</span>
        <span className={cn('flex items-center gap-1.5 text-[13px]', c.unread > 0 ? 'font-semibold text-[#0E8C7F]' : 'text-[#0B2E2B]/50')}>
          <span className="truncate">{sub}</span>
          <span className="shrink-0">· {listTime(c.lastMessageAt)}</span>
        </span>
      </span>
      {c.unread > 0 && <span className="h-3 w-3 shrink-0 rounded-full bg-[#0E8C7F]" aria-label={String(c.unread)} />}
    </Link>
  );
}

function PanelShell({ title, action, footer, children }: { title: string; action?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <p className="flex-1 font-display text-xl font-bold text-[#0B2E2B]">{title}</p>
        {action}
      </div>
      <div className="max-h-[min(60vh,480px)] overflow-y-auto px-1.5 pb-1.5">{children}</div>
      {footer && <div className="border-t border-[#EADFC8] p-1.5">{footer}</div>}
    </>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-8 text-center text-sm text-[#0B2E2B]/55">{children}</p>;
}

const footerCls = 'block rounded-xl py-2.5 text-center text-sm font-bold text-[#0A6E64] transition-colors hover:bg-[#FBF6EC]';

/**
 * Facebook-style shortcuts in the header: private messages, groups and friends,
 * each with its unread count and a drop-down list.
 */
export default function HeaderHub({ dark = false }: { dark?: boolean }) {
  const club = useClub();
  const social = useSocial();
  const { getUser, users, currentUser } = useStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Panel | null>(null);
  const [search, setSearch] = useState('');
  const feed = useMentionFeed(club.enabled && social.enabled, currentUser.id);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const listTime = useListTime();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(null); }, [pathname]);
  useEffect(() => { if (open !== 'friends') setSearch(''); }, [open]);
  // opening 🔔 marks everything as seen, but keeps the new ones highlighted while it is open
  useEffect(() => {
    if (open !== 'mentions') return;
    setFreshIds(new Set(feed.items.filter((m) => !m.seen).map((m) => m.id)));
    void feed.markSeen();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!club.enabled || !social.enabled) return null;

  const directs = club.conversations.filter((c) => c.kind === 'direct');
  const groups = club.conversations.filter((c) => c.kind !== 'direct');
  const unreadDirect = directs.filter((c) => c.unread > 0).length;
  const unreadGroups = groups.filter((c) => c.unread > 0).length;
  const incoming = social.incomingIds.map((id) => getUser(id)).filter((u): u is User => Boolean(u));
  const friends = social.friendIds.map((id) => getUser(id)).filter((u): u is User => Boolean(u));
  const online = friends.filter((u) => social.isOnline(u.id));
  const close = () => setOpen(null);
  const found = searchPlayers(users.filter((u) => u.id !== currentUser.id && !club.blockedIds.includes(u.id)), search);

  const openChat = async (userId: string) => {
    close();
    const id = await club.startDirect(userId);
    if (id) navigate(`/club/${id}`);
  };

  const buttons: { id: Panel; icon: typeof MessageCircle; label: string; count: number }[] = [
    { id: 'messages', icon: MessageCircle, label: t('quick.direct'), count: unreadDirect },
    { id: 'groups', icon: Users, label: t('hub.groups'), count: unreadGroups },
    { id: 'friends', icon: UserPlus, label: t('quick.myFriends'), count: incoming.length },
    { id: 'mentions', icon: Bell, label: t('mention.title'), count: feed.unseen },
  ];

  return (
    <div ref={ref} className="relative flex items-center gap-1.5 sm:gap-2">
      {buttons.map(({ id, icon: Icon, label, count }) => (
        <button
          key={id}
          type="button"
          onClick={() => setOpen((v) => (v === id ? null : id))}
          aria-label={label}
          title={label}
          aria-expanded={open === id}
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            open === id
              ? 'bg-[#0E8C7F]/15 text-[#0A6E64]'
              : dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-[#0B2E2B]/[0.07] text-[#0B2E2B] hover:bg-[#0B2E2B]/[0.12]',
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
          <Count n={count} />
        </button>
      ))}

      <AnimatePresence>
        {open && (
          <motion.div
            key={open}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-2 top-[76px] z-50 overflow-hidden rounded-2xl border border-[#EADFC8] bg-white shadow-[0_16px_40px_rgba(11,46,43,.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]"
          >
            {open === 'messages' && (
              <PanelShell
                title={t('quick.direct')}
                action={(
                  <Link to="/club?f=direct" onClick={close} aria-label={t('club.newMessage')}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B2E2B]/[0.07] text-[#0B2E2B] hover:bg-[#0B2E2B]/[0.12]">
                    <MessageCirclePlus className="h-[18px] w-[18px]" />
                  </Link>
                )}
                footer={<Link to="/club?f=direct" onClick={close} className={footerCls}>{t('hub.seeAllMessages')}</Link>}
              >
                {online.length > 0 && (
                  <div className="-mx-1.5 flex gap-1 overflow-x-auto px-2 pb-2 pt-1">
                    {online.map((u) => (
                      <button key={u.id} type="button" onClick={() => void openChat(u.id)}
                        className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-1 hover:bg-[#FBF6EC]">
                        <PresenceAvatar userId={u.id} user={u} size={48} ring={false} />
                        <span className="w-full truncate text-center text-[11px] font-semibold text-[#0B2E2B]/70">{u.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
                {directs.length === 0
                  ? <Empty>{t('hub.noMessages')}</Empty>
                  : directs.slice(0, 20).map((c) => <ConversationItem key={c.id} c={c} onGo={close} />)}
              </PanelShell>
            )}

            {open === 'groups' && (
              <PanelShell
                title={t('hub.groups')}
                action={(
                  <Link to="/club?tab=discover" onClick={close} aria-label={t('club.tab.discover')}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B2E2B]/[0.07] text-[#0B2E2B] hover:bg-[#0B2E2B]/[0.12]">
                    <Plus className="h-[18px] w-[18px]" />
                  </Link>
                )}
                footer={<Link to="/club?f=group" onClick={close} className={footerCls}>{t('hub.seeAllGroups')}</Link>}
              >
                {groups.length === 0
                  ? <Empty>{t('hub.noGroups')}</Empty>
                  : groups.slice(0, 20).map((c) => <ConversationItem key={c.id} c={c} onGo={close} />)}
              </PanelShell>
            )}

            {open === 'mentions' && (
              <PanelShell title={t('mention.title')}>
                {feed.items.length === 0 ? (
                  <Empty>{t('mention.empty')}</Empty>
                ) : feed.items.map((m) => {
                  const author = getUser(m.authorId);
                  return (
                    <Link key={m.id} to={m.to} onClick={close}
                      className={cn('flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#FBF6EC]', freshIds.has(m.id) && 'bg-[#0E8C7F]/[0.07]')}>
                      <span className="relative shrink-0">
                        {author
                          ? <PresenceAvatar userId={author.id} user={author} size={44} ring={false} />
                          : <span className="block h-11 w-11 rounded-full bg-[#EADFC8]" />}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0E8C7F] text-white ring-2 ring-white">
                          <AtSign className="h-3 w-3" strokeWidth={3} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug text-[#0B2E2B]">
                          <b>{author?.name ?? t('club.unknownPlayer')}</b> {t(`mention.kind.${m.kind}`)}
                        </span>
                        {m.excerpt && <span className="mt-0.5 block truncate text-[13px] text-[#0B2E2B]/55">« {m.excerpt} »</span>}
                        <span className={cn('mt-0.5 block text-xs', freshIds.has(m.id) ? 'font-bold text-[#0E8C7F]' : 'text-[#0B2E2B]/45')}>{listTime(m.createdAt)}</span>
                      </span>
                    </Link>
                  );
                })}
              </PanelShell>
            )}

            {open === 'friends' && (
              <PanelShell
                title={t('quick.myFriends')}
                footer={<Link to="/profil#amis" onClick={close} className={footerCls}>{t('hub.seeAllFriends')}</Link>}
              >
                <label className="mx-1.5 mb-2 flex h-10 items-center gap-2 rounded-full bg-[#0B2E2B]/[0.06] px-3.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0E8C7F]/40">
                  <Search className="h-4 w-4 shrink-0 text-[#0B2E2B]/45" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && found[0]) { close(); navigate(`/joueur/${found[0].id}`); } }}
                    placeholder={t('handle.search')}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/40"
                  />
                </label>
                {search.trim() ? (
                  found.length === 0 ? <Empty>{t('handle.noResult')}</Empty> : found.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-[#FBF6EC]">
                      <Link to={`/joueur/${u.id}`} onClick={close} className="flex min-w-0 flex-1 items-center gap-3">
                        <PresenceAvatar userId={u.id} user={u} size={44} ring={false} />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-bold text-[#0B2E2B]">{u.name} {u.nationality}</span>
                          <span className="block truncate text-[13px] font-semibold text-[#0A6E64]">{handleOf(u)}</span>
                        </span>
                      </Link>
                      <FriendButton userId={u.id} size="sm" />
                    </div>
                  ))
                ) : (<>
                {incoming.length > 0 && (
                  <>
                    <p className="px-2.5 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D14A2B]">{t('friends.requests')} · {incoming.length}</p>
                    {incoming.map((u) => (
                      <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl px-2.5 py-2">
                        <Link to={`/joueur/${u.id}`} onClick={close} className="flex min-w-0 flex-1 items-center gap-3">
                          <PresenceAvatar userId={u.id} user={u} size={44} ring={false} />
                          <span className="truncate text-[15px] font-bold text-[#0B2E2B]">{u.name} {u.nationality}</span>
                        </Link>
                        <FriendButton userId={u.id} size="sm" />
                      </div>
                    ))}
                  </>
                )}
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
                  {t('quick.friendsOnline')} · {online.length}
                </p>
                {online.length === 0 ? (
                  <Empty>{friends.length === 0 ? t('quick.noFriends') : t('quick.noneOnline')}</Empty>
                ) : online.map((u) => (
                  <button key={u.id} type="button" onClick={() => void openChat(u.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#FBF6EC]">
                    <PresenceAvatar userId={u.id} user={u} size={44} ring={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-[#0B2E2B]">{u.name} {u.nationality}</span>
                      <span className="block text-xs font-bold text-[#16A34A]">{t('presence.online')}</span>
                    </span>
                    <MessageCircle className="h-5 w-5 text-[#0E8C7F]" />
                  </button>
                ))}
                </>)}
              </PanelShell>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
