import { BadgeCheck, CalendarPlus, Flame, Footprints, Handshake, Medal as MedalGlyph, Shapes, UserCheck } from 'lucide-react';
import type { MedalKey } from '@/lib/rank';
import { cn } from '@/lib/utils';

const ICONS: Record<MedalKey, typeof MedalGlyph> = {
  firstMatch: Footprints,
  regular: Flame,
  veteran: MedalGlyph,
  organizer: CalendarPlus,
  fairplay: Handshake,
  complete: UserCheck,
  multisport: Shapes,
  certified: BadgeCheck,
};

const COLORS: Record<MedalKey, string> = {
  firstMatch: 'from-[#2FBFA5] to-[#0E8C7F]',
  regular: 'from-[#FFB547] to-[#FF6B4A]',
  veteran: 'from-[#FFE08A] to-[#D9971E]',
  organizer: 'from-[#5B7CFF] to-[#2FBFA5]',
  fairplay: 'from-[#22C55E] to-[#0E8C7F]',
  complete: 'from-[#FF6B4A] to-[#F05252]',
  multisport: 'from-[#A78BFA] to-[#5B7CFF]',
  certified: 'from-[#1D9BF0] to-[#1478C8]',
};

/** Round medal: bright when earned, greyed out when still to unlock. */
export default function MedalIcon({ medal, earned, size = 44 }: { medal: MedalKey; earned: boolean; size?: number }) {
  const Icon = ICONS[medal];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2',
        earned ? `${COLORS[medal]} text-white ring-white shadow-[0_4px_12px_rgba(11,46,43,.18)]` : 'from-[#EADFC8] to-[#D9CCB2] text-[#0B2E2B]/35 ring-transparent',
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.46, height: size * 0.46 }} strokeWidth={2.2} />
    </span>
  );
}
