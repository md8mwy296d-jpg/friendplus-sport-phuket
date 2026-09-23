import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Share, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const DISMISS_KEY = 'friendplus.installDismissedAt';
const SNOOZE_MS = 14 * 24 * 3600_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/** "Install the app" banner on phones: native prompt on Android/Chrome, Share → Add to Home Screen hint on iOS Safari. */
export default function InstallPrompt() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed() || window.innerWidth >= 1024) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const timer = window.setTimeout(() => {
      if (isIos()) setIosHint(true);
      setVisible(true);
    }, 4000);
    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  };

  // never cover a page's own action (join a session, sign in, finish the profile, create, chat)
  const busyPage = /^\/(session\/|club\/|connexion|bienvenue|creer)/.test(pathname);
  const show = visible && !busyPage && (Boolean(deferred) || iosHint);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-[20px] border border-[#EADFC8] bg-white p-4 shadow-[0_16px_40px_rgba(11,46,43,.18)] lg:hidden"
          role="dialog"
          aria-label={t('pwa.install.title')}
        >
          <div className="flex items-start gap-3">
            <img src="/pwa-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-[#0B2E2B]">{t('pwa.install.title')}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-[#0B2E2B]/60">
                {deferred ? t('pwa.install.body') : (
                  <>
                    {t('pwa.install.ios', { share: '§' }).split('§')[0]}
                    <Share className="mx-0.5 inline h-4 w-4 -translate-y-0.5 text-[#0E8C7F]" aria-label="Share" />
                    {t('pwa.install.ios', { share: '§' }).split('§')[1]}
                  </>
                )}
              </p>
            </div>
            <button onClick={dismiss} className="-mr-1 -mt-1 rounded-full p-1.5 text-[#0B2E2B]/40 hover:bg-[#FBF6EC]" aria-label={t('pwa.install.later')}>
              <X className="h-4 w-4" />
            </button>
          </div>
          {deferred && (
            <div className="mt-3 flex gap-2">
              <button onClick={dismiss} className="h-10 flex-1 rounded-full border border-[#EADFC8] text-sm font-semibold text-[#0B2E2B]/70">
                {t('pwa.install.later')}
              </button>
              <button onClick={() => void install()} className="h-10 flex-1 rounded-full bg-[#0E8C7F] text-sm font-bold text-white">
                {t('pwa.install.cta')}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
