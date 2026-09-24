import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { useStore } from './store';
import { useI18n } from './i18n';
import { clubErrorKey, compressImage, useClub } from './club';

export interface Announcement {
  id: string;
  authorId: string;
  title: string;
  body: string;
  imageUrl: string;
  imagePath: string | null;
  official: boolean;
  pinned: boolean;
  createdAt: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  image?: File | null;
  pinned: boolean;
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const NEWS_BUCKET = 'news';
const SEEN_KEY = 'friendplus.newsSeenAt';

const toAnnouncement = (r: Row): Announcement => ({
  id: r.id,
  authorId: r.author_id,
  title: r.title,
  body: r.body ?? '',
  imagePath: r.image_path ?? null,
  imageUrl: r.image_path ? supabase.storage.from(NEWS_BUCKET).getPublicUrl(r.image_path).data.publicUrl : '',
  official: Boolean(r.official),
  pinned: Boolean(r.pinned),
  createdAt: r.created_at,
});

function readSeenAt(): string {
  try { return localStorage.getItem(SEEN_KEY) ?? ''; } catch { return ''; }
}

/** Club news feed (admins and certified accounts post, everyone reads), live. */
export function useNews() {
  const { currentUser, pushToast } = useStore();
  const { isAppAdmin } = useClub();
  const { t } = useI18n();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenAt, setSeenAt] = useState(readSeenAt);

  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('announcements').select('*')
      .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    if (error) console.error(error);
    setItems(((data ?? []) as Row[]).map(toAnnouncement));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    if (!SUPABASE_CONFIGURED) return;
    const channel = supabase
      .channel('club-news')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const fail = useCallback((err: unknown) => {
    console.error(err);
    pushToast({ kind: 'error', title: t(clubErrorKey(err)) });
  }, [pushToast, t]);

  const post = useCallback(async (input: AnnouncementInput): Promise<boolean> => {
    const me = currentUser.id;
    if (!me) return false;
    let path: string | null = null;
    try {
      if (input.image) {
        const blob = await compressImage(input.image);
        path = `${me}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from(NEWS_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc('post_announcement', {
        p_title: input.title.trim(), p_body: input.body.trim(), p_image_path: path, p_pinned: input.pinned,
      });
      if (error) throw error;
      pushToast({ kind: 'success', title: t('news.toast.posted') });
      await load();
      return true;
    } catch (err) {
      if (path) await supabase.storage.from(NEWS_BUCKET).remove([path]);
      fail(err);
      return false;
    }
  }, [currentUser.id, fail, load, pushToast, t]);

  const remove = useCallback(async (item: Announcement) => {
    const { error } = await supabase.from('announcements').delete().eq('id', item.id);
    if (error) { fail(error); return; }
    if (item.imagePath && item.authorId === currentUser.id) await supabase.storage.from(NEWS_BUCKET).remove([item.imagePath]);
    setItems((prev) => prev.filter((a) => a.id !== item.id));
  }, [currentUser.id, fail]);

  const setPinned = useCallback(async (item: Announcement, pinned: boolean) => {
    const { error } = await supabase.rpc('set_announcement_pinned', { p_id: item.id, p_pinned: pinned });
    if (error) { fail(error); return; }
    await load();
  }, [fail, load]);

  const newest = items.reduce((max, a) => (a.createdAt > max ? a.createdAt : max), '');
  const markSeen = useCallback(() => {
    if (!newest) return;
    setSeenAt(newest);
    try { localStorage.setItem(SEEN_KEY, newest); } catch { /* private mode */ }
  }, [newest]);

  return {
    items,
    loading,
    canPost: isAppAdmin || currentUser.certified,
    isAdmin: isAppAdmin,
    unseen: items.filter((a) => a.createdAt > seenAt && a.authorId !== currentUser.id).length,
    post,
    remove,
    setPinned,
    markSeen,
  };
}

/** Certify / uncertify a player (admins only; enforced by set_certified()). */
export async function setCertified(userId: string, value: boolean): Promise<{ error: unknown }> {
  const { error } = await supabase.rpc('set_certified', { p_user: userId, p_value: value });
  return { error };
}
