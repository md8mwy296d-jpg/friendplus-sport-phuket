/** Tropical gradients a player can pick for an avatar without photo (index stored in profiles.avatar_color). */
export const AVATAR_GRADIENTS = [
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

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Chosen gradient, or one derived from the name so every player keeps a stable colour. */
export function avatarGradient(name: string, color?: number | null): string[] {
  return AVATAR_GRADIENTS[color ?? hash(name) % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
}
