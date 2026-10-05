import { ChevronDown, Globe } from 'lucide-react';
import { LANGS, useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Compact "🌐 FR ▾" button over a native select: the phone's own picker, 23 languages, accessible. */
export default function LanguageSelect({ dark = false, className }: { dark?: boolean; className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <label
      className={cn(
        'relative flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 text-sm font-bold',
        dark ? 'border-white/25 bg-white/10 text-white' : 'border-sand-dark bg-white/80 text-ink',
        className,
      )}
    >
      <Globe className="h-4 w-4" aria-hidden />
      <span aria-hidden>{lang.toUpperCase()}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t('nav.language')}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
