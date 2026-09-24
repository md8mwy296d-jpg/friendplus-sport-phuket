import { Link } from 'react-router';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import type { Announcement } from '@/lib/news';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import PlayerAvatar from '@/components/PlayerAvatar';
import CertifiedBadge from '@/components/CertifiedBadge';

interface Props {
  item: Announcement;
  isAdmin: boolean;
  onDelete: (a: Announcement) => void;
  onPin: (a: Announcement, pinned: boolean) => void;
}

/** One Club news post: author (official team or certified account), text, photo. */
export default function NewsCard({ item, isAdmin, onDelete, onPin }: Props) {
  const { getUser, currentUser } = useStore();
  const { t, formatDate } = useI18n();
  const author = getUser(item.authorId);
  const canDelete = isAdmin || item.authorId === currentUser.id;

  return (
    <article className={cn(
      'overflow-hidden rounded-[20px] border bg-white shadow-[0_2px_8px_rgba(11,46,43,.06)]',
      item.pinned ? 'border-[#FFB547]' : 'border-[#EADFC8]',
    )}>
      {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="max-h-[420px] w-full object-cover" />}
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          {item.official ? (
            <img src="/logo.svg" alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#FBF6EC] p-1" />
          ) : author ? (
            <Link to={`/joueur/${author.id}`}><PlayerAvatar user={author} size={40} ring={false} /></Link>
          ) : (
            <span className="h-10 w-10 shrink-0 rounded-full bg-[#EADFC8]" />
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1 truncate text-sm font-bold text-[#0B2E2B]">
              {item.official ? t('certified.admin') : (
                author ? <Link to={`/joueur/${author.id}`} className="truncate hover:underline">{author.name}</Link> : '—'
              )}
              <CertifiedBadge certified={item.official || author?.certified} />
            </p>
            <p className="text-xs text-[#0B2E2B]/45">
              {formatDate(item.createdAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {item.pinned && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFB547]/20 px-2.5 py-1 text-[11px] font-bold text-[#B97A0B]">
              <Pin className="h-3 w-3" /> {t('news.pinned')}
            </span>
          )}
        </div>
        <h3 className="mt-3 font-display text-lg font-bold leading-snug text-[#0B2E2B]">{item.title}</h3>
        {item.body && <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-[#0B2E2B]/80">{item.body}</p>}
        {(isAdmin || canDelete) && (
          <div className="mt-3 flex justify-end gap-1">
            {isAdmin && (
              <button onClick={() => onPin(item, !item.pinned)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#0B2E2B]/60 hover:bg-[#FBF6EC]">
                {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                {item.pinned ? t('news.unpin') : t('news.pin')}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { if (window.confirm(t('news.deleteConfirm'))) onDelete(item); }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#D03838] hover:bg-[#F05252]/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('news.delete')}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
