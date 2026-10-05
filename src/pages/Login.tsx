import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { Loader2, Mail } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { GOOGLE_ENABLED, supabase } from '@/lib/supabase';

function safeNext(raw: string | null): string {
  // only allow in-app paths
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/explorer';
}

export default function Login() {
  const { t } = useI18n();
  const { isAuthenticated, profileLoaded, profileComplete, configured } = useStore();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  if (isAuthenticated && profileLoaded) {
    return <Navigate to={profileComplete ? next : `/bienvenue?next=${encodeURIComponent(next)}`} replace />;
  }

  const redirectTo = `${window.location.origin}/connexion?next=${encodeURIComponent(next)}`;

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError(t('err.invalid_input')); return; }
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (err) { setError(err.message.includes('rate') ? t('err.rate_limited') : t('err.generic')); return; }
    setEmail(clean);
    setStep('code');
    setCooldown(60);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length < 6) { setError(t('auth.badCode')); return; }
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (err) setError(t('auth.badCode'));
    // on success the store picks up the session and <Navigate> above redirects
  };

  const google = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (err) setError(t('err.generic'));
  };

  const inputCls = 'h-12 w-full rounded-full border border-[#E4DCCF] bg-white px-5 text-[15px] text-[#15130F] outline-none transition-colors placeholder:text-[#15130F]/35 focus:border-[#A8844A] focus-visible:ring-2 focus-visible:ring-[#A8844A]/25';
  const primaryCls = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#A8844A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#7D6136] disabled:opacity-60';

  return (
    <div className="mx-auto flex max-w-[440px] flex-col px-6 py-14 sm:py-20">
      <h1 className="font-display text-[clamp(1.9rem,6vw,2.5rem)] font-bold leading-tight tracking-[-0.02em] text-[#15130F]">
        {step === 'email' ? t('auth.title') : t('auth.sentTitle')}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#15130F]/60">
        {step === 'email' ? t('auth.subtitle') : t('auth.sentBody', { email })}
      </p>

      {!configured && (
        <p role="alert" className="mt-6 rounded-2xl bg-[#D9C08A]/20 px-4 py-3 text-sm font-medium text-[#7D6136]">
          {t('auth.notConfigured')}
        </p>
      )}

      <div className="mt-8 rounded-[24px] border border-[#E4DCCF] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,43,.06)]">
        {step === 'email' ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
            <label htmlFor="login-email" className="text-sm font-semibold text-[#15130F]">{t('auth.emailLabel')}</label>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className={inputCls}
            />
            <button type="submit" disabled={busy || !configured} className={primaryCls}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {busy ? t('auth.sending') : t('auth.send')}
            </button>
            {GOOGLE_ENABLED && (
              <>
                <div className="flex items-center gap-3 text-xs text-[#15130F]/40">
                  <span className="h-px flex-1 bg-[#E4DCCF]" />{t('auth.or')}<span className="h-px flex-1 bg-[#E4DCCF]" />
                </div>
                <button
                  type="button"
                  onClick={google}
                  disabled={!configured}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#E4DCCF] bg-white px-6 text-[15px] font-semibold text-[#15130F] transition-colors hover:bg-[#F7F4EE] disabled:opacity-60"
                >
                  {t('auth.google')}
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
            <label htmlFor="login-code" className="text-sm font-semibold text-[#15130F]">{t('auth.codeLabel')}</label>
            <input
              id="login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={`${inputCls} text-center font-mono text-xl tracking-[0.4em]`}
            />
            <button type="submit" disabled={busy} className={primaryCls}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? t('auth.verifying') : t('auth.verify')}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="font-medium text-[#15130F]/60 underline-offset-4 hover:underline">
                {t('auth.changeEmail')}
              </button>
              <button type="button" disabled={cooldown > 0 || busy} onClick={() => void sendCode()} className="font-semibold text-[#A8844A] underline-offset-4 hover:underline disabled:text-[#15130F]/35 disabled:no-underline">
                {t('auth.resend')}{cooldown > 0 ? ` (${cooldown}s)` : ''}
              </button>
            </div>
          </form>
        )}
        {error && <p role="alert" className="mt-4 text-sm font-medium text-[#F05252]">{error}</p>}
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-[#15130F]/50">{t('auth.terms')}</p>
    </div>
  );
}
