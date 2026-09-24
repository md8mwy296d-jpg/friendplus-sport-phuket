import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Menu, X, ChevronDown, User, Mail, LogOut, Users } from 'lucide-react';
import { useI18n, LANGS } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { useSocial } from '@/lib/social';
import type { Lang } from '@/lib/types';
import { cn } from '@/lib/utils';
import PlayerAvatar from './PlayerAvatar';
import HeaderHub from './social/HeaderHub';
import RankInsignia from './rank/RankInsignia';
import { rankFor } from '@/lib/rank';

const NAV_LINKS = [
  { to: '/explorer', key: 'nav.explore' },
  { to: '/club', key: 'nav.club' },
  { to: '/creer', key: 'nav.create' },
  { to: '/salles', key: 'nav.venues' },
  { to: '/mes-sessions', key: 'nav.mySessions' },
];

function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="FRIEND+" className="h-9 w-9" />
      <span className={cn('leading-none', compact && 'hidden sm:block')}>
        <span className={cn('font-display text-xl font-extrabold tracking-tight', dark ? 'text-white' : 'text-[#0B2E2B]')}>
          FRIEND
          <motion.span
            className="inline-block text-[#FF6B4A]"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            +
          </motion.span>
        </span>
        <span className={cn('block text-[10px] font-semibold uppercase tracking-[0.22em]', dark ? 'text-white/60' : 'text-[#0B2E2B]/50')}>
          {t('nav.tagline')}
        </span>
      </span>
    </Link>
  );
}

