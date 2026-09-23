import type { Conversation } from './club';
import type { User } from './types';
import { useI18n } from './i18n';

/** Display name of a conversation (private chats are named after the other player). */
export function conversationTitle(c: Pick<Conversation, 'kind' | 'name'>, other: User | undefined, fallback: string): string {
  if (c.kind === 'direct') return other?.name || fallback;
  return c.name || fallback;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** « 14:32 » today, « Hier » yesterday, « 12 sept. » otherwise. */
export function useListTime() {
  const { t, formatDate } = useI18n();
  return (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (isSameDay(d, now)) return formatDate(iso, { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, yesterday)) return t('club.chat.yesterday');
    return formatDate(iso, { day: 'numeric', month: 'short' });
  };
}
