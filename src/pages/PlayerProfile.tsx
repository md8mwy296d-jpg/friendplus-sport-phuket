import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { BadgeCheck, PenLine } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useSocial, useMoments } from '@/lib/social';
import { useClub, clubErrorKey } from '@/lib/club';
import { setCertified } from '@/lib/posts';
import CertifiedBadge from '@/components/CertifiedBadge';
import { useI18n } from '@/lib/i18n';
import PlayerAvatar from '@/components/PlayerAvatar';
import SportIcon from '@/components/SportIcon';
import EmptyState from '@/components/EmptyState';
import { FriendButton, MessageButton } from '@/components/social/FriendButton';
import MomentComposer from '@/components/social/MomentComposer';
import MomentCard from '@/components/social/MomentCard';
import ScorePanel from '@/components/social/ScorePanel';
import RankInsignia from '@/components/rank/RankInsignia';
import RankSection from '@/components/rank/RankSection';
import { rankFor } from '@/lib/rank';

/** Public page of a player: identity, friend / message actions and shared moments. */
export default function PlayerProfile() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { getUser, currentUser, sessions, ready, isAuthenticated, refresh, pushToast } = useStore();
  const { isAppAdmin } = useClub();
  const [certBusy, setCertBusy] = useState(false);
  const { statusWith } = useSocial();
  const { t } = useI18n();
  const player = getUser(id);
  const isMe = Boolean(currentUser.id) && currentUser.id === id;
  const { moments, loading, friendCount, post, remove, reload } = useMoments(player ? id : undefined);

  // friends-only moments appear as soon as a request is accepted
  const status = statusWith(id);
  useEffect(() => { void reload(); }, [status, reload]);

  const mySessions = useMemo(
    () => (isMe ? sessions.filter((s) => s.playerIds.includes(id)).sort((a, b) => b.date.localeCompare(a.date)) : []),
    [isMe, sessions, id],
  );
  const tagged = params.get('moment');

  const toggleCertified = async () => {
    if (!player) return;
    setCertBusy(true);
    const { error } = await setCertified(player.id, !player.certified);
    if (error) pushToast({ kind: 'error', title: t(clubErrorKey(error)) });
    else {
      await refresh();
      pushToast({ kind: 'success', title: t(player.certified ? 'certified.toast.revoked' : 'certified.toast.granted') });
    }
    setCertBusy(false);
  };

  if (!player) {
    if (!ready) return <p className="py-24 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>;
    return (
      <div className="container py-16">
        <EmptyState title={t('player.notFound')} body={t('player.notFoundBody')} ctaLabel={t('nav.explore')} ctaTo="/explorer" />
      </div>
    );
  }

  const stats = [
    { value: player.joinedCount, label: t('profile.stats.played') },
    { value: player.organizedCount, label: t('profile.stats.organized') },
    { value: friendCount, label: t('player.stats.friends') },
  ];

  return (
    <div className="bg-[#FBF6EC] pb-16">
      <section className="bg-lagoon-deep px-4 pb-24 pt-10 sm:px-6">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
          <PlayerAvatar user={player} size={112} ring={false} className="font-display text-4xl font-bold ring-4 ring-white/30" />
          <h1 className="mt-4 font-display text-[clamp(1.8rem,6vw,2.4rem)] font-bold leading-tight text-white">
            {player.name} <CertifiedBadge certified={player.certified} /> <span className="align-middle text-2xl">{player.nationality}</span>
            <RankInsignia rank={rankFor(player.score)} size={30} className="ml-2 align-middle" />
          </h1>
          <p className="mt-1 text-sm text-white/65">
            {t(`rank.${rankFor(player.score).key}`)} · {t(`common.level.${player.level}`)} · {player.score === null ? t('score.new') : `${t('score.short')} ${player.score} %`}
          </p>
          {player.sports.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label={t('player.sports')}>
              {player.sports.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <SportIcon sport={s} className="h-4 w-4 text-[#2FBFA5]" /> {t(`sport.${s}`)}
                </span>
              ))}
            </div>
          )}
          {player.bio && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">{player.bio}</p>}
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-[760px] space-y-8 px-4 sm:px-6">
        <div className="rounded-[24px] border border-[#EADFC8] bg-white p-5 shadow-[0_2px_8px_rgba(11,46,43,.06),0_16px_40px_rgba(11,46,43,.08)] sm:p-6">
          <div className="mb-5 grid grid-cols-3 divide-x divide-[#EADFC8] text-center">
            {stats.map((s) => (
              <div key={s.label} className="px-2">
                <p className="font-display text-2xl font-bold text-[#0B2E2B]">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium text-[#0B2E2B]/55">{s.label}</p>
              </div>
            ))}
          </div>
          <ScorePanel user={player} />
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {isMe ? (
              <Link to="/profil" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#EADFC8] bg-white px-5 text-sm font-bold text-[#0B2E2B] hover:bg-[#FBF6EC]">
                <PenLine className="h-4 w-4" /> {t('player.editProfile')}
              </Link>
            ) : (
              <>
                <FriendButton userId={player.id} />
                <MessageButton userId={player.id} />
              </>
            )}
          </div>
          {isAppAdmin && (
            <div className="mt-4 flex justify-center border-t border-[#EADFC8] pt-4">
              <button
                onClick={() => void toggleCertified()}
                disabled={certBusy}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1D9BF0]/40 px-4 text-xs font-bold text-[#1478C8] hover:bg-[#1D9BF0]/10 disabled:opacity-60"
              >
                <BadgeCheck className="h-4 w-4" /> {player.certified ? t('certified.revoke') : t('certified.grant')}
              </button>
            </div>
          )}
          {!isAuthenticated && (
            <p className="mt-3 text-center text-xs text-[#0B2E2B]/50">{t('player.loginToConnect', { name: player.name.split(' ')[0] })}</p>
          )}
        </div>

        <RankSection user={player} />

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#0B2E2B]">{t('moments.title')}</h2>
          {isMe && <MomentComposer sessions={mySessions} defaultSessionId={tagged} onPost={post} />}
          {loading ? (
            <p className="py-10 text-center text-sm text-[#0B2E2B]/45">{t('common.loading')}</p>
          ) : moments.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-[#EADFC8] px-6 py-10 text-center text-sm text-[#0B2E2B]/50">
              {isMe ? t('moments.empty.mine') : t('moments.empty.other')}
            </p>
          ) : (
            <div className="space-y-4">
              {moments.map((m) => <MomentCard key={m.id} moment={m} onDelete={(x) => void remove(x)} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