function LanguageSelector({ dark = false, dropUp = false }: { dark?: boolean; dropUp?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
          dark
            ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
            : 'border-[#EADFC8] bg-white/70 text-[#0B2E2B] hover:bg-white',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        {lang.toUpperCase()}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: dropUp ? 8 : -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 8 : -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute right-0 z-50 min-w-[160px] overflow-hidden rounded-2xl border border-[#EADFC8] bg-white p-1.5 shadow-[0_16px_40px_rgba(11,46,43,.14)]',
              dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {LANGS.map((l, i) => (
              <motion.li
                key={l.code}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.15 }}
              >
                <button
                  role="option"
                  aria-selected={lang === l.code}
                  onClick={() => { setLang(l.code as Lang); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                    lang === l.code ? 'bg-[#0E8C7F]/10 text-[#0A6E64]' : 'text-[#0B2E2B] hover:bg-[#FBF6EC]',
                  )}
                >
                  {l.label}
                  <span className="text-xs font-bold text-[#0B2E2B]/35">{l.code.toUpperCase()}</span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function AvatarMenu({ dark = false }: { dark?: boolean }) {
  const { currentUser, pendingInvitesForMe, resetDemo } = useStore();
  const { incomingIds } = useSocial();
  const { t } = useI18n();
  // friend requests have their own icon in the header (HeaderHub)
  const alerts = pendingInvitesForMe.length;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const itemCls = 'flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC]';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('relative rounded-full transition-transform hover:scale-105', dark && 'ring-2 ring-white/40')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <PlayerAvatar user={currentUser} size={38} />
        {alerts > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F05252] px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {alerts}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#EADFC8] bg-white p-1.5 shadow-[0_16px_40px_rgba(11,46,43,.14)]"
            role="menu"
          >
            <div className="border-b border-[#EADFC8] px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-[#0B2E2B]">
                <RankInsignia rank={rankFor(currentUser.score)} size={18} /> {currentUser.name} {currentUser.nationality}
              </p>
              <p className="text-xs text-[#0B2E2B]/50">{t(`common.level.${currentUser.level}`)} · {currentUser.score === null ? t('score.new') : `${t('score.short')} ${currentUser.score} %`}</p>
            </div>
            <button className={itemCls} onClick={() => { setOpen(false); navigate(`/joueur/${currentUser.id}`); }}>
              <User className="h-4 w-4 text-[#0E8C7F]" /> {t('player.myPage')}
            </button>
            <button className={itemCls} onClick={() => { setOpen(false); navigate('/profil'); }}>
              <Users className="h-4 w-4 text-[#0E8C7F]" />
              <span className="flex-1 text-left">{t('nav.profile')} · {t('player.stats.friends')}</span>
              {incomingIds.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B4A] px-1 text-[10px] font-bold text-white">
                  {incomingIds.length}
                </span>
              )}
            </button>
            <button className={itemCls} onClick={() => { setOpen(false); navigate('/mes-sessions'); }}>
              <Mail className="h-4 w-4 text-[#0E8C7F]" />
              <span className="flex-1 text-left">{t('nav.myInvitations')}</span>
              {pendingInvitesForMe.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F05252] px-1 text-[10px] font-bold text-white">
                  {pendingInvitesForMe.length}
                </span>
              )}
            </button>
            <button
              className={itemCls}
              onClick={() => { setOpen(false); resetDemo(); }}
            >
              <LogOut className="h-4 w-4 text-[#F05252]" /> {t('nav.logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const { t } = useI18n();
  const { isAuthenticated } = useStore();
  const { unreadTotal } = useClub();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const isHome = location.pathname === '/';
  const dark = isHome && !scrolled && !drawer;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        dark
          ? 'border-b border-transparent bg-transparent'
          : 'border-b border-[#EADFC8] bg-[rgba(251,246,236,.8)] backdrop-blur-[12px]',
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-12">
        {/* signed in on a phone, the wordmark gives way to the messages / groups / friends icons */}
        <Logo dark={dark} compact={isAuthenticated} />

        {/* desktop links */}
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'group relative rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                  dark
                    ? isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    : isActive ? 'text-[#0B2E2B]' : 'text-[#0B2E2B]/60 hover:text-[#0B2E2B]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t(link.key)}
                  {link.to === '/club' && unreadTotal > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B4A] px-1.5 align-middle text-[10px] font-bold text-white">
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                  <span
                    className={cn(
                      'absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-[linear-gradient(90deg,#0E8C7F,#2FBFA5,#FFB547,#FF6B4A)] transition-transform duration-300',
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          {/* on phones the language picker lives in the menu, leaving room for the account button */}
          <div className={isAuthenticated ? 'hidden lg:block' : 'hidden sm:block'}>
            <LanguageSelector dark={dark} />
          </div>
          <Link
            to="/creer"
            className={cn(isAuthenticated ? 'hidden lg:inline-flex' : 'hidden sm:inline-flex', 'h-10 items-center rounded-full bg-[linear-gradient(135deg,#FF6B4A,#FFB547)] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,74,.35)] transition-transform hover:scale-[1.03]')}
          >
            {t('nav.ctaCreate')}
          </Link>
          {isAuthenticated && <HeaderHub dark={dark} />}
          <div>
            {isAuthenticated ? (
              <AvatarMenu dark={dark} />
            ) : (
              <Link
                to={`/connexion?next=${encodeURIComponent(location.pathname)}`}
                className={cn(
                  'inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors sm:px-5',
                  dark ? 'border-white/30 text-white hover:bg-white/10' : 'border-[#EADFC8] bg-white text-[#0B2E2B] hover:bg-[#FBF6EC]',
                )}
              >
                {t('auth.login')}
              </Link>
            )}
          </div>
          <button
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border lg:hidden',
              dark ? 'border-white/20 bg-white/10 text-white' : 'border-[#EADFC8] bg-white/70 text-[#0B2E2B]',
            )}
            onClick={() => setDrawer((v) => !v)}
            aria-label="Menu"
            aria-expanded={drawer}
          >
            {drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-[72px] z-40 lg:hidden"
          >
            <div className="relative h-full overflow-hidden bg-[#0B2E2B]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundColor: '#2FBFA5',
                  maskImage: 'url(/texture-palm.svg)',
                  WebkitMaskImage: 'url(/texture-palm.svg)',
                  maskSize: '500px',
                  WebkitMaskSize: '500px',
                }}
              />
              <nav className="relative flex h-full flex-col gap-2 overflow-y-auto p-8 pb-24">
                {[...NAV_LINKS, isAuthenticated ? { to: '/profil', key: 'nav.profile' } : { to: '/connexion', key: 'auth.login' }].map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.07 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        cn(
                          'block py-2 font-display text-[32px] font-bold leading-tight transition-colors',
                          isActive ? 'text-[#FFB547]' : 'text-white hover:text-[#2FBFA5]',
                        )
                      }
                    >
                      {t(link.key)}
                    </NavLink>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="mt-6 flex flex-col gap-4"
                >
                  <Link
                    to="/creer"
                    className="inline-flex h-12 w-fit items-center rounded-full bg-[linear-gradient(135deg,#FF6B4A,#FFB547)] px-7 text-base font-bold text-white shadow-[0_8px_24px_rgba(255,107,74,.35)]"
                  >
                    {t('nav.ctaCreate')}
                  </Link>
                  <LanguageSelector dark />
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
