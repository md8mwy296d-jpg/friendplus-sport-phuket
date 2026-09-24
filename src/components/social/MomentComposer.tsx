import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Loader2, Lock, Globe2, X } from 'lucide-react';
import type { Session } from '@/lib/types';
import type { MomentInput, MomentVisibility } from '@/lib/social';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

interface Props {
  /** Sessions the player took part in, newest first, to tag the moment. */
  sessions: Session[];
  defaultSessionId?: string | null;
  onPost: (input: MomentInput) => Promise<boolean>;
}

/** Text + photo composer for the player's own page. */
export default function MomentComposer({ sessions, defaultSessionId = null, onPost }: Props) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sessionId, setSessionId] = useState<string>(defaultSessionId ?? '');
  const [visibility, setVisibility] = useState<MomentVisibility>('public');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (defaultSessionId) setSessionId(defaultSessionId); }, [defaultSessionId]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/') || file.size > MAX_SOURCE_BYTES) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };
  const clearImage = () => { setImage(null); setPreview(''); };

  const canPost = !busy && (body.trim().length > 0 || image !== null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    const ok = await onPost({ body, image, sessionId: sessionId || null, visibility });
    setBusy(false);
    if (ok) { setBody(''); clearImage(); setSessionId(''); }
  };

  const chip = (active: boolean) => cn(
    'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors',
    active ? 'bg-[#0B2E2B] text-white' : 'border border-[#EADFC8] bg-white text-[#0B2E2B]/60',
  );

  return (
    <form onSubmit={submit} className="rounded-[20px] border border-[#EADFC8] bg-white p-4 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        placeholder={t('moments.composer.placeholder')}
        rows={3}
        className="w-full resize-none rounded-2xl bg-[#FBF6EC] px-4 py-3 text-[15px] text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35 focus:ring-2 focus:ring-[#0E8C7F]/25"
      />
      {preview && (
        <div className="relative mt-3 overflow-hidden rounded-2xl">
          <img src={preview} alt="" className="max-h-72 w-full object-cover" />
          <button type="button" onClick={clearImage} aria-label={t('moments.composer.removePhoto')}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#0B2E2B]/70 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => input.current?.click()} className={chip(false)}>
          <ImagePlus className="h-4 w-4 text-[#0E8C7F]" /> {t('moments.composer.photo')}
        </button>
        <button type="button" onClick={() => setVisibility('public')} className={chip(visibility === 'public')}>
          <Globe2 className="h-3.5 w-3.5" /> {t('moments.visibility.public')}
        </button>
        <button type="button" onClick={() => setVisibility('friends')} className={chip(visibility === 'friends')}>
          <Lock className="h-3.5 w-3.5" /> {t('moments.visibility.friends')}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {sessions.length > 0 && (
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-[#0B2E2B]/60">
            <span className="shrink-0">{t('moments.composer.session')}</span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-full border border-[#EADFC8] bg-white px-3 text-xs font-semibold text-[#0B2E2B] outline-none"
            >
              <option value="">{t('moments.composer.noSession')}</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
        )}
        <button type="submit" disabled={!canPost}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-golden-hour px-6 text-sm font-bold text-white shadow-coral disabled:opacity-50 sm:ml-auto">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? t('moments.composer.posting') : t('moments.composer.post')}
        </button>
      </div>
    </form>
  );
}
