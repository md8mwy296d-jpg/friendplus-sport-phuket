import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import { MessageCircle, Plus } from 'lucide-react';
import type { Booking, BookingStatus, Offer } from '@/lib/types';
import { useBookingDate } from '@/lib/booking';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import OfferMedia from '@/components/offer/OfferMedia';
import StatusPill from '@/components/offer/StatusPill';
import OfferEditor from '@/components/admin/OfferEditor';
import VisitsByCity from '@/components/admin/VisitsByCity';
import VisitLog from '@/components/admin/VisitLog';
import BlockedIps from '@/components/admin/BlockedIps';

type Tab = 'bookings' | 'offers' | 'security';
const TODO: BookingStatus[] = ['paid'];
const CASHED: BookingStatus[] = ['paid', 'confirmed', 'completed'];

/** What the admin can do next, per status. */
const NEXT: Partial<Record<BookingStatus, BookingStatus[]>> = {
  paid: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: ['refunded'],
};
const ACTION_LABEL: Partial<Record<BookingStatus, string>> = {
  confirmed: 'admin.action.confirm',
  completed: 'admin.action.complete',
  cancelled: 'admin.action.cancel',
  refunded: 'admin.action.refund',
};

function BookingRow({ b, onChanged }: { b: Booking; onChanged: () => void }) {
  const { t, formatTHB } = useI18n();
  const { adminSetBookingStatus } = useStore();
  const when = useBookingDate();
  const [open, setOpen] = useState(b.status === 'paid');
  const [note, setNote] = useState(b.adminNote);
  const [busy, setBusy] = useState(false);
  const phoneDigits = b.contactPhone.replace(/\D/g, '');

  const act = async (status: BookingStatus) => {
    setBusy(true);
    if (await adminSetBookingStatus(b.id, status, note)) onChanged();
    setBusy(false);
  };

  return (
    <li className="min-w-0 rounded-[18px] border border-sand-dark bg-white">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={b.status} />
            <span className="text-xs font-semibold text-ink/45">{b.ref}</span>
          </div>
          <p className="mt-1 truncate font-semibold text-ink">{b.offerTitle}</p>
          <p className="truncate text-[13px] text-ink/55">{when(b)} · ×{b.qty} · {b.contactName}</p>
        </div>
        <span className="shrink-0 font-display text-lg font-bold text-ink">{formatTHB(b.amountThb)}</span>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-sand-dark p-4 text-sm">
          <dl className="grid gap-1.5">
            {[
              ['E-mail', b.email ?? '—'],
              [t('detail.contact'), b.contactPhone],
              [t('detail.pickup'), b.pickup || '—'],
              [t('detail.options'), b.options.map((o) => o.label).join(', ') || '—'],
              [t('detail.notes'), b.notes || '—'],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
                <dt className="text-ink/50">{k}</dt>
                <dd className="break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {phoneDigits.length >= 6 && (
            <a
              href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`My Phuket Key · ${b.ref} · ${b.offerTitle}`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#25D366]/15 px-3 py-1.5 text-xs font-bold text-[#128C4A]"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{t('admin.note')}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              className="mt-1 w-full resize-y rounded-xl border border-sand-dark px-3 py-2 outline-none focus:border-lagoon"
            />
          </label>
          {(NEXT[b.status] ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(NEXT[b.status] ?? []).map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => void act(s)}
                  className={cn(
                    'h-10 rounded-full px-4 text-sm font-bold disabled:opacity-50',
                    s === 'cancelled' ? 'border border-cancel/40 text-cancel' : 'bg-lagoon text-white',
                  )}
                >
                  {t(ACTION_LABEL[s] ?? '')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function Admin() {
  const { t, formatTHB } = useI18n();
  const { isAdmin, ready, offers, adminBookings } = useStore();
  const [tab, setTab] = useState<Tab>('bookings');
  const [list, setList] = useState<Booking[] | null>(null);
  const [filter, setFilter] = useState<'todo' | 'all'>('todo');
  const [editing, setEditing] = useState<Offer | null | 'new'>(null);

  const load = useCallback(async () => setList(await adminBookings()), [adminBookings]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const stats = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    const rows = list ?? [];
    return {
      todo: rows.filter((b) => TODO.includes(b.status)).length,
      revenue: rows.filter((b) => CASHED.includes(b.status) && b.paidAt && Date.parse(b.paidAt) > since)
        .reduce((n, b) => n + b.amountThb, 0),
    };
  }, [list]);

  if (!ready) return <p className="py-24 text-center text-sm text-ink/50">{t('common.loading')}</p>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const shown = (list ?? []).filter((b) => filter === 'all' || TODO.includes(b.status));
  const tabCls = (active: boolean) => cn(
    'h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors',
    active ? 'bg-ink text-white' : 'border border-sand-dark bg-white text-ink/60',
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">{t('admin.title')}</h1>
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(['bookings', 'offers', 'security'] as Tab[]).map((id) => (
          <button key={id} onClick={() => { setTab(id); setEditing(null); }} className={tabCls(tab === id)}>
            {t(`admin.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-white p-4 shadow-paper">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{t('admin.toConfirm')}</p>
              <p className="mt-1 font-display text-3xl font-bold text-coral">{stats.todo}</p>
            </div>
            <div className="rounded-[18px] bg-white p-4 shadow-paper">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{t('admin.revenue')}</p>
              <p className="mt-1 font-display text-3xl font-bold text-ink">{formatTHB(stats.revenue)}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            {(['todo', 'all'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={tabCls(filter === f)}>{t(`admin.filter.${f}`)}</button>
            ))}
          </div>
          {list === null ? (
            <p className="py-12 text-center text-sm text-ink/50">{t('common.loading')}</p>
          ) : shown.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink/50">{t('admin.bookings.empty')}</p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-3">
              {shown.map((b) => <BookingRow key={`${b.id}-${b.status}`} b={b} onChanged={() => void load()} />)}
            </ul>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="mt-6">
          {editing ? (
            <OfferEditor key={editing === 'new' ? 'new' : editing.id} offer={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
          ) : (
            <>
              <button
                onClick={() => setEditing('new')}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-pop px-5 text-sm font-bold text-white shadow-coral"
              >
                <Plus className="h-4 w-4" /> {t('admin.offers.new')}
              </button>
              <ul className="mt-5 grid grid-cols-1 gap-3">
                {offers.map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => setEditing(o)}
                      className="flex w-full items-center gap-3 rounded-[18px] border border-sand-dark bg-white p-3 text-left hover:border-lagoon/40"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                        <OfferMedia category={o.category} photo={o.photos[0]} alt={o.title} iconClassName="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{o.title}</p>
                        <p className="text-[13px] text-ink/55">
                          {t(`cat.${o.category}`)} · {formatTHB(o.priceThb)} {t(`unit.${o.priceUnit}`)}
                        </p>
                        <div className="mt-1 flex gap-1.5">
                          {!o.active && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-ink/60">{t('admin.offers.hidden')}</span>}
                          {o.featured && <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-bold text-[#9A6400]">{t('admin.offers.featured')}</span>}
                          {o.photos.length === 0 && <span className="rounded-full bg-cancel/10 px-2 py-0.5 text-[10px] font-bold text-cancel">0 photo</span>}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-lagoon-deep">{t('common.edit')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'security' && (
        <div className="mt-6 grid gap-6">
          <VisitsByCity />
          <VisitLog />
          <BlockedIps />
        </div>
      )}
    </div>
  );
}
