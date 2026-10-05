import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { UserRound } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import Logo from './Logo';
import LanguageSelect from './LanguageSelect';

export default function Navbar() {
  const { t } = useI18n();
  const { isAuthenticated, isAdmin, profile } = useStore();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  // pages whose dark hero sits under the transparent bar
  const dark = (pathname === '/' || pathname === '/mon-arrivee') && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { to: '/mon-arrivee', key: 'nav.arrival' },
    { to: '/explorer', key: 'nav.explore' },
    { to: '/reservations', key: 'nav.bookings' },
    ...(isAdmin ? [{ to: '/admin', key: 'nav.admin' }] : []),
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-300',
        dark ? 'bg-transparent' : 'border-b border-sand-dark bg-[rgba(251,246,236,.88)] backdrop-blur-[12px]',
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <Logo dark={dark} />
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => cn(
                'rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                dark
                  ? isActive ? 'text-white' : 'text-white/75 hover:text-white'
                  : isActive ? 'bg-ink/5 text-ink' : 'text-ink/60 hover:text-ink',
              )}
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelect dark={dark} />
          {isAuthenticated ? (
            <Link
              to="/profil"
              className={cn(
                'flex h-10 items-center gap-2 rounded-full border px-1.5 text-sm font-semibold sm:pr-3.5',
                dark ? 'border-white/25 bg-white/10 text-white' : 'border-sand-dark bg-white text-ink',
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lagoon text-xs font-bold text-white">
                {(profile?.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-[120px] truncate sm:inline">{profile?.name || t('nav.profile')}</span>
            </Link>
          ) : (
            <Link
              to={`/connexion?next=${encodeURIComponent(pathname)}`}
              className={cn(
                'flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-bold sm:px-4',
                dark ? 'bg-white text-ink' : 'bg-ink text-white',
              )}
            >
              <UserRound className="hidden h-4 w-4 min-[400px]:block" /> {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
