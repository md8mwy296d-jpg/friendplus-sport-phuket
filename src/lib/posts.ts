import { useCallback, useEffect, useRef, useState } from 'react';
import type { Sport } from './types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { useStore } from './store';
import { useI18n } from './i18n';
import { clubErrorKey, compressImage } from './club';

/* ------------------------------------------------------------------ types */

export interface ClubPage {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  sport: Sport | null;
  venueId: string | null;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  pageId: string | null;
  groupId: string | null;
  title: string;
  body: string;
  imageUrl: string;
  imagePath: string | null;
  pinned: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface PostInput {
  pageId?: string | null;
  groupId?: string | null;
  title: string;
  body: string;
  image?: File | null;
  pinned: boolean;
}

export interface PageInput {
  name: string;
  description: string;
  sport: Sport | null;
  venueId: string | null;
}

/** Which posts to show: the public feed (optionally one Page), one group, or a single post. */
export type PostScope =
  | { kind: 'feed'; pageId?: string | null; official?: boolean }
  | { kind: 'group'; groupId: string }
  | { kind: 'single'; postId: string };

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const POSTS_BUCKET = 'posts';

const toPage = (r: Row): ClubPage => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  description: r.description ?? '',
  sport: r.sport ?? null,
  venueId: r.venue_id ?? null,
  createdAt: r.created_at,
});

const count = (v: unknown): number => (Array.isArray(v) && v[0] ? Number((v[0] as { count: number }).count) : 0);

const isSitePhoto = (path: string) => path.startsWith('/');

const toPost = (r: Row, liked: Set<string>): Post => ({
  id: r.id,
  authorId: r.author_id,
  pageId: r.page_id ?? null,
  groupId: r.group_id ?? null,
  title: r.title ?? '',
  body: r.body ?? '',
  imagePath: r.image_path ?? null,
  imageUrl: !r.image_path ? ''
    : isSitePhoto(r.image_path) ? r.image_path // photo du site (publications de démo)
      : supabase.storage.from(POSTS_BUCKET).getPublicUrl(r.image_path).data.publicUrl,
  pinned: Boolean(r.pinned),
  createdAt: r.created_at,
  likeCount: count(r.post_likes),
  commentCount: count(r.post_comments),
  likedByMe: liked.has(r.id),
});

function useFail() {
  const { pushToast } = useStore();
  const { t } = useI18n();
  return useCallback((err: unknown) => {
    console.error(err);
    pushToast({ kind: 'error', title: t(clubErrorKey(err)) });
  }, [pushToast, t]);
}

/* ------------------------------------------------------------------ pages */

export function useClubPages() {
  const fail = useFail();
  const [pages, setPages] = useState<ClubPage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
    const { data, error } = await supabase.from('club_pages').select('*').order('created_at');
    if (error) console.error(error);
    setPages(((data ?? []) as Row[]).map(toPage));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (id: string | null, input: PageInput): Promise<string | null> => {
    const { data, error } = await supabase.rpc('save_page', {
      p_id: id, p_name: input.name.trim(), p_description: input.description.trim(),
      p_sport: input.sport ?? '', p_venue: input.venueId ?? '',
    });
    if (error) { fail(error); return null; }
    await load();
    return data as string;
  }, [fail, load]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('club_pages').delete().eq('id', id);
    if (error) { fail(error); return false; }
    await load();
    return true;
  }, [fail, load]);

  return { pages, loading, save, remove, reload: load };
}

/* ------------------------------------------------------------------ posts */

