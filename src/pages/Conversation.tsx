import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, CalendarDays, Crown, Flag, ImagePlus, LogOut, MessageCircle, MoreVertical, Pencil, SendHorizontal,
  ShieldOff, Trash2, UserMinus, UserPlus, Users, X,
  UserRound,
} from 'lucide-react';
import { useClub, useConversation, signedImageUrls, type Message } from '@/lib/club';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import PlayerAvatar from '@/components/PlayerAvatar';
import GroupFormModal from '@/components/club/GroupFormModal';
import UserPickerModal from '@/components/club/UserPickerModal';
import { ConfirmModal, ConversationAvatar, Modal } from '@/components/club/ClubUI';
import { conversationTitle, isSameDay } from '@/lib/club-format';

type Confirm = { title: string; body?: string; label?: string; danger?: boolean; run: () => void } | null;

function useDayLabel() {
  const { t, formatDate } = useI18n();
  return (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (isSameDay(d, now)) return t('club.chat.today');
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (isSameDay(d, y)) return t('club.chat.yesterday');
    return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  };
}

function MenuItem({ icon: Icon, label, onClick, danger = false }: {
  icon: typeof Users; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#FBF6EC]',
        danger ? 'text-[#D03838]' : 'text-[#0B2E2B]',
      )}
    >
      <Icon className={cn('h-4 w-4', danger ? 'text-[#F05252]' : 'text-[#0E8C7F]')} /> {label}
    </button>
  );
}

/** Remount per conversation so scroll position, drafts and modals start fresh. */
export default function Conversation() {
  const { id } = useParams();
  return <ConversationView key={id} id={id} />;
}

