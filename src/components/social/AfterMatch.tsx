import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Camera, MessageCircle } from 'lucide-react';
import type { Session } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useI18n } from '@/lib/i18n';
import PlayerAvatar from '@/components/PlayerAvatar';
import { FriendButton, MessageButton } from './FriendButton';
import TeammateReview, { type GivenReview } from './TeammateReview';
import ScoreBadge from '@/components/ScoreBadge';
import { supabase } from '@/lib/supabase';
import CertifiedBadge from '@/components/CertifiedBadge';

/** Shown on a finished session to the players who took part: message, add as friend, share a memory. */
export default function AfterMatch({ session }: { session: Session }) {
  const { currentUser, getUser } = useStore();
  const club = useClub();
  const { t } = useI18n();
  const navigate = useNavigate();
  const teammates = session.playerIds.filter((id) => id !== currentUser.id).map((id) => getUser(id)).filter(Boolean);
  // reviews are open for 7 days after the end of the match
  const reviewOpen = Date.now() - (new Date(session.date).getTime() + session.durationMin * 60_000) < 7 * 24 * 3600_000;
  const [given, setGiven] = useState<Record<string, GivenReview>>({});

  useEffect(() => {
    let alive = true;
    void supabase.from('match_reviews').select('reviewee_id, rules_ok, respect_ok')
      .eq('session_id', session.id).eq('reviewer_id', currentUser.id)
      .then(({ data }) => {
        if (!alive) return;
        const map: Record<string, GivenReview> = {};
        for (const r of data ?? []) map[r.reviewee_id as string] = { rules: r.rules_ok as boolean, respect: r.respect_ok as boolean };
        setGiven(map);
      });
    return () => { alive = false; };
  }, [session.id, currentUser.id]);

  const openTeamChat = async () => {
    const conv = await club.openSessionChat(session.id);
    if (conv) navigate(`/club/${conv}`);
  };

  return (
    <section id="apres-match" className="container scroll-mt-24 pt-8">
      <div className="overflow-hidden rounded-[24px] border border-[#EADFC8] bg-white shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)]">
        <div className="h-1.5 bg-golden-hour" />
        <div className="p-5 sm:p-7">
          <h2 className="font-display text-xl font-bold text-[#0B2E2B] sm:text-2xl">{t('afterMatch.title')}</h2>
          <p className="mt-1 text-sm text-[#0B2E2B]/60">{t('afterMatch.subtitle')}</p>
          {reviewOpen && teammates.length > 0 && (
            <p className="mt-2 text-xs font-semibold text-[#0A6E64]">{t('review.prompt')}</p>
          )}

          {teammates.length === 0 ? (
            <p className="mt-5 text-sm text-[#0B2E2B]/55">{t('afterMatch.alone')}</p>
          ) : (
            <ul className="mt-5 divide-y divide-[#EADFC8]">
              {teammates.map((u) => u && (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Link to={`/joueur/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <PlayerAvatar user={u} size={44} ring={false} />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold text-[#0B2E2B]">{u.name} <CertifiedBadge certified={u.certified} owner={u.isOwner} /> {u.nationality}</span>
                      <span className="flex items-center gap-2 text-xs font-semibold text-[#0E8C7F]">
                        <ScoreBadge user={u} /> {t('afterMatch.profile')} →
                      </span>
                    </span>
                  </Link>
                  <span className="flex items-center gap-2">
                    <FriendButton userId={u.id} size="sm" />
                    <MessageButton userId={u.id} size="sm" iconOnly />
                  </span>
                  {reviewOpen && (
                    <TeammateReview
                      key={`${u.id}-${given[u.id] ? 'done' : 'new'}`}
                      sessionId={session.id}
                      userId={u.id}
                      given={given[u.id]}
                      onSaved={(id, r) => setGiven((prev) => ({ ...prev, [id]: r }))}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {club.enabled && (
              <button onClick={() => void openTeamChat()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0B2E2B] px-5 text-sm font-bold text-white hover:bg-[#1E5945]">
                <MessageCircle className="h-4 w-4" /> {t('afterMatch.teamChat')}
              </button>
            )}
            <Link
              to={`/joueur/${currentUser.id}?moment=${session.id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-golden-hour px-5 text-sm font-bold text-white shadow-coral"
            >
              <Camera className="h-4 w-4" /> {t('moments.shareCta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
