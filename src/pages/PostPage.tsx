import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useClubPages, usePosts } from '@/lib/posts';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useI18n } from '@/lib/i18n';
import PostCard from '@/components/posts/PostCard';
import EmptyState from '@/components/EmptyState';

/** A single publication, opened from a link forwarded in a private message. */
export default function PostPage() {
  const { id = '' } = useParams();
  const { currentUser } = useStore();
  const { isAppAdmin } = useClub();
  const { t } = useI18n();
  const scope = useMemo(() => ({ kind: 'single' as const, postId: id }), [id]);
  const { posts, loading, toggleLike, remove, setPinned } = usePosts(scope);
  const { pages } = useClubPages();
  const post = posts[0];
  const page = post?.pageId ? pages.find((p) => p.id === post.pageId) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/club?tab=pages" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6E64]">
        <ArrowLeft className="h-4 w-4" /> {t('posts.backToPages')}
      </Link>
      {loading ? (
        <p className="py-16 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>
      ) : !post ? (
        <EmptyState title={t('posts.notFound')} body={t('posts.notFoundBody')} ctaLabel={t('posts.backToPages')} ctaTo="/club?tab=pages" />
      ) : (
        <PostCard
          post={post}
          page={page}
          canModerate={isAppAdmin || Boolean(page && page.ownerId === currentUser.id)}
          onLike={(x) => void toggleLike(x)}
          onDelete={(x) => void remove(x)}
          onPin={(x, v) => void setPinned(x, v)}
        />
      )}
    </div>
  );
}
