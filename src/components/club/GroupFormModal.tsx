import { useState, type FormEvent } from 'react';
import { Globe, Lock } from 'lucide-react';
import type { GroupInput } from '@/lib/club';
import type { Sport } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SportIcon from '@/components/SportIcon';
import { Modal } from './ClubUI';

const SPORTS: Sport[] = ['futsal', 'padel', 'dance', 'gym'];
const EMPTY: GroupInput = { name: '', description: '', sport: null, isPrivate: false };

/** Create or edit a group. The parent remounts it (key) to reset the fields. */
export default function GroupFormModal({
  open, onClose, onSubmit, initial, mode,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: GroupInput) => Promise<boolean>;
  initial?: GroupInput;
  mode: 'create' | 'edit';
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<GroupInput>(initial ?? EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (form.name.trim().length < 3) { setError(t('club.form.errName')); return; }
    setBusy(true);
    const ok = await onSubmit(form);
    setBusy(false);
    if (ok) onClose();
  };

  const labelCls = 'text-xs font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/50';
  const inputCls = 'mt-2 w-full rounded-2xl border border-[#EADFC8] bg-[#FBF6EC]/60 px-4 py-3 text-[15px] text-[#0B2E2B] outline-none transition-colors placeholder:text-[#0B2E2B]/35 focus:border-[#0E8C7F] focus:bg-white';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(mode === 'create' ? 'club.form.createTitle' : 'club.form.editTitle')}
      footer={
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="h-12 w-full rounded-full bg-golden-hour text-sm font-bold text-white shadow-coral transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {t(mode === 'create' ? 'club.form.create' : 'club.form.save')}
        </button>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="block">
          <span className={labelCls}>{t('club.form.name')}</span>
          <input
            autoFocus
            value={form.name}
            maxLength={60}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }}
            placeholder={t('club.form.namePh')}
            className={inputCls}
          />
          {error && <span className="mt-1.5 block text-[13px] font-medium text-[#D03838]">{error}</span>}
        </label>

        <label className="block">
          <span className={labelCls}>{t('club.form.description')}</span>
          <textarea
            value={form.description}
            maxLength={300}
            rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t('club.form.descriptionPh')}
            className={cn(inputCls, 'resize-none')}
          />
        </label>

        <div>
          <span className={labelCls}>{t('club.form.sport')}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[null, ...SPORTS].map((s) => (
              <button
                key={s ?? 'any'}
                type="button"
                onClick={() => setForm({ ...form, sport: s })}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors',
                  form.sport === s
                    ? 'border-[#0B2E2B] bg-[#0B2E2B] text-white'
                    : 'border-[#EADFC8] bg-white text-[#0B2E2B]/70 hover:border-[#0E8C7F]',
                )}
              >
                {s && <SportIcon sport={s} className="h-4 w-4" />}
                {s ? t(`sport.${s}`) : t('club.form.anySport')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelCls}>{t('club.form.visibility')}</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[false, true].map((priv) => (
              <button
                key={String(priv)}
                type="button"
                onClick={() => setForm({ ...form, isPrivate: priv })}
                className={cn(
                  'flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors',
                  form.isPrivate === priv ? 'border-[#0E8C7F] bg-[#0E8C7F]/5' : 'border-[#EADFC8] hover:border-[#0E8C7F]/50',
                )}
              >
                {priv ? <Lock className="mt-0.5 h-4 w-4 text-[#0E8C7F]" /> : <Globe className="mt-0.5 h-4 w-4 text-[#0E8C7F]" />}
                <span>
                  <span className="block text-sm font-bold text-[#0B2E2B]">{t(priv ? 'club.private' : 'club.public')}</span>
                  <span className="block text-[13px] text-[#0B2E2B]/55">{t(priv ? 'club.form.privateHint' : 'club.form.publicHint')}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
