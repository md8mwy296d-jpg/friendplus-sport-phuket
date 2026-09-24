import { ShieldCheck } from 'lucide-react';
import type { User } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { scoreTone } from '@/lib/score';

function Bar({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs font-semibold text-[#0B2E2B]/60">
        <span>{label}</span>
        <span className="font-mono text-sm font-bold text-[#0B2E2B]">{pct === null ? '—' : `${pct} %`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EADFC8]/70">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0E8C7F,#2FBFA5)]" style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}

/** FRIEND+ score with its two components, on a player's page. */
export default function ScorePanel({ user }: { user: User }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl bg-[#FBF6EC] p-4">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold', scoreTone(user.score))}>
          {user.score === null ? <ShieldCheck className="h-6 w-6" /> : `${user.score}%`}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0B2E2B]">{t('score.label')}</p>
          <p className="text-xs text-[#0B2E2B]/55">
            {user.score === null ? t('score.notRated') : t('score.basedOn', { count: user.reviewCount })}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Bar label={t('score.fairplay')} pct={user.fairplayPct} />
        <Bar label={t('score.activity')} pct={user.activityPct} />
      </div>
      <p className="mt-3 text-[11px] leading-snug text-[#0B2E2B]/45">{t('score.how')}</p>
    </div>
  );
}
