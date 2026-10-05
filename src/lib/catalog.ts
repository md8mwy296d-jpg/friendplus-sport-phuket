import {
  Baby, BedDouble, Helicopter, Martini, Motorbike, PlaneLanding, Sailboat, Sparkles, TreePalm, WashingMachine,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId, DeliveryMode, Offer, OfferOption, PriceUnit } from './types';

export interface Category {
  id: CategoryId;
  icon: LucideIcon;
  /** Two colours for the tile gradient / photo placeholder. */
  from: string;
  to: string;
}

/** The services, in display order (arrival concierge first). Labels come from i18n: `cat.<id>` and `cat.<id>.tagline`. */
export const CATEGORIES: Category[] = [
  { id: 'arrival', icon: PlaneLanding, from: '#15130F', to: '#A8844A' },
  { id: 'scooter', icon: Motorbike, from: '#2A251E', to: '#8C6D3B' },
  { id: 'excursion', icon: TreePalm, from: '#1E2622', to: '#6E7F6A' },
  { id: 'boat', icon: Sailboat, from: '#141D26', to: '#5B7083' },
  { id: 'stay', icon: BedDouble, from: '#2A251E', to: '#B08D57' },
  { id: 'nightlife', icon: Martini, from: '#1A1418', to: '#6E4B5E' },
  { id: 'nanny', icon: Baby, from: '#2E2622', to: '#A68C78' },
  { id: 'cleaning', icon: WashingMachine, from: '#1F2326', to: '#7D878D' },
  { id: 'beauty', icon: Sparkles, from: '#2B1F1D', to: '#9C7066' },
  { id: 'helicopter', icon: Helicopter, from: '#0F0E0C', to: '#4A4238' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryOf(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export const isCategory = (v: string | null | undefined): v is CategoryId =>
  Boolean(v) && CATEGORY_IDS.includes(v as CategoryId);

/** Rentals and stays are booked over a date range (days / nights). */
export const usesDateRange = (unit: PriceUnit) => unit === 'day' || unit === 'night';

/** Days between two YYYY-MM-DD dates (0 when invalid). */
export function daysBetween(start: string, end: string | null): number {
  if (!start || !end) return 0;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86_400_000)) : 0;
}

/**
 * Price estimate shown in the booking widget. The server recomputes it in
 * public._booking_amount (same rules) — the app never decides what is charged.
 */
export function estimateAmount(offer: Pick<Offer, 'priceThb' | 'priceUnit' | 'options'>, qty: number, units: number, optionIds: string[]): number {
  const mult = {
    person: qty,
    group: 1,
    day: units * qty,
    night: units,
    hour: qty,
    item: qty,
  }[offer.priceUnit];
  let total = offer.priceThb * mult;
  for (const opt of offer.options as OfferOption[]) {
    if (optionIds.includes(opt.id)) total += opt.price_thb * (opt.per === 'unit' ? mult : 1);
  }
  return total;
}

/** Delivery fee for a mode, or null when the offer doesn't deliver that way (mirrors create_booking). */
export function deliveryFee(offer: Pick<Offer, 'deliveryAirportThb' | 'deliveryAddressThb'>, mode: DeliveryMode): number | null {
  if (mode === 'airport') return offer.deliveryAirportThb;
  if (mode === 'address') return offer.deliveryAddressThb;
  return 0;
}

export const offersDelivery = (offer: Pick<Offer, 'deliveryAirportThb' | 'deliveryAddressThb'>) =>
  offer.deliveryAirportThb !== null || offer.deliveryAddressThb !== null;

/** Flight number as stored by the server: upper case, no spaces (e.g. "TG201"). */
export const normalizeFlight = (v: string) => v.replace(/\s/g, '').toUpperCase();
export const isFlightNumber = (v: string) => /^[A-Z0-9]{3,8}$/.test(normalizeFlight(v));

/** Today in Phuket (UTC+7) as YYYY-MM-DD, so date pickers don't offer "yesterday" late at night. */
export function todayInPhuket(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
