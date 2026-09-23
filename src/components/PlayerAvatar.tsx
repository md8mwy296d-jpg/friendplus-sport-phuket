import { useState } from 'react';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { avatarGradient, initials } from '@/lib/avatar';

interface PlayerAvatarProps {
  user: Pick<User, 'name' | 'nationality'> & Partial<Pick<User, 'avatarUrl' | 'avatarColor'>>;
  size?: number;
  className?: string;
  ring?: boolean;
}

/** Profile photo when the player added one, otherwise initials on their tropical gradient. */
export default function PlayerAvatar({ user, size = 32, className, ring = true }: PlayerAvatarProps) {
  const [brokenUrl, setBrokenUrl] = useState('');
  const [c1, c2] = avatarGradient(user.name, user.avatarColor);
  const showPhoto = Boolean(user.avatarUrl) && user.avatarUrl !== brokenUrl;
  return (
    <span
      title={`${user.name} ${user.nationality}`}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        ring && 'ring-2 ring-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
    >
      {showPhoto ? (
        <img
          src={user.avatarUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setBrokenUrl(user.avatarUrl ?? '')}
        />
      ) : (
        initials(user.name) || '?'
      )}
    </span>
  );
}
