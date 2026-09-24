import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { ClubPage, PageInput } from '@/lib/posts';
import type { Sport } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { SPORTS } from '@/lib/sports';
import { Modal } from '@/components/club/ClubUI';

interface Props {
  open: boolean;
  page?: ClubPage;
  onClose: () => void;
  onSave: (input: PageInput) => Promise<boolean>;
}

/** Create / edit the Page of a venue (certified owners and admins). */
export default function PageFormModal({ open, page, onClose, onSave }: Props) {
  const { venues } = useStore();
  const { t } = useI18n();
  const [name, setName] = useState(page?.name ?? '');
  const [description, setDescription] = useState(page?.description ?? '');
  const [sport, setSport] = useState<Sport | ''>(page?.sport ?? '');
  const [venueId, setVenueId] = useState(page?.venueId ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || busy) return;
    setBusy(true);
    const ok = await onSave({ name, description, sport: sport || null, venueId: venueId || null });
    setBusy(false);
    if (ok) onClose();
  };

  const field = 'w-full rounded-2xl border border-[#EADFC8] bg-white px-4 py-3 text-[15px] text-[#0B2E2B] outline-none focus:border-[#0E8C7F]';
  return (
    <Modal open={open} onClose={onClose} title={page ? t('pages.edit') : t('pages.create')}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-[#0B2E2B]">{t('pages.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder={t('pages.namePh')} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-[#0B2E2B]">{t('pages.description')}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} rows={3} className={`${field} resize-none`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[#0B2E2B]">{t('pages.sport')}</span>
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport | '')} className={field}>
              <option value="">—</option>
              {SPORTS.map((s) => <option key={s} value={s}>{t(`sport.${s}`)}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-[#0B2E2B]">{t('pages.venue')}</span>
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className={field}>
              <option value="">—</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
        </div>
        <button type="submit" disabled={busy || name.trim().length < 2}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0E8C7F] text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t('pages.save')}
        </button>
      </form>
    </Modal>
  );
}
