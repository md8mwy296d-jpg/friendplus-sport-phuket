import { useMemo, useState, type FormEvent } from 'react';
import { countryOptions } from '@/lib/countries';
import { LANGS, useI18n } from '@/lib/i18n';
import type { Lang, Profile } from '@/lib/types';

export interface ProfileValues {
  name: string;
  phone: string;
  countryCode: string;
  lang: Lang;
}

/** Name, phone (WhatsApp), nationality and language — shared by the welcome screen and the account page. */
export default function ProfileForm({ initial, submitLabel, busyLabel, onSubmit }: {
  initial: Profile | null;
  submitLabel: string;
  busyLabel: string;
  onSubmit: (values: ProfileValues) => Promise<void>;
}) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [countryCode, setCountryCode] = useState(initial?.countryCode ?? '');
  const [language, setLanguage] = useState<Lang>(initial?.onboarded ? initial.lang : lang);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const countries = useMemo(() => countryOptions(lang), [lang]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError(t('onboard.errName')); return; }
    if (phone.replace(/\D/g, '').length < 6) { setError(t('onboard.errPhone')); return; }
    setError('');
    setBusy(true);
    await onSubmit({ name: name.trim(), phone: phone.trim(), countryCode, lang: language });
    setBusy(false);
  };

  const labelCls = 'text-xs font-bold uppercase tracking-[0.12em] text-ink/50';
  const inputCls = 'mt-1.5 w-full rounded-xl border border-sand-dark bg-white px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-ink/35 focus:border-lagoon';

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="block">
        <span className={labelCls}>{t('profile.name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder={t('onboard.namePh')} className={inputCls} />
      </label>
      <label className="block">
        <span className={labelCls}>{t('onboard.phone')}</span>
        <input
          value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} type="tel" inputMode="tel"
          autoComplete="tel" placeholder={t('onboard.phonePh')} className={inputCls}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t('onboard.nationality')}</span>
          <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={inputCls}>
            <option value="">{t('onboard.choose')}</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{t('onboard.lang')}</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Lang)} className={inputCls}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="text-sm font-medium text-cancel">{error}</p>}
      <button type="submit" disabled={busy} className="mt-1 h-12 rounded-full bg-lagoon text-sm font-bold text-white hover:bg-lagoon-deep disabled:opacity-60">
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}