export function usePosts(scope: PostScope) {
  const { currentUser, pushToast } = useStore();
  const { t } = useI18n();
  const fail = useFail();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);
  const me = currentUser.id;
  const key = JSON.stringify(scope);

  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
    const s = JSON.parse(key) as PostScope;
    let q = supabase.from('posts').select('*, post_likes(count), post_comments(count)');
    if (s.kind === 'group') q = q.eq('group_id', s.groupId);
    else if (s.kind === 'single') q = q.eq('id', s.postId);
    else {
      q = q.is('group_id', null);
      if (s.pageId) q = q.eq('page_id', s.pageId);
      else if (s.official) q = q.is('page_id', null);
    }
    const { data, error } = await q.order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(60);
    if (error) { console.error(error); setLoading(false); return; }
    const rows = (data ?? []) as Row[];
    let liked = new Set<string>();
    if (me && rows.length) {
      const { data: mine } = await supabase.from('post_likes').select('post_id').eq('user_id', me).in('post_id', rows.map((r) => r.id));
      liked = new Set(((mine ?? []) as Row[]).map((r) => r.post_id as string));
    }
    setPosts(rows.map((r) => toPost(r, liked)));
    setLoading(false);
  }, [key, me]);

  useEffect(() => {
    setLoading(true);
    void load();
    if (!SUPABASE_CONFIGURED) return;
    const later = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void load(); }, 400);
    };
    const channel = supabase
      .channel(`posts-${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, later)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, later)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, later)
      .subscribe();
    return () => { void supabase.removeChannel(channel); window.clearTimeout(timer.current); };
  }, [load, key]);

  const publish = useCallback(async (input: PostInput): Promise<boolean> => {
    if (!me) return false;
    let path: string | null = null;
    try {
      if (input.image) {
        const blob = await compressImage(input.image);
        path = `${me}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from(POSTS_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc('publish_post', {
        p_page: input.pageId ?? null, p_group: input.groupId ?? null,
        p_title: input.title.trim(), p_body: input.body.trim(), p_image_path: path, p_pinned: input.pinned,
      });
      if (error) throw error;
      pushToast({ kind: 'success', title: t('posts.toast.published') });
      await load();
      return true;
    } catch (err) {
      if (path) await supabase.storage.from(POSTS_BUCKET).remove([path]);
      fail(err);
      return false;
    }
  }, [me, fail, load, pushToast, t]);

  const remove = useCallback(async (post: Post) => {
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) { fail(error); return; }
    if (post.imagePath && !isSitePhoto(post.imagePath) && post.authorId === me) await supabase.storage.from(POSTS_BUCKET).remove([post.imagePath]);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }, [fail, me]);

  const setPinned = useCallback(async (post: Post, pinned: boolean) => {
    const { error } = await supabase.rpc('set_post_pinned', { p_post: post.id, p_pinned: pinned });
    if (error) { fail(error); return; }
    await load();
  }, [fail, load]);

  const toggleLike = useCallback(async (post: Post) => {
    // optimistic, then the server's answer
    setPosts((prev) => prev.map((p) => (p.id === post.id
      ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) } : p)));
    const { error } = await supabase.rpc('toggle_post_like', { p_post: post.id });
    if (error) { fail(error); await load(); }
  }, [fail, load]);

  return { posts, loading, publish, remove, setPinned, toggleLike, reload: load };
}

/* --------------------------------------------------------------- comments */

export function useComments(postId: string, open: boolean) {
  const fail = useFail();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at').limit(200);
    if (error) console.error(error);
    setComments(((data ?? []) as Row[]).map((r) => ({ id: r.id, postId: r.post_id, authorId: r.author_id, body: r.body, createdAt: r.created_at })));
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void load();
    const channel = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [open, postId, load]);

  const add = useCallback(async (body: string) => {
    const { error } = await supabase.rpc('add_post_comment', { p_post: postId, p_body: body.trim() });
    if (error) { fail(error); return false; }
    await load();
    return true;
  }, [postId, fail, load]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('post_comments').delete().eq('id', id);
    if (error) { fail(error); return; }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, [fail]);

  return { comments, loading, add, remove };
}

/** Certify / uncertify a player (admins only; enforced by set_certified()). */
export async function setCertified(userId: string, value: boolean): Promise<{ error: unknown }> {
  const { error } = await supabase.rpc('set_certified', { p_user: userId, p_value: value });
  return { error };
}

/* ------------------------------------------------------------ unseen dot */

const SEEN_KEY = 'friendplus.pagesSeenAt';

/** Whether the public feed has posts newer than the last visit of the Pages tab. */
export function useFeedUnseen() {
  const { currentUser } = useStore();
  const [latest, setLatest] = useState<{ at: string; author: string } | null>(null);
  const [seenAt, setSeenAt] = useState(() => { try { return localStorage.getItem(SEEN_KEY) ?? ''; } catch { return ''; } });

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    void supabase.from('posts').select('created_at, author_id').is('group_id', null)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        const r = (data ?? [])[0] as Row | undefined;
        if (r) setLatest({ at: r.created_at, author: r.author_id });
      });
  }, []);

  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    setSeenAt(now);
    try { localStorage.setItem(SEEN_KEY, now); } catch { /* private mode */ }
  }, []);

  return { unseen: Boolean(latest && latest.at > seenAt && latest.author !== currentUser.id), markSeen };
}
