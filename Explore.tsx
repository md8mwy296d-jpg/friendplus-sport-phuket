import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, RotateCcw, Plus, ChevronRight } from 'lucide-react';
import type { Level, Session, Sport } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SessionCard from '@/components/SessionCard';
import SportIcon from '@/components/SportIcon';
import CountUp from '@/components/home/CountUp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const SPORTS: Sport[] = ['futsal', 'padel', 'dance', 'gym'];
const AREAS = ['Patong', 'Kata', 'Rawai', 'Chalong', 'Phuket Town', 'Bang Tao'];
const PAGE_SIZE = 9;

type DateFilter = 'all' | 'today' | 'tomorrow' | 'week';
type StatusFilter = 'all' | 'open' | 'almostFull' | 'confirmed';
type LevelFilter = 'all' | Level;
type SortKey = 'soon' | 'spots' | 'price';

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function matchesDate(iso: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const day = startOfDay(new Date(iso).getTime());
  const today = startOfDay(Date.now());
  if (filter === 'today') return day === today;
  if (filter === 'tomorrow') return day === today + 86_400_000;
  // this week: within the next 7 days (including today)
  return day >= today && day < today + 7 * 86_400_000;
}

/** Small local "live activity" toast — simulated players joining sessions (max 1 / 60s). */
function LiveActivity() {
  const { sessions, getUser } = useStore();
  const { t } = useI18n();
  const [toast, setToast] = useState<{ id: number; name: string; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const fire = () => {
      if (cancelled) return;
      const candidates = sessions.filter((s) => s.status === 'open' && s.playerIds.length > 0);
      if (candidates.length > 0) {
        const s = candidates[Math.floor(Math.random() * candidates.length)];
        const u = getUser(s.playerIds[Math.floor(Math.random() * s.playerIds.length)]);
        if (u) setToast({ id: Date.now(), name: u.name.split(' ')[0], title: s.title });
      }
      timer = window.setTimeout(fire, 60_000);
    };
    timer = window.setTimeout(fire, 18_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessions, getUser]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[95]">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ x: 80, opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 80, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="pointer-events-auto w-[300px] max-w-[calc(100vw-32px)] rounded-2xl border border-[#0E8C7F]/30 bg-white/95 px-4 py-3 shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.12)] backdrop-blur"
            role="status"
          >
            <p className="text-[13px] font-medium text-[#0B2E2B]/80">
              {t('explore.liveJoin', { name: toast.name, title: toast.title })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Explore() {
  const { sessions, getVenue } = useStore();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const [sport, setSport] = useState<Sport | 'all'>(() => {
    const p = searchParams.get('sport');
    return SPORTS.includes(p as Sport) ? (p as Sport) : 'all';
  });
  const [rawQuery, setRawQuery] = useState(() => searchParams.get('q') ?? '');
  const [query, setQuery] = useState(rawQuery);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [area, setArea] = useState<string>(() => {
    const p = searchParams.get('quartier');
    return p && AREAS.includes(p) ? p : 'all';
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const p = searchParams.get('statut');
    return p === 'open' || p === 'almostFull' || p === 'confirmed' ? p : 'all';
  });
  const [level, setLevel] = useState<LevelFilter>('all');
  const [sort, setSort] = useState<SortKey>('soon');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [scrolled, setScrolled] = useState(false);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // search debounce 250ms
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(rawQuery), 250);
    return () => window.clearTimeout(id);
  }, [rawQuery]);

  // light shadow on the sticky filter bar once scrolled past it
  useEffect(() => {
    const onScroll = () => {
      const el = filterBarRef.current;
      if (!el) return;
      setScrolled(el.getBoundingClientRect().top <= 73);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sessions.length };
    for (const sp of SPORTS) counts[sp] = sessions.filter((s) => s.sport === sp).length;
    return counts;
  }, [sessions]);

  const openCount = useMemo(
    () => sessions.filter((s) => s.status === 'open' || s.status === 'full').length,
    [sessions],
  );
  const confirmedThisWeek = useMemo(
    () =>
      sessions.filter(
        (s) => s.status === 'confirmed' && new Date(s.date).getTime() < Date.now() + 7 * 86_400_000,
      ).length,
    [sessions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sessions.filter((s) => {
      if (sport !== 'all' && s.sport !== sport) return false;
      const venue = getVenue(s.venueId);
      if (area !== 'all' && venue?.area !== area) return false;
      if (q) {
        const hay = `${s.title} ${venue?.name ?? ''} ${venue?.area ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (!matchesDate(s.date, dateFilter)) return false;
      if (statusFilter === 'open' && s.status !== 'open') return false;
      if (statusFilter === 'confirmed' && s.status !== 'confirmed') return false;
      if (statusFilter === 'almostFull') {
        const left = s.quota - s.playerIds.length;
        if (!((s.status === 'open' || s.status === 'full') && left <= 2)) return false;
      }
      if (level !== 'all' && s.level !== 'all' && s.level !== level) return false;
      return true;
    });
    const spotsLeft = (s: Session) => Math.max(0, s.quota - s.playerIds.length);
    return list.sort((a, b) => {
      // cancelled sessions always sink to the bottom
      const sink = Number(a.status === 'cancelled') - Number(b.status === 'cancelled');
      if (sink !== 0) return sink;
      if (sort === 'soon') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sort === 'spots') return spotsLeft(b) - spotsLeft(a);
      return a.pricePerPerson - b.pricePerPerson;
    });
  }, [sessions, sport, query, area, dateFilter, statusFilter, level, sort, getVenue]);

  const filtersActive =
    sport !== 'all' ||
    query.trim() !== '' ||
    dateFilter !== 'all' ||
    area !== 'all' ||
    statusFilter !== 'all' ||
    level !== 'all';

  const resetFilters = () => {
    setSport('all');
    setRawQuery('');
    setQuery('');
    setDateFilter('all');
    setArea('all');
    setStatusFilter('all');
    setLevel('all');
    setSort('soon');
    setVisible(PAGE_SIZE);
  };

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [sport, query, dateFilter, area, statusFilter, level, sort]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="bg-[#FBF6EC]">
      {/* Section 1 — page header */}
      <motion.section
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative overflow-hidden bg-lagoon-deep"
      >
        <div className="palm-texture absolute inset-0 bg-white/[0.05]" aria-hidden />
        <div className="grain-overlay absolute inset-0 opacity-[0.05]" aria-hidden />
        <div className="container relative flex min-h-[280px] flex-col justify-center py-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B4A]">
            {t('explore.eyebrow')}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.02em] text-white md:text-5xl">
            {t('explore.title')}
          </h1>
          <p className="mt-3 font-mono text-sm font-medium text-white/70">
            <CountUp value={openCount} duration={800} /> {t('status.open').toLowerCase()} ·{' '}
            <CountUp value={confirmedThisWeek} duration={800} />{' '}
            {t('explore.subtitle', { open: '', confirmed: '' }).split('·')[1]?.trim() ?? ''}
          </p>
        </div>
      </motion.section>

      {/* Section 2 — sticky filter bar */}
      <div
        ref={filterBarRef}
        className={cn(
          'sticky top-[72px] z-30 border-b border-[#EADFC8] bg-[#FBF6EC]/95 backdrop-blur transition-shadow duration-300',
          scrolled && 'shadow-[0_8px_24px_rgba(11,46,43,.08)]',
        )}
      >
        <div className="container flex flex-col gap-3 py-4">
          {/* sport tabs + create CTA */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', ...SPORTS] as const).map((sp) => {
              const activeTab = sport === sp;
              return (
                <button
                  key={sp}
                  onClick={() => setSport(sp)}
                  className={cn(
                    'relative flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
                    activeTab ? 'text-white' : 'text-[#0B2E2B]/65 hover:text-[#0B2E2B]',
                  )}
                >
                  {activeTab && (
                    <motion.span
                      layoutId="explore-sport-tab"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-[#0B2E2B]"
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {sp !== 'all' && <SportIcon sport={sp} className="h-4 w-4" />}
                    {sp === 'all' ? t('explore.tab.all') : t(`sport.${sp}`)}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums',
                        activeTab ? 'bg-white/20 text-white' : 'bg-[#EADFC8] text-[#0B2E2B]/60',
                      )}
                    >
                      {sportCounts[sp] ?? 0}
                    </span>
                  </span>
                </button>
              );
            })}
            <Link
              to="/creer"
              className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-coral-pop px-4 text-sm font-bold text-white shadow-coral transition-transform hover:scale-[1.03]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t('nav.create')}
            </Link>
          </div>

          {/* search + secondary filters */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-[#EADFC8] bg-white px-4">
              <Search className="h-4 w-4 shrink-0 text-[#0B2E2B]/40" />
              <input
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder={t('explore.search')}
                className="w-full bg-transparent text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35"
              />
            </label>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="h-10 rounded-full border-[#EADFC8] bg-white" aria-label={t('explore.filter.date')}>
                <SelectValue placeholder={t('explore.filter.date')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('explore.date.all')}</SelectItem>
                <SelectItem value="today">{t('explore.date.today')}</SelectItem>
                <SelectItem value="tomorrow">{t('explore.date.tomorrow')}</SelectItem>
                <SelectItem value="week">{t('explore.date.week')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-10 rounded-full border-[#EADFC8] bg-white" aria-label={t('explore.filter.area')}>
                <SelectValue placeholder={t('explore.filter.area')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('explore.area.all')}</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-10 rounded-full border-[#EADFC8] bg-white" aria-label={t('explore.filter.status')}>
                <SelectValue placeholder={t('explore.filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('explore.status.all')}</SelectItem>
                <SelectItem value="open">{t('status.open')}</SelectItem>
                <SelectItem value="almostFull">{t('explore.status.almostFull')}</SelectItem>
                <SelectItem value="confirmed">{t('status.confirmed')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={level} onValueChange={(v) => setLevel(v as LevelFilter)}>
              <SelectTrigger className="h-10 rounded-full border-[#EADFC8] bg-white" aria-label={t('explore.filter.level')}>
                <SelectValue placeholder={t('explore.filter.level')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.level.all')}</SelectItem>
                <SelectItem value="beginner">{t('common.level.beginner')}</SelectItem>
                <SelectItem value="intermediate">{t('common.level.intermediate')}</SelectItem>
                <SelectItem value="advanced">{t('common.level.advanced')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-10 rounded-full border-[#EADFC8] bg-white" aria-label={t('explore.filter.sort')}>
                <SelectValue placeholder={t('explore.filter.sort')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soon">{t('explore.sort.soon')}</SelectItem>
                <SelectItem value="spots">{t('explore.sort.spots')}</SelectItem>
                <SelectItem value="price">{t('explore.sort.price')}</SelectItem>
              </SelectContent>
            </Select>

            <AnimatePresence>
              {filtersActive && (
                <motion.button
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  onClick={resetFilters}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#FF6B4A]/40 bg-[#FF6B4A]/10 px-4 text-sm font-semibold text-[#FF6B4A] hover:bg-[#FF6B4A]/15"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('explore.reset')}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Section 3 — sessions grid */}
      <section className="container py-12 md:py-16">
        <p className="mb-6 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
          {t('explore.results', { count: filtered.length })}
        </p>

        {shown.length > 0 ? (
          <>
            <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {shown.map((s, i) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ y: 32, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={
                      i < PAGE_SIZE
                        ? { duration: 0.5, ease: EASE, delay: (i % 3) * 0.06 + Math.floor(i / 3) * 0.06 }
                        : { type: 'spring', stiffness: 260, damping: 26 }
                    }
                  >
                    <SessionCard session={s} className="h-full" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {visible < filtered.length && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-[#0E8C7F]/30 bg-white px-8 text-sm font-bold text-[#0A6E64] shadow-paper transition-all hover:-translate-y-0.5 hover:bg-[#0E8C7F]/5"
                >
                  {t('explore.loadMore')}
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Section 4 — empty state */
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <motion.img
              src="/empty-state.svg"
              alt=""
              className="w-[240px]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 15 }}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
              className="flex flex-col items-center gap-4"
            >
              <h3 className="font-display text-2xl font-semibold text-[#0B2E2B]">
                {t('explore.empty.title')}
              </h3>
              <p className="max-w-sm text-[15px] leading-relaxed text-[#0B2E2B]/55">
                {t('explore.empty.body')}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-full border border-[#0E8C7F]/30 bg-white px-6 py-3 text-sm font-semibold text-[#0A6E64] transition-all hover:scale-[1.03] hover:bg-[#0E8C7F]/5"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('explore.empty.reset')}
                </button>
                <Link
                  to="/creer"
                  className="inline-flex items-center gap-2 rounded-full bg-coral-pop px-6 py-3 text-sm font-bold text-white shadow-coral transition-all hover:scale-[1.03]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                  {t('nav.create')}
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* Section 5 — invitation banner */}
      <section className="container pb-20 md:pb-24">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative overflow-hidden rounded-[24px] bg-lagoon-deep px-8 py-12 text-center md:py-16"
        >
          <div className="palm-texture absolute inset-0 bg-white/[0.05]" aria-hidden />
          <div className="grain-overlay absolute inset-0 opacity-[0.05]" aria-hidden />
          <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
            <h3 className="font-display text-3xl font-bold text-white md:text-4xl">
              {t('explore.banner.title')}
            </h3>
            <p className="text-[15px] leading-relaxed text-white/70">{t('explore.banner.body')}</p>
            <motion.div
              animate={{
                boxShadow: [
                  '0 8px 24px rgba(255,107,74,.35)',
                  '0 8px 40px rgba(255,107,74,.6)',
                  '0 8px 24px rgba(255,107,74,.35)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-2 rounded-full"
            >
              <Link
                to="/creer"
                className="inline-flex items-center gap-2 rounded-full bg-coral-pop px-8 py-4 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                {t('nav.create')}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <LiveActivity />
    </div>
  );
}
