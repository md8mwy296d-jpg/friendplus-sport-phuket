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
  // a conversation takes the whole screen, like a messaging app
  const inChat = pathname.startsWith('/club/');

  // scroll to top on route change (except hash links)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className={`flex min-h-[100dvh] flex-col bg-[#FBF6EC] ${inChat ? '' : 'pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0'}`}>
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<p className="py-24 text-center text-sm text-[#0B2E2B]/50">{t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
      {!inChat && <Footer />}
      {!inChat && <MobileTabBar />}
      <InstallPrompt />
      <Toasts />
    </div>
  );
}
