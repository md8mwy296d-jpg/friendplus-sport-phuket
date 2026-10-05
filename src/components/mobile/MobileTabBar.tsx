import { NavLink } from 'react-router';
import { CalendarCheck, Compass, House, LayoutDashboard, PlaneLanding, UserRound } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/** App-style bottom navigation on phones. */
export default function MobileTabBar() {
  const { t } = useI18n();
  const { isAdmin } = useStore();
  const tabs = [
    { to: '/', key: 'nav.home', icon: House, end: true },
    { to: '/mon-arrivee', key: 'nav.arrival', icon: PlaneLanding },
    { to: '/explorer', key: 'nav.explore', icon: Compass },
    { to: '/reservations', key: 'nav.bookings', icon: CalendarCheck },
    ...(isAdmin ? [{ to: '/admin', key: 'nav.admin', icon: LayoutDashboard }] : []),
    { to: '/profil', key: 'nav.profile', icon: UserRound },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-dark bg-[rgba(251,246,236,.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden"
      aria-label={t('nav.menu')}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {tabs.map(({ to, key, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
                isActive ? 'text-lagoon-deep' : 'text-ink/50',
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.9} />
                  <span className="max-w-full truncate px-1">{t(key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
