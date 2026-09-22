import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

/** Guards member-only pages: login first, then a completed profile. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated, profileLoaded, profileComplete } = useStore();
  const { t } = useI18n();
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);

  if (!ready || (isAuthenticated && !profileLoaded)) {
    return <p className="py-24 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>;
  }
  if (!isAuthenticated) return <Navigate to={`/connexion?next=${next}`} replace />;
  if (!profileComplete) return <Navigate to={`/bienvenue?next=${next}`} replace />;
  return <>{children}</>;
}
