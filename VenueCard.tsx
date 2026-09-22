import { MapPin, Star } from 'lucide-react';
import type { Venue } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from './SportIcon';

interface VenueCardProps {
  venue: Venue;
  className?: string;
  onClick?: () => void;
}

/** Venue card: 3:2 photo, name, area, sports, rating, indicative price. */
export default function VenueCard({ venue, className, onClick }: VenueCardProps) {
  const { t, formatTHB } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-[300px] shrink-0 flex-col overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white text-left',
        'shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)]',
        'transition-all duration-300 ease-expo hover:-translate-y-1.5 hover:shadow-[0_4px_12px_rgba(11,46,43,.08),0_24px_56px_rgba(11,46,43,.14)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E8C7F]',
        className,
      )}
    >
      <div className="relative aspect-[3/2] overflow-hidden">
        <img
          src={venue.photo}
          alt={venue.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[#0B2E2B] backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-[#FFB547] text-[#FFB547]" />
          {venue.rating.toFixed(1)}
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug text-[#0B2E2B]">{venue.name}</h3>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-[#0B2E2B]/55">
            <MapPin className="h-3.5 w-3.5 text-[#FF6B4A]" /> {venue.area}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {venue.sports.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-[10px] bg-[#0E8C7F]/10 px-2 py-1 text-[11px] font-semibold text-[#0A6E64]">
                <SportIcon sport={s} className="h-3 w-3" />
                {t(`sport.${s}`)}
              </span>
            ))}
          </div>
          <span className="font-mono text-[13px] font-bold text-[#0B2E2B]">
            {t('common.from')} {formatTHB(venue.priceFrom)}
          </span>
        </div>
      </div>
    </button>
  );
}
