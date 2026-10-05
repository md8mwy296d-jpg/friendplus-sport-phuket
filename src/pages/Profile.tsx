import { LogOut } from 'lucide-react';
import { flagOf } from '@/lib/countries';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import ProfileForm from '@/components/ProfileForm';
import DeleteAccount from '@/components/DeleteAccount';

export default function Profile() {
  const { t, setLang } = useI18n();
  const { profile, email, updateProfile, signOut, pushToast } = useStore();

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">{t('profile.title')}</h1>
      <p className="mt-1 text-sm text-ink/55">{t('profile.email')} : {email}</p>

      <div className="mt-6 rounded-[24px] border border-sand-dark bg-white p-5 shadow-paper">
        <ProfileForm
          key={profile?.id}
          initial={profile}
          submitLabel={t('common.save')}
          busyLabel={t('onboard.saving')}
          onSubmit={async (v) => {
            const ok = await updateProfile({
              name: v.name, phone: v.phone, countryCode: v.countryCode, nationality: flagOf(v.countryCode), lang: v.lang,
            });
            if (ok) { setLang(v.lang); pushToast({ kind: 'success', title: t('profile.saved') }); }
          }}
        />
      </div>

      <button
        onClick={() => void signOut()}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-sand-dark bg-white text-sm font-semibold text-ink hover:bg-sand"
      >
        <LogOut className="h-4 w-4" /> {t('nav.logout')}
      </button>

      <div className="mt-10">
        <DeleteAccount />
      </div>
    </div>
  );
}
