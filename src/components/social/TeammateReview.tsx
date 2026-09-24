import { useState } from 'react';
import { Check, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { clubErrorKey } from '@/lib/club';
import { cn } from '@/lib/utils';

export interface GivenReview { rules: boolean; respect: boolean }

interface Props {
  sessionId: string;
  userId: string;
  given?: GivenReview;
  onSaved: (userId: string, review: GivenReview) => void;
}

interface QuestionProps { label: string; value: boolean | null; set: (v: boolean) => void; yes: string; no: string }

function Question({ label, value, set, yes, no }: QuestionProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-[#0B2E2B]/70">{label}</span>
      <span className="flex gap-1.5">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => set(v)}
            aria-pressed={value === v}
            aria-label={v ? yes : no}
            className={cn(
              'flex h-8 w-10 items-center justify-center rounded-full border transition-colors',
              value === v
                ? v ? 'border-[#22C55E] bg-[#22C55E] text-white' : 'border-[#F05252] bg-[#F05252] text-white'
                : 'border-[#EADFC8] bg-white text-[#0B2E2B]/50',
            )}
          >
            {v ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
          </button>
        ))}
      </span>
    </div>
  );
}

/** Two yes/no questions about a teammate (rules of the game, respect for people). Anonymous. */
export default function TeammateReview({ sessionId, userId, given, onSaved }: Props) {
  const { refresh, pushToast } = useStore();
  const { t } = useI18n();
  const [rules, setRules] = useState<boolean | null>(given?.rules ?? null);
  const [respect, setRespect] = useState<boolean | null>(given?.respect ?? null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!given);

  const save = async () => {
    if (rules === null || respect === null) return;
    setBusy(true);
    const { error } = await supabase.rpc('review_teammate', { p_session: sessionId, p_user: userId, p_rules: rules, p_respect: respect });
    setBusy(false);
    if (error) { pushToast({ kind: 'error', title: t(clubErrorKey(error)) }); return; }
    onSaved(userId, { rules, respect });
    setEditing(false);
    pushToast({ kind: 'success', title: t('review.thanks') });
    void refresh();
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
        <Check className="h-3.5 w-3.5" /> {t('review.done')}
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-2xl bg-[#FBF6EC] p-3">
      <Question label={t('review.rules')} value={rules} set={setRules} yes={t('review.yes')} no={t('review.no')} />
      <Question label={t('review.respect')} value={respect} set={setRespect} yes={t('review.yes')} no={t('review.no')} />
      <button
        onClick={() => void save()}
        disabled={busy || rules === null || respect === null}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[#0E8C7F] text-xs font-bold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t('review.send')}
      </button>
    </div>
  );
}
