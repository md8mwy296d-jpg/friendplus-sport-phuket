import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Loader2, Megaphone, Pin, X } from 'lucide-react';
import type { PostInput } from '@/lib/posts';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

interface Props {
  /** Where the post goes: a Page, a group, or neither (FRIEND+ official post). */
  target: { pageId?: string | null; groupId?: string | null };
  heading: string;
  onPublish: (input: PostInput) => Promise<boolean>;
}

/** Composer for page owners, group admins and FRIEND+ admins. */
export default function PostComposer({ target, heading, onPublish }: Props) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/') || file.size > MAX_SOURCE_BYTES) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };
  const canPost = !busy && (title.trim() !== '' || body.trim() !== '' || image !== null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    const ok = await onPublish({ ...target, title, body, image, pinned });
    setBusy(false);
    if (ok) { setTitle(''); setBody(''); setImage(null); setPreview(''); setPinned(false); setOpen(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-[20px] border border-dashed border-[#0E8C7F]/50 bg-white px-5 py-4 text-left text-sm font-bold text-[#0A6E64] hover:bg-[#0E8C7F]/5">
        <Megaphone className="h-5 w-5" /> {heading}
      </button>
    );
  }

  const field = 'w-full rounded-2xl bg-[#FBF6EC] px-4 py-3 text-[15px] text-[#0B2E2B] outline-none placeholder:text-[#0B2E2B]/35 focus:ring-2 focus:ring-[#0E8C7F]/25';
  return (
    <form onSubmit={submit} className="space-y-3 rounded-[20px] border border-[#EADFC8] bg-white p-4 shadow-[0_2px_8px_rgba(11,46,43,.06)] sm:p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-[#0B2E2B]"><Megaphone className="h-4 w-4 text-[#FF6B4A]" /> {heading}</p>
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder={t('posts.titlePh')} className={cn(field, 'font-semibold')} />
      <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 2000))} placeholder={t('posts.bodyPh')} rows={4} className={cn(field, 'resize-none')} />
      {preview && (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={preview} alt="" className="max-h-64 w-full object-cover" />
          <button type="button" onClick={() => { setImage(null); setPreview(''); }} aria-label={t('moments.composer.removePhoto')}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#0B2E2B]/70 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#EADFC8] px-3.5 text-xs font-bold text-[#0B2E2B]/70">
          <ImagePlus className="h-4 w-4 text-[#0E8C7F]" /> {t('moments.composer.photo')}
        </button>
        <button type="button" onClick={() => setPinned((v) => !v)} aria-pressed={pinned}
          className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold', pinned ? 'bg-[#FFB547] text-[#0B2E2B]' : 'border border-[#EADFC8] text-[#0B2E2B]/70')}>
          <Pin className="h-3.5 w-3.5" /> {t('posts.pin')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto h-11 rounded-full px-4 text-sm font-semibold text-[#0B2E2B]/55">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={!canPost}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-golden-hour px-6 text-sm font-bold text-white shadow-coral disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? t('posts.publishing') : t('posts.publish')}
        </button>
      </div>
    </form>
  );
}
