import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { useStore } from './store';
import { useI18n } from './i18n';
import type { Sport } from './types';

/* ---------------------------------- types ---------------------------------- */

export type ConversationKind = 'group' | 'direct' | 'session';

export interface Conversation {
  id: string;
  kind: ConversationKind;
  name: string;
  description: string;
  sport: Sport | null;
  isPrivate: boolean;
  sessionId: string | null;
  role: 'admin' | 'member';
  lastMessageAt: string;
  lastBody: string | null;
  lastSenderId: string | null;
  lastHasImage: boolean;
  lastDeleted: boolean;
  unread: number;
  memberCount: number;
  otherUserId: string | null;
}

export interface PublicGroup {
  id: string;
  name: string;
  description: string;
  sport: Sport | null;
  memberCount: number;
  lastMessageAt: string;
  createdAt: string;
  isMember: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  body: string;
  imagePath: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface ConversationInfo {
  id: string;
  kind: ConversationKind;
  name: string;
  description: string;
  sport: Sport | null;
  isPrivate: boolean;
  sessionId: string | null;
  createdBy: string | null;
}

export interface Member {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface GroupInput {
  name: string;
  description: string;
  sport: Sport | null;
  isPrivate: boolean;
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toConversation = (r: Row): Conversation => ({
  id: r.id,
  kind: r.kind,
  name: r.name || '',
  description: r.description || '',
  sport: r.sport ?? null,
  isPrivate: Boolean(r.is_private),
  sessionId: r.session_id ?? null,
  role: r.role,
  lastMessageAt: r.last_message_at,
  lastBody: r.last_body ?? null,
  lastSenderId: r.last_sender_id ?? null,
  lastHasImage: Boolean(r.last_has_image),
  lastDeleted: Boolean(r.last_deleted),
  unread: r.unread ?? 0,
  memberCount: r.member_count ?? 0,
  otherUserId: r.other_user_id ?? null,
});

const toPublicGroup = (r: Row): PublicGroup => ({
  id: r.id,
  name: r.name,
  description: r.description || '',
  sport: r.sport ?? null,
  memberCount: r.member_count ?? 0,
  lastMessageAt: r.last_message_at,
  createdAt: r.created_at,
  isMember: Boolean(r.is_member),
});

export const toMessage = (r: Row): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id ?? null,
  body: r.body || '',
  imagePath: r.image_path ?? null,
  createdAt: r.created_at,
  deletedAt: r.deleted_at ?? null,
});

const toInfo = (r: Row): ConversationInfo => ({
  id: r.id,
  kind: r.kind,
  name: r.name || '',
  description: r.description || '',
  sport: r.sport ?? null,
  isPrivate: Boolean(r.is_private),
  sessionId: r.session_id ?? null,
  createdBy: r.created_by ?? null,
});

const CLUB_ERRORS = [
  'not_member', 'blocked', 'banned', 'group_full', 'too_many_groups', 'rate_limited', 'not_allowed',
  'invalid_input', 'not_found', 'profile_incomplete', 'not_authenticated',
];

export function clubErrorKey(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? '';
  const code = CLUB_ERRORS.find((k) => msg.includes(k));
  return code ? `club.err.${code}` : 'err.generic';
}

/* ------------------------------ image helpers ------------------------------ */

export const CHAT_BUCKET = 'chat-images';
const MAX_IMAGE_SIDE = 1600;

/** Resizes a photo to at most 1600 px and re-encodes it as JPEG (phone photos are often 5–10 MB). */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('invalid_input'))), 'image/jpeg', 0.82),
  );
}

const signedUrlCache = new Map<string, { url: string; expires: number }>();

/** Signed URLs for private chat photos, cached until shortly before they expire. */
export async function signedImageUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of paths) {
    const hit = signedUrlCache.get(p);
    if (hit && hit.expires > now) out[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length > 0) {
    const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrls(missing, 3600);
    for (const d of data ?? []) {
      if (d.path && d.signedUrl) {
        out[d.path] = d.signedUrl;
        signedUrlCache.set(d.path, { url: d.signedUrl, expires: now + 50 * 60_000 });
      }
    }
  }
  return out;
}

/* --------------------------------- provider --------------------------------- */

export interface ClubContextValue {
  enabled: boolean;
  ready: boolean;
  conversations: Conversation[];
  unreadTotal: number;
  blockedIds: string[];
  isAppAdmin: boolean;
  refresh: () => Promise<void>;
  createGroup: (input: GroupInput) => Promise<string | null>;
  updateGroup: (id: string, input: GroupInput) => Promise<boolean>;
  joinGroup: (id: string) => Promise<boolean>;
  leaveGroup: (id: string) => Promise<boolean>;
  addMember: (conversationId: string, userId: string) => Promise<boolean>;
  removeMember: (conversationId: string, userId: string) => Promise<boolean>;
  setRole: (conversationId: string, userId: string, role: 'admin' | 'member') => Promise<boolean>;
  startDirect: (userId: string) => Promise<string | null>;
  openSessionChat: (sessionId: string) => Promise<string | null>;
  sendMessage: (conversationId: string, body: string, image?: File | null) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  markRead: (conversationId: string) => void;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  report: (target: { messageId?: string; userId?: string }, reason: string) => Promise<boolean>;
  discoverGroups: () => Promise<PublicGroup[]>;
}

