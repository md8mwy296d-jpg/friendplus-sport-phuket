import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useClub } from '@/lib/club';
import { supabase } from '@/lib/supabase';

/** Profile section: permanently delete one's own account (delete_my_account RPC). Hidden for the app admin. */
export default function DeleteAccount() {
  const { t } = useI18n();
  const { signOut, pushToast } = useStore();
  const { isAppAdmin } = useClub();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  if (isAppAdmin) return null;

  const word = t('account.delete.word');
  const confirmed = typed.trim().toUpperCase() === word.toUpperCase();

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      pushToast({ kind: 'error', title: t('account.delete.error') });
      setBusy(false);
      return;
    }
    await signOut();
    pushToast({ kind: 'success', title: t('account.delete.done') });
    navigate('/');
  };

  return (
    <>
      <section className="mt-10 rounded-[24px] border border-[#F05252]/30 bg-white p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold tracking-tight text-[#C4343A]">{t('account.delete.title')}</h2>
        <p className="mt-1.5 max-w-lg text-[14px] leading-relaxed text-[#0B2E2B]/60">{t('account.delete.text')}</p>
        <button
          type="button"
          onClick={() => { setTyped(''); setOpen(true); }}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#F05252]/50 px-6 py-3 text-sm font-bold text-[#C4343A] transition-colors hover:bg-[#F05252]/10"
        >
          <Trash2 className="h-4 w-4" />
          {t('account.delete.button')}
        </button>
      </section>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B2E2B]/50 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label={t('account.delete.title')}
              className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-bold text-[#0B2E2B]">{t('account.delete.confirmTitle')}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#0B2E2B]/60">{t('account.delete.confirmBody', { word })}</p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
                aria-label={t('account.delete.confirmBody', { word })}
                className="mt-4 w-full rounded-xl border border-[#EADFC8] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#0B2E2B] outline-none focus:border-[#F05252]"
                placeholder={word}
              />
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full border border-[#EADFC8] py-2.5 text-sm font-semibold text-[#0B2E2B] transition-colors hover:bg-[#FBF6EC] disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={!confirmed || busy}
                  onClick={() => void remove()}
                  className="flex-1 rounded-full bg-[#F05252] py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                >
                  {t('account.delete.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
