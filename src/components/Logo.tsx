import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

export default function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="My Phuket Key">
      <img src="/logo.svg" alt="" className="h-9 w-9" />
      <span className="leading-none">
        <span className={cn('font-display text-[19px] font-extrabold tracking-tight', dark ? 'text-white' : 'text-ink')}>
          My Phuket <span className="text-coral">Key</span>
        </span>
        <span className={cn('mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.2em] min-[400px]:block', dark ? 'text-white/60' : 'text-ink/50')}>
          {t('brand.tagline')}
        </span>
      </span>
    </Link>
  );
}
