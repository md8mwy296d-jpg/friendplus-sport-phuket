import type { ComponentProps } from 'react';
import { useSocial } from '@/lib/social';
import { useI18n } from '@/lib/i18n';
import PlayerAvatar from '@/components/PlayerAvatar';

type Props = ComponentProps<typeof PlayerAvatar> & { userId: string };

/** A player's avatar with a green dot when this friend has the app open. */
export default function PresenceAvatar({ userId, size = 32, ...rest }: Props) {
  const { isOnline } = useSocial();
  const { t } = useI18n();
  const online = isOnline(userId);
  const dot = Math.max(10, Math.round(size * 0.28));
  return (
    <span className="relative inline-flex shrink-0">
      <PlayerAvatar size={size} {...rest} />
      {online && (
        <span
          aria-label={t('presence.online')}
          className="absolute bottom-0 right-0 rounded-full bg-[#22C55E] ring-2 ring-white"
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  );
}
