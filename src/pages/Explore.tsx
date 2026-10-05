import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import { CATEGORIES, isCategory } from '@/lib/catalog';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import OfferCard from '@/components/offer/OfferCard';

type Sort = 'featured' | 'priceAsc' | 'priceDesc' | 'rating';
const SORTS: Sort[] = ['featured', 'priceAsc', 'priceDesc', 'rating'];

/** Accent-insensitive lower-case text for searching. */
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function Explore() {
  const { t } = useI18n();
  const { offers, offersReady } = useStore();
  const [params, setParams] = useSearchParams();
  const cat = isCategory(params.get('cat')) ? params.get('cat') : null;
  const q = params.get('q') ?? '';
  const sort: Sort = SORTS.includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'featured';

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const list = offers.filter((o) => {
      if (!o.active) return false;
      if (cat && o.category !== cat) return false;
      if (words.length === 0) return true;
      const hay = norm([o.title, o.summary, o.area, t(`cat.${o.category}`), ...o.highlights].join(' '));
      return words.every((w) => hay.includes(w));
    });
    const sorted = [...list];
    if (sort === 'priceAsc') sorted.sort((a, b) => a.priceThb - b.priceThb);
    else if (sort === 'priceDesc') sorted.sort((a, b) => b.priceThb - a.priceThb);
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    else sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort - b.sort);
    return sorted;
  }, [offers, cat, q, sort, t]);

  const chip = (active: boolean) => cn(
    'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
    active ? 'bg-ink text-white' : 'border border-sand-dark bg-white text-ink/70 hover:border-lagoon',
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
        {cat ? t(`cat.${cat}`) : t('explore.title')}
      </h1>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="flex h-12 items-center gap-2.5 rounded-full border border-sand-dark bg-white px-4 focus-within:border-lagoon md:flex-1">
          <Search className="h-4 w-4 text-ink/40" aria-hidden />
          <input
            value={q}
            onChange={(e) => update({ q: e.target.value || null })}
            placeholder={t('explore.search')}
            aria-label={t('explore.search')}
            className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink/40"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => update({ sort: e.target.value === 'featured' ? null : e.target.value })}
          className="h-12 rounded-full border border-sand-dark bg-white px-4 text-sm font-semibold text-ink outline-none md:w-60"
          aria-label="Sort"
        >
          {SORTS.map((s) => <option key={s} value={s}>{t(`explore.sort.${s}`)}</option>)}
        </select>
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button onClick={() => update({ cat: null })} className={chip(!cat)}>{t('explore.all')}</button>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => update({ cat: c.id })} className={chip(cat === c.id)}>
              <Icon className="h-4 w-4" /> {t(`cat.${c.id}`)}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm font-semibold text-ink/50">
        {t(shown.length === 1 ? 'explore.count.one' : 'explore.count.other', { count: shown.length })}
      </p>

      {!offersReady ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[330px] animate-pulse rounded-[20px] bg-sand-dark/50" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-xl font-semibold text-ink">{t('explore.empty.title')}</p>
          <p className="mt-2 text-ink/55">{t('explore.empty.body')}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => <OfferCard key={o.id} offer={o} />)}
        </div>
      )}
    </div>
  );
}
