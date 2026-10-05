/** Languages bundled with the app. */
export type BaseLang = 'fr' | 'en' | 'ru' | 'th';
/** Languages loaded on demand from src/locales/<code>.json. */
export type ExtraLang =
  | 'es' | 'pt' | 'de' | 'nl' | 'sv' | 'pl' | 'uk' | 'tr' | 'ku' | 'kk' | 'uz'
  | 'ar' | 'ary' | 'ur' | 'hi' | 'zh' | 'ja' | 'ko' | 'ms';
export type Lang = BaseLang | ExtraLang;

export type CategoryId =
  | 'arrival' | 'scooter' | 'excursion' | 'boat' | 'stay' | 'nightlife' | 'nanny' | 'cleaning' | 'beauty' | 'helicopter';

/** How the base price multiplies (mirrors public._booking_amount in supabase/myphuketkey.sql). */
export type PriceUnit = 'person' | 'group' | 'day' | 'night' | 'hour' | 'item';

/** none = picked up / meeting point, airport = handed over on landing, address = delivered to the hotel or villa. */
export type DeliveryMode = 'none' | 'airport' | 'address';

export interface OfferOption {
  id: string;
  label: string;
  price_thb: number;
  /** 'unit' multiplies like the base price, 'booking' is counted once. */
  per: 'unit' | 'booking';
}

export interface Offer {
  id: string;
  slug: string;
  category: CategoryId;
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  area: string;
  meetingPoint: string;
  durationLabel: string;
  priceThb: number;
  priceUnit: PriceUnit;
  minQty: number;
  maxQty: number;
  options: OfferOption[];
  photos: string[];
  rating: number;
  reviewCount: number;
  cancellation: string;
  featured: boolean;
  active: boolean;
  sort: number;
  /** Delivery fees in THB; null = not offered. */
  deliveryAirportThb: number | null;
  deliveryAddressThb: number | null;
  /** What this offer settles for the landing (arrival checklist). */
  arrivalCovers: ArrivalNeed[];
}

export type ArrivalNeed = 'welcome' | 'ride' | 'bags';

export type BookingStatus =
  | 'pending_payment' | 'paid' | 'confirmed' | 'completed' | 'cancelled' | 'refunded' | 'expired';

export interface Booking {
  id: string;
  ref: string;
  offerId: string | null;
  offerTitle: string;
  category: CategoryId;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  startTime: string;
  qty: number;
  units: number;
  options: OfferOption[];
  amountThb: number;
  status: BookingStatus;
  contactName: string;
  contactPhone: string;
  pickup: string;
  notes: string;
  adminNote: string;
  paidAt: string | null;
  createdAt: string;
  delivery: DeliveryMode;
  deliveryFeeThb: number;
  deliveryAddress: string;
  flightNumber: string;
  /** Admin listing only. */
  email?: string;
  trip?: Trip | null;
}

export type StayType = 'hotel' | 'villa' | 'condo' | 'other';

/** The customer's arrival: flight, dates and where they stay. */
export interface Trip {
  arrivalDate: string; // YYYY-MM-DD or ''
  arrivalTime: string; // HH:MM or ''
  flightNumber: string;
  departureDate: string;
  stayType: StayType;
  stayName: string;
  stayAddress: string;
  travelers: number;
  bags: number;
  notes: string;
}

export interface Profile {
  id: string;
  name: string;
  nationality: string; // flag emoji
  countryCode: string;
  lang: Lang;
  phone: string;
  onboarded: boolean;
}

export interface ToastItem {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'error' | 'celebration';
  title: string;
  body?: string;
}
