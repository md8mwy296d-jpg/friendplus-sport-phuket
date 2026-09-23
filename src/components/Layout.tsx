import { Outlet, useLocation } from 'react-router';
import { Suspense, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import Navbar from './Navbar';
import Footer from './Footer';
import Toasts from './Toast';

export default function Layout() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  // scroll to top on route change (except hash links)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FBF6EC]">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<p className="py-24 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
