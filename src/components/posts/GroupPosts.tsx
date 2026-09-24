import { useMemo } from 'react';
import { usePosts } from '@/lib/posts';
import { useI18n } from '@/lib/i18n';
import PostCard from './PostCard';
import PostComposer from './PostComposer';

/** Publications inside a group: its creator / admins post, members like, comment and forward. */
export default function GroupPosts({ groupId, canPublish }: { groupId: string; canPublish: boolean }) {
  const { t } = useI18n();
  const scope = useMemo(() => ({ kind: 'group' as const, groupId }), [groupId]);
  const feed = usePosts(scope);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-6">
      {canPublish
        ? <PostComposer target={{ groupId }} heading={t('posts.publishInGroup')} onPublish={feed.publish} />
        : <p className="text-[13px] text-[#0B2E2B]/50">{t('posts.groupHint')}</p>}
      {feed.loading ? (
        <p className="py-16 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>
      ) : feed.posts.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-[#EADFC8] px-6 py-12 text-center text-sm text-[#0B2E2B]/50">{t('posts.empty')}</p>
      ) : (
        feed.posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            canModerate={canPublish}
            onLike={(x) => void feed.toggleLike(x)}
            onDelete={(x) => void feed.remove(x)}
            onPin={(x, v) => void feed.setPinned(x, v)}
          />
        ))
      )}
    </div>
  );
}
