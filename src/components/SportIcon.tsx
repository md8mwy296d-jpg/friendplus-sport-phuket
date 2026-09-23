import type { Sport } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SportIconProps {
  sport: Sport;
  className?: string;
  strokeWidth?: number;
}

/** Custom sport icon set (lucide-style stroke icons): futsal ball, padel racket, golf flag, dance figure, gym dumbbell. */
export default function SportIcon({ sport, className, strokeWidth = 1.8 }: SportIconProps) {
  const cls = cn('h-5 w-5', className);
  const common = {
    className: cls,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (sport) {
    case 'futsal':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5 L16.4 10.7 L14.7 15.8 H9.3 L7.6 10.7 Z" />
          <path d="M12 3.5 V7.5 M19.6 8.6 L16.4 10.7 M17.9 17.4 L14.7 15.8 M6.1 17.4 L9.3 15.8 M4.4 8.6 L7.6 10.7" />
        </svg>
      );
    case 'padel':
      return (
        <svg {...common}>
          <ellipse cx="10" cy="9" rx="6.5" ry="7.5" transform="rotate(-20 10 9)" />
          <path d="M14.5 15 L19 21" />
          <circle cx="7.5" cy="6.5" r="0.4" fill="currentColor" />
          <circle cx="11.5" cy="6" r="0.4" fill="currentColor" />
          <circle cx="8.5" cy="10" r="0.4" fill="currentColor" />
          <circle cx="12.5" cy="9.5" r="0.4" fill="currentColor" />
        </svg>
      );
    case 'dance':
      return (
        <svg {...common}>
          <circle cx="13" cy="4.5" r="2" />
          <path d="M13 7 C11 9 8 9.5 5 8.5" />
          <path d="M13 7 C14.5 10 14 13 12.5 15.5 L10 20" />
          <path d="M13 7 C15.5 8.5 18 8.5 20 7" />
          <path d="M12.5 15.5 C14.5 17 16.5 18 19 18.5" />
        </svg>
      );
    case 'golf':
      return (
        <svg {...common}>
          <path d="M9 20 V3 L17 6.5 L9 10" />
          <ellipse cx="9" cy="20" rx="6" ry="1.5" />
          <circle cx="17.5" cy="17" r="1.8" />
        </svg>
      );
    case 'gym':
      return (
        <svg {...common}>
          <path d="M6.5 6.5 L17.5 17.5" />
          <path d="M4 9 L9 4 M3 6 L7 2 M15 20 L20 15 M17 22 L21 18" />
          <path d="M8 11.5 L12.5 16 M11.5 8 L16 12.5" />
        </svg>
      );
  }
}
