import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import type { Lang, Level, Sport } from '@/lib/types';
import { LANGS, useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { countryOptions } from '@/lib/countries';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import AvatarEditor from '@/components/AvatarEditor';
import { SPORTS } from '@/lib/sports';

const ALL_SPORTS = SPORTS;
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export default function Onboarding() {
  const { t, lang, setLang } = useI18n();
  const { ready, isAuthenticated, profileLoaded, profileComplete, currentUser, updateProfile } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rawNext = params.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/explorer';

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [sports, setSports] = useState<Sport[]>([]);
  const [level, setLevel] = useState<Level>('beginner');
  const [appLang, setAppLang] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // prefill from an existing profile (e.g. name from Google)
  useEffect(() => {
    if (currentUser.name) setName((n) => n || currentUser.name);
    if (currentUser.countryCode) setCountry((c) => c || currentUser.countryCode);
    if (currentUser.sports.length) setSports((s) => (s.length ? s : currentUser.sports));
  }, [currentUser]);

  const countries = useMemo(() => countryOptions(lang), [lang]);

  if (!ready || (isAuthenticated && !profileLoaded)) {
    return <p className="py-24 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>;
  }
  if (!isAuthenticated) return <Navigate to={`/connexion?next=${encodeURIComponent(next)}`} replace />;
  if (profileComplete && !busy) return <Navigate to={next} replace />;

  const nameOk = name.trim().length >= 2;
  const sportsOk = sports.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!nameOk || !sportsOk) return;
    setBusy(true);
    const picked = countries.find((c) => c.code === country);
    const ok = await updateProfile({
      name: name.trim(),
      countryCode: picked?.code ?? '',
      nationality: picked?.flag ?? '🌍',
      sports,
      level,
      lang: appLang,
      onboarded: true,
    });
    setBusy(false);
    if (ok) {
      setLang(appLang);
      navigate(next, { replace: true });
    }
  };

  const labelCls = 'text-sm font-semibold text-[#0B2E2B]';
  const fieldCls = 'h-12 w-full rounded-full border border-[#EADFC8] bg-white px-5 text-[15px] text-[#0B2E2B] outline-none focus:border-[#0E8C7F] focus-visible:ring-2 focus-visible:ring-[#0E8C7F]/25';

  return (
    <div className="mx-auto max-w-[560px] px-6 py-14 sm:py-20">
      <h1 className="font-display text-[clamp(1.9rem,6vw,2.5rem)] font-bold leading-tight tracking-[-0.02em] text-[#0B2E2B]">{t('onboard.title')}</h1>
      <p className="mt-3 text-[15px] text-[#0B2E2B]/60">{t('onboard.subtitle')}</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-6 rounded-[24px] border border-[#EADFC8] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-8">
        <div className="flex flex-col items-center gap-1">
          <AvatarEditor name={name} flag={countries.find((c) => c.code === country)?.flag} size={88} />
          <p className="text-xs text-[#0B2E2B]/50">{t('avatar.optional')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="ob-name" className={labelCls}>{t('onboard.name')}</label>
          <input id="ob-name" value={name} maxLength={60} autoComplete="given-name" onChange={(e) => setName(e.target.value)} placeholder={t('onboard.namePh')} className={fieldCls} />
          {attempted && !nameOk && <p className="text-xs font-semibold text-[#F05252]">{t('onboard.errName')}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="ob-country" className={labelCls}>{t('onboard.nationality')}</label>
          <select id="ob-country" value={country} onChange={(e) => setCountry(e.target.value)} className={cn(fieldCls, 'appearance-none')}>
            <option value="">{t('onboard.choose')}</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={labelCls}>{t('onboard.sports')}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ALL_SPORTS.map((s) => {
              const on = sports.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                  className={cn(
                    'flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                    on ? 'border-[#0E8C7F] bg-[#0E8C7F] text-white' : 'border-[#EADFC8] bg-white text-[#0B2E2B] hover:bg-[#FBF6EC]',
                  )}
                >
                  <SportIcon sport={s} className="h-4 w-4" /> {t(`sport.${s}`)}
                </button>
              );
            })}
          </div>
          {attempted && !sportsOk && <p className="text-xs font-semibold text-[#F05252]">{t('onboard.errSports')}</p>}
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="ob-level" className={labelCls}>{t('onboard.level')}</label>
            <select id="ob-level" value={level} onChange={(e) => setLevel(e.target.value as Level)} className={cn(fieldCls, 'appearance-none')}>
              {LEVELS.map((l) => <option key={l} value={l}>{t(`common.level.${l}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ob-lang" className={labelCls}>{t('onboard.lang')}</label>
            <select id="ob-lang" value={appLang} onChange={(e) => setAppLang(e.target.value as Lang)} className={cn(fieldCls, 'appearance-none')}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0E8C7F] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#0A6E64] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? t('onboard.saving') : t('onboard.submit')}
        </button>
      </form>
    </div>
  );
}
