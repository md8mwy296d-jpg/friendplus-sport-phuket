import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { Session as AuthSession } from '@supabase/supabase-js';
import type { Invitation, Session, Sport, StoreState, ToastItem, User, Venue, Level, Lang } from './types';
import { useI18n } from './i18n';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { DEFAULT_RATES, FIXED_QUOTA, pricePerPlayer, type Rates, type SportRate } from './sports';

/** Kept for backward compatibility with older imports (no longer used for data). */
export const STORAGE_KEY = 'friendplus.v1';

export interface CreateSessionInput {
  sport: Sport;
  title: string;
  venueId: string;
  date: string; // ISO
  durationMin: number;
  quota: number;
  level: Level | 'all';
  mixed: boolean;
  description: string;
  confirmHoursBefore?: 24 | 48;
}

export interface ProfilePatch {
  name?: string;
  nationality?: string;
  countryCode?: string;
  lang?: Lang;
  sports?: Sport[];
  level?: Level;
  bio?: string;
  onboarded?: boolean;
  avatarColor?: number | null;
}

export interface StoreContextValue {
  // state
  state: StoreState;
  toasts: ToastItem[];
  currentUser: User;
  users: User[];
  venues: Venue[];
  /** Fixed prices per sport (public.sport_rates). */
  rates: Rates;
  sessions: Session[];
  invitations: Invitation[];
  // auth
  ready: boolean; // first load finished
  isAuthenticated: boolean;
  profileLoaded: boolean; // profile of the signed-in user fetched at least once
  profileComplete: boolean;
  email: string;
  configured: boolean;
  // getters
  getUser: (id: string) => User | undefined;
  getVenue: (id: string) => Venue | undefined;
  getSession: (id: string) => Session | undefined;
  pendingInvitesForMe: Invitation[];
  // actions
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  cancelSession: (sessionId: string) => Promise<boolean>;
  createSession: (input: CreateSessionInput) => Session;
  sendInvitation: (sessionId: string, toUserId: string, message?: string) => void;
  respondInvitation: (invitationId: string, accept: boolean) => void;
  updateProfile: (patch: ProfilePatch) => Promise<boolean>;
  /** Resizes the picture, stores it and makes it the profile photo. */
  uploadAvatar: (file: File) => Promise<boolean>;
  removeAvatar: () => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Legacy name used by the UI: now signs the user out. */
  resetDemo: () => void;
  dismissToast: (id: string) => void;
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 320;

/** Square-crops and downsizes a picture so phone photos upload fast and stay small. */
async function resizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode_failed'))), 'image/jpeg', 0.86);
  });
}

/* ------------------------------ row mappers ------------------------------ */

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function toUser(r: Row): User {
  return {
    id: r.id,
    name: r.name || '',
    nationality: r.nationality || '🌍',
    countryCode: r.country_code || '',
    lang: (r.lang || 'fr') as Lang,
    sports: (r.sports || []) as Sport[],
    level: (r.level || 'beginner') as Level,
    rating: Number(r.rating ?? 5),
    bio: r.bio || '',
    joinedCount: r.joined_count ?? 0,
    organizedCount: r.organized_count ?? 0,
    avatarUrl: r.avatar_path ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(r.avatar_path).data.publicUrl : '',
    avatarColor: r.avatar_color ?? null,
    certified: Boolean(r.certified),
    fairplayPct: r.fairplay_pct ?? null,
    activityPct: r.activity_pct ?? 0,
    score: r.score ?? null,
    reviewCount: r.review_count ?? 0,
  };
}

function toVenue(r: Row): Venue {
  return {
    id: r.id,
    name: r.name,
    area: r.area,
    sports: (r.sports || []) as Sport[],
    address: r.address || '',
    rating: Number(r.rating ?? 0),
    priceFrom: r.price_from ?? 0,
    photo: r.photo || '',
    amenities: r.amenities || [],
    hours: r.hours || '',
  };
}

function toSession(r: Row): Session {
  const members: { user_id: string; kind: string; joined_at: string }[] = [...(r.session_players || [])]
    .sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)));
  return {
    id: r.id,
    sport: r.sport,
    title: r.title,
    venueId: r.venue_id,
    date: r.starts_at,
    durationMin: r.duration_min,
    quota: r.quota,
    playerIds: members.filter((m) => m.kind === 'player').map((m) => m.user_id),
    waitlistIds: members.filter((m) => m.kind === 'waitlist').map((m) => m.user_id),
    pricePerPerson: r.price_per_person,
    level: r.level,
    mixed: r.mixed,
    status: r.status,
    confirmationDeadline: r.confirmation_deadline,
    creatorId: r.creator_id,
    description: r.description || '',
    createdAt: r.created_at,
  };
}

