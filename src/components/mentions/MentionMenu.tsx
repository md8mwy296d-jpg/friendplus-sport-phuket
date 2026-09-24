import { useSocial } from '@/lib/social';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import PresenceAvatar from '@/components/social/PresenceAvatar';

/** Suggestions shown above a field while an @mention is being typed. */
export default function MentionMenu({ options, index, onPick, className }: {
  options: User[]; index: number; onPick: (username: string) => void; className?: string;
}) {
  const { t } = useI18n();
  const { friendIds } = useSocial();
  if (options.length === 0) return null;
  return (
    <ul
      role="listbox"
      className={cn('absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-2xl border border-[#EADFC8] bg-white p-1 shadow-[0_12px_32px_rgba(11,46,43,.16)]', className)}
    >
      {options.map((u, i) => (
        <li key={u.id}>
          <button
            type="button"
            role="option"
            aria-selected={i === index}
            // keep the field focused
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(u.username)}
            className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left', i === index ? 'bg-[#0E8C7F]/10' : 'hover:bg-[#FBF6EC]')}
          >
            <PresenceAvatar userId={u.id} user={u} size={32} ring={false} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#0B2E2B]">{u.name} {u.nationality}</span>
              <span className="block truncate text-xs font-semibold text-[#0A6E64]">@{u.username}</span>
            </span>
            {friendIds.includes(u.id) && <span className="shrink-0 text-[11px] font-bold text-[#0B2E2B]/40">{t('friends.isFriend')}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
