import type { User } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { scoreTone } from '@/lib/score';
import RankInsignia from '@/components/rank/RankInsignia';
import { rankFor } from '@/lib/rank';

/** Compact FRIEND+ score pill ("86 %" or "New"). */
export default function ScoreBadge({ user, className }: { user: Pick<User, 'score'>; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      title={t('score.label')}
      className={cn('inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-2 text-[11px] font-bold tabular-nums', scoreTone(user.score), className)}
    >
      <RankInsignia rank={rankFor(user.score)} size={14} />
      {user.score === null ? t('score.new') : `${user.score} %`}
    </span>
  );
}
