import type { BookingStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STYLE: Record<BookingStatus, string> = {
  pending_payment: 'bg-amber/20 text-[#9A6400]',
  paid: 'bg-lagoon/12 text-lagoon-deep',
  confirmed: 'bg-confirm/15 text-[#15803D]',
  completed: 'bg-ink/10 text-ink/70',
  cancelled: 'bg-cancel/12 text-[#B42323]',
  refunded: 'bg-dusk/12 text-[#3B5BDB]',
  expired: 'bg-ink/8 text-ink/45',
};

export default function StatusPill({ status, className }: { status: BookingStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold', STYLE[status], className)}>
      {t(`status.${status}`)}
    </span>
  );
}
