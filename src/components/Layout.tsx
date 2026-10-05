import { Outlet, useLocation } from 'react-router';
import { Suspense, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import Navbar from './Navbar';
import Footer from './Footer';
import Toasts from './Toast';
import MobileTabBar from './mobile/MobileTabBar';
import InstallPrompt from './mobile/InstallPrompt';

export default function Layout() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  // scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-sand pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<p className="py-24 text-center text-sm text-ink/50">{t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileTabBar />
      <InstallPrompt />
      <Toasts />
    </div>
  );
}
