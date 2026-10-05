import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { Session as AuthSession } from '@supabase/supabase-js';
import type { Booking, BookingStatus, CategoryId, Lang, Offer, OfferOption, Profile, ToastItem } from './types';
import { useI18n } from './i18n';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

export interface ProfilePatch {
  name?: string;
  nationality?: string;
  countryCode?: string;
  lang?: Lang;
  phone?: string;
  onboarded?: boolean;
}

export interface BookingInput {
  offerId: string;
  startDate: string;
  endDate: string | null;
  startTime: string;
  qty: number;
  optionIds: string[];
  contactName: string;
  contactPhone: string;
  pickup: string;
  notes: string;
}

/** Offer as edited in the admin form (snake_case, sent as-is to admin_save_offer). */
export interface OfferDraft {
  id?: string;
  slug: string;
  category: CategoryId;
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  included: string[];
  not_included: string[];
  area: string;
  meeting_point: string;
  duration_label: string;
  price_thb: number;
  price_unit: Offer['priceUnit'];
  min_qty: number;
  max_qty: number;
  options: OfferOption[];
  photos: string[];
  rating: number;
  review_count: number;
  cancellation: string;
  featured: boolean;
  active: boolean;
  sort: number;
}

export interface StoreContextValue {
  toasts: ToastItem[];
  configured: boolean;
  // auth
  ready: boolean; // first load finished
  isAuthenticated: boolean;
  profileLoaded: boolean;
  profileComplete: boolean;
  isAdmin: boolean;
  email: string;
  profile: Profile | null;
  // data
  offers: Offer[];
  offersReady: boolean;
  bookings: Booking[];
  getOffer: (slug: string) => Offer | undefined;
  // actions
  updateProfile: (patch: ProfilePatch) => Promise<boolean>;
  createBooking: (input: BookingInput) => Promise<string | null>;
  payBooking: (bookingId: string) => Promise<boolean>;
  cancelUnpaidBooking: (bookingId: string) => Promise<boolean>;
  refreshBookings: () => Promise<void>;
  refreshOffers: () => Promise<void>;
  signOut: () => Promise<void>;
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  pushError: (err: unknown) => void;
  dismissToast: (id: string) => void;
  // admin
  adminBookings: () => Promise<Booking[]>;
  adminSetBookingStatus: (id: string, status: BookingStatus, note?: string) => Promise<boolean>;
  adminSaveOffer: (draft: OfferDraft) => Promise<string | null>;
  adminUploadPhoto: (file: File) => Promise<string | null>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/* ------------------------------ row mappers ------------------------------ */

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function toOffer(r: Row): Offer {
  return {
    id: r.id,
    slug: r.slug,
    category: r.category,
    title: r.title,
    summary: r.summary || '',
    description: r.description || '',
    highlights: r.highlights || [],
    included: r.included || [],
    notIncluded: r.not_included || [],
    area: r.area || '',
    meetingPoint: r.meeting_point || '',
    durationLabel: r.duration_label || '',
    priceThb: r.price_thb,
    priceUnit: r.price_unit,
    minQty: r.min_qty ?? 1,
    maxQty: r.max_qty ?? 10,
    options: Array.isArray(r.options) ? r.options : [],
    photos: r.photos || [],
    rating: Number(r.rating ?? 5),
    reviewCount: r.review_count ?? 0,
    cancellation: r.cancellation || '',
    featured: Boolean(r.featured),
    active: r.active !== false,
    sort: r.sort ?? 0,
  };
}

function toBooking(r: Row): Booking {
  return {
    id: r.id,
    ref: r.ref,
    offerId: r.offer_id ?? null,
    offerTitle: r.offer_title,
    category: r.category,
    startDate: r.start_date,
    endDate: r.end_date ?? null,
    startTime: r.start_time || '',
    qty: r.qty,
    units: r.units ?? 1,
    options: Array.isArray(r.options) ? r.options : [],
    amountThb: r.amount_thb,
    status: r.status,
    contactName: r.contact_name || '',
    contactPhone: r.contact_phone || '',
    pickup: r.pickup || '',
    notes: r.notes || '',
    adminNote: r.admin_note || '',
    paidAt: r.paid_at ?? null,
    createdAt: r.created_at,
    email: r.email ?? undefined,
  };
}

function toProfile(r: Row): Profile {
  return {
    id: r.id,
    name: r.name || '',
    nationality: r.nationality || '🌍',
    countryCode: r.country_code || '',
    lang: (r.lang || 'en') as Lang,
    phone: r.phone || '',
    onboarded: Boolean(r.onboarded),
  };
}

const KNOWN_ERRORS = [
  'not_authenticated', 'not_found', 'not_allowed', 'rate_limited', 'invalid_input', 'invalid_date',
  'invalid_quantity', 'invalid_contact', 'not_payable', 'payments_not_configured',
];

export function errorKey(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? String(err ?? '');
  const code = KNOWN_ERRORS.find((k) => msg.includes(k));
  return code ? `err.${code}` : 'err.generic';
}

/* -------------------------------- provider -------------------------------- */

export function StoreProvider({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersReady, setOffersReady] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const myId = auth?.user.id ?? '';

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  const pushError = useCallback((err: unknown) => {
    console.error(err);
    pushToast({ kind: 'error', title: t(errorKey(err)) });
  }, [pushToast, t]);

  /* ------------------------------- auth ------------------------------- */
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) { setAuthReady(true); return; }
    void supabase.auth.getSession().then(({ data }) => {
      setAuth(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setAuth(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ------------------------------- data ------------------------------- */
  const refreshOffers = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setOffersReady(true); return; }
    const { data, error } = await supabase.from('offers').select('*').order('sort').order('created_at');
    if (error) console.error(error);
    setOffers(((data ?? []) as Row[]).map(toOffer));
    setOffersReady(true);
  }, []);

  const refreshBookings = useCallback(async () => {
    if (!SUPABASE_CONFIGURED || !myId) { setBookings([]); return; }
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', myId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { console.error(error); return; }
    setBookings(((data ?? []) as Row[]).map(toBooking));
  }, [myId]);

  const loadMe = useCallback(async () => {
    if (!SUPABASE_CONFIGURED || !myId) {
      setProfile(null);
      setIsAdmin(false);
      setProfileLoaded(true);
      return;
    }
    const [pRes, aRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', myId).maybeSingle(),
      supabase.from('app_admins').select('user_id').eq('user_id', myId),
    ]);
    if (pRes.error) console.error(pRes.error);
    setProfile(pRes.data ? toProfile(pRes.data as Row) : null);
    setIsAdmin(((aRes.data ?? []) as Row[]).length > 0);
    setProfileLoaded(true);
  }, [myId]);

