import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '@/lib/types';
import { I18nContext, translate, LOCALE_MAP, formatDateFor, formatTHBFor, type I18nContextValue } from '@/lib/i18n';

const LANG_KEY = 'friendplus.lang';

function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw === 'fr' || raw === 'en' || raw === 'ru' || raw === 'th') return raw;
  } catch { /* ignore */ }
  return 'fr';
}

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    locale: LOCALE_MAP[lang],
    formatDate: (iso, opts) => formatDateFor(lang, iso, opts),
    formatTHB: (n) => formatTHBFor(lang, n),
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
