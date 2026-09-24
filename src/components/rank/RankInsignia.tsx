import { useId } from 'react';
import type { Rank, RankTier } from '@/lib/rank';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const TIER: Record<RankTier, { from: string; to: string; edge: string; mark: string }> = {
  bronze: { from: '#E3A769', to: '#9A5B2A', edge: '#6E3F1C', mark: '#FFF4E6' },
  silver: { from: '#EEF2F6', to: '#8C99A6', edge: '#5B6670', mark: '#1F2A33' },
  gold: { from: '#FFE08A', to: '#D9971E', edge: '#8F5F0A', mark: '#5A3A05' },
  legend: { from: '#2FBFA5', to: '#0B2E2B', edge: '#FFB547', mark: '#FFD166' },
};

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)},${(cy + rr * Math.sin(rad)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Shield insignia with chevrons or stars, coloured by tier (bronze → legend). */
export default function RankInsignia({ rank, size = 20, className }: { rank: Rank; size?: number; className?: string }) {
  const { t } = useI18n();
  const id = useId().replace(/:/g, '');
  const c = TIER[rank.tier];
  const label = t(`rank.${rank.key}`);

  const marks = rank.mark === 'chevron'
    ? Array.from({ length: rank.count }, (_, i) => {
        const y = 15 + (i - (rank.count - 1) / 2) * 6.5;
        return <path key={i} d={`M9 ${y - 2.5} L16 ${y + 2.5} L23 ${y - 2.5}`} fill="none" stroke={c.mark} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />;
      })
    : rank.key === 'legend'
      ? [<polygon key="s" points={star(16, 14.5, 6.5)} fill={c.mark} />]
      : Array.from({ length: rank.count }, (_, i) => {
          const layout = rank.count === 1 ? [[16, 15]] : rank.count === 2 ? [[11.5, 15], [20.5, 15]] : [[16, 10.5], [11.5, 18.5], [20.5, 18.5]];
          const [x, y] = layout[i];
          return <polygon key={i} points={star(x, y, rank.count === 1 ? 6 : 4.2)} fill={c.mark} />;
        });

  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label={label} className={cn('inline-block shrink-0', className)}>
      <title>{label}</title>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.from} />
          <stop offset="1" stopColor={c.to} />
        </linearGradient>
      </defs>
      {rank.key === 'legend' && (
        <g fill="none" stroke="#FFB547" strokeWidth="1.6" strokeLinecap="round">
          <path d="M5 9 C3 15 4 22 10 27" />
          <path d="M27 9 C29 15 28 22 22 27" />
          <path d="M4.5 13 l-2 -1 M4.4 18 l-2.2 0 M6 22.5 l-1.8 1.2 M27.5 13 l2 -1 M27.6 18 l2.2 0 M26 22.5 l1.8 1.2" />
        </g>
      )}
      <path d="M16 2.5 L26.5 6.5 V15 C26.5 21.5 22 26.5 16 29.5 C10 26.5 5.5 21.5 5.5 15 V6.5 Z" fill={`url(#g${id})`} stroke={c.edge} strokeWidth="1.4" strokeLinejoin="round" />
      {marks}
    </svg>
  );
}
