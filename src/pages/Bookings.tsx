import { useEffect } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import type { Booking } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useBookingDate } from '@/lib/booking';
import OfferMedia from '@/components/offer/OfferMedia';
import StatusPill from '@/components/offer/StatusPill';

export default function Bookings() {
  const { t, formatTHB } = useI18n();
  const { bookings, offers, refreshBookings } = useStore();
  const when = useBookingDate();

  useEffect(() => { void refreshBookings(); }, [refreshBookings]);

  // expired / cancelled-before-payment noise goes last
  const sorted = [...bookings].sort((a, b) => {
    const rank = (x: Booking) => (x.status === 'expired' || x.status === 'cancelled' ? 1 : 0);
    return rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">{t('bookings.title')}</h1>
      {sorted.length === 0 ? (
        <div className="mt-10 rounded-[24px] border border-sand-dark bg-white p-10 text-center shadow-paper">
          <p className="font-display text-xl font-semibold text-ink">{t('bookings.empty.title')}</p>
          <p className="mt-2 text-ink/60">{t('bookings.empty.body')}</p>
          <Link to="/explorer" className="mt-6 inline-flex h-12 items-center rounded-full bg-lagoon px-6 text-sm font-bold text-white">
            {t('bookings.empty.cta')}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {sorted.map((b) => {
            const photo = offers.find((o) => o.id === b.offerId)?.photos[0];
            return (
              <li key={b.id}>
                <Link
                  to={`/reservations/${b.id}`}
                  className="flex items-center gap-4 rounded-[20px] border border-sand-dark bg-white p-3 shadow-paper transition-colors hover:border-lagoon/40"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                    <OfferMedia category={b.category} photo={photo} alt={b.offerTitle} iconClassName="h-8 w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <StatusPill status={b.status} />
                    <p className="mt-1 truncate font-semibold text-ink">{b.offerTitle}</p>
                    <p className="truncate text-[13px] text-ink/55">{when(b)}</p>
                    <p className="text-[13px] text-ink/45">{t('bookings.ref')} {b.ref} · {formatTHB(b.amountThb)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink/30" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
