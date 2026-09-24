import { useCallback, useEffect, useState, type KeyboardEvent, type RefObject, type SyntheticEvent } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { useStore } from './store';
import { useSocial } from './social';
import { searchPlayers } from './players';
import type { User } from './types';

/** A piece of text: plain, or an @handle. */
export type MentionPart = { text: string; handle?: string };

const HANDLE = /(^|[^a-z0-9_.@])@([a-z0-9_.]{3,20})/gi;

/** Splits "Bravo @hakan !" into ["Bravo ", @hakan, " !"] (a trailing "." stays in the text). */
export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(HANDLE)) {
    let handle = m[2];
    while (handle.endsWith('.')) handle = handle.slice(0, -1);
    if (handle.length < 3) continue;
    const start = (m.index ?? 0) + m[1].length;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: `@${handle}`, handle: handle.toLowerCase() });
    last = start + 1 + handle.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** The "@que" being typed right before the caret, if any. */
export function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|[^a-z0-9_.@])@([a-z0-9_.]{0,20})$/i.exec(before);
  if (!m) return null;
  return { start: before.length - m[2].length - 1, query: m[2].toLowerCase() };
}

type Field = HTMLInputElement | HTMLTextAreaElement;

/**
 * @-mention autocomplete for an input or textarea: tracks the caret, exposes the query being typed
 * and replaces it with the chosen handle. Spread `bind` on the field, show a MentionMenu while `query !== null`.
 */
export function useMentions(value: string, setValue: (v: string) => void, ref: RefObject<Field | null>) {
  const [caret, setCaret] = useState(0);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(-1);
  const active = activeMention(value, caret);
  const open = Boolean(active) && active!.start !== dismissed;

  const track = useCallback((e: SyntheticEvent<Field>) => {
    setCaret(e.currentTarget.selectionStart ?? e.currentTarget.value.length);
  }, []);

  const pick = useCallback((username: string) => {
    if (!active) return;
    const insert = `@${username} `;
    const next = value.slice(0, active.start) + insert + value.slice(caret);
    const pos = active.start + insert.length;
    setValue(next);
    setCaret(pos);
    setIndex(0);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }, [active, caret, value, setValue, ref]);

  /** Arrow keys / Enter / Tab / Escape while the menu is open. Returns true when the key was used. */
  const handleKey = useCallback((e: KeyboardEvent<Field>, options: string[]): boolean => {
    if (!open || options.length === 0) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => (i + 1) % options.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => (i - 1 + options.length) % options.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[Math.min(index, options.length - 1)]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); setDismissed(active!.start); return true; }
    return false;
  }, [open, index, pick, active]);

  return {
    query: open ? active!.query : null,
    index,
    pick,
    handleKey,
    bind: { onSelect: track, onKeyUp: track, onClick: track, onInput: track },
  };
}

/** Players matching an @query: friends first, then everyone (never me, never without a handle). */
export function useMentionOptions(query: string | null, limit = 6): User[] {
  const { users, currentUser } = useStore();
  const { friendIds } = useSocial();
  if (query === null) return [];
  const pool = users.filter((u) => u.id !== currentUser.id && u.username);
  const friends = new Set(friendIds);
  if (!query) return pool.filter((u) => friends.has(u.id)).slice(0, limit);
  const found = searchPlayers(pool, `@${query}`, 30).concat(searchPlayers(pool, query, 30));
  const unique = [...new Map(found.map((u) => [u.id, u])).values()];
  return unique.sort((a, b) => Number(friends.has(b.id)) - Number(friends.has(a.id))).slice(0, limit);
}


/* ------------------------------------------------------------- mention feed */

export interface MentionItem {
  id: string;
  authorId: string;
  kind: 'message' | 'comment' | 'post' | 'moment';
  excerpt: string;
  createdAt: string;
  seen: boolean;
  /** Where the mention is: the chat, the publication or the author's page. */
  to: string;
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toMention = (r: Row): MentionItem => ({
  id: r.id,
  authorId: r.author_id,
  kind: r.kind,
  excerpt: r.excerpt ?? '',
  createdAt: r.created_at,
  seen: Boolean(r.seen_at),
  to: r.kind === 'message' ? `/club/${r.conversation_id}`
    : r.kind === 'moment' ? `/joueur/${r.author_id}`
      : `/publication/${r.post_id}`,
});

/** My latest @mentions (live), with the unseen count and "mark all as seen". */
export function useMentionFeed(enabled: boolean, myId: string) {
  const [items, setItems] = useState<MentionItem[]>([]);

  const load = useCallback(async () => {
    if (!enabled || !SUPABASE_CONFIGURED) { setItems([]); return; }
    const { data, error } = await supabase.from('mentions').select('*').order('created_at', { ascending: false }).limit(40);
    if (error) { console.error(error); return; }
    setItems(((data ?? []) as Row[]).map(toMention));
  }, [enabled]);

  useEffect(() => {
    void load();
    if (!enabled || !SUPABASE_CONFIGURED) return;
    const channel = supabase
      .channel(`mentions-${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mentions', filter: `user_id=eq.${myId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, myId, load]);

  const markSeen = useCallback(async () => {
    if (!items.some((m) => !m.seen)) return;
    setItems((prev) => prev.map((m) => ({ ...m, seen: true })));
    await supabase.rpc('mark_mentions_seen');
  }, [items]);

  return { items, unseen: items.filter((m) => !m.seen).length, markSeen };
}
