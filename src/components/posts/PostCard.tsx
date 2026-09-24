import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Heart, MessageCircle, Pin, PinOff, Send, Share2, Trash2 } from 'lucide-react';
import type { ClubPage, Post } from '@/lib/posts';
import { useComments } from '@/lib/posts';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import PlayerAvatar from '@/components/PlayerAvatar';
import CertifiedBadge from '@/components/CertifiedBadge';
import SportIcon from '@/components/SportIcon';
import UserPickerModal from '@/components/club/UserPickerModal';
import MentionMenu from '@/components/mentions/MentionMenu';
import MentionText from '@/components/mentions/MentionText';
import { useMentionOptions, useMentions } from '@/lib/mentions';

interface Props {
  post: Post;
  page?: ClubPage;
  /** Can pin / unpin this post (admin, page owner, group admin). */
  canModerate: boolean;
  onLike: (p: Post) => void;
  onDelete: (p: Post) => void;
  onPin: (p: Post, pinned: boolean) => void;
}

function Comments({ post, canModerate }: { post: Post; canModerate: boolean }) {
  const { getUser, currentUser, isAuthenticated } = useStore();
  const { isAppAdmin } = useClub();
  const { t, formatDate } = useI18n();
  const { comments, loading, add, remove } = useComments(post.id, true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const mention = useMentions(text, (v) => setText(v.slice(0, 500)), field);
  const options = useMentionOptions(mention.query);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    if (await add(text)) setText('');
    setBusy(false);
  };

  return (
    <div className="space-y-3 border-t border-[#EADFC8] pt-3">
      {loading ? (
        <p className="text-xs text-[#0B2E2B]/45">{t('common.loading')}</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[#0B2E2B]/45">{t('posts.noComments')}</p>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((c) => {
            const u = getUser(c.authorId);
            const canDelete = c.authorId === currentUser.id || post.authorId === currentUser.id || isAppAdmin || canModerate;
            return (
              <li key={c.id} className="flex gap-2">
                {u ? <Link to={`/joueur/${u.id}`}><PlayerAvatar user={u} size={28} ring={false} /></Link> : <span className="h-7 w-7 rounded-full bg-[#EADFC8]" />}
                <div className="min-w-0 flex-1 rounded-2xl bg-[#FBF6EC] px-3 py-2">
                  <p className="flex items-center gap-1 text-xs font-bold text-[#0B2E2B]">
                    {u?.name ?? '—'} <CertifiedBadge certified={u?.certified} owner={u?.isOwner} />
                    <span className="ml-1 font-normal text-[#0B2E2B]/40">{formatDate(c.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {canDelete && (
                      <button onClick={() => void remove(c.id)} className="ml-auto text-[#0B2E2B]/35 hover:text-[#D03838]" aria-label={t('posts.delete')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </p>
                  <p className="whitespace-pre-line text-sm text-[#0B2E2B]/85"><MentionText text={c.body} /></p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {isAuthenticated && (
        <form onSubmit={submit} className="relative flex items-center gap-2">
          <MentionMenu options={options} index={mention.index} onPick={mention.pick} />
          <input
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            {...mention.bind}
            onKeyDown={(e) => { mention.handleKey(e, options.map((u) => u.username)); }}
            placeholder={t('posts.commentPh')}
            className="h-10 min-w-0 flex-1 rounded-full border border-[#EADFC8] bg-white px-4 text-sm outline-none focus:border-[#0E8C7F]"
          />
          <button type="submit" disabled={!text.trim() || busy} aria-label={t('posts.send')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0E8C7F] text-white disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}

/** A Club publication (FRIEND+, a venue Page or a group): like, comment, forward privately. */
export default function PostCard({ post, page, canModerate, onLike, onDelete, onPin }: Props) {
  const { getUser, currentUser, isAuthenticated, pushToast } = useStore();
  const club = useClub();
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const author = getUser(post.authorId);
  const official = !post.pageId && !post.groupId;
  const canDelete = post.authorId === currentUser.id || club.isAppAdmin;

  const needLogin = () => { navigate(`/connexion?next=${encodeURIComponent(`/publication/${post.id}`)}`); };

  const forward = async (userId: string) => {
    const conv = await club.startDirect(userId);
    if (!conv) return false;
    const link = `${window.location.origin}/publication/${post.id}`;
    const ok = await club.sendMessage(conv, `📣 ${post.title || t('posts.forwardDefault')}\n${link}`);
    if (ok) pushToast({ kind: 'success', title: t('posts.toast.forwarded') });
    return ok;
  };

  return (
    <article className={cn(
      'overflow-hidden rounded-[20px] border bg-white shadow-[0_2px_8px_rgba(11,46,43,.06)]',
      post.pinned ? 'border-[#FFB547]' : 'border-[#EADFC8]',
    )}>
      <div className="flex items-center gap-3 px-4 pt-4 sm:px-5">
        {official ? (
          <img src="/logo.svg" alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#FBF6EC] p-1" />
        ) : page ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lagoon-deep text-white">
            {page.sport ? <SportIcon sport={page.sport} className="h-5 w-5 text-[#2FBFA5]" /> : page.name[0]}
          </span>
        ) : author ? (
          <Link to={`/joueur/${author.id}`}><PlayerAvatar user={author} size={40} ring={false} /></Link>
        ) : <span className="h-10 w-10 rounded-full bg-[#EADFC8]" />}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 truncate text-sm font-bold text-[#0B2E2B]">
            {official ? t('certified.admin') : page ? page.name : author?.name ?? '—'}
            <CertifiedBadge certified={official || (page ? getUser(page.ownerId)?.certified : false)} owner={page ? getUser(page.ownerId)?.isOwner : false} />
          </p>
          <p className="truncate text-xs text-[#0B2E2B]/45">
            {page && author ? `${author.name} · ` : ''}
            {formatDate(post.createdAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {post.pinned && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFB547]/20 px-2.5 py-1 text-[11px] font-bold text-[#B97A0B]">
            <Pin className="h-3 w-3" /> {t('posts.pinned')}
          </span>
        )}
      </div>

      <div className="px-4 pb-2 pt-3 sm:px-5">
        {post.title && <h3 className="font-display text-lg font-bold leading-snug text-[#0B2E2B]">{post.title}</h3>}
        {post.body && <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-[#0B2E2B]/80"><MentionText text={post.body} /></p>}
      </div>
      {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" className="max-h-[480px] w-full object-cover" />}

      <div className="space-y-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => (isAuthenticated ? onLike(post) : needLogin())}
            aria-pressed={post.likedByMe}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold transition-colors',
              post.likedByMe ? 'bg-[#FF6B4A]/12 text-[#E0492A]' : 'text-[#0B2E2B]/60 hover:bg-[#FBF6EC]')}
          >
            <Heart className={cn('h-4 w-4', post.likedByMe && 'fill-current')} /> {post.likeCount > 0 && post.likeCount} {t('posts.like')}
          </button>
          <button onClick={() => setShowComments((v) => !v)} aria-expanded={showComments}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#0B2E2B]/60 hover:bg-[#FBF6EC]">
            <MessageCircle className="h-4 w-4" /> {post.commentCount > 0 && post.commentCount} {t('posts.comment')}
          </button>
          <button onClick={() => (isAuthenticated ? setShareOpen(true) : needLogin())}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#0B2E2B]/60 hover:bg-[#FBF6EC]">
            <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('posts.forward')}</span>
          </button>
          {(canModerate || canDelete) && (
            <span className="ml-auto flex">
              {canModerate && (
                <button onClick={() => onPin(post, !post.pinned)} aria-label={post.pinned ? t('posts.unpin') : t('posts.pin')}
                  className="rounded-full p-2 text-[#0B2E2B]/45 hover:bg-[#FBF6EC]">
                  {post.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </button>
              )}
              {canDelete && (
                <button onClick={() => { if (window.confirm(t('posts.deleteConfirm'))) onDelete(post); }} aria-label={t('posts.delete')}
                  className="rounded-full p-2 text-[#D03838]/70 hover:bg-[#F05252]/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </span>
          )}
        </div>
        {showComments && <Comments post={post} canModerate={canModerate} />}
      </div>

      <UserPickerModal
        key={shareOpen ? 'share-open' : 'share-closed'}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={t('posts.forwardTitle')}
        onPick={async (userId) => forward(userId)}
      />
    </article>
  );
}
