import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Info, Loader2, MessageCircle } from 'lucide-react';
import { contactHref } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useBookingDate } from '@/lib/booking';
import OfferMedia from '@/components/offer/OfferMedia';
import StatusPill from '@/components/offer/StatusPill';

const PAID = ['paid', 'confirmed', 'completed'];

export default function BookingDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { t, formatTHB } = useI18n();
  const { bookings, offers, refreshBookings, payBooking, cancelUnpaidBooking } = useStore();
  const when = useBookingDate();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const b = bookings.find((x) => x.id === id);
  const backFromStripe = params.get('paid') === '1';

  useEffect(() => { void refreshBookings().then(() => setLoaded(true)); }, [refreshBookings]);

  // back from Stripe: the webhook can take a few seconds, poll until the booking is paid (max ~1 min)
  const waiting = backFromStripe && b?.status === 'pending_payment';
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      void refreshBookings();
      if (n >= 20) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [waiting, refreshBookings]);

  if (!b) {
    if (!loaded) return <p className="py-24 text-center text-sm text-ink/50">{t('common.loading')}</p>;
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="font-display text-2xl font-bold text-ink">{t('detail.notFound')}</p>
        <Link to="/reservations" className="mt-6 inline-flex h-12 items-center rounded-full bg-lagoon px-6 text-sm font-bold text-white">
          {t('bookings.title')}
        </Link>
      </div>
    );
  }

  const offer = offers.find((o) => o.id === b.offerId);
  const pay = async () => { setBusy(true); const ok = await payBooking(b.id); if (!ok) setBusy(false); };
  const cancel = async () => {
    if (!window.confirm(t('detail.cancelConfirm'))) return;
    setBusy(true);
    await cancelUnpaidBooking(b.id);
    setBusy(false);
  };

  const rows: [string, string][] = [
    [t('detail.when'), when(b)],
    [t('detail.qty'), String(b.qty)],
    ...(b.options.length ? [[t('detail.options'), b.options.map((o) => o.label).join(', ')] as [string, string]] : []),
    [t('detail.contact'), `${b.contactName} · ${b.contactPhone}`],
    ...(b.pickup ? [[t('detail.pickup'), b.pickup] as [string, string]] : []),
    ...(b.notes ? [[t('detail.notes'), b.notes] as [string, string]] : []),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/reservations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {t('bookings.title')}
      </Link>

      {PAID.includes(b.status) && backFromStripe && (
        <div className="mt-4 flex gap-3 rounded-[20px] bg-confirm/12 p-4 text-[#15803D]">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-bold">{t('detail.paidTitle')}</p>
            <p className="text-sm text-[#166534]">{t('detail.paidBody')}</p>
          </div>
        </div>
      )}
      {waiting && (
        <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-lagoon/10 p-4 text-sm font-medium text-lagoon-deep">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> {t('detail.waiting')}
        </div>
      )}
      {params.get('cancelled') === '1' && b.status === 'pending_payment' && (
        <div className="mt-4 flex gap-3 rounded-[20px] bg-amber/15 p-4 text-sm text-[#7A4F00]">
          <Info className="h-5 w-5 shrink-0" /> {t('detail.cancelledPay')}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-[24px] border border-sand-dark bg-white shadow-paper">
        <div className="h-40">
          <OfferMedia category={b.category} photo={offer?.photos[0]} alt={b.offerTitle} iconClassName="h-12 w-12" />
        </div>
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusPill status={b.status} />
            <span className="text-sm font-semibold text-ink/50">{t('bookings.ref')} {b.ref}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold leading-snug text-ink">
            {offer ? <Link to={`/offre/${offer.slug}`} className="hover:underline">{b.offerTitle}</Link> : b.offerTitle}
          </h1>

          <dl className="mt-4 grid gap-2.5 text-[15px]">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3">
                <dt className="text-ink/50">{k}</dt>
                <dd className="break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex items-end justify-between border-t border-sand-dark pt-4">
            <span className="font-semibold text-ink/60">{t('detail.amount')}</span>
            <span className="font-display text-2xl font-bold text-ink">{formatTHB(b.amountThb)}</span>
          </div>

          {b.status === 'pending_payment' && (
            <>
              <p className="mt-3 text-sm text-ink/55">{t('detail.payBefore')}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => void pay()}
                  disabled={busy}
                  className="h-12 flex-1 rounded-full bg-coral-pop text-sm font-bold text-white shadow-coral disabled:opacity-60"
                >
                  {t('bookings.pay')}
                </button>
                <button
                  onClick={() => void cancel()}
                  disabled={busy}
                  className="h-12 rounded-full border border-sand-dark px-6 text-sm font-semibold text-ink/70 hover:bg-sand"
                >
                  {t('bookings.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <a
        href={contactHref(`My Phuket Key ${b.ref}`)}
        target="_blank"
        rel="noreferrer"
        className="mt-5 flex items-center gap-2 rounded-[18px] border border-sand-dark bg-white p-4 text-sm text-ink/70 hover:border-lagoon/40"
      >
        <MessageCircle className="h-5 w-5 shrink-0 text-lagoon" /> {t('detail.help', { ref: b.ref })}
      </a>
    </div>
  );
}
