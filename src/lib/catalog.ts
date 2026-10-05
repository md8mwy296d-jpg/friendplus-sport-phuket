import {
  Baby, BedDouble, Helicopter, Martini, Motorbike, Sailboat, Sparkles, TreePalm, WashingMachine, type LucideIcon,
} from 'lucide-react';
import type { CategoryId, Offer, OfferOption, PriceUnit } from './types';

export interface Category {
  id: CategoryId;
  icon: LucideIcon;
  /** Two colours for the tile gradient / photo placeholder. */
  from: string;
  to: string;
}

/** The 9 services, in display order. Labels come from i18n: `cat.<id>` and `cat.<id>.tagline`. */
export const CATEGORIES: Category[] = [
  { id: 'scooter', icon: Motorbike, from: '#FF6B4A', to: '#FFB547' },
  { id: 'excursion', icon: TreePalm, from: '#0E8C7F', to: '#2FBFA5' },
  { id: 'boat', icon: Sailboat, from: '#1F6FB2', to: '#2FBFA5' },
  { id: 'stay', icon: BedDouble, from: '#1E5945', to: '#0E8C7F' },
  { id: 'nightlife', icon: Martini, from: '#5B3CC4', to: '#C04CD8' },
  { id: 'nanny', icon: Baby, from: '#F38BA0', to: '#FFB547' },
  { id: 'cleaning', icon: WashingMachine, from: '#2FA6D8', to: '#7AD3C9' },
  { id: 'beauty', icon: Sparkles, from: '#D94C8A', to: '#FF8C7A' },
  { id: 'helicopter', icon: Helicopter, from: '#0B2E2B', to: '#3E6E8E' },
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
  }[offer.priceUnit];
  let total = offer.priceThb * mult;
  for (const opt of offer.options as OfferOption[]) {
    if (optionIds.includes(opt.id)) total += opt.price_thb * (opt.per === 'unit' ? mult : 1);
  }
  return total;
}

/** Today in Phuket (UTC+7) as YYYY-MM-DD, so date pickers don't offer "yesterday" late at night. */
export function todayInPhuket(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
