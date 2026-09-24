import { BadgeCheck, Crown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Blue check next to the name of a verified account, followed by the gold "OWNER" tag
 * of a venue boss (owns a Page; only certified accounts can create one).
 */
export default function CertifiedBadge({ certified, owner, className }: { certified?: boolean; owner?: boolean; className?: string }) {
  const { t } = useI18n();
  if (!certified && !owner) return null;
  return (
    <>
      {certified && (
        <BadgeCheck
          role="img"
          aria-label={t('certified.label')}
          className={cn('inline-block h-[1em] w-[1em] shrink-0 fill-[#1D9BF0] align-[-0.125em] text-white', className)}
        >
          <title>{t('certified.label')}</title>
        </BadgeCheck>
      )}
      {owner && (
        <span
          title={t('owner.label')}
          aria-label={t('owner.label')}
          className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-b from-[#FFD66B] to-[#E0A01E] px-1.5 py-px align-[0.1em] font-sans text-[10px] font-extrabold uppercase leading-[1.5] tracking-[0.08em] text-[#4A2C00] shadow-[inset_0_-1px_0_rgba(0,0,0,.15)]"
        >
          <Crown className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
          {t('owner.tag')}
        </span>
      )}
    </>
  );
}
