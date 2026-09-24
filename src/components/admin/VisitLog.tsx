import { useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useClub } from '@/lib/club';
import { useStore } from '@/lib/store';
import { flagOf, useVisitLog } from '@/lib/visits';
import { blockIp, unblockIp } from '@/lib/moderation';

const PAGE = 30;

/** Admins only (on their profile): latest connections with IP, city and device (kept 30 days). */
export default function VisitLog() {
  const { t, formatDate } = useI18n();
  const { isAppAdmin } = useClub();
  const { pushToast } = useStore();
  const { rows, reload } = useVisitLog(isAppAdmin);
  const [shown, setShown] = useState(PAGE);
  const [busyIp, setBusyIp] = useState<string | null>(null);
  if (!isAppAdmin) return null;

  const toggle = async (ip: string, blocked: boolean) => {
    if (!blocked && !window.confirm(t('moderation.ip.confirm', { ip }))) return;
    setBusyIp(ip);
    const error = blocked ? await unblockIp(ip) : await blockIp(ip, t('visitlog.reason'));
    if (error) pushToast({ kind: 'error', title: error === 'own_ip' ? t('moderation.err.own_ip') : t('moderation.err.generic') });
    else pushToast({ kind: 'success', title: t(blocked ? 'moderation.ip.unblocked' : 'moderation.ip.blocked') });
    await reload();
    setBusyIp(null);
  };

  return (
    <section className="mt-4 rounded-[24px] border border-[#EADFC8] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-[#0B2E2B]">
        <ListOrdered className="h-5 w-5 text-[#0E8C7F]" /> {t('visitlog.title')}
      </h2>
      <p className="mt-2 text-[13px] text-[#0B2E2B]/55">{t('visitlog.hint')}</p>

      {rows === null ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-[#FBF6EC]" />
      ) : rows.length === 0 ? (
        <p className="mt-5 text-center text-[13px] text-[#0B2E2B]/45">{t('visitlog.empty')}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-[#EADFC8]">
            {rows.slice(0, shown).map((r, i) => (
              <li key={`${r.at}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
                <span className="w-28 shrink-0 font-mono text-[12px] text-[#0B2E2B]/55">
                  {formatDate(r.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-[#0B2E2B]">
                  {flagOf(r.country)} {r.city || t('visits.unknown')}
                </span>
                <span className="font-mono text-[12px] text-[#0B2E2B]">{r.ip ?? '—'}</span>
                <span className="w-16 text-[12px] text-[#0B2E2B]/50">{r.device}</span>
                {r.ip && (
                  <button
                    type="button"
                    disabled={busyIp === r.ip}
                    onClick={() => void toggle(r.ip!, r.blocked)}
                    className={r.blocked
                      ? 'rounded-full border border-[#0E8C7F]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#0E8C7F] disabled:opacity-50'
                      : 'rounded-full border border-[#E5484D]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#C4343A] disabled:opacity-50'}
                  >
                    {r.blocked ? t('moderation.ip.unblock') : t('moderation.ip.block')}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {rows.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-3 w-full rounded-full border border-[#EADFC8] py-2 text-xs font-semibold text-[#0B2E2B]/70 hover:bg-[#FBF6EC]"
            >
              {t('visitlog.more')}
            </button>
          )}
        </>
      )}
    </section>
  );
}
