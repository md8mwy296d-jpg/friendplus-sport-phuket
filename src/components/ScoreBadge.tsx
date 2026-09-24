import type { User } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { scoreTone } from '@/lib/score';

/** Compact FRIEND+ score pill ("86 %" or "New"). */
export default function ScoreBadge({ user, className }: { user: Pick<User, 'score'>; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      title={t('score.label')}
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums', scoreTone(user.score), className)}
    >
      {user.score === null ? t('score.new') : `${user.score} %`}
    </span>
  );
}
