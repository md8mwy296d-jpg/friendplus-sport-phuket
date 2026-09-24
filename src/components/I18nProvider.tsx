import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '@/lib/types';
import {
  I18nContext, translate, LOCALE_MAP, LANG_CODES, RTL_LANGS, isLoaded, loadLocale, formatDateFor, formatTHBFor,
  type I18nContextValue,
} from '@/lib/i18n';

const LANG_KEY = 'friendplus.lang';

function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw && LANG_CODES.has(raw)) return raw as Lang;
  } catch { /* ignore */ }
  // first visit: the phone's language when we have it
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.toLowerCase();
    if (code.startsWith('ar-ma') || code.startsWith('ar-dz') || code.startsWith('ar-tn')) return 'ary';
    const base = code.split('-')[0];
    if (LANG_CODES.has(base)) return base as Lang;
  }
  return 'fr';
}

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang());
  // bumps once the dictionary of a language loaded on demand has arrived
  const [loaded, setLoaded] = useState(0);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
    if (isLoaded(lang)) return;
    let alive = true;
    loadLocale(lang).then(() => { if (alive) setLoaded((n) => n + 1); }).catch(console.error);
    return () => { alive = false; };
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    locale: LOCALE_MAP[lang],
    formatDate: (iso, opts) => formatDateFor(lang, iso, opts),
    formatTHB: (n) => formatTHBFor(lang, n),
  }), [lang, setLang, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
