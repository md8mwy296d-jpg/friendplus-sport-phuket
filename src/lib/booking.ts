import type { Booking, DeliveryMode, Offer, Trip } from './types';
import { useI18n } from './i18n';
import { daysBetween, todayInPhuket, usesDateRange } from './catalog';

/** What the customer picked in the booking widget, carried to the checkout page in the URL. */
export interface BookingChoice {
  start: string;
  end: string | null;
  time: string;
  qty: number;
  optionIds: string[];
  delivery: DeliveryMode;
}

export function choiceToSearch(c: BookingChoice): string {
  const p = new URLSearchParams({ start: c.start, qty: String(c.qty) });
  if (c.end) p.set('end', c.end);
  if (c.time) p.set('time', c.time);
  if (c.optionIds.length) p.set('opt', c.optionIds.join(','));
  if (c.delivery !== 'none') p.set('dlv', c.delivery);
  return p.toString();
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function choiceFromSearch(p: URLSearchParams): Partial<BookingChoice> {
  const out: Partial<BookingChoice> = {};
  const start = p.get('start') ?? '';
  const end = p.get('end') ?? '';
  if (DATE.test(start)) out.start = start;
  if (DATE.test(end)) out.end = end;
  const time = p.get('time') ?? '';
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) out.time = time;
  const qty = Number(p.get('qty'));
  if (Number.isInteger(qty) && qty > 0) out.qty = qty;
  const opt = p.get('opt');
  if (opt) out.optionIds = opt.split(',').filter(Boolean).slice(0, 20);
  const dlv = p.get('dlv');
  out.delivery = dlv === 'airport' || dlv === 'address' ? dlv : 'none';
  return out;
}

/** « sam. 12 oct. → mar. 15 oct. · 09:00 » in the visitor's language. */
export function useBookingDate() {
  const { formatDate } = useI18n();
  const day = (d: string) => formatDate(`${d}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short' });
  return (b: Pick<Booking, 'startDate' | 'endDate' | 'startTime'>) =>
    `${day(b.startDate)}${b.endDate ? ` → ${day(b.endDate)}` : ''}${b.startTime ? ` · ${b.startTime}` : ''}`;
}

/**
 * Pre-fills the booking widget from the customer's arrival: dates from landing to departure,
 * landing time, travellers / bags, and airport hand-over when the offer allows it.
 */
export function choiceFromTrip(offer: Offer, trip: Trip | null): Partial<BookingChoice> {
  if (!trip?.arrivalDate || trip.arrivalDate < todayInPhuket()) return {};
  const out: Partial<BookingChoice> = { start: trip.arrivalDate };
  if (usesDateRange(offer.priceUnit) && trip.departureDate && daysBetween(trip.arrivalDate, trip.departureDate) >= 1) {
    out.end = trip.departureDate;
  }
  if (offer.category === 'arrival' && trip.arrivalTime) out.time = trip.arrivalTime;
  if (offer.priceUnit === 'item' && trip.bags > 0) out.qty = trip.bags;
  if (['person', 'group', 'night'].includes(offer.priceUnit)) out.qty = trip.travelers;
  if (offer.deliveryAirportThb !== null && trip.flightNumber) out.delivery = 'airport';
  else if (offer.deliveryAddressThb !== null && trip.stayAddress) out.delivery = 'address';
  return out;
}

/** « Remis à l'aéroport · vol TG201 · 14:35 » / « Livré à : Villa Mango, Kamala » ('' without delivery). */
export function useDeliveryText() {
  const { t } = useI18n();
  return (b: Pick<Booking, 'delivery' | 'deliveryAddress' | 'flightNumber' | 'startTime'>) => {
    if (b.delivery === 'airport') {
      return [t('book.delivery.airport'), b.flightNumber && t('trip.flightShort', { flight: b.flightNumber }), b.startTime]
        .filter(Boolean).join(' · ');
    }
    if (b.delivery === 'address') return `${t('book.delivery.address')} · ${b.deliveryAddress}`;
    return '';
  };
}
