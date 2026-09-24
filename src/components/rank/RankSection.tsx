import type { User } from '@/lib/types';
import { medalsFor, nextRank, rankFor, RANKS } from '@/lib/rank';
import { useI18n } from '@/lib/i18n';
import RankInsignia from './RankInsignia';
import MedalIcon from './MedalIcon';

/** Rank (with progress to the next one), the full rank ladder and achievement medals. */
export default function RankSection({ user }: { user: User }) {
  const { t } = useI18n();
  const score = user.score ?? 0;
  const rank = rankFor(score);
  const next = nextRank(rank);
  const progress = next ? Math.round(((score - rank.min) / (next.min - rank.min)) * 100) : 100;
  const medals = medalsFor(user);
  const earned = medals.filter((m) => m.earned).length;

  return (
    <section className="space-y-5 rounded-[24px] border border-[#EADFC8] bg-white p-5 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-6">
      <div className="flex items-center gap-4">
        <RankInsignia rank={rank} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('rank.title')}</p>
          <p className="font-display text-2xl font-bold text-[#0B2E2B]">{t(`rank.${rank.key}`)}</p>
          {next ? (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EADFC8]/70">
                <div className="h-full rounded-full bg-golden-hour" style={{ width: `${Math.max(4, progress)}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#0B2E2B]/55">{t('rank.next', { rank: t(`rank.${next.key}`), pct: next.min })}</p>
            </>
          ) : (
            <p className="mt-1 text-xs font-semibold text-[#B97A0B]">{t('rank.max')}</p>
          )}
        </div>
      </div>

      <div className="-mx-1 flex justify-between gap-1 overflow-x-auto px-1 pb-1" aria-label={t('rank.ladder')}>
        {RANKS.map((r) => (
          <div key={r.key} className={r.level <= rank.level ? 'flex min-w-[40px] flex-col items-center gap-1' : 'flex min-w-[40px] flex-col items-center gap-1 opacity-35 grayscale'}>
            <RankInsignia rank={r} size={30} />
            <span className="text-[10px] font-semibold text-[#0B2E2B]/60">{r.min}%</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
          {t('medal.title')} · {earned}/{medals.length}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {medals.map((m) => (
            <div key={m.key} className="flex flex-col items-center gap-1.5 text-center" title={t(`medal.${m.key}.desc`)}>
              <MedalIcon medal={m.key} earned={m.earned} />
              <span className={m.earned ? 'text-[11px] font-semibold leading-tight text-[#0B2E2B]' : 'text-[11px] leading-tight text-[#0B2E2B]/40'}>
                {t(`medal.${m.key}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
