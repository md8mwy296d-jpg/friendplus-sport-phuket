import type { Lang } from './types';
import { LOCALE_MAP } from './i18n';

/** Nationalities offered in onboarding / profile (Phuket's main visitor markets first). */
export const COUNTRY_CODES = [
  'TH', 'FR', 'RU', 'GB', 'DE', 'US', 'AU', 'CN', 'IN', 'KR', 'JP', 'MY', 'SG', 'IT', 'ES',
  'NL', 'BE', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'AT', 'IE', 'PT', 'IL', 'AE', 'SA',
  'KZ', 'UA', 'BY', 'CA', 'NZ', 'BR', 'AR', 'MX', 'ID', 'VN', 'PH', 'HK', 'TW', 'TR', 'MA',
  'DZ', 'TN', 'ZA', 'EG', 'LB',
] as const;

export function flagOf(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function countryOptions(lang: Lang): { code: string; flag: string; name: string }[] {
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames([LOCALE_MAP[lang]], { type: 'region' }); } catch { names = null; }
  return COUNTRY_CODES
    .map((code) => ({ code: code as string, flag: flagOf(code), name: names?.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, LOCALE_MAP[lang]));
}
