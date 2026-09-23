import { Check, X } from 'lucide-react';
import type { SessionStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STYLES: Record<SessionStatus, string> = {
  open: 'bg-[#5B7CFF]/12 text-[#3B5BDB] border-[#5B7CFF]/30',
  full: 'bg-[#FFB547]/15 text-[#B97A0B] border-[#FFB547]/40',
  confirmed: 'bg-[#22C55E]/12 text-[#15803D] border-[#22C55E]/30',
  cancelled: 'bg-[#F05252]/10 text-[#D03838] border-[#F05252]/30',
};

export default function StatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        STYLES[status],
        className,
      )}
    >
      {status === 'open' && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5B7CFF] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5B7CFF]" />
        </span>
      )}
      {status === 'confirmed' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      {status === 'cancelled' && <X className="h-3.5 w-3.5" strokeWidth={3} />}
      {status === 'full' && <span className="h-2 w-2 rounded-full bg-[#FFB547]" />}
      {t(`status.${status}`)}
    </span>
  );
}
