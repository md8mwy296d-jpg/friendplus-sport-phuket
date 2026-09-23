import type { Sport } from './types';

/** Every sport offered by FRIEND+, in display order. */
export const SPORTS: Sport[] = ['futsal', 'padel', 'golf', 'dance', 'gym'];

/** Sports played with a set number of players (the organiser cannot change it). */
export const FIXED_QUOTA: Partial<Record<Sport, number>> = { futsal: 10, padel: 4, golf: 4 };

/** Session lengths offered when creating a session (minutes). */
export function durationsFor(sport: Sport | null): number[] {
  return sport === 'golf' ? [120, 180, 240] : [60, 90, 120];
}

export interface SportRate {
  amount: number;
  /** 'player' = per player per hour; 'court' = court per hour, split between the players. */
  per: 'player' | 'court';
}

/**
 * Fixed prices set by FRIEND+ (players never choose them). Mirrors public.sport_rates, which is the
 * source of truth: the server recomputes the price when a session is created.
 */
export const DEFAULT_RATES: Record<Sport, SportRate> = {
  padel: { amount: 2200, per: 'court' },
  futsal: { amount: 300, per: 'player' },
  golf: { amount: 120, per: 'player' },
  dance: { amount: 120, per: 'player' },
  gym: { amount: 120, per: 'player' },
};

export type Rates = Record<Sport, SportRate>;

function playersFor(sport: Sport, quota?: number): number {
  return FIXED_QUOTA[sport] ?? quota ?? 1;
}

/** Price each player pays for a session — same formula as create_session() in schema.sql. */
export function pricePerPlayer(rates: Rates, sport: Sport, durationMin: number, quota?: number): number {
  const rate = rates[sport] ?? DEFAULT_RATES[sport];
  const perPlayer = rate.per === 'court' ? rate.amount / playersFor(sport, quota) : rate.amount;
  return Math.round((perPlayer * durationMin) / 60);
}

/** Hourly price for one player, used for "from …" labels. */
export function hourlyPerPlayer(rates: Rates, sport: Sport): number {
  return pricePerPlayer(rates, sport, 60);
}
