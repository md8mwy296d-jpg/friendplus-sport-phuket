import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { useStore } from './store';
import { useI18n } from './i18n';
import { clubErrorKey, compressImage } from './club';

/* ------------------------------------------------------------------ types */

export type FriendStatus = 'none' | 'friends' | 'outgoing' | 'incoming';

export interface Friendship {
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export type MomentVisibility = 'public' | 'friends';

export interface Moment {
  id: string;
  userId: string;
  body: string;
  imageUrl: string;
  imagePath: string | null;
  sessionId: string | null;
  visibility: MomentVisibility;
  createdAt: string;
}

export interface MomentInput {
  body: string;
  image?: File | null;
  sessionId?: string | null;
  visibility: MomentVisibility;
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const MOMENTS_BUCKET = 'moments';
const PRESENCE_TOPIC = 'online-players';

const toFriendship = (r: Row): Friendship => ({
  requesterId: r.requester_id,
  addresseeId: r.addressee_id,
  status: r.status,
  createdAt: r.created_at,
});

const toMoment = (r: Row): Moment => ({
  id: r.id,
  userId: r.user_id,
  body: r.body ?? '',
  imagePath: r.image_path ?? null,
  imageUrl: r.image_path ? supabase.storage.from(MOMENTS_BUCKET).getPublicUrl(r.image_path).data.publicUrl : '',
  sessionId: r.session_id ?? null,
  visibility: r.visibility,
  createdAt: r.created_at,
});

/* --------------------------------------------------------------- provider */

export interface SocialContextValue {
  enabled: boolean;
  friendships: Friendship[];
  friendIds: string[];
  /** Players who asked me to be their friend, newest first. */
  incomingIds: string[];
  outgoingIds: string[];
  statusWith: (userId: string) => FriendStatus;
  sendRequest: (userId: string) => Promise<boolean>;
  respond: (userId: string, accept: boolean) => Promise<boolean>;
  removeFriend: (userId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  /** Players with the app open right now (Realtime presence). */
  onlineIds: Set<string>;
  /** A friend currently online. */
  isOnline: (userId: string) => boolean;
  /** Last visit of a friend (ISO date), when known. */
  lastSeenOf: (userId: string) => string | undefined;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function useSocial(): SocialContextValue {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { currentUser, isAuthenticated, profileComplete, pushToast } = useStore();
  const { t } = useI18n();
  const myId = currentUser.id;
  const enabled = SUPABASE_CONFIGURED && isAuthenticated && profileComplete;
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const timer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) { setFriendships([]); return; }
    const { data, error } = await supabase.from('friendships').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setFriendships(((data ?? []) as Row[]).map(toFriendship));
  }, [enabled]);

  useEffect(() => { void refresh(); }, [refresh, myId]);

