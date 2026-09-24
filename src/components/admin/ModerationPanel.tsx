import { useState } from 'react';
import { Ban, ShieldAlert, ShieldCheck, Wifi } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { blockIp, deviceLabel, suspendPlayer, unblockIp, usePlayerModeration } from '@/lib/moderation';

/** Admins only (on a player's page): recent IP addresses, IP blocking and account suspension. */
export default function ModerationPanel({ userId, name }: { userId: string; name: string }) {
  const { t, formatDate } = useI18n();
  const { pushToast } = useStore();
  const { connections, bannedUntil, loading, reload } = usePlayerModeration(userId, true);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<string | null>, success: string) => {
    setBusy(true);
    const error = await action();
    if (error) pushToast({ kind: 'error', title: t(`moderation.err.${error}`) === `moderation.err.${error}` ? t('moderation.err.generic') : t(`moderation.err.${error}`) });
    else pushToast({ kind: 'success', title: t(success) });
    await reload();
    setBusy(false);
  };

  const suspend = (days: number) => {
    const label = days >= 36500 ? t('moderation.suspend.forever') : t('moderation.suspend.days', { n: days });
    if (!window.confirm(t('moderation.suspend.confirm', { name, duration: label }))) return;
    void run(() => suspendPlayer(userId, days), 'moderation.suspend.done');
  };

  return (
    <div className="mt-4 rounded-2xl border border-[#E5484D]/25 bg-[#E5484D]/[0.04] p-4 text-left">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#C4343A]">
        <ShieldAlert className="h-4 w-4" /> {t('moderation.title')}
      </p>

      {bannedUntil && (
        <p className="mt-2 text-[13px] font-semibold text-[#C4343A]">
          {t('moderation.suspendedUntil', { date: formatDate(bannedUntil, { day: 'numeric', month: 'long', year: 'numeric' }) })}
        </p>
      )}

      <p className="mt-3 text-[12px] font-semibold text-[#0B2E2B]/60">{t('moderation.ips')}</p>
      {loading && connections.length === 0 ? (
        <p className="mt-1 text-[13px] text-[#0B2E2B]/45">{t('common.loading')}</p>
      ) : connections.length === 0 ? (
        <p className="mt-1 text-[13px] text-[#0B2E2B]/45">{t('moderation.noIp')}</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {connections.map((c) => (
            <li key={c.ip} className="flex flex-wrap items-center gap-2 text-[13px] text-[#0B2E2B]">
              <Wifi className="h-3.5 w-3.5 text-[#0B2E2B]/40" />
              <span className="font-mono font-semibold">{c.ip}</span>
              <span className="text-[#0B2E2B]/50">
                {deviceLabel(c.userAgent)}{c.lastSeen ? ` · ${formatDate(c.lastSeen, { day: 'numeric', month: 'short' })}` : ''}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!c.ip) return;
                  if (c.blocked) void run(() => unblockIp(c.ip!), 'moderation.ip.unblocked');
                  else if (window.confirm(t('moderation.ip.confirm', { ip: c.ip }))) void run(() => blockIp(c.ip!, name, userId), 'moderation.ip.blocked');
                }}
                className={c.blocked
                  ? 'ml-auto rounded-full border border-[#0E8C7F]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#0E8C7F] disabled:opacity-50'
                  : 'ml-auto rounded-full border border-[#E5484D]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#C4343A] disabled:opacity-50'}
              >
                {c.blocked ? t('moderation.ip.unblock') : t('moderation.ip.block')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {bannedUntil ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => suspendPlayer(userId, 0), 'moderation.reactivate.done')}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#0E8C7F]/40 px-3.5 text-xs font-bold text-[#0E8C7F] disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" /> {t('moderation.reactivate')}
          </button>
        ) : (
          [7, 30, 36500].map((days) => (
            <button
              key={days}
              type="button"
              disabled={busy}
              onClick={() => suspend(days)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E5484D]/40 px-3.5 text-xs font-bold text-[#C4343A] hover:bg-[#E5484D]/10 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              {t('moderation.suspend')} · {days >= 36500 ? t('moderation.suspend.forever') : t('moderation.suspend.days', { n: days })}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