  // offers are public: load them right away (and again after sign-in, for admins who see inactive ones)
  useEffect(() => { if (authReady) void refreshOffers(); }, [authReady, myId, refreshOffers]);

  useEffect(() => {
    if (!authReady) return;
    setProfileLoaded(false);
    void loadMe();
    void refreshBookings();
  }, [authReady, loadMe, refreshBookings]);

  // adopt the profile language once, right after sign-in
  const langSynced = useRef('');
  useEffect(() => {
    if (!profile || langSynced.current === profile.id) return;
    langSynced.current = profile.id;
    if (profile.onboarded && profile.lang !== lang) setLang(profile.lang);
  }, [profile, lang, setLang]);

  /* ------------------------------ actions ------------------------------ */
  const updateProfile = useCallback(async (patch: ProfilePatch): Promise<boolean> => {
    if (!myId) return false;
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 60);
    if (patch.nationality !== undefined) row.nationality = patch.nationality;
    if (patch.countryCode !== undefined) row.country_code = patch.countryCode;
    if (patch.lang !== undefined) row.lang = patch.lang;
    if (patch.phone !== undefined) row.phone = patch.phone.trim().slice(0, 30);
    if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
    const { error } = await supabase.from('profiles').update(row).eq('id', myId);
    if (error) { pushError(error); return false; }
    await loadMe();
    return true;
  }, [myId, loadMe, pushError]);

  const createBooking = useCallback(async (input: BookingInput): Promise<string | null> => {
    const { data, error } = await supabase.rpc('create_booking', {
      p_offer: input.offerId,
      p_start: input.startDate,
      p_end: input.endDate,
      p_time: input.startTime,
      p_qty: input.qty,
      p_options: input.optionIds,
      p_contact_name: input.contactName,
      p_contact_phone: input.contactPhone,
      p_pickup: input.pickup,
      p_notes: input.notes,
    });
    if (error) { pushError(error); return null; }
    await refreshBookings();
    return data as string;
  }, [pushError, refreshBookings]);

  /** Opens Stripe Checkout for an unpaid booking (full-page redirect). */
  const payBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: { booking_id: bookingId } });
    let code = '';
    if (error) {
      // the function answers {error: "..."} with a 4xx/5xx status
      try { code = String((await (error as { context?: Response }).context?.json())?.error ?? ''); } catch { code = ''; }
      pushError(new Error(code || error.message));
      return false;
    }
    const url = (data as { url?: string } | null)?.url;
    if (!url) { pushError(new Error('err.generic')); return false; }
    window.location.assign(url);
    return true;
  }, [pushError]);

  const cancelUnpaidBooking = useCallback(async (bookingId: string) => {
    const { error } = await supabase.rpc('cancel_unpaid_booking', { p_booking: bookingId });
    if (error) { pushError(error); return false; }
    await refreshBookings();
    return true;
  }, [pushError, refreshBookings]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setBookings([]);
    setProfile(null);
    setIsAdmin(false);
    langSynced.current = '';
    navigate('/');
  }, [navigate]);

  /* -------------------------------- admin -------------------------------- */
  const adminBookings = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_bookings', { p_limit: 500 });
    if (error) { pushError(error); return []; }
    return ((data ?? []) as Row[]).map(toBooking);
  }, [pushError]);

  const adminSetBookingStatus = useCallback(async (id: string, status: BookingStatus, note?: string) => {
    const { error } = await supabase.rpc('admin_set_booking_status', { p_booking: id, p_status: status, p_note: note ?? null });
    if (error) { pushError(error); return false; }
    return true;
  }, [pushError]);

  const adminSaveOffer = useCallback(async (draft: OfferDraft) => {
    const { data, error } = await supabase.rpc('admin_save_offer', { p: draft });
    if (error) { pushError(error); return null; }
    await refreshOffers();
    return data as string;
  }, [pushError, refreshOffers]);

  const adminUploadPhoto = useCallback(async (file: File) => {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('offer-photos').upload(path, file, { contentType: file.type });
    if (error) { pushError(error); return null; }
    return supabase.storage.from('offer-photos').getPublicUrl(path).data.publicUrl;
  }, [pushError]);

  /* ------------------------------- value ------------------------------- */
  const value = useMemo<StoreContextValue>(() => ({
    toasts,
    configured: SUPABASE_CONFIGURED,
    ready: authReady && profileLoaded,
    isAuthenticated: Boolean(myId),
    profileLoaded: !myId || profileLoaded,
    profileComplete: Boolean(profile?.onboarded),
    isAdmin,
    email: auth?.user.email ?? '',
    profile,
    offers,
    offersReady,
    bookings,
    getOffer: (slug) => offers.find((o) => o.slug === slug),
    updateProfile,
    createBooking,
    payBooking,
    cancelUnpaidBooking,
    refreshBookings,
    refreshOffers,
    signOut,
    pushToast,
    pushError,
    dismissToast,
    adminBookings,
    adminSetBookingStatus,
    adminSaveOffer,
    adminUploadPhoto,
  }), [toasts, authReady, profileLoaded, myId, profile, isAdmin, auth, offers, offersReady, bookings,
    updateProfile, createBooking, payBooking, cancelUnpaidBooking, refreshBookings, refreshOffers, signOut,
    pushToast, pushError, dismissToast, adminBookings, adminSetBookingStatus, adminSaveOffer, adminUploadPhoto]);

  return createElement(StoreContext.Provider, { value }, children);
}
