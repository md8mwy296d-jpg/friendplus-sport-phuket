import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { unblockIp, useBlockedIps } from '@/lib/moderation';

/** Admins only (on their profile): every blocked IP address, with an unblock button. */
export default function BlockedIps() {
  const { t, formatDate } = useI18n();
  const { isAdmin: isAppAdmin } = useStore();
  const { pushToast } = useStore();
  const { items, reload } = useBlockedIps(isAppAdmin);
  if (!isAppAdmin) return null;

  const unblock = async (ip: string) => {
    const error = await unblockIp(ip);
    pushToast(error ? { kind: 'error', title: t('moderation.err.generic') } : { kind: 'success', title: t('moderation.ip.unblocked') });
    await reload();
  };

  return (
    <section className="mt-4 rounded-[24px] border border-[#E4DCCF] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-[#15130F]">
        <ShieldAlert className="h-5 w-5 text-[#C4343A]" /> {t('moderation.blockedList')}
      </h2>
      <p className="mt-2 text-[13px] text-[#15130F]/55">{t('moderation.blockedHint')}</p>
      {!items || items.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-[#15130F]/45">{t('moderation.blockedEmpty')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#E4DCCF]">
          {items.map((b) => (
            <li key={b.ip} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
              <span className="font-mono font-semibold text-[#15130F]">{b.ip}</span>
              <span className="text-[#15130F]/50">{b.reason} · {formatDate(b.createdAt, { day: 'numeric', month: 'short' })}</span>
              <button
                type="button"
                onClick={() => void unblock(b.ip)}
                className="ml-auto rounded-full border border-[#A8844A]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#A8844A]"
              >
                {t('moderation.ip.unblock')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