  // requests and acceptances arrive live (RLS limits the stream to my own rows)
  useEffect(() => {
    if (!enabled) return;
    const later = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void refresh(); }, 300);
    };
    const channel = supabase
      .channel(`friends-${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, later)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, myId, refresh]);

  // presence: every open app joins the "online" channel under its player id
  useEffect(() => {
    if (!enabled) { setOnlineIds(new Set()); return; }
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      // supabase.channel() hands back a same-name channel that is still closing: wait for it to go
      const stale = supabase.getChannels().find((c) => c.topic === `realtime:${PRESENCE_TOPIC}`);
      if (stale) await supabase.removeChannel(stale);
      if (cancelled) return;
      const ch = supabase.channel(PRESENCE_TOPIC, { config: { presence: { key: myId } } });
      channel = ch;
      ch
        .on('presence', { event: 'sync' }, () => setOnlineIds(new Set(Object.keys(ch.presenceState()))))
        .on('presence', { event: 'leave' }, ({ key }) => {
          // they just left: "seen a moment ago" until the next refresh
          setLastSeen((prev) => ({ ...prev, [key]: new Date().toISOString() }));
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') void ch.track({ at: new Date().toISOString() });
        });
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, myId]);

  // "seen … ago": note my own visit and read my friends' (friends only, see social.sql §8)
  useEffect(() => {
    if (!enabled) { setLastSeen({}); return; }
    const beat = async () => {
      if (document.visibilityState !== 'visible') return;
      await supabase.rpc('touch_last_seen');
      const { data } = await supabase.rpc('friends_last_seen');
      setLastSeen(Object.fromEntries(((data ?? []) as Row[]).map((r) => [r.user_id as string, r.seen_at as string])));
    };
    void beat();
    const id = window.setInterval(() => { void beat(); }, 120_000);
    const onVisible = () => { void beat(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, myId, friendships.length]);

  const fail = useCallback((err: unknown) => {
    console.error(err);
    pushToast({ kind: 'error', title: t(clubErrorKey(err)) });
  }, [pushToast, t]);

  const sendRequest = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc('send_friend_request', { p_user: userId });
    if (error) { fail(error); return false; }
    pushToast({ kind: 'success', title: t(data === 'accepted' || data === 'friends' ? 'friends.toast.nowFriends' : 'friends.toast.requested') });
    await refresh();
    return true;
  }, [fail, pushToast, refresh, t]);

  const respond = useCallback(async (userId: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_friend_request', { p_user: userId, p_accept: accept });
    if (error) { fail(error); return false; }
    if (accept) pushToast({ kind: 'celebration', title: t('friends.toast.nowFriends') });
    await refresh();
    return true;
  }, [fail, pushToast, refresh, t]);

  const removeFriend = useCallback(async (userId: string) => {
    const { error } = await supabase.rpc('remove_friend', { p_user: userId });
    if (error) { fail(error); return false; }
    await refresh();
    return true;
  }, [fail, refresh]);

  const value = useMemo<SocialContextValue>(() => {
    const other = (f: Friendship) => (f.requesterId === myId ? f.addresseeId : f.requesterId);
    const friendIds = friendships.filter((f) => f.status === 'accepted').map(other);
    const incomingIds = friendships.filter((f) => f.status === 'pending' && f.addresseeId === myId).map(other);
    const outgoingIds = friendships.filter((f) => f.status === 'pending' && f.requesterId === myId).map(other);
    return {
      enabled,
      friendships,
      friendIds,
      incomingIds,
      outgoingIds,
      statusWith: (userId) =>
        friendIds.includes(userId) ? 'friends'
          : incomingIds.includes(userId) ? 'incoming'
            : outgoingIds.includes(userId) ? 'outgoing' : 'none',
      sendRequest,
      respond,
      removeFriend,
      refresh,
      onlineIds,
      isOnline: (userId) => userId !== myId && onlineIds.has(userId) && friendIds.includes(userId),
      lastSeenOf: (userId) => lastSeen[userId],
    };
  }, [enabled, friendships, myId, sendRequest, respond, removeFriend, refresh, onlineIds, lastSeen]);

  return createElement(SocialContext.Provider, { value }, children);
}

/* ---------------------------------------------------------------- moments */

/** Moments shown on a player's page, with posting and deleting for its owner. */
export function useMoments(userId: string | undefined) {
  const { currentUser, pushToast } = useStore();
  const { t } = useI18n();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId || !SUPABASE_CONFIGURED) { setMoments([]); setLoading(false); return; }
    const [mRes, fRes] = await Promise.all([
      supabase.from('moments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
      supabase.rpc('friend_count', { p_user: userId }),
    ]);
    if (mRes.error) console.error(mRes.error);
    setMoments(((mRes.data ?? []) as Row[]).map(toMoment));
    setFriendCount(Number(fRes.data ?? 0));
    setLoading(false);
  }, [userId]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const post = useCallback(async (input: MomentInput): Promise<boolean> => {
    const me = currentUser.id;
    if (!me) return false;
    let path: string | null = null;
    try {
      if (input.image) {
        const blob = await compressImage(input.image);
        path = `${me}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from(MOMENTS_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc('post_moment', {
        p_body: input.body.trim(),
        p_image_path: path,
        p_session: input.sessionId ?? null,
        p_visibility: input.visibility,
      });
      if (error) throw error;
      pushToast({ kind: 'success', title: t('moments.toast.posted') });
      await load();
      return true;
    } catch (err) {
      if (path) await supabase.storage.from(MOMENTS_BUCKET).remove([path]);
      console.error(err);
      pushToast({ kind: 'error', title: t(clubErrorKey(err)) });
      return false;
    }
  }, [currentUser.id, load, pushToast, t]);

  const remove = useCallback(async (moment: Moment) => {
    const { error } = await supabase.from('moments').delete().eq('id', moment.id);
    if (error) { pushToast({ kind: 'error', title: t(clubErrorKey(error)) }); return false; }
    if (moment.imagePath && moment.userId === currentUser.id) {
      await supabase.storage.from(MOMENTS_BUCKET).remove([moment.imagePath]);
    }
    setMoments((prev) => prev.filter((m) => m.id !== moment.id));
    return true;
  }, [currentUser.id, pushToast, t]);

  return { moments, loading, friendCount, post, remove, reload: load };
}

/* ------------------------------------------------------------ after match */

/** A session is over once its end time has passed (cancelled sessions never "end"). */
export function sessionEnded(session: { status: string; date: string; durationMin: number }, now = Date.now()): boolean {
  return session.status !== 'cancelled' && new Date(session.date).getTime() + session.durationMin * 60_000 <= now;
}

/* --------------------------------------------------------------- presence */

/** "En ligne", "Vu il y a 5 min", "Vu hier"… for a friend. */
export function presenceLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  online: boolean,
  seenAt: string | undefined,
  now = Date.now(),
): string {
  if (online) return t('presence.online');
  if (!seenAt) return t('presence.offline');
  const min = Math.max(0, Math.floor((now - new Date(seenAt).getTime()) / 60_000));
  if (min < 2) return t('presence.justNow');
  if (min < 60) return t('presence.minutes', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('presence.hours', { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t('presence.yesterday') : t('presence.days', { n: d });
}