function ConversationView({ id }: { id: string | undefined }) {
  const navigate = useNavigate();
  const { t, formatDate } = useI18n();
  const { currentUser, getUser } = useStore();
  const club = useClub();
  const { info, members, messages, loading, notFound, hasMore, loadOlder, reload, reloadMembers } = useConversation(id);
  const dayLabel = useDayLabel();

  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [msgMenu, setMsgMenu] = useState<Message | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ messageId?: string; userId?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [confirm, setConfirm] = useState<Confirm>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const prevCount = useRef(0);

  const myId = currentUser.id;
  const me = members.find((m) => m.userId === myId);
  const isMember = Boolean(me);
  const isAdmin = me?.role === 'admin' || club.isAppAdmin;
  const otherId = info?.kind === 'direct' ? members.find((m) => m.userId !== myId)?.userId : undefined;
  const other = otherId ? getUser(otherId) : undefined;
  const blockedOther = Boolean(otherId && club.blockedIds.includes(otherId));
  const canAddMembers = info?.kind === 'group' && isMember && (!info.isPrivate || me?.role === 'admin');
  const title = info ? conversationTitle(info, other, t('club.unknownPlayer')) : '';

  // hide messages from players I blocked (groups and session chats)
  const visible = useMemo(
    () => messages.filter((m) => !m.senderId || m.senderId === myId || !club.blockedIds.includes(m.senderId)),
    [messages, club.blockedIds, myId],
  );

  // signed URLs for private photos
  useEffect(() => {
    const paths = visible.map((m) => m.imagePath).filter((p): p is string => Boolean(p) && !imageUrls[p as string]);
    if (paths.length === 0) return;
    let alive = true;
    void signedImageUrls(paths).then((urls) => { if (alive) setImageUrls((prev) => ({ ...prev, ...urls })); });
    return () => { alive = false; };
  }, [visible, imageUrls]);

  // mark as read when opening and whenever a message arrives while the page is visible
  const { markRead } = club;
  useEffect(() => {
    if (id && isMember && document.visibilityState === 'visible') markRead(id);
  }, [id, isMember, visible.length, markRead]);

  // keep the view pinned to the latest message (unless the user scrolled up to read)
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const grew = visible.length > prevCount.current;
    const mineLast = visible[visible.length - 1]?.senderId === myId;
    if (prevCount.current === 0 || (grew && (stickToBottom.current || mineLast))) {
      el.scrollTop = el.scrollHeight;
    }
    prevCount.current = visible.length;
  }, [visible, myId]);

  useEffect(() => {
    if (!photo) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // photos load after the first scroll: stay pinned to the bottom when their height arrives
  const keepPinned = () => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  };

  const onScroll = () => {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const send = async () => {
    if (!id || sending || (!draft.trim() && !photo)) return;
    setSending(true);
    const ok = await club.sendMessage(id, draft, photo);
    setSending(false);
    if (ok) {
      setDraft('');
      setPhoto(null);
      stickToBottom.current = true;
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  // auto-grow the composer up to ~5 lines
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  if (loading && !info) {
    return <p className="py-24 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>;
  }
  if (notFound || !info || !id) {
    return (
      <div className="container">
        <EmptyState title={t('club.chat.notFoundTitle')} body={t('club.chat.notFoundBody')} ctaLabel={t('club.chat.back')} ctaTo="/club" />
      </div>
    );
  }

  const subtitle = info.kind === 'direct'
    ? other ? `${other.nationality} · ${t(`common.level.${other.level}`)}` : ''
    : info.kind === 'session'
      ? `${t('club.sessionChatHint')} · ${t(members.length === 1 ? 'club.members.one' : 'club.members.other', { count: members.length })}`
      : `${t(info.isPrivate ? 'club.private' : 'club.public')} · ${t(members.length === 1 ? 'club.members.one' : 'club.members.other', { count: members.length })}`;

  const menuActions = [
    info.kind === 'direct' && otherId && { icon: UserRound, label: t('afterMatch.profile'), run: () => navigate(`/joueur/${otherId}`) },
    info.kind !== 'direct' && { icon: Users, label: t('club.menu.members'), run: () => setMembersOpen(true) },
    info.kind === 'session' && info.sessionId && { icon: CalendarDays, label: t('club.menu.viewSession'), run: () => navigate(`/session/${info.sessionId}`) },
    info.kind === 'group' && isAdmin && { icon: Pencil, label: t('club.menu.edit'), run: () => setEditOpen(true) },
    info.kind === 'direct' && otherId && (blockedOther
      ? { icon: ShieldOff, label: t('club.menu.unblock'), run: () => void club.unblockUser(otherId) }
      : {
          icon: ShieldOff, label: t('club.menu.block'), danger: true, run: () => setConfirm({
            title: t('club.blockConfirm', { name: other?.name ?? '' }), body: t('club.blockBody'), danger: true,
            label: t('club.menu.block'), run: () => void club.blockUser(otherId),
          }),
        }),
    info.kind === 'direct' && otherId && { icon: Flag, label: t('club.menu.report'), danger: true, run: () => setReportTarget({ userId: otherId }) },
    info.kind === 'group' && isMember && {
      icon: LogOut, label: t('club.menu.leave'), danger: true, run: () => setConfirm({
        title: t('club.leaveConfirm', { name: info.name }), body: t('club.leaveBody'), danger: true,
        label: t('club.menu.leave'), run: async () => { if (await club.leaveGroup(id)) navigate('/club'); },
      }),
    },
  ].filter(Boolean) as { icon: typeof Users; label: string; run: () => void; danger?: boolean }[];

  return (
    <div className="flex h-[calc(100dvh-72px)] flex-col bg-[#FBF6EC] lg:h-[calc(100dvh-72px)]">
      {/* header */}
      <div className="border-b border-[#EADFC8] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-3 sm:px-6">
          <Link to="/club" className="rounded-full p-2 text-[#0B2E2B]/70 hover:bg-[#FBF6EC]" aria-label={t('club.chat.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => info.kind !== 'direct' && setMembersOpen(true)}
          >
            <ConversationAvatar kind={info.kind} sport={info.sport} other={other} isPrivate={info.kind === 'group' && info.isPrivate} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-display text-[17px] font-semibold text-[#0B2E2B]">{title}</span>
              <span className="block truncate text-xs text-[#0B2E2B]/50">{subtitle}</span>
            </span>
          </button>
          {menuActions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full p-2 text-[#0B2E2B]/70 hover:bg-[#FBF6EC]"
                aria-label={t('club.menu.more')}
                aria-expanded={menuOpen}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[#EADFC8] bg-white p-1.5 shadow-[0_16px_40px_rgba(11,46,43,.14)]"
                    >
                      {menuActions.map((a) => (
                        <MenuItem key={a.label} icon={a.icon} label={a.label} danger={a.danger} onClick={() => { setMenuOpen(false); a.run(); }} />
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* messages */}
      <div ref={listRef} onScroll={onScroll} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex max-w-3xl flex-col px-3 py-4 sm:px-6">
          {!isMember ? (
            <div className="mx-auto mt-10 max-w-md rounded-[24px] border border-[#EADFC8] bg-white p-6 text-center shadow-paper">
              <ConversationAvatar kind="group" sport={info.sport} size={64} />
              <h2 className="mt-4 font-display text-2xl font-semibold text-[#0B2E2B]">{info.name}</h2>
              {info.description && <p className="mt-2 text-[15px] leading-relaxed text-[#0B2E2B]/65">{info.description}</p>}
              <p className="mt-3 text-sm text-[#0B2E2B]/50">{t('club.chat.joinToWrite')}</p>
              <button
                onClick={async () => { if (await club.joinGroup(id)) void reload(); }}
                className="mt-5 inline-flex h-12 items-center rounded-full bg-[#0E8C7F] px-7 text-sm font-bold text-white hover:bg-[#0A6E64]"
              >
                {t('club.join')}
              </button>
            </div>
          ) : (
            <>
              {hasMore && (
                <button onClick={() => void loadOlder()} className="mx-auto mb-4 rounded-full border border-[#EADFC8] bg-white px-4 py-2 text-[13px] font-semibold text-[#0B2E2B]/60 hover:text-[#0B2E2B]">
                  {t('club.chat.loadOlder')}
                </button>
              )}
              {visible.length === 0 && (
                <p className="py-16 text-center text-sm text-[#0B2E2B]/50">{t('club.noMessages')}</p>
              )}
              {visible.map((m, i) => {
                const prev = visible[i - 1];
                const next = visible[i + 1];
                const mine = m.senderId === myId;
                const newDay = !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));
                const firstOfRun = newDay || prev?.senderId !== m.senderId;
                const lastOfRun = !next || next.senderId !== m.senderId || !isSameDay(new Date(next.createdAt), new Date(m.createdAt));
                const sender = m.senderId ? getUser(m.senderId) : undefined;
                const showSender = !mine && info.kind !== 'direct';
                const url = m.imagePath ? imageUrls[m.imagePath] : undefined;
                return (
                  <div key={m.id}>
                    {newDay && (
                      <p className="my-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/40">{dayLabel(m.createdAt)}</p>
                    )}
                    <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start', lastOfRun ? 'mb-3' : 'mb-0.5')}>
                      {showSender && (
                        <span className="w-8 shrink-0">
                          {lastOfRun && sender && <PlayerAvatar user={sender} size={32} ring={false} />}
                        </span>
                      )}
                      <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
                        {showSender && firstOfRun && (
                          <span className="mb-1 ml-3 text-xs font-semibold text-[#0A6E64]">
                            {sender ? `${sender.name.split(' ')[0]} ${sender.nationality}` : t('club.unknownPlayer')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => !m.deletedAt && setMsgMenu(m)}
                          className={cn(
                            'overflow-hidden text-left text-[15px] leading-snug shadow-[0_1px_2px_rgba(11,46,43,.08)]',
                            m.deletedAt
                              ? 'rounded-2xl border border-dashed border-[#EADFC8] bg-transparent px-3.5 py-2 italic text-[#0B2E2B]/45 shadow-none'
                              : mine
                                ? 'rounded-[20px] rounded-br-md bg-[#0E8C7F] text-white'
                                : 'rounded-[20px] rounded-bl-md bg-white text-[#0B2E2B]',
                          )}
                        >
                          {m.deletedAt ? t('club.deleted') : (
                            <>
                              {m.imagePath && (
                                url ? (
                                  <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    onLoad={keepPinned}
                                    onClick={(e) => { e.stopPropagation(); setLightbox(url); }}
                                    className="block max-h-80 w-full max-w-[280px] cursor-zoom-in object-cover"
                                  />
                                ) : (
                                  <span className="block h-48 w-[240px] animate-pulse bg-[#0B2E2B]/10" />
                                )
                              )}
                              {m.body && <span className="block whitespace-pre-wrap break-words px-3.5 py-2">{m.body}</span>}
                            </>
                          )}
                        </button>
                        {lastOfRun && (
                          <span className={cn('mt-1 text-[11px] text-[#0B2E2B]/40', mine ? 'mr-2' : 'ml-3')}>
                            {formatDate(m.createdAt, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* composer */}
      {isMember && (
        <div className="border-t border-[#EADFC8] bg-white pb-[env(safe-area-inset-bottom)]">
          {blockedOther ? (
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 text-sm text-[#0B2E2B]/60">
              {t('club.chat.blockedBanner')}
              <button onClick={() => otherId && void club.unblockUser(otherId)} className="font-bold text-[#0A6E64] hover:underline">
                {t('club.menu.unblock')}
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-3 py-3 sm:px-6">
              {photoPreview && (
                <div className="relative mb-3 inline-block">
                  <img src={photoPreview} alt="" className="h-24 rounded-2xl object-cover" />
                  <button
                    onClick={() => setPhoto(null)}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#0B2E2B] text-white shadow"
                    aria-label={t('club.chat.removePhoto')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => { setPhoto(e.target.files?.[0] ?? null); e.target.value = ''; }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0E8C7F] hover:bg-[#0E8C7F]/10"
                  aria-label={t('club.chat.attach')}
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  maxLength={2000}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t('club.chat.placeholder')}
                  className="max-h-[132px] min-h-11 flex-1 resize-none rounded-[22px] border border-[#EADFC8] bg-[#FBF6EC]/70 px-4 py-2.5 text-[15px] leading-snug text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35 focus:border-[#0E8C7F] focus:bg-white"
                />
                <button
                  onClick={() => void send()}
                  disabled={sending || (!draft.trim() && !photo)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-golden-hour text-white shadow-coral transition-transform hover:scale-105 disabled:opacity-40 disabled:shadow-none"
                  aria-label={t('club.chat.send')}
                >
                  <SendHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* message actions */}
      <Modal open={Boolean(msgMenu)} onClose={() => setMsgMenu(null)} title={msgMenu?.body ? msgMenu.body.slice(0, 60) : t('club.photo')}>
        {msgMenu && (
          <div className="flex flex-col gap-1">
            {msgMenu.senderId && msgMenu.senderId !== myId && info.kind !== 'direct' && (
              <MenuItem icon={MessageCircle} label={t('club.members.message')} onClick={async () => {
                const sid = msgMenu.senderId!;
                setMsgMenu(null);
                const conv = await club.startDirect(sid);
                if (conv) navigate(`/club/${conv}`);
              }} />
            )}
            {(msgMenu.senderId === myId || isAdmin) && (
              <MenuItem icon={Trash2} label={t('club.msg.delete')} danger onClick={() => {
                const target = msgMenu;
                setMsgMenu(null);
                setConfirm({
                  title: t('club.msg.deleteConfirm'), body: t('club.msg.deleteBody'), danger: true, label: t('club.msg.delete'),
                  run: () => void club.deleteMessage(target.id),
                });
              }} />
            )}
            {msgMenu.senderId !== myId && (
              <MenuItem icon={Flag} label={t('club.msg.report')} danger onClick={() => {
                setReportTarget({ messageId: msgMenu.id });
                setMsgMenu(null);
              }} />
            )}
          </div>
        )}
      </Modal>

      {/* members */}
      <Modal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={t('club.members.title')}
        subtitle={t(members.length === 1 ? 'club.members.one' : 'club.members.other', { count: members.length })}
        footer={canAddMembers ? (
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#0E8C7F]/40 text-sm font-bold text-[#0A6E64] hover:bg-[#0E8C7F]/5"
          >
            <UserPlus className="h-4 w-4" /> {t('club.members.add')}
          </button>
        ) : undefined}
      >
        <ul className="flex flex-col gap-1">
          {members.map((m) => {
            const u = getUser(m.userId);
            const self = m.userId === myId;
            return (
              <li key={m.userId} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                {u ? <PlayerAvatar user={u} size={40} ring={false} /> : <span className="h-10 w-10 rounded-full bg-[#EADFC8]" />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-[#0B2E2B]">
                      {self ? t('club.you') : u?.name ?? t('club.unknownPlayer')} {u?.nationality}
                    </span>
                    {m.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFB547]/20 px-2 py-0.5 text-[10px] font-bold text-[#B97A0B]">
                        <Crown className="h-3 w-3" /> {t('club.members.admin')}
                      </span>
                    )}
                  </span>
                  {u && <span className="block truncate text-xs text-[#0B2E2B]/50">{t(`common.level.${u.level}`)}</span>}
                </span>
                {!self && (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={async () => { const conv = await club.startDirect(m.userId); if (conv) { setMembersOpen(false); navigate(`/club/${conv}`); } }}
                      className="rounded-full p-2 text-[#0E8C7F] hover:bg-[#0E8C7F]/10"
                      aria-label={t('club.members.message')}
                      title={t('club.members.message')}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    {info.kind === 'group' && isAdmin && (
                      <>
                        <button
                          onClick={async () => { if (await club.setRole(id, m.userId, m.role === 'admin' ? 'member' : 'admin')) void reloadMembers(); }}
                          className="rounded-full p-2 text-[#B97A0B] hover:bg-[#FFB547]/15"
                          aria-label={t(m.role === 'admin' ? 'club.members.removeAdmin' : 'club.members.makeAdmin')}
                          title={t(m.role === 'admin' ? 'club.members.removeAdmin' : 'club.members.makeAdmin')}
                        >
                          <Crown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirm({
                            title: t('club.members.removeConfirm', { name: u?.name ?? '' }),
                            body: t('club.members.removeBody', { name: u?.name ?? '' }),
                            danger: true, label: t('club.members.remove'),
                            run: async () => { if (await club.removeMember(id, m.userId)) void reloadMembers(); },
                          })}
                          className="rounded-full p-2 text-[#D03838] hover:bg-[#F05252]/10"
                          aria-label={t('club.members.remove')}
                          title={t('club.members.remove')}
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Modal>

      <UserPickerModal
        key={addOpen ? 'add-open' : 'add-closed'}
        open={addOpen}
        onClose={() => { setAddOpen(false); void reloadMembers(); }}
        title={t('club.picker.addTitle')}
        exclude={members.map((m) => m.userId)}
        multi
        onPick={(userId) => club.addMember(id, userId)}
      />

      {info.kind === 'group' && (
        <GroupFormModal
          key={editOpen ? 'edit-open' : 'edit-closed'}
          open={editOpen}
          mode="edit"
          initial={{ name: info.name, description: info.description, sport: info.sport, isPrivate: info.isPrivate }}
          onClose={() => setEditOpen(false)}
          onSubmit={async (input) => { const ok = await club.updateGroup(id, input); if (ok) void reload(); return ok; }}
        />
      )}

      <Modal
        open={Boolean(reportTarget)}
        onClose={() => { setReportTarget(null); setReportReason(''); }}
        title={t('club.report.title')}
        subtitle={t('club.report.body')}
        footer={
          <button
            onClick={async () => {
              if (!reportTarget) return;
              const ok = await club.report(reportTarget, reportReason);
              if (ok) { setReportTarget(null); setReportReason(''); }
            }}
            className="h-12 w-full rounded-full bg-[#E03E3E] text-sm font-bold text-white hover:bg-[#C53030]"
          >
            {t('club.report.send')}
          </button>
        }
      >
        <textarea
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder={t('club.report.reasonPh')}
          className="w-full resize-none rounded-2xl border border-[#EADFC8] bg-[#FBF6EC]/60 px-4 py-3 text-[15px] outline-none focus:border-[#0E8C7F] focus:bg-white"
        />
      </Modal>

      <ConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.run()}
        title={confirm?.title ?? ''}
        body={confirm?.body}
        confirmLabel={confirm?.label}
        danger={confirm?.danger}
      />

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
            <button className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white" aria-label={t('common.close')}>
              <X className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
