import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { MapPin, Pencil, Plus, Store, Trash2 } from 'lucide-react';
import { useClubPages, usePosts, type ClubPage, type PageInput } from '@/lib/posts';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import CertifiedBadge from '@/components/CertifiedBadge';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import PageFormModal from './PageFormModal';

type Selected = 'all' | 'official' | string;

/** Club "Pages" tab: FRIEND+ news and the Pages of partner venues. Players like, comment and forward. */
export default function PagesFeed({ initialPage }: { initialPage?: string | null }) {
  const { currentUser, getUser, getVenue } = useStore();
  const { isAppAdmin } = useClub();
  const { t } = useI18n();
  const { pages, save, remove } = useClubPages();
  const [selected, setSelected] = useState<Selected>(initialPage || 'all');
  const [form, setForm] = useState<{ open: boolean; page?: ClubPage }>({ open: false });

  const page = pages.find((p) => p.id === selected);
  const scope = useMemo(
    () => ({ kind: 'feed' as const, pageId: page?.id ?? null, official: selected === 'official' }),
    [page?.id, selected],
  );
  const feed = usePosts(scope);
  const byId = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const myPages = pages.filter((p) => p.ownerId === currentUser.id);
  const canCreatePage = (isAppAdmin || currentUser.certified) && myPages.length < 3;
  const ownsSelected = Boolean(page && (page.ownerId === currentUser.id || isAppAdmin));

  const onSave = async (input: PageInput) => {
    const id = await save(form.page?.id ?? null, input);
    if (id) setSelected(id);
    return Boolean(id);
  };

  const chip = (active: boolean) => cn(
    'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
    active ? 'bg-[#0B2E2B] text-white' : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/70 hover:border-[#0E8C7F]',
  );
  const ordered = [...myPages, ...pages.filter((p) => p.ownerId !== currentUser.id)];
  const owner = page ? getUser(page.ownerId) : undefined;
  const venue = page?.venueId ? getVenue(page.venueId) : undefined;

  return (
    <div className="mt-6 space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setSelected('all')} className={chip(selected === 'all')}>{t('club.filter.all')}</button>
        <button onClick={() => setSelected('official')} className={chip(selected === 'official')}>
          <img src="/logo.svg" alt="" className="h-4 w-4" /> FRIEND+
        </button>
        {ordered.map((p) => (
          <button key={p.id} onClick={() => setSelected(p.id)} className={chip(selected === p.id)}>
            {p.sport ? <SportIcon sport={p.sport} className="h-4 w-4" /> : <Store className="h-4 w-4" />} {p.name}
          </button>
        ))}
        {canCreatePage && (
          <button onClick={() => setForm({ open: true })} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-coral-pop px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" strokeWidth={3} /> {t('pages.create')}
          </button>
        )}
      </div>

      {page && (
        <div className="rounded-[20px] bg-lagoon-deep p-5 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
              {page.sport ? <SportIcon sport={page.sport} className="h-6 w-6 text-[#2FBFA5]" /> : <Store className="h-6 w-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-bold">{page.name}</p>
              {owner && (
                <Link to={`/joueur/${owner.id}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white">
                  {t('pages.by')} {owner.name} <CertifiedBadge certified={owner.certified} owner={owner.isOwner} />
                </Link>
              )}
              {venue && <p className="mt-1 flex items-center gap-1 text-xs text-white/70"><MapPin className="h-3.5 w-3.5" /> {venue.name}, {venue.area}</p>}
            </div>
            {ownsSelected && (
              <span className="flex shrink-0 gap-1">
                <button onClick={() => setForm({ open: true, page })} className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label={t('pages.edit')}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { if (window.confirm(t('pages.deleteConfirm'))) void remove(page.id).then((ok) => ok && setSelected('all')); }}
                  className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label={t('pages.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            )}
          </div>
          {page.description && <p className="mt-3 whitespace-pre-line text-sm text-white/80">{page.description}</p>}
        </div>
      )}

      {page && ownsSelected ? (
        <PostComposer target={{ pageId: page.id }} heading={t('pages.publishOn', { name: page.name })} onPublish={feed.publish} />
      ) : !page && isAppAdmin ? (
        <PostComposer target={{}} heading={t('pages.publishOfficial')} onPublish={feed.publish} />
      ) : !page && myPages.length > 0 ? (
        <p className="text-[13px] text-[#0B2E2B]/55">{t('pages.pickYourPage')}</p>
      ) : (
        <p className="text-[13px] text-[#0B2E2B]/50">{t('pages.playersHint')}</p>
      )}

      {feed.loading ? (
        <p className="py-16 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>
      ) : feed.posts.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-[#EADFC8] px-6 py-12 text-center text-sm text-[#0B2E2B]/50">{t('posts.empty')}</p>
      ) : (
        feed.posts.map((p) => {
          const pg = p.pageId ? byId.get(p.pageId) : undefined;
          return (
            <PostCard
              key={p.id}
              post={p}
              page={pg}
              canModerate={isAppAdmin || Boolean(pg && pg.ownerId === currentUser.id)}
              onLike={(x) => void feed.toggleLike(x)}
              onDelete={(x) => void feed.remove(x)}
              onPin={(x, v) => void feed.setPinned(x, v)}
            />
          );
        })
      )}

      <PageFormModal
        key={form.open ? `page-${form.page?.id ?? 'new'}` : 'page-closed'}
        open={form.open}
        page={form.page}
        onClose={() => setForm({ open: false })}
        onSave={onSave}
      />
    </div>
  );
}
