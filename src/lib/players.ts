import type { User } from './types';

/** "@hakan", or '' for a player who has no handle yet. */
export const handleOf = (u: Pick<User, 'username'> | undefined): string => (u?.username ? `@${u.username}` : '');

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Players matching a search: "@hak" matches handles starting with "hak";
 * a plain word matches the name or the handle. Exact handle first, then handle prefix, then name.
 */
export function searchPlayers(users: User[], query: string, limit = 8): User[] {
  const raw = query.trim();
  if (!raw) return [];
  const byHandle = raw.startsWith('@');
  const q = fold(raw.replace(/^@+/, ''));
  if (!q) return [];
  const rank = (u: User): number => {
    const h = u.username;
    if (h === q) return 0;
    if (h.startsWith(q)) return 1;
    if (byHandle) return h.includes(q) ? 2 : -1;
    const n = fold(u.name);
    if (n.startsWith(q) || n.split(/\s+/).some((w) => w.startsWith(q))) return 2;
    if (n.includes(q) || h.includes(q)) return 3;
    return -1;
  };
  return users
    .filter((u) => u.name)
    .map((u) => [u, rank(u)] as const)
    .filter(([, r]) => r >= 0)
    .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name))
    .slice(0, limit)
    .map(([u]) => u);
}