function toInvitation(r: Row): Invitation {
  return {
    id: r.id,
    sessionId: r.session_id,
    fromUserId: r.from_user_id,
    toUserId: r.to_user_id,
    status: r.status,
    message: r.message || '',
    createdAt: r.created_at,
  };
}

const GUEST: User = {
  id: '',
  name: '',
  nationality: '🌍',
  countryCode: '',
  lang: 'fr',
  sports: [],
  level: 'beginner',
  rating: 5,
  bio: '',
  joinedCount: 0,
  organizedCount: 0,
  avatarUrl: '',
  avatarColor: null,
  certified: false,
  fairplayPct: null,
  activityPct: 0,
  score: null,
  reviewCount: 0,
};

const KNOWN_ERRORS = [
  'not_authenticated', 'profile_incomplete', 'session_closed', 'not_found', 'too_soon', 'too_far',
  'too_many_sessions', 'venue_sport_mismatch', 'not_allowed', 'rate_limited', 'invalid_input',
];

function errorKey(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? '';
  const code = KNOWN_ERRORS.find((k) => msg.includes(k));
  return code ? `err.${code}` : 'err.generic';
}

/* -------------------------------- provider -------------------------------- */

export function StoreProvider({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [me, setMe] = useState<{ onboarded: boolean; createdAt: string } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const myId = auth?.user.id ?? '';
  const prevStatuses = useRef<Map<string, Session['status']>>(new Map());
  const pendingCreates = useRef<Map<string, Promise<boolean>>>(new Map());
  const reloadTimer = useRef<number | undefined>(undefined);

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
  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setDataReady(true); return; }
    const since = new Date(Date.now() - 45 * 24 * 3600_000).toISOString();
    const [vRes, sRes, uRes, iRes] = await Promise.all([
      supabase.from('venues').select('*').order('name'),
      supabase
        .from('sessions')
        .select('*, session_players(user_id, kind, joined_at)')
        .gte('starts_at', since)
        .order('starts_at', { ascending: true })
        .limit(500),
      supabase.from('public_profiles').select('*').limit(2000),
      myId
        ? supabase.from('invitations').select('*').order('created_at', { ascending: false }).limit(300)
        : Promise.resolve({ data: [] as Row[], error: null }),
    ]);
    const firstError = vRes.error || sRes.error || uRes.error || iRes.error;
    if (firstError) { console.error(firstError); setDataReady(true); return; }

    const nextSessions = ((sRes.data ?? []) as Row[]).map(toSession);

    // status transitions on sessions I'm in → celebratory / warning toasts
    if (myId && prevStatuses.current.size > 0) {
      for (const s of nextSessions) {
        const before = prevStatuses.current.get(s.id);
        if (!before || before === s.status || !s.playerIds.includes(myId)) continue;
        if (s.status === 'confirmed') {
          pushToast({ kind: 'celebration', title: t('toast.confirmed'), body: t('toast.confirmedBody', { title: s.title }) });
        } else if (s.status === 'cancelled') {
          pushToast({ kind: 'error', title: t('toast.cancelled'), body: t('toast.cancelledBody', { title: s.title }) });
        }
      }
    }
    prevStatuses.current = new Map(nextSessions.map((s) => [s.id, s.status]));

    const profileRows = (uRes.data ?? []) as Row[];
    // only players who finished onboarding are listed (plus myself)
    setUsers(profileRows.filter((r) => r.onboarded || r.id === myId).map(toUser));
    setVenues(((vRes.data ?? []) as Row[]).map(toVenue));
    // prices are fixed by FRIEND+; a missing table simply keeps the built-in defaults
    const { data: rateRows } = await supabase.from('sport_rates').select('sport, amount, per');
    if (rateRows?.length) {
      const next: Rates = { ...DEFAULT_RATES };
      for (const r of rateRows as Row[]) next[r.sport as Sport] = { amount: r.amount, per: r.per } as SportRate;
      setRates(next);
    }
    setSessions(nextSessions);
    setInvitations(((iRes.data ?? []) as Row[]).map(toInvitation));

    if (myId) {
      const row = profileRows.find((r) => r.id === myId);
      setMe({ onboarded: Boolean(row?.onboarded), createdAt: row?.created_at ?? new Date().toISOString() });
    } else {
      setMe(null);
    }
    setDataReady(true);
  }, [myId, pushToast, t]);

  const scheduleReload = useCallback(() => {
    window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => { void load(); }, 400);
  }, [load]);

  // initial load + reload when the signed-in user changes
  useEffect(() => {
    if (!authReady) return;
    const run = async () => {
      if (SUPABASE_CONFIGURED) {
        // settle any session whose confirmation deadline has passed
        const { error } = await supabase.rpc('evaluate_sessions');
        if (error) console.warn('evaluate_sessions', error.message);
      }
      await load();
    };
    void run();
  }, [authReady, load]);

  // live updates (realtime) + periodic deadline check
  useEffect(() => {
    if (!SUPABASE_CONFIGURED || !authReady) return;
    const channel = supabase
      .channel('friendplus-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_players' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, scheduleReload)
      .subscribe();
    const interval = window.setInterval(async () => {
      const { data } = await supabase.rpc('evaluate_sessions');
      if (typeof data === 'number' && data > 0) scheduleReload();
    }, 60_000);
    const onFocus = () => scheduleReload();
    window.addEventListener('focus', onFocus);
    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [authReady, scheduleReload]);

  // Adopt the profile language once, right after sign-in
  const langSynced = useRef('');
  useEffect(() => {
    if (!myId || langSynced.current === myId || !me) return;
    const mine = users.find((u) => u.id === myId);
    if (!mine) return;
    langSynced.current = myId;
    if (me.onboarded && mine.lang !== lang) setLang(mine.lang);
  }, [myId, users, me, lang, setLang]);

  /* ------------------------------ helpers ------------------------------ */
  const requireAuth = useCallback((): boolean => {
    if (myId && me?.onboarded) return true;
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(myId ? `/bienvenue?next=${next}` : `/connexion?next=${next}`);
    return false;
  }, [myId, me, location.pathname, location.search, navigate]);

  /* ------------------------------ actions ------------------------------ */
  const joinSession = useCallback((sessionId: string) => {
    if (!requireAuth()) return;
    const s = sessions.find((x) => x.id === sessionId);
    void (async () => {
      const { data, error } = await supabase.rpc('join_session', { p_session: sessionId });
      if (error) { pushError(error); return; }
      await load();
      if (data === 'joined') {
        pushToast({ kind: 'success', title: t('toast.joined'), body: t('toast.joinedBody', { title: s?.title ?? '', count: (s?.playerIds.length ?? 0) + 1, quota: s?.quota ?? 0 }) });
      } else if (data === 'lastSpot') {
        pushToast({ kind: 'celebration', title: t('toast.lastSpot'), body: t('toast.lastSpotBody') });
      } else if (data === 'waitlist') {
        pushToast({ kind: 'warning', title: t('toast.waitlist') });
      } else if (data === 'already') {
        pushToast({ kind: 'info', title: t('toast.alreadyJoined') });
      }
    })();
  }, [requireAuth, load, sessions, pushToast, pushError, t]);

  const leaveSession = useCallback((sessionId: string) => {
    if (!requireAuth()) return;
    void (async () => {
      const { error } = await supabase.rpc('leave_session', { p_session: sessionId });
      if (error) { pushError(error); return; }
      await load();
      pushToast({ kind: 'info', title: t('toast.leftSession') });
    })();
  }, [requireAuth, load, pushToast, pushError, t]);

  const cancelSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!requireAuth()) return false;
    const { error } = await supabase.rpc('cancel_session', { p_session: sessionId });
    if (error) { pushError(error); return false; }
    await load();
    return true;
  }, [requireAuth, load, pushError]);

  const createSession = useCallback((input: CreateSessionInput): Session => {
    const hoursBefore = input.confirmHoursBefore ?? 24;
    const id = crypto.randomUUID();
    const optimistic: Session = {
      id,
      sport: input.sport,
      title: input.title,
      venueId: input.venueId,
      date: input.date,
      durationMin: input.durationMin,
      quota: FIXED_QUOTA[input.sport] ?? input.quota,
      playerIds: [myId],
      waitlistIds: [],
      // shown until the server answers; create_session() recomputes it from sport_rates
      pricePerPerson: pricePerPlayer(rates, input.sport, input.durationMin, input.quota),
      level: input.level,
      mixed: input.mixed,
      status: 'open',
      confirmationDeadline: new Date(new Date(input.date).getTime() - hoursBefore * 3600_000).toISOString(),
      creatorId: myId,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
    if (!requireAuth()) return optimistic;
    setSessions((prev) => [optimistic, ...prev]);

    const promise = (async () => {
      const { error } = await supabase.rpc('create_session', {
        p_id: id,
        p_sport: input.sport,
        p_title: input.title,
        p_venue_id: input.venueId,
        p_starts_at: input.date,
        p_duration_min: input.durationMin,
        p_quota: input.quota,
        p_price: 0, // ignored: the server applies the fixed rate
        p_level: input.level,
        p_mixed: input.mixed,
        p_description: input.description,
        p_confirm_hours: hoursBefore,
      });
      if (error) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        pushError(error);
        return false;
      }
      await load();
      pushToast({ kind: 'success', title: t('toast.sessionCreated'), body: t('toast.sessionCreatedBody') });
      return true;
    })();
    pendingCreates.current.set(id, promise);
    void promise.finally(() => pendingCreates.current.delete(id));
    return optimistic;
  }, [myId, rates, requireAuth, load, pushToast, pushError, t]);

  const sendInvitation = useCallback((sessionId: string, toUserId: string, message = '') => {
    if (!requireAuth()) return;
    const target = users.find((u) => u.id === toUserId);
    void (async () => {
      const pending = pendingCreates.current.get(sessionId);
      if (pending && !(await pending)) return; // session creation failed
      const { error } = await supabase.rpc('send_invitation', { p_session: sessionId, p_to: toUserId, p_message: message });
      if (error) { pushError(error); return; }
      pushToast({ kind: 'info', title: t('toast.inviteSent', { name: target?.name ?? '' }) });
      scheduleReload();
    })();
  }, [requireAuth, users, pushToast, pushError, scheduleReload, t]);

  const respondInvitation = useCallback((invitationId: string, accept: boolean) => {
    if (!requireAuth()) return;
    setInvitations((prev) => prev.map((i) => (i.id === invitationId ? { ...i, status: accept ? 'accepted' : 'declined' } : i)));
    void (async () => {
      const { error } = await supabase.rpc('respond_invitation', { p_invitation: invitationId, p_accept: accept });
      if (error) pushError(error);
      await load();
    })();
  }, [requireAuth, load, pushError]);

  const updateProfile = useCallback(async (patch: ProfilePatch): Promise<boolean> => {
    if (!myId) return false;
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 60);
    if (patch.nationality !== undefined) row.nationality = patch.nationality;
    if (patch.countryCode !== undefined) row.country_code = patch.countryCode;
    if (patch.lang !== undefined) row.lang = patch.lang;
    if (patch.sports !== undefined) row.sports = patch.sports;
    if (patch.level !== undefined) row.level = patch.level;
    if (patch.bio !== undefined) row.bio = patch.bio.slice(0, 140);
    if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
    if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor;
    const { error } = await supabase.from('profiles').update(row).eq('id', myId);
    if (error) { pushError(error); return false; }
    await load();
    return true;
  }, [myId, load, pushError]);

  const currentAvatarPath = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.from('profiles').select('avatar_path').eq('id', myId).maybeSingle();
    return (data?.avatar_path as string | null) ?? null;
  }, [myId]);

  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!myId) return false;
    try {
      const blob = await resizeAvatar(file);
      const previous = await currentAvatarPath();
      const path = `${myId}/${Date.now().toString(36)}.jpg`;
      const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (up.error) throw up.error;
      const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', myId);
      if (error) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path]);
        throw error;
      }
      if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
      await load();
      return true;
    } catch (err) {
      pushError(err);
      return false;
    }
  }, [myId, currentAvatarPath, load, pushError]);

  const removeAvatar = useCallback(async (): Promise<boolean> => {
    if (!myId) return false;
    const previous = await currentAvatarPath();
    const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', myId);
    if (error) { pushError(error); return false; }
    if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    await load();
    return true;
  }, [myId, currentAvatarPath, load, pushError]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setInvitations([]);
    setMe(null);
    prevStatuses.current = new Map();
    langSynced.current = '';
    navigate('/');
  }, [navigate]);

  const resetDemo = useCallback(() => { void signOut(); }, [signOut]);

  /* ------------------------------- value ------------------------------- */
  const value = useMemo<StoreContextValue>(() => {
    const currentUser = users.find((u) => u.id === myId) ?? { ...GUEST, id: myId, lang };
    const state: StoreState = {
      currentUserId: myId,
      users,
      venues,
      sessions,
      invitations,
      seededAt: me?.createdAt ?? new Date().toISOString(),
    };
    return {
      state,
      toasts,
      currentUser,
      users,
      venues,
      rates,
      sessions,
      invitations,
      ready: authReady && dataReady,
      isAuthenticated: Boolean(myId),
      profileLoaded: !myId || me !== null,
      profileComplete: Boolean(me?.onboarded),
      email: auth?.user.email ?? '',
      configured: SUPABASE_CONFIGURED,
      getUser: (id) => users.find((u) => u.id === id),
      getVenue: (id) => venues.find((v) => v.id === id),
      getSession: (id) => sessions.find((s) => s.id === id),
      pendingInvitesForMe: invitations.filter((i) => i.toUserId === myId && i.status === 'pending'),
      joinSession,
      leaveSession,
      cancelSession,
      createSession,
      sendInvitation,
      respondInvitation,
      updateProfile,
      uploadAvatar,
      removeAvatar,
      signOut,
      resetDemo,
      dismissToast,
      pushToast,
      refresh: load,
    };
  }, [users, myId, lang, venues, rates, sessions, invitations, me, toasts, authReady, dataReady, auth,
    joinSession, leaveSession, cancelSession, createSession, sendInvitation, respondInvitation,
    updateProfile, uploadAvatar, removeAvatar, signOut, resetDemo, dismissToast, pushToast, load]);

  return createElement(StoreContext.Provider, { value }, children);
}
