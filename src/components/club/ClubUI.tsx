import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Users, X } from 'lucide-react';
import type { ConversationKind } from '@/lib/club';
import type { Sport, User } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import PlayerAvatar from '@/components/PlayerAvatar';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Bottom sheet on phones, centered card on larger screens (same look as the invite modal). */
export function Modal({
  open, onClose, title, subtitle, children, footer, className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0B2E2B]/50 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]',
              className,
            )}
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EADFC8] p-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-[#0B2E2B]">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-[#0B2E2B]/55">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="shrink-0 rounded-full p-2 text-[#0B2E2B]/50 hover:bg-[#FBF6EC]" aria-label={t('common.close')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
            {footer && <div className="border-t border-[#EADFC8] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmModal({
  open, onClose, onConfirm, title, body, confirmLabel, danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="h-12 flex-1 rounded-full border border-[#EADFC8] text-sm font-semibold text-[#0B2E2B] hover:bg-[#FBF6EC]">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              'h-12 flex-1 rounded-full text-sm font-bold text-white',
              danger ? 'bg-[#E03E3E] hover:bg-[#C53030]' : 'bg-[#0E8C7F] hover:bg-[#0A6E64]',
            )}
          >
            {confirmLabel ?? t('club.confirm')}
          </button>
        </div>
      }
    >
      {body && <p className="text-[15px] leading-relaxed text-[#0B2E2B]/70">{body}</p>}
    </Modal>
  );
}

const KIND_STYLE: Record<ConversationKind, string> = {
  group: 'bg-[linear-gradient(135deg,#0E8C7F,#2FBFA5)]',
  session: 'bg-[linear-gradient(135deg,#FF6B4A,#FFB547)]',
  direct: 'bg-[linear-gradient(135deg,#0B2E2B,#1E5945)]',
};

/** Round avatar for a conversation: the other player for private chats, a sport badge otherwise. */
export function ConversationAvatar({
  kind, sport, other, isPrivate = false, size = 48,
}: {
  kind: ConversationKind;
  sport: Sport | null;
  other?: Pick<User, 'name' | 'nationality'>;
  isPrivate?: boolean;
  size?: number;
}) {
  if (kind === 'direct' && other) return <PlayerAvatar user={other} size={size} ring={false} />;
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full text-white', KIND_STYLE[kind])}
      style={{ width: size, height: size }}
    >
      {sport ? <SportIcon sport={sport} className="h-[46%] w-[46%]" strokeWidth={2} /> : <Users className="h-[42%] w-[42%]" />}
      {isPrivate && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[#0B2E2B] shadow">
          <Lock className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn('flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B4A] px-1.5 text-[11px] font-bold text-white', className)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