const ClubContext = createContext<ClubContextValue | null>(null);

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within ClubProvider');
  return ctx;
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const { currentUser, isAuthenticated, profileComplete, pushToast } = useStore();
  const { t } = useI18n();
  const myId = currentUser.id;
  const enabled = SUPABASE_CONFIGURED && isAuthenticated && profileComplete;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const reloadTimer = useRef<number | undefined>(undefined);

  const fail = useCallback((err: unknown) => {
    console.error(err);
    pushToast({ kind: 'error', title: t(clubErrorKey(err)) });
  }, [pushToast, t]);

  const refresh = useCallback(async () => {
    if (!enabled) { setConversations([]); setBlockedIds([]); setIsAppAdmin(false); setReady(true); return; }
    const [cRes, bRes, aRes] = await Promise.all([
      supabase.rpc('my_conversations'),
      supabase.from('user_blocks').select('blocked_id'),
      supabase.from('app_admins').select('user_id').eq('user_id', myId),
    ]);
    if (cRes.error) { console.error(cRes.error); setReady(true); return; }
    setConversations(((cRes.data ?? []) as Row[]).map(toConversation));
    setBlockedIds(((bRes.data ?? []) as Row[]).map((r) => r.blocked_id));
    setIsAppAdmin(((aRes.data ?? []) as Row[]).length > 0);
    setReady(true);
  }, [enabled, myId]);

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => { void refresh(); }, 350);
  }, [refresh]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Any new message in one of my conversations (RLS filters the stream) → refresh the list
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`club-inbox-${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, scheduleRefresh)
      .subscribe();
    const onFocus = () => scheduleRefresh();
    window.addEventListener('focus', onFocus);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, myId, scheduleRefresh]);

  /* --------------------------------- actions --------------------------------- */
  const rpc = useCallback(async <T,>(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; data: T | null }> => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) { fail(error); return { ok: false, data: null }; }
    return { ok: true, data: data as T };
  }, [fail]);

  const createGroup = useCallback(async (input: GroupInput) => {
    const res = await rpc<string>('create_group', {
      p_name: input.name.trim(), p_description: input.description.trim(), p_sport: input.sport ?? '', p_private: input.isPrivate,
    });
    if (res.ok) { await refresh(); pushToast({ kind: 'success', title: t('club.toast.groupCreated') }); }
    return res.data;
  }, [rpc, refresh, pushToast, t]);

  const updateGroup = useCallback(async (id: string, input: GroupInput) => {
    const res = await rpc('update_group', {
      p_conversation: id, p_name: input.name.trim(), p_description: input.description.trim(), p_sport: input.sport ?? '', p_private: input.isPrivate,
    });
    if (res.ok) await refresh();
    return res.ok;
  }, [rpc, refresh]);

  const joinGroup = useCallback(async (id: string) => {
    const res = await rpc('join_group', { p_conversation: id });
    if (res.ok) { await refresh(); pushToast({ kind: 'success', title: t('club.toast.joined') }); }
    return res.ok;
  }, [rpc, refresh, pushToast, t]);

  const leaveGroup = useCallback(async (id: string) => {
    const res = await rpc('leave_group', { p_conversation: id });
    if (res.ok) { await refresh(); pushToast({ kind: 'info', title: t('club.toast.left') }); }
    return res.ok;
  }, [rpc, refresh, pushToast, t]);

  const addMember = useCallback(async (conversationId: string, userId: string) => {
    const res = await rpc('add_group_member', { p_conversation: conversationId, p_user: userId });
    if (res.ok) scheduleRefresh();
    return res.ok;
  }, [rpc, scheduleRefresh]);

  const removeMember = useCallback(async (conversationId: string, userId: string) => {
    const res = await rpc('remove_group_member', { p_conversation: conversationId, p_user: userId });
    if (res.ok) scheduleRefresh();
    return res.ok;
  }, [rpc, scheduleRefresh]);

  const setRole = useCallback(async (conversationId: string, userId: string, role: 'admin' | 'member') => {
    const res = await rpc('set_group_role', { p_conversation: conversationId, p_user: userId, p_role: role });
    return res.ok;
  }, [rpc]);

  const startDirect = useCallback(async (userId: string) => {
    const res = await rpc<string>('start_direct', { p_user: userId });
    if (res.ok) scheduleRefresh();
    return res.data;
  }, [rpc, scheduleRefresh]);

  const openSessionChat = useCallback(async (sessionId: string) => {
    const res = await rpc<string>('open_session_chat', { p_session: sessionId });
    if (res.ok) scheduleRefresh();
    return res.data;
  }, [rpc, scheduleRefresh]);

  const sendMessage = useCallback(async (conversationId: string, body: string, image?: File | null) => {
    let imagePath: string | null = null;
    if (image) {
      try {
        const blob = await compressImage(image);
        imagePath = `${conversationId}/${myId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from(CHAT_BUCKET).upload(imagePath, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
      } catch (err) {
        console.error(err);
        pushToast({ kind: 'error', title: t('club.err.upload') });
        return false;
      }
    }
    const res = await rpc('send_message', { p_conversation: conversationId, p_body: body.trim(), p_image_path: imagePath });
    if (!res.ok && imagePath) void supabase.storage.from(CHAT_BUCKET).remove([imagePath]);
    return res.ok;
  }, [myId, rpc, pushToast, t]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const res = await rpc<string | null>('delete_message', { p_message: messageId });
    // own photos are removed from storage too (others' photos stay until cleanup)
    if (res.ok && res.data && res.data.split('/')[1] === myId) {
      void supabase.storage.from(CHAT_BUCKET).remove([res.data]);
    }
    return res.ok;
  }, [rpc, myId]);

  const markRead = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
    // query builders are lazy: the request only starts once awaited / then-ed
    void supabase.rpc('mark_conversation_read', { p_conversation: conversationId }).then(({ error }) => {
      if (error) console.warn('mark_conversation_read', error.message);
    });
  }, []);

  const blockUser = useCallback(async (userId: string) => {
    const res = await rpc('block_user', { p_user: userId });
    if (res.ok) { await refresh(); pushToast({ kind: 'info', title: t('club.toast.blocked') }); }
    return res.ok;
  }, [rpc, refresh, pushToast, t]);

  const unblockUser = useCallback(async (userId: string) => {
    const res = await rpc('unblock_user', { p_user: userId });
    if (res.ok) { await refresh(); pushToast({ kind: 'info', title: t('club.toast.unblocked') }); }
    return res.ok;
  }, [rpc, refresh, pushToast, t]);

  const report = useCallback(async (target: { messageId?: string; userId?: string }, reason: string) => {
    const res = await rpc('report_content', {
      p_message: target.messageId ?? null, p_user: target.userId ?? null, p_reason: reason,
    });
    if (res.ok) pushToast({ kind: 'success', title: t('club.toast.reported') });
    return res.ok;
  }, [rpc, pushToast, t]);

  const discoverGroups = useCallback(async () => {
    if (!enabled) return [];
    const { data, error } = await supabase.rpc('discover_groups');
    if (error) { fail(error); return []; }
    return ((data ?? []) as Row[]).map(toPublicGroup);
  }, [enabled, fail]);

  const value = useMemo<ClubContextValue>(() => ({
    enabled,
    ready,
    conversations,
    unreadTotal: conversations.reduce((n, c) => n + c.unread, 0),
    blockedIds,
    isAppAdmin,
    refresh,
    createGroup,
    updateGroup,
    joinGroup,
    leaveGroup,
    addMember,
    removeMember,
    setRole,
    startDirect,
    openSessionChat,
    sendMessage,
    deleteMessage,
    markRead,
    blockUser,
    unblockUser,
    report,
    discoverGroups,
  }), [enabled, ready, conversations, blockedIds, isAppAdmin, refresh, createGroup, updateGroup, joinGroup,
    leaveGroup, addMember, removeMember, setRole, startDirect, openSessionChat, sendMessage, deleteMessage,
    markRead, blockUser, unblockUser, report, discoverGroups]);

  return createElement(ClubContext.Provider, { value }, children);
}

