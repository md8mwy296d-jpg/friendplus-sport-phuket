import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { Lock, MessageCirclePlus, Plus, Search } from 'lucide-react';
import { useClub, type Conversation, type PublicGroup } from '@/lib/club';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import SportIcon from '@/components/SportIcon';
import GroupFormModal from '@/components/club/GroupFormModal';
import UserPickerModal from '@/components/club/UserPickerModal';
import { ConversationAvatar, UnreadBadge } from '@/components/club/ClubUI';
import { conversationTitle, useListTime } from '@/lib/club-format';
import { SPORTS } from '@/lib/sports';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
type Tab = 'chats' | 'discover';
type Filter = 'all' | 'group' | 'direct' | 'session';

function ConversationRow({ c }: { c: Conversation }) {
  const { getUser, currentUser } = useStore();
  const { t } = useI18n();
  const listTime = useListTime();
  const other = c.otherUserId ? getUser(c.otherUserId) : undefined;
  const title = conversationTitle(c, other, t('club.unknownPlayer'));
  const sender = c.lastSenderId === currentUser.id
    ? t('club.you')
    : c.kind !== 'direct' && c.lastSenderId ? getUser(c.lastSenderId)?.name.split(' ')[0] : undefined;
  const preview = c.lastDeleted
    ? t('club.deleted')
    : c.lastBody || (c.lastHasImage ? t('club.photo') : null);

  return (
    <Link
      to={`/club/${c.id}`}
      className="flex items-center gap-3.5 rounded-[20px] px-3 py-3 transition-colors hover:bg-white"
    >
      <ConversationAvatar kind={c.kind} sport={c.sport} other={other} isPrivate={c.kind === 'group' && c.isPrivate} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn('truncate text-[15px] text-[#0B2E2B]', c.unread > 0 ? 'font-bold' : 'font-semibold')}>{title}</span>
          {c.kind === 'direct' && other && <span aria-hidden className="text-sm">{other.nationality}</span>}
          <span className="ml-auto shrink-0 text-xs text-[#0B2E2B]/45">{listTime(c.lastMessageAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cn('truncate text-[13px]', c.unread > 0 ? 'font-medium text-[#0B2E2B]/80' : 'text-[#0B2E2B]/50')}>
            {preview
              ? <>{sender && <span className="font-semibold">{sender} : </span>}{preview}</>
              : c.kind === 'direct' ? t('club.noMessages') : `${t(`club.kind.${c.kind}`)} · ${t(c.memberCount === 1 ? 'club.members.one' : 'club.members.other', { count: c.memberCount })}`}
          </span>
          <UnreadBadge count={c.unread} className="ml-auto shrink-0" />
        </span>
      </span>
    </Link>
  );
}

