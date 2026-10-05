import { createContext, useContext } from 'react';
import type { BaseLang, Lang } from './types';
import { BASE_DICTS } from './i18n-base';
import { APP_DICTS } from './i18n-app';
import { ARRIVAL_DICTS } from './i18n-arrival';

export type Dict = Record<string, string>;

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'sv', label: 'Svenska' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ku', label: 'Kurdî' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'uz', label: 'Oʻzbekcha' },
  { code: 'ar', label: 'العربية' },
  { code: 'ary', label: 'الدارجة المغاربية' },
  { code: 'ur', label: 'اردو' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'th', label: 'ไทย' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

export const LANG_CODES = new Set<string>(LANGS.map((l) => l.code));

/** Written right to left. */
export const RTL_LANGS = new Set<Lang>(['ar', 'ary', 'ur']);

export const LOCALE_MAP: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  ru: 'ru-RU',
  th: 'th-TH',
  es: 'es-ES',
  pt: 'pt-BR',
  de: 'de-DE',
  nl: 'nl-NL',
  sv: 'sv-SE',
  pl: 'pl-PL',
  uk: 'uk-UA',
  tr: 'tr-TR',
  ku: 'ku-TR',
  kk: 'kk-KZ',
  uz: 'uz-Latn-UZ',
  ar: 'ar',
  ary: 'ar-MA',
  ur: 'ur-PK',
  hi: 'hi-IN',
  ms: 'ms-MY',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export const DICTS: Record<BaseLang, Dict> = {
  fr: { ...BASE_DICTS.fr, ...APP_DICTS.fr, ...ARRIVAL_DICTS.fr },
  en: { ...BASE_DICTS.en, ...APP_DICTS.en, ...ARRIVAL_DICTS.en },
  ru: { ...BASE_DICTS.ru, ...APP_DICTS.ru, ...ARRIVAL_DICTS.ru },
  th: { ...BASE_DICTS.th, ...APP_DICTS.th, ...ARRIVAL_DICTS.th },
};

export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
  formatDate: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
  formatTHB: (n: number) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

/* ------------------------------------------------ languages loaded on demand */

const LOADERS = import.meta.glob<{ default: Dict }>('../locales/*.json');
const EXTRA: Partial<Record<Lang, Dict>> = {};

export const isLoaded = (lang: Lang): boolean => lang in DICTS || lang in EXTRA;

/** Fetches the dictionary of a language that isn't bundled (no-op for fr/en/ru/th). */
export async function loadLocale(lang: Lang): Promise<void> {
  if (isLoaded(lang)) return;
  const load = LOADERS[`../locales/${lang}.json`];
  if (!load) return;
  EXTRA[lang] = (await load()).default;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  // missing strings fall back to English, then French
  let str = (DICTS as Partial<Record<Lang, Dict>>)[lang]?.[key] ?? EXTRA[lang]?.[key] ?? DICTS.en[key] ?? DICTS.fr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function formatDateFor(lang: Lang, iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], opts ?? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatTHBFor(lang: Lang, n: number): string {
  return `${new Intl.NumberFormat(LOCALE_MAP[lang]).format(n)} ฿`;
}
