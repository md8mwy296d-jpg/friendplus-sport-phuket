import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

export interface PlayerConnection {
  ip: string | null;
  userAgent: string | null;
  lastSeen: string | null;
  blocked: boolean;
}
export interface BlockedIp { ip: string; reason: string; userId: string | null; createdAt: string }

interface ModerationRow { ip: string | null; user_agent: string | null; last_seen: string | null; blocked: boolean; banned_until: string | null }

/** Admins only: a player's recent IP addresses and suspension state. */
export function usePlayerModeration(userId: string | undefined, enabled: boolean) {
  const [connections, setConnections] = useState<PlayerConnection[]>([]);
  const [bannedUntil, setBannedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled || !userId || !SUPABASE_CONFIGURED) return;
    setLoading(true);
    const { data } = await supabase.rpc('admin_player_moderation', { p_user: userId });
    const rows = (data ?? []) as ModerationRow[];
    setConnections(rows.filter((r) => r.ip).map((r) => ({
      ip: r.ip, userAgent: r.user_agent, lastSeen: r.last_seen, blocked: r.blocked,
    })));
    const until = rows[0]?.banned_until ?? null;
    setBannedUntil(until && new Date(until) > new Date() ? until : null);
    setLoading(false);
  }, [enabled, userId]);

  useEffect(() => { void reload(); }, [reload]);
  return { connections, bannedUntil, loading, reload };
}

/** Admins only: every blocked IP address. */
export function useBlockedIps(enabled: boolean) {
  const [items, setItems] = useState<BlockedIp[] | null>(null);
  const reload = useCallback(async () => {
    if (!enabled || !SUPABASE_CONFIGURED) return;
    const { data } = await supabase.rpc('admin_blocked_ips');
    setItems(((data ?? []) as { ip: string; reason: string; user_id: string | null; created_at: string }[])
      .map((r) => ({ ip: r.ip, reason: r.reason, userId: r.user_id, createdAt: r.created_at })));
  }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { items, reload };
}

/** p_days = 0 reactivates the account. */
export async function suspendPlayer(userId: string, days: number) {
  const { error } = await supabase.rpc('admin_suspend_user', { p_user: userId, p_days: days });
  return error?.message ?? null;
}

export async function blockIp(ip: string, reason: string, userId?: string) {
  const { error } = await supabase.rpc('admin_block_ip', { p_ip: ip, p_reason: reason, p_user: userId ?? null });
  return error?.message ?? null;
}

export async function unblockIp(ip: string) {
  const { error } = await supabase.rpc('admin_unblock_ip', { p_ip: ip });
  return error?.message ?? null;
}

/** "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 …" → "iPhone". */
export function deviceLabel(ua: string | null) {
  if (!ua) return '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return ua.slice(0, 24);
}
