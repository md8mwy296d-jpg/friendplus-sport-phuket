import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { flagOf, useVisitStats } from '@/lib/visits';
import { cn } from '@/lib/utils';

const RANGES = [7, 30, 90];

/** Admins only: anonymous visit counts per city. */
export default function VisitsByCity() {
  const { t } = useI18n();
  const { isAdmin: isAppAdmin } = useStore();
  const [days, setDays] = useState(30);
  const rows = useVisitStats(isAppAdmin, days);
  if (!isAppAdmin) return null;

  const total = rows?.reduce((sum, r) => sum + r.visits, 0) ?? 0;
  const max = Math.max(1, ...(rows ?? []).map((r) => r.visits));

  return (
    <section className="mt-10 rounded-[24px] border border-[#E4DCCF] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-[#15130F]">
          <MapPin className="h-5 w-5 text-[#A8844A]" />
          {t('visits.title')}
        </h2>
        <div className="flex gap-1 rounded-full bg-[#F7F4EE] p-1">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                d === days ? 'bg-[#A8844A] text-white' : 'text-[#15130F]/60 hover:text-[#15130F]',
              )}
            >
              {t('visits.days', { n: d })}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[13px] text-[#15130F]/55">{t('visits.hint')}</p>

      {rows === null ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-[#F7F4EE]" />
      ) : rows.length === 0 ? (
        <p className="mt-5 text-center text-[13px] text-[#15130F]/45">{t('visits.empty')}</p>
      ) : (
        <>
          <p className="mt-4 font-mono text-sm font-bold text-[#15130F]">{t('visits.total', { n: total })}</p>
          <ul className="mt-3 space-y-2.5">
            {rows.map((r) => (
              <li key={`${r.country}-${r.city}`} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-[13px] font-semibold text-[#15130F] sm:w-56">
                  {flagOf(r.country)} {r.city || t('visits.unknown')}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F7F4EE]">
                  <div className="h-full rounded-full bg-golden-hour" style={{ width: `${(r.visits / max) * 100}%` }} />
                </div>
                <span className="w-10 text-right font-mono text-sm font-bold tabular-nums text-[#15130F]">{r.visits}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
