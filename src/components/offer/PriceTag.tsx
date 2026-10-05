import type { PriceUnit } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function PriceTag({ price, unit, className, big = false }: {
  price: number; unit: PriceUnit; className?: string; big?: boolean;
}) {
  const { t, formatTHB } = useI18n();
  return (
    <p className={cn('text-ink/60', big ? 'text-sm' : 'text-[13px]', className)}>
      {t('offer.from')}{' '}
      <span className={cn('font-display font-bold text-ink', big ? 'text-2xl' : 'text-[17px]')}>{formatTHB(price)}</span>{' '}
      {t(`unit.${unit}`)}
    </p>
  );
}
