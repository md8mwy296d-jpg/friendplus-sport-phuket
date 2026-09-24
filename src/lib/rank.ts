import type { User } from './types';

export type RankTier = 'bronze' | 'silver' | 'gold' | 'legend';

export interface Rank {
  key: 'recruit' | 'private' | 'corporal' | 'sergeant' | 'lieutenant' | 'captain' | 'legend';
  /** 1-based position in RANKS. */
  level: number;
  tier: RankTier;
  mark: 'chevron' | 'star';
  count: number;
  /** Lowest score (%) for this rank. */
  min: number;
}

/** Military-style ranks earned with the FRIEND+ score (profile 15 + fair-play 60 + activity 25). */
export const RANKS: Rank[] = [
  { key: 'recruit', level: 1, tier: 'bronze', mark: 'chevron', count: 1, min: 0 },
  { key: 'private', level: 2, tier: 'bronze', mark: 'chevron', count: 2, min: 15 },
  { key: 'corporal', level: 3, tier: 'silver', mark: 'chevron', count: 3, min: 30 },
  { key: 'sergeant', level: 4, tier: 'silver', mark: 'star', count: 1, min: 45 },
  { key: 'lieutenant', level: 5, tier: 'gold', mark: 'star', count: 2, min: 60 },
  { key: 'captain', level: 6, tier: 'gold', mark: 'star', count: 3, min: 75 },
  { key: 'legend', level: 7, tier: 'legend', mark: 'star', count: 1, min: 90 },
];

export function rankFor(score: number | null | undefined): Rank {
  const s = score ?? 0;
  return [...RANKS].reverse().find((r) => s >= r.min) ?? RANKS[0];
}

export function nextRank(rank: Rank): Rank | undefined {
  return RANKS[rank.level];
}

export type MedalKey =
  | 'firstMatch' | 'regular' | 'veteran' | 'organizer' | 'fairplay' | 'complete' | 'certified' | 'multisport';

export interface Medal {
  key: MedalKey;
  earned: boolean;
}

/** Achievement medals shown on a player's page (earned ones first). */
export function medalsFor(user: User): Medal[] {
  const medals: Medal[] = [
    { key: 'firstMatch', earned: user.joinedCount >= 1 },
    { key: 'regular', earned: user.joinedCount >= 10 },
    { key: 'veteran', earned: user.joinedCount >= 50 },
    { key: 'organizer', earned: user.organizedCount >= 3 },
    { key: 'fairplay', earned: (user.fairplayPct ?? 0) >= 90 && user.reviewCount >= 5 },
    { key: 'complete', earned: user.profilePct >= 100 },
    { key: 'multisport', earned: user.sports.length >= 3 },
    { key: 'certified', earned: user.certified },
  ];
  return [...medals.filter((m) => m.earned), ...medals.filter((m) => !m.earned)];
}
