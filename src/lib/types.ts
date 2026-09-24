export type Sport = 'futsal' | 'padel' | 'golf' | 'dance' | 'gym';
export type Lang = 'fr' | 'en' | 'ru' | 'th';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type SessionStatus = 'open' | 'full' | 'confirmed' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface User {
  id: string;
  name: string;
  nationality: string; // flag emoji
  countryCode: string;
  lang: Lang;
  sports: Sport[];
  level: Level;
  rating: number; // 0-5
  bio: string;
  joinedCount: number;
  organizedCount: number;
  /** Public URL of the profile photo, '' when none. */
  avatarUrl: string;
  /** Index in the avatar gradient palette chosen by the player, null = derived from the name. */
  avatarColor: number | null;
  /** Verified account (badge ✓), granted by a FRIEND+ admin. */
  certified: boolean;
  /** % of "yes" answers from teammates (rules + respect), null until the first review. */
  fairplayPct: number | null;
  /** 10 % per match played, capped at 100 %. */
  activityPct: number;
  /** FRIEND+ score out of 100: complete profile 15 + fair-play 60 + activity 25. */
  score: number | null;
  reviewCount: number;
  /** 25 % each: name, photo, country, sports wished. */
  profilePct: number;
  /** FRIEND+ admin: shown with the maximum score and every medal. */
  isAdmin: boolean;
  /** Owns a venue Page (certified venue boss): gold "OWNER" badge players can't get. */
  isOwner: boolean;
}

export interface Venue {
  id: string;
  name: string;
  area: string; // Patong, Kata, ...
  sports: Sport[];
  address: string;
  rating: number;
  priceFrom: number; // THB / pers
  photo: string;
  amenities: string[];
  hours: string;
}

export interface Session {
  id: string;
  sport: Sport;
  title: string;
  venueId: string;
  date: string; // ISO datetime of the event
  durationMin: number;
  quota: number;
  playerIds: string[];
  waitlistIds: string[];
  pricePerPerson: number; // THB
  level: Level | 'all';
  mixed: boolean;
  status: SessionStatus;
  confirmationDeadline: string; // ISO datetime, 24-48h before event
  creatorId: string;
  description: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  sessionId: string;
  fromUserId: string;
  toUserId: string;
  status: InvitationStatus;
  message: string;
  createdAt: string;
}

export interface ToastItem {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'error' | 'celebration';
  title: string;
  body?: string;
}

export interface StoreState {
  currentUserId: string;
  users: User[];
  venues: Venue[];
  sessions: Session[];
  invitations: Invitation[];
  seededAt: string;
}
