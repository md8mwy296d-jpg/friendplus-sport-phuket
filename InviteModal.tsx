import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Send, X } from 'lucide-react';
import type { Session } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import PlayerAvatar from './PlayerAvatar';
import { cn } from '@/lib/utils';

interface InviteModalProps {
  session: Session;
  open: boolean;
  onClose: () => void;
}

/** Invitation modal: search simulated players, select chips, personal message, send → store auto-replies. */
export default function InviteModal({ session, open, onClose }: InviteModalProps) {
  const { users, currentUser, sendInvitation, invitations } = useStore();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const candidates = useMemo(() => {
    const invited = new Set(
      invitations
        .filter((i) => i.sessionId === session.id && i.fromUserId === currentUser.id && i.status === 'pending')
        .map((i) => i.toUserId),
    );
    return users
      .filter((u) => u.id !== currentUser.id)
      .filter((u) => !session.playerIds.includes(u.id))
      .filter((u) => !invited.has(u.id))
      .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const aSport = a.sports.includes(session.sport) ? 0 : 1;
        const bSport = b.sports.includes(session.sport) ? 0 : 1;
        return aSport - bSport || b.rating - a.rating;
      });
  }, [users, currentUser.id, session, invitations, query]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const send = () => {
    for (const id of selected) sendInvitation(session.id, id, message);
    setSelected([]);
    setMessage('');
    setQuery('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0B2E2B]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('invite.title')}
            className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#EADFC8] p-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#0B2E2B]">{t('invite.title')}</h2>
                <p className="mt-0.5 text-[13px] text-[#0B2E2B]/55">{t('invite.subtitle')}</p>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-[#0B2E2B]/50 hover:bg-[#FBF6EC]" aria-label={t('common.close')}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-[#EADFC8] p-4">
              <div className="flex items-center gap-2 rounded-full border border-[#EADFC8] bg-[#FBF6EC] px-4 py-2.5">
                <Search className="h-4 w-4 text-[#0B2E2B]/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('invite.search')}
                  className="w-full bg-transparent text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35"
                />
              </div>
              {selected.length > 0 && (
                <p className="mt-2 text-xs font-semibold text-[#0E8C7F]">
                  {t(selected.length === 1 ? 'invite.selected.one' : 'invite.selected.other', { count: selected.length })}
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {candidates.map((u) => {
                const isSel = selected.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                      isSel ? 'bg-[#0E8C7F]/10' : 'hover:bg-[#FBF6EC]',
                    )}
                  >
                    <PlayerAvatar user={u} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#0B2E2B]">
                        {u.name} <span className="font-normal">{u.nationality}</span>
                      </span>
                      <span className="block truncate text-xs text-[#0B2E2B]/50">
                        {u.sports.map((s) => t(`sport.${s}`)).join(' · ')} — {t(`common.level.${u.level}`)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                        isSel ? 'border-[#0E8C7F] bg-[#0E8C7F] text-white' : 'border-[#EADFC8]',
                      )}
                    >
                      {isSel && <Send className="h-2.5 w-2.5" />}
                    </span>
                  </button>
                );
              })}
              {candidates.length === 0 && (
                <p className="py-8 text-center text-sm text-[#0B2E2B]/45">{t('empty.title')}</p>
              )}
            </div>

            <div className="space-y-3 border-t border-[#EADFC8] p-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('invite.messagePlaceholder')}
                rows={2}
                className="w-full resize-none rounded-2xl border border-[#EADFC8] bg-[#FBF6EC] px-4 py-3 text-sm text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35 focus:border-[#0E8C7F]"
              />
              <button
                onClick={send}
                disabled={selected.length === 0}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white transition-all',
                  selected.length > 0
                    ? 'bg-[linear-gradient(135deg,#FF6B4A,#FFB547)] shadow-[0_8px_24px_rgba(255,107,74,.35)] hover:scale-[1.02]'
                    : 'cursor-not-allowed bg-[#0B2E2B]/15',
                )}
              >
                <Send className="h-4 w-4" />
                {t('invite.send')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
