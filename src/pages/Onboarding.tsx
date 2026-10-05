import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { flagOf } from '@/lib/countries';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import ProfileForm from '@/components/ProfileForm';

/** First sign-in: name and phone are needed before booking. */
export default function Onboarding() {
  const { t, setLang } = useI18n();
  const { ready, isAuthenticated, profile, profileComplete, updateProfile } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get('next') ?? '/';
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';

  if (!ready) return <p className="py-24 text-center text-sm text-ink/50">{t('common.loading')}</p>;
  if (!isAuthenticated) return <Navigate to={`/connexion?next=${encodeURIComponent(next)}`} replace />;
  if (profileComplete) return <Navigate to={next} replace />;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t('onboard.title')}</h1>
      <p className="mt-2 text-ink/60">{t('onboard.subtitle')}</p>
      <div className="mt-6 rounded-[24px] border border-sand-dark bg-white p-5 shadow-paper">
        <ProfileForm
          initial={profile}
          submitLabel={t('onboard.submit')}
          busyLabel={t('onboard.saving')}
          onSubmit={async (v) => {
            const ok = await updateProfile({
              name: v.name, phone: v.phone, countryCode: v.countryCode, nationality: flagOf(v.countryCode),
              lang: v.lang, onboarded: true,
            });
            if (ok) { setLang(v.lang); navigate(next, { replace: true }); }
          }}
        />
      </div>
    </div>
  );
}
