import { Outlet, useLocation } from 'react-router';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Toasts from './Toast';

export default function Layout() {
  const { pathname } = useLocation();

  // scroll to top on route change (except hash links)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FBF6EC]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
