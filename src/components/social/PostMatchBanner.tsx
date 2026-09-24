import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { sessionEnded } from '@/lib/social';
import PlayerAvatar from '@/components/PlayerAvatar';
import SportIcon from '@/components/SportIcon';

const SEEN_KEY = 'friendplus.afterMatchSeen';
const WINDOW_MS = 3 * 24 * 3600_000; // offered during the 3 days after the match

function readSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]; } catch { return []; }
}

/** "Match over" prompt under the top bar: talk to your teammates, add them, share a memory. */
export default function PostMatchBanner() {
  const { sessions, currentUser, isAuthenticated, getUser } = useStore();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [seen, setSeen] = useState<string[]>(readSeen);

  const session = useMemo(() => {
    if (!isAuthenticated) return undefined;
    const now = Date.now();
    return sessions
      .filter((s) => s.playerIds.includes(currentUser.id) && sessionEnded(s, now)
        && now - (new Date(s.date).getTime() + s.durationMin * 60_000) < WINDOW_MS && !seen.includes(s.id))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [sessions, currentUser.id, isAuthenticated, seen]);

  if (!session || pathname.startsWith(`/session/${session.id}`) || pathname.startsWith('/club/')) return null;

  const dismiss = () => {
    const next = [...seen, session.id].slice(-50);
    setSeen(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };
  const mates = session.playerIds.filter((id) => id !== currentUser.id).map((id) => getUser(id)).filter(Boolean).slice(0, 4);

  return (
    <div className="border-b border-[#EADFC8] bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-12">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-golden-hour text-white">
          <SportIcon sport={session.sport} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#0B2E2B]">{t('afterMatch.bannerTitle', { title: session.title })}</p>
          <p className="truncate text-xs text-[#0B2E2B]/55">{t('afterMatch.bannerBody')}</p>
        </div>
        {mates.length > 0 && (
          <span className="hidden -space-x-2 sm:flex">
            {mates.map((u) => u && <PlayerAvatar key={u.id} user={u} size={30} />)}
          </span>
        )}
        <Link
          to={`/session/${session.id}#apres-match`}
          onClick={dismiss}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#0E8C7F] px-4 text-xs font-bold text-white hover:bg-[#0A6E64]"
        >
          {t('afterMatch.bannerCta')}
        </Link>
        <button onClick={dismiss} aria-label={t('afterMatch.dismiss')} className="shrink-0 rounded-full p-1.5 text-[#0B2E2B]/40 hover:bg-[#FBF6EC]">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
