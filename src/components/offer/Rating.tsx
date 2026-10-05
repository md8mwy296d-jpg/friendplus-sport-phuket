import { Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function Rating({ rating, count, className }: { rating: number; count: number; className?: string }) {
  const { t } = useI18n();
  if (count <= 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[13px] text-ink/70', className)}>
      <Star className="h-3.5 w-3.5 fill-amber text-amber" />
      <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="text-ink/45">({t('offer.reviews', { count })})</span>
    </span>
  );
}
