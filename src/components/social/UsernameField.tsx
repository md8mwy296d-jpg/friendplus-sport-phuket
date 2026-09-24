import { useEffect, useState } from 'react';
import { AtSign, Check, Loader2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Check = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid';

const clean = (v: string) => v.trim().toLowerCase().replace(/^@+/, '');
const VALID = /^(?![._])(?!.*[._]{2})[a-z0-9_.]{3,20}(?<![._])$/;

/** The player's unique @handle, checked live and saved on its own. */
export default function UsernameField() {
  const { currentUser, setUsername, pushToast } = useStore();
  const { t } = useI18n();
  const [value, setValue] = useState(currentUser.username);
  const [state, setState] = useState<Check>('idle');
  const [busy, setBusy] = useState(false);
  const v = clean(value);
  const changed = v !== currentUser.username;

  useEffect(() => { setValue(currentUser.username); }, [currentUser.username]);

  useEffect(() => {
    if (!changed) { setState('idle'); return; }
    if (!VALID.test(v)) { setState('invalid'); return; }
    if (!SUPABASE_CONFIGURED) { setState('ok'); return; }
    setState('checking');
    const id = window.setTimeout(async () => {
      const { data } = await supabase.rpc('username_available', { p_username: v });
      setState(data ? 'ok' : 'taken');
    }, 350);
    return () => window.clearTimeout(id);
  }, [v, changed]);

  const save = async () => {
    if (state !== 'ok' || busy) return;
    setBusy(true);
    const ok = await setUsername(v);
    setBusy(false);
    if (ok) pushToast({ kind: 'success', title: t('handle.saved', { handle: `@${v}` }) });
  };

  return (
    <div>
      <label htmlFor="profile-username" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">
        {t('handle.label')}
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className={cn(
          'flex h-11 min-w-0 flex-1 basis-52 items-center gap-1 rounded-xl border bg-[#FBF6EC] px-3 transition-colors focus-within:bg-white',
          state === 'taken' || state === 'invalid' ? 'border-[#F05252]' : state === 'ok' ? 'border-[#16A34A]' : 'border-[#EADFC8] focus-within:border-[#0E8C7F]',
        )}>
          <AtSign className="h-4 w-4 shrink-0 text-[#0E8C7F]" />
          <input
            id="profile-username"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s+/g, '').toLowerCase().slice(0, 21))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save(); } }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="hakan"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/30"
          />
          {state === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-[#0B2E2B]/40" />}
          {state === 'ok' && <Check className="h-4 w-4 text-[#16A34A]" />}
          {(state === 'taken' || state === 'invalid') && <X className="h-4 w-4 text-[#F05252]" />}
        </span>
        {changed && (
          <button
            type="button"
            onClick={() => void save()}
            disabled={state !== 'ok' || busy}
            className="h-11 rounded-full bg-[#0E8C7F] px-5 text-sm font-bold text-white transition-opacity disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('handle.save')}
          </button>
        )}
      </div>
      <p className={cn('mt-1 px-1 text-xs', state === 'taken' || state === 'invalid' ? 'text-[#D14A2B]' : state === 'ok' ? 'text-[#16A34A]' : 'text-[#0B2E2B]/50')}>
        {state === 'taken' ? t('handle.taken')
          : state === 'invalid' ? t('handle.invalid')
            : state === 'ok' ? t('handle.available')
              : t('handle.hint')}
      </p>
    </div>
  );
}
