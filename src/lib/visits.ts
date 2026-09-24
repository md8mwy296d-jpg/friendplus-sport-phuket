import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const COUNTED_KEY = 'fp-visit-counted';

/** Count this visit once per browser session (city only, anonymous). Production only. */
export function countVisit() {
  if (!import.meta.env.PROD) return;
  try {
    if (sessionStorage.getItem(COUNTED_KEY)) return;
    sessionStorage.setItem(COUNTED_KEY, '1');
  } catch { /* storage unavailable: still count */ }
  fetch('/api/hit', { method: 'POST', keepalive: true }).catch(() => { /* best-effort */ });
}

export interface CityVisits { country: string; city: string; visits: number }

/** Admins only: visits per city over the last `days` days. */
export function useVisitStats(enabled: boolean, days: number) {
  const [rows, setRows] = useState<CityVisits[] | null>(null);
  useEffect(() => {
    if (!enabled || !SUPABASE_CONFIGURED) return;
    let alive = true;
    supabase.rpc('admin_visit_stats', { p_days: days }).then(({ data, error }) => {
      if (alive) setRows(error ? [] : ((data ?? []) as CityVisits[]).map((r) => ({ ...r, visits: Number(r.visits) })));
    });
    return () => { alive = false; };
  }, [enabled, days]);
  return rows;
}

export interface VisitLogRow { at: string; ip: string | null; country: string; city: string; device: string; blocked: boolean }

/** Admins only: latest connections (IP, city, device), kept 30 days. */
export function useVisitLog(enabled: boolean) {
  const [rows, setRows] = useState<VisitLogRow[] | null>(null);
  const reload = useCallback(async () => {
    if (!enabled || !SUPABASE_CONFIGURED) return;
    const { data, error } = await supabase.rpc('admin_visit_log', { p_limit: 200 });
    setRows(error ? [] : (data ?? []) as VisitLogRow[]);
  }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { rows, reload };
}

/** Emoji flag from an ISO country code ("TH" → 🇹🇭). */
export function flagOf(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
