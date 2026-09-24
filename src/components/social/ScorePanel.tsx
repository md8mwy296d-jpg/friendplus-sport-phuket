import { Link } from 'react-router';
import { Check, ChevronRight } from 'lucide-react';
import type { User } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { scoreTone } from '@/lib/score';

function Bar({ label, pct, weight }: { label: string; pct: number | null; weight: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs font-semibold text-[#0B2E2B]/60">
        <span>{label} <span className="text-[#0B2E2B]/35">· {weight} pts</span></span>
        <span className="font-mono text-sm font-bold text-[#0B2E2B]">{pct === null ? '—' : `${pct} %`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EADFC8]/70">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0E8C7F,#2FBFA5)]" style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}

/** FRIEND+ score with its three components, on a player's page; the owner sees what is missing. */
export default function ScorePanel({ user }: { user: User }) {
  const { currentUser } = useStore();
  const { t } = useI18n();
  const isMe = user.id === currentUser.id;
  const checks = [
    { key: 'name', done: user.name.trim().length >= 2 },
    { key: 'photo', done: Boolean(user.avatarUrl) },
    { key: 'country', done: Boolean(user.countryCode) },
    { key: 'sports', done: user.sports.length > 0 },
  ];

  return (
    <div className="rounded-2xl bg-[#FBF6EC] p-4">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold', scoreTone(user.score))}>
          {user.score ?? 0}%
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0B2E2B]">{t('score.label')}</p>
          <p className="text-xs text-[#0B2E2B]/55">
            {user.reviewCount > 0 ? t('score.basedOn', { count: user.reviewCount }) : t('score.noReviews')}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Bar label={t('score.profile')} pct={user.profilePct} weight={15} />
        <Bar label={t('score.fairplay')} pct={user.fairplayPct} weight={60} />
        <Bar label={t('score.activity')} pct={user.activityPct} weight={25} />
      </div>
      {isMe && user.profilePct < 100 && (
        <Link to="/profil" className="mt-4 block rounded-xl border border-[#0E8C7F]/30 bg-white p-3">
          <span className="flex items-center justify-between text-xs font-bold text-[#0A6E64]">
            {t('score.completeProfile')} <ChevronRight className="h-4 w-4" />
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            {checks.map((c) => (
              <span key={c.key} className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                c.done ? 'bg-[#22C55E]/12 text-[#15803D]' : 'bg-[#FF6B4A]/10 text-[#D14A2B]',
              )}>
                {c.done && <Check className="h-3 w-3" />} {t(`score.check.${c.key}`)}
              </span>
            ))}
          </span>
        </Link>
      )}
      <p className="mt-3 text-[11px] leading-snug text-[#0B2E2B]/45">{t('score.how')}</p>
    </div>
  );
}
