import { Fragment } from 'react';
import { Link } from 'react-router';
import { useStore } from '@/lib/store';
import { splitMentions } from '@/lib/mentions';
import { cn } from '@/lib/utils';

/** Text where each @handle of a real player becomes a link to their page. */
export default function MentionText({ text, className }: { text: string; className?: string }) {
  const { users } = useStore();
  const known = new Set(users.map((u) => u.username).filter(Boolean));
  return (
    <>
      {splitMentions(text).map((p, i) => (p.handle && known.has(p.handle)
        ? (
          <Link
            key={i}
            to={`/joueur/@${p.handle}`}
            onClick={(e) => e.stopPropagation()}
            className={cn('font-semibold text-[#0A6E64] hover:underline', className)}
          >
            {p.text}
          </Link>
        )
        : <Fragment key={i}>{p.text}</Fragment>))}
    </>
  );
}