/* ------------------------------ conversation ------------------------------ */

const PAGE = 50;

/** Messages of one conversation: first page, live inserts/deletions, older pages on demand. */
export function useConversation(conversationId: string | undefined) {
  const { enabled } = useClub();
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from('conversation_members')
      .select('user_id, role, joined_at')
      .eq('conversation_id', conversationId)
      .order('joined_at');
    setMembers(((data ?? []) as Row[]).map((r) => ({ userId: r.user_id, role: r.role, joinedAt: r.joined_at })));
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE);
    const rows = ((data ?? []) as Row[]).map(toMessage).reverse();
    setMessages(rows);
    setHasMore(rows.length === PAGE);
  }, [conversationId]);

  const load = useCallback(async () => {
    if (!conversationId || !enabled) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setNotFound(false);
    setInfo(toInfo(data as Row));
    await Promise.all([loadMembers(), loadMessages()]);
    setLoading(false);
  }, [conversationId, enabled, loadMembers, loadMessages]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!conversationId || !enabled) return;
    const channel = supabase
      .channel(`club-conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = toMessage(payload.new as Row);
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = toMessage(payload.new as Row);
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, enabled]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', messages[0].createdAt)
      .order('created_at', { ascending: false })
      .limit(PAGE);
    const older = ((data ?? []) as Row[]).map(toMessage).reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length === PAGE);
  }, [conversationId, messages]);

  return { info, members, messages, loading, notFound, hasMore, loadOlder, reload: load, reloadMembers: loadMembers, reloadMessages: loadMessages };
}
