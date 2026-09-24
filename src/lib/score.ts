/** Colour of a % score: green from 80, amber from 50, red below. */
export function scoreTone(pct: number | null): string {
  if (pct === null) return 'bg-[#0B2E2B]/8 text-[#0B2E2B]/55';
  if (pct >= 80) return 'bg-[#22C55E]/15 text-[#15803D]';
  if (pct >= 50) return 'bg-[#FFB547]/20 text-[#B97A0B]';
  return 'bg-[#F05252]/12 text-[#D03838]';
}
