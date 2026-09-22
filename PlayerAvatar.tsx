import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';

const GRADIENTS = [
  ['#0E8C7F', '#2FBFA5'],
  ['#FF6B4A', '#FFB547'],
  ['#1E5945', '#0E8C7F'],
  ['#5B7CFF', '#2FBFA5'],
  ['#FFB547', '#FF6B4A'],
  ['#0B2E2B', '#1E5945'],
  ['#F05252', '#FF6B4A'],
  ['#2FBFA5', '#5B7CFF'],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

interface PlayerAvatarProps {
  user: Pick<User, 'name' | 'nationality'>;
  size?: number;
  className?: string;
  ring?: boolean;
}

/** Avatar with initials on a deterministic tropical gradient (hash of the name), white ring, native tooltip. */
export default function PlayerAvatar({ user, size = 32, className, ring = true }: PlayerAvatarProps) {
  const [c1, c2] = GRADIENTS[hash(user.name) % GRADIENTS.length];
  return (
    <span
      title={`${user.name} ${user.nationality}`}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white',
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
      {initials(user.name)}
    </span>
  );
}
