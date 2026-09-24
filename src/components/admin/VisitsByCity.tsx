import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useClub } from '@/lib/club';
import { useVisitStats } from '@/lib/visits';
import { cn } from '@/lib/utils';

const RANGES = [7, 30, 90];

/** Emoji flag from an ISO country code ("TH" → 🇹🇭). */
function flag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** Admins only: anonymous visit counts per city. */
export default function VisitsByCity() {
  const { t } = useI18n();
  const { isAppAdmin } = useClub();
  const [days, setDays] = useState(30);
  const rows = useVisitStats(isAppAdmin, days);
  if (!isAppAdmin) return null;

  const total = rows?.reduce((sum, r) => sum + r.visits, 0) ?? 0;
  const max = Math.max(1, ...(rows ?? []).map((r) => r.visits));

  return (
    <section className="mt-10 rounded-[24px] border border-[#EADFC8] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-[#0B2E2B]">
          <MapPin className="h-5 w-5 text-[#0E8C7F]" />
          {t('visits.title')}
        </h2>
        <div className="flex gap-1 rounded-full bg-[#FBF6EC] p-1">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                d === days ? 'bg-[#0E8C7F] text-white' : 'text-[#0B2E2B]/60 hover:text-[#0B2E2B]',
              )}
            >
              {t('visits.days', { n: d })}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[13px] text-[#0B2E2B]/55">{t('visits.hint')}</p>

      {rows === null ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-[#FBF6EC]" />
      ) : rows.length === 0 ? (
        <p className="mt-5 text-center text-[13px] text-[#0B2E2B]/45">{t('visits.empty')}</p>
      ) : (
        <>
          <p className="mt-4 font-mono text-sm font-bold text-[#0B2E2B]">{t('visits.total', { n: total })}</p>
          <ul className="mt-3 space-y-2.5">
            {rows.map((r) => (
              <li key={`${r.country}-${r.city}`} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-[13px] font-semibold text-[#0B2E2B] sm:w-56">
                  {flag(r.country)} {r.city || t('visits.unknown')}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#FBF6EC]">
                  <div className="h-full rounded-full bg-golden-hour" style={{ width: `${(r.visits / max) * 100}%` }} />
                </div>
                <span className="w-10 text-right font-mono text-sm font-bold tabular-nums text-[#0B2E2B]">{r.visits}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