function GroupCard({ g, onJoin }: { g: PublicGroup; onJoin: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col rounded-[20px] border border-[#EADFC8] bg-white p-5 shadow-paper">
      <div className="flex items-center gap-3">
        <ConversationAvatar kind="group" sport={g.sport} size={44} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-[#0B2E2B]">{g.name}</p>
          <p className="text-[13px] text-[#0B2E2B]/50">
            {g.sport ? `${t(`sport.${g.sport}`)} · ` : ''}
            {t(g.memberCount === 1 ? 'club.members.one' : 'club.members.other', { count: g.memberCount })}
          </p>
        </div>
      </div>
      {g.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#0B2E2B]/65">{g.description}</p>}
      <div className="mt-auto pt-4">
        {g.isMember ? (
          <Link to={`/club/${g.id}`} className="inline-flex h-10 items-center rounded-full bg-[#0E8C7F]/10 px-5 text-sm font-bold text-[#0A6E64]">
            {t('club.joined')} →
          </Link>
        ) : (
          <button
            onClick={() => onJoin(g.id)}
            className="inline-flex h-10 items-center rounded-full bg-[#0E8C7F] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0A6E64]"
          >
            {t('club.join')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Club() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { conversations, ready, createGroup, startDirect, joinGroup, discoverGroups } = useClub();
  const tab: Tab = params.get('tab') === 'discover' ? 'discover' : 'chats';
  const [filter, setFilter] = useState<Filter>('all');
  const [groupOpen, setGroupOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [groups, setGroups] = useState<PublicGroup[] | null>(null);
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<string>('all');

  const loadGroups = useCallback(async () => { setGroups(await discoverGroups()); }, [discoverGroups]);
  useEffect(() => { if (tab === 'discover') void loadGroups(); }, [tab, loadGroups]);

  const shown = useMemo(
    () => conversations.filter((c) => filter === 'all' || c.kind === filter),
    [conversations, filter],
  );
  const shownGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (groups ?? []).filter((g) =>
      (sport === 'all' || g.sport === sport) &&
      (!q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)));
  }, [groups, query, sport]);

  const setTab = (next: Tab) => setParams(next === 'chats' ? {} : { tab: next }, { replace: true });

  const onJoin = async (id: string) => {
    if (await joinGroup(id)) navigate(`/club/${id}`);
  };

  const chip = (active: boolean) => cn(
    'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
    active ? 'bg-[#0B2E2B] text-white' : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/70 hover:border-[#0E8C7F]',
  );

  return (
    <div className="bg-[#FBF6EC]">
      <motion.section
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative overflow-hidden bg-lagoon-deep"
      >
        <div className="palm-texture absolute inset-0 bg-white/[0.05]" aria-hidden />
        <div className="grain-overlay absolute inset-0 opacity-[0.05]" aria-hidden />
        <div className="container relative flex min-h-[220px] flex-col justify-center py-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B4A]">{t('club.eyebrow')}</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.02em] text-white md:text-5xl">{t('club.title')}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-white/70">{t('club.subtitle')}</p>
        </div>
      </motion.section>

      <div className="container max-w-3xl py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-[#EADFC8] bg-white p-1">
            {(['chats', 'discover'] as Tab[]).map((id) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'h-10 rounded-full px-5 text-sm font-bold transition-colors',
                  tab === id ? 'bg-[#0E8C7F] text-white' : 'text-[#0B2E2B]/60 hover:text-[#0B2E2B]',
                )}
              >
                {t(`club.tab.${id}`)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setDmOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#0E8C7F]/40 bg-white px-4 text-sm font-bold text-[#0A6E64] hover:bg-[#0E8C7F]/5"
              aria-label={t('club.newMessage')}
            >
              <MessageCirclePlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('club.newMessage')}</span>
            </button>
            <button
              onClick={() => setGroupOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-pop px-4 text-sm font-bold text-white shadow-coral transition-transform hover:scale-[1.03]"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              {t('club.newGroup')}
            </button>
          </div>
        </div>

        {tab === 'chats' ? (
          <>
            <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
              {(['all', 'group', 'direct', 'session'] as Filter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={chip(filter === f)}>
                  {t(`club.filter.${f === 'all' ? 'all' : f === 'group' ? 'groups' : f === 'direct' ? 'direct' : 'sessions'}`)}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-[24px] border border-[#EADFC8] bg-[#FBF6EC] p-1.5">
              {!ready ? (
                <p className="py-16 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>
              ) : shown.length === 0 ? (
                <EmptyState
                  title={t('club.empty.chats.title')}
                  body={t('club.empty.chats.body')}
                  ctaLabel={t('club.tab.discover')}
                  onCta={() => setTab('discover')}
                  className="py-10"
                />
              ) : (
                shown.map((c) => <ConversationRow key={c.id} c={c} />)
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-3">
              <label className="flex h-12 items-center gap-2.5 rounded-full border border-[#EADFC8] bg-white px-4 focus-within:border-[#0E8C7F]">
                <Search className="h-4 w-4 text-[#0B2E2B]/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('club.search')}
                  className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#0B2E2B]/35"
                />
              </label>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {['all', ...SPORTS].map((s) => (
                  <button key={s} onClick={() => setSport(s)} className={chip(sport === s)}>
                    {s !== 'all' && <SportIcon sport={s as 'futsal'} className="h-4 w-4" />}
                    {s === 'all' ? t('club.filter.all') : t(`sport.${s}`)}
                  </button>
                ))}
              </div>
            </div>
            {groups === null ? (
              <p className="py-16 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>
            ) : shownGroups.length === 0 ? (
              <EmptyState title={t('club.empty.discover.title')} body={t('club.empty.discover.body')} ctaLabel={t('club.newGroup')} onCta={() => setGroupOpen(true)} />
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {shownGroups.map((g) => <GroupCard key={g.id} g={g} onJoin={(id) => void onJoin(id)} />)}
              </div>
            )}
            <p className="mt-6 flex items-center justify-center gap-1.5 text-[13px] text-[#0B2E2B]/45">
              <Lock className="h-3.5 w-3.5" /> {t('club.form.privateHint')}
            </p>
          </>
        )}
      </div>

      <GroupFormModal
        key={groupOpen ? 'open' : 'closed'}
        open={groupOpen}
        mode="create"
        onClose={() => setGroupOpen(false)}
        onSubmit={async (input) => {
          const id = await createGroup(input);
          if (id) navigate(`/club/${id}`);
          return Boolean(id);
        }}
      />
      <UserPickerModal
        key={dmOpen ? 'dm-open' : 'dm-closed'}
        open={dmOpen}
        onClose={() => setDmOpen(false)}
        title={t('club.picker.directTitle')}
        onPick={async (userId) => {
          const id = await startDirect(userId);
          if (id) navigate(`/club/${id}`);
          return Boolean(id);
        }}
      />
    </div>
  );
}
