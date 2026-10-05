import type { Booking } from './types';
import { useI18n } from './i18n';

/** What the customer picked in the booking widget, carried to the checkout page in the URL. */
export interface BookingChoice {
  start: string;
  end: string | null;
  time: string;
  qty: number;
  optionIds: string[];
}

export function choiceToSearch(c: BookingChoice): string {
  const p = new URLSearchParams({ start: c.start, qty: String(c.qty) });
  if (c.end) p.set('end', c.end);
  if (c.time) p.set('time', c.time);
  if (c.optionIds.length) p.set('opt', c.optionIds.join(','));
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
  return out;
}

/** « sam. 12 oct. → mar. 15 oct. · 09:00 » in the visitor's language. */
export function useBookingDate() {
  const { formatDate } = useI18n();
  const day = (d: string) => formatDate(`${d}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short' });
  return (b: Pick<Booking, 'startDate' | 'endDate' | 'startTime'>) =>
    `${day(b.startDate)}${b.endDate ? ` → ${day(b.endDate)}` : ''}${b.startTime ? ` · ${b.startTime}` : ''}`;
}
