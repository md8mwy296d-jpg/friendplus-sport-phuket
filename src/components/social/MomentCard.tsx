import { Link } from 'react-router';
import { Lock, Trash2 } from 'lucide-react';
import type { Moment } from '@/lib/social';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useI18n } from '@/lib/i18n';
import SportIcon from '@/components/SportIcon';

/** One shared moment: photo, text, linked session. */
export default function MomentCard({ moment, onDelete }: { moment: Moment; onDelete?: (m: Moment) => void }) {
  const { getSession, currentUser } = useStore();
  const { isAppAdmin } = useClub();
  const { t, formatDate } = useI18n();
  const session = moment.sessionId ? getSession(moment.sessionId) : undefined;
  const canDelete = onDelete && (moment.userId === currentUser.id || isAppAdmin);

  return (
    <article className="overflow-hidden rounded-[20px] border border-[#EADFC8] bg-white shadow-[0_2px_8px_rgba(11,46,43,.06)]">
      {moment.imageUrl && <img src={moment.imageUrl} alt="" loading="lazy" className="max-h-[520px] w-full object-cover" />}
      <div className="space-y-3 p-4 sm:p-5">
        {moment.body && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#0B2E2B]">{moment.body}</p>}
        {session && (
          <Link to={`/session/${session.id}`} className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#FBF6EC] px-3 py-1.5 text-xs font-semibold text-[#0A6E64] hover:bg-[#EADFC8]/60">
            <SportIcon sport={session.sport} className="h-4 w-4" />
            <span className="truncate">{session.title}</span>
          </Link>
        )}
        <div className="flex items-center gap-2 text-xs text-[#0B2E2B]/45">
          <span>{formatDate(moment.createdAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
          {moment.visibility === 'friends' && (
            <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {t('moments.visibility.friends')}</span>
          )}
          {canDelete && (
            <button
              onClick={() => { if (window.confirm(t('moments.deleteConfirm'))) onDelete(moment); }}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-[#D03838] hover:bg-[#F05252]/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('moments.delete')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
