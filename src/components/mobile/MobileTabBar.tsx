import { NavLink } from 'react-router';
import { CalendarCheck, CirclePlus, Compass, House, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useClub } from '@/lib/club';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', key: 'nav.home', icon: House, end: true },
  { to: '/explorer', key: 'nav.explore', icon: Compass },
  { to: '/creer', key: 'nav.create', icon: CirclePlus, accent: true },
  { to: '/club', key: 'nav.club', icon: MessageCircle },
  { to: '/mes-sessions', key: 'nav.mySessions', icon: CalendarCheck },
];

/** App-style bottom navigation on phones (hidden from the lg breakpoint, where the top bar has room). */
export default function MobileTabBar() {
  const { t } = useI18n();
  const { unreadTotal } = useClub();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EADFC8] bg-[rgba(251,246,236,.92)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] lg:hidden"
      aria-label="Navigation"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {TABS.map(({ to, key, icon: Icon, end, accent }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              aria-label={accent ? t(key) : undefined}
              className={({ isActive }) => cn(
                'relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors',
                isActive ? 'text-[#0A6E64]' : 'text-[#0B2E2B]/50',
              )}
            >
              {({ isActive }) => (
                <>
                  {accent ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-pop text-white shadow-coral">
                      <Icon className="h-5 w-5" strokeWidth={2.4} />
                    </span>
                  ) : (
                    <span className="relative">
                      <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.9} />
                      {to === '/club' && unreadTotal > 0 && (
                        <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B4A] px-1 text-[9px] font-bold text-white ring-2 ring-[#FBF6EC]">
                          {unreadTotal > 99 ? '99+' : unreadTotal}
                        </span>
                      )}
                    </span>
                  )}
                  {!accent && <span className="max-w-full truncate px-1">{t(key)}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
