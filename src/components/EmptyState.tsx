import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaTo?: string;
  className?: string;
}

/** Spot illustration (palm + ball + waiting character) + text + optional CTA. */
export default function EmptyState({ title, body, ctaLabel, ctaTo = '/explorer', className }: EmptyStateProps) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center gap-4 py-16 text-center', className)}>
      <img src="/empty-state.svg" alt="" className="w-full max-w-[300px]" loading="lazy" />
      <h3 className="font-display text-xl font-semibold text-[#0B2E2B]">{title ?? t('empty.title')}</h3>
      <p className="max-w-sm text-[15px] leading-relaxed text-[#0B2E2B]/55">{body ?? t('empty.body')}</p>
      <Link
        to={ctaTo}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0E8C7F] px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(11,46,43,.1)] transition-all hover:scale-[1.03] hover:bg-[#0A6E64]"
      >
        {ctaLabel ?? t('empty.cta')}
      </Link>
    </div>
  );
}
