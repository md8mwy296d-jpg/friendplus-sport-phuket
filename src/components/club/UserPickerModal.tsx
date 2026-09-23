import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useI18n } from '@/lib/i18n';
import PlayerAvatar from '@/components/PlayerAvatar';
import { Modal } from './ClubUI';

/** Searchable list of players: pick one (new private message) or add several (group members). */
export default function UserPickerModal({
  open, onClose, title, exclude = [], onPick, multi = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  exclude?: string[];
  onPick: (userId: string) => Promise<boolean> | void;
  multi?: boolean;
}) {
  const { users, currentUser } = useStore();
  const { blockedIds } = useClub();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<string[]>([]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hidden = new Set([currentUser.id, ...exclude, ...blockedIds]);
    return users
      .filter((u) => !hidden.has(u.id))
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 60);
  }, [users, currentUser.id, exclude, blockedIds, query]);

  const pick = async (id: string) => {
    const res = await onPick(id);
    if (multi) { if (res !== false) setAdded((prev) => [...prev, id]); }
    else onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <label className="flex h-12 items-center gap-2.5 rounded-full border border-[#EADFC8] bg-[#FBF6EC]/60 px-4 focus-within:border-[#0E8C7F] focus-within:bg-white">
        <Search className="h-4 w-4 text-[#0B2E2B]/40" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('club.picker.search')}
          className="h-full flex-1 bg-transparent text-[15px] text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35"
        />
      </label>
      <ul className="mt-4 flex flex-col gap-1">
        {candidates.length === 0 && <li className="py-8 text-center text-sm text-[#0B2E2B]/50">{t('club.picker.empty')}</li>}
        {candidates.map((u) => {
          const done = added.includes(u.id);
          return (
            <li key={u.id}>
              <button
                onClick={() => !done && void pick(u.id)}
                disabled={done}
                className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-[#FBF6EC] disabled:opacity-70"
              >
                <PlayerAvatar user={u} size={42} ring={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-[#0B2E2B]">{u.name} {u.nationality}</span>
                  <span className="block truncate text-[13px] text-[#0B2E2B]/50">
                    {u.sports.map((s) => t(`sport.${s}`)).join(' · ')} · {t(`common.level.${u.level}`)}
                  </span>
                </span>
                {multi && (
                  <span className={done
                    ? 'inline-flex items-center gap-1 text-[13px] font-semibold text-[#15803D]'
                    : 'rounded-full border border-[#0E8C7F]/40 px-3 py-1 text-[13px] font-bold text-[#0A6E64]'}
                  >
                    {done ? <><Check className="h-3.5 w-3.5" /> {t('club.picker.added')}</> : t('club.picker.add')}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
