import { BadgeCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Blue check next to the name of a verified account. */
export default function CertifiedBadge({ certified, className }: { certified?: boolean; className?: string }) {
  const { t } = useI18n();
  if (!certified) return null;
  return (
    <BadgeCheck
      role="img"
      aria-label={t('certified.label')}
      className={cn('inline-block h-[1em] w-[1em] shrink-0 fill-[#1D9BF0] align-[-0.125em] text-white', className)}
    >
      <title>{t('certified.label')}</title>
    </BadgeCheck>
  );
}
