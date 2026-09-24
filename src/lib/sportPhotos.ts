import type { Sport } from './types';

/**
 * Photos of each sport (real, free-licence Unsplash pictures in /public).
 * Add files to /public/sports and list them here: the pool grows, nothing else changes.
 */
const POOL: Record<Sport, string[]> = {
  futsal: ['/sport-futsal.jpg', '/sports/futsal-1.jpg', '/sports/futsal-2.jpg', '/sports/futsal-3.jpg', '/sports/futsal-4.jpg'],
  padel: ['/sport-padel.jpg', '/sports/padel-1.jpg', '/sports/padel-2.jpg', '/sports/padel-3.jpg'],
  golf: ['/sport-golf.jpg', '/venue-golf.jpg', '/golf-swing.jpg', '/sports/golf-1.jpg', '/sports/golf-2.jpg', '/sports/golf-3.jpg'],
  dance: ['/sport-dance.jpg', '/sports/dance-1.jpg', '/sports/dance-2.jpg', '/sports/dance-3.jpg', '/sports/dance-4.jpg'],
  gym: ['/sport-gym.jpg', '/sports/gym-1.jpg', '/sports/gym-2.jpg', '/sports/gym-3.jpg', '/sports/gym-4.jpg'],
};

/** Weeks since 1970 (changes every Monday). */
export function weekNumber(now = Date.now()): number {
  return Math.floor((now / 86_400_000 + 3) / 7);
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/**
 * The photo of a sport for this week. `seed` (a session or venue id…) varies it between cards,
 * while the same card keeps the same photo all week long.
 */
export function sportPhoto(sport: Sport, seed = ''): string {
  const pool = POOL[sport] ?? POOL.futsal;
  return pool[(weekNumber() + hash(seed)) % pool.length];
}
