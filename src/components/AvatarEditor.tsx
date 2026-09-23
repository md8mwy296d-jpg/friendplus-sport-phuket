import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AVATAR_GRADIENTS } from '@/lib/avatar';
import PlayerAvatar from './PlayerAvatar';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // before resizing; the stored file is ~30 KB

interface AvatarEditorProps {
  /** Name typed in the form, so initials update before the profile is saved. */
  name?: string;
  flag?: string;
  size?: number;
  className?: string;
}

/** Profile photo picker (camera or gallery on phones) with gradient colours as fallback. Saves immediately. */
export default function AvatarEditor({ name, flag, size = 96, className }: AvatarEditorProps) {
  const { currentUser, uploadAvatar, removeAvatar, updateProfile, pushToast } = useStore();
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const displayed = { ...currentUser, name: name?.trim() || currentUser.name };
  const hasPhoto = Boolean(currentUser.avatarUrl);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_SOURCE_BYTES) {
      pushToast({ kind: 'error', title: t('avatar.invalid') });
      return;
    }
    setBusy(true);
    await uploadAvatar(file);
    setBusy(false);
  };

  const onRemove = async () => {
    setBusy(true);
    await removeAvatar();
    setBusy(false);
  };

  const pickColor = (i: number) => {
    if (busy || currentUser.avatarColor === i) return;
    void updateProfile({ avatarColor: i });
  };

  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors disabled:opacity-50';

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={hasPhoto ? t('avatar.change') : t('avatar.add')}
        className="relative rounded-full transition-transform hover:scale-[1.03] disabled:hover:scale-100"
      >
        <PlayerAvatar
          user={displayed}
          size={size}
          ring={false}
          className="font-display font-bold shadow-[0_8px_24px_rgba(11,46,43,.18)] ring-4 ring-white"
        />
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B4A] text-white ring-4 ring-white">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </span>
        {flag && (
          <span className="absolute -left-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#0B2E2B] text-lg ring-4 ring-white">
            {flag}
          </span>
        )}
      </button>

      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className={cn(btn, 'border-[#0E8C7F] bg-[#0E8C7F] text-white hover:bg-[#0A6E64]')}
        >
          <Camera className="h-3.5 w-3.5" />
          {busy ? t('avatar.uploading') : hasPhoto ? t('avatar.change') : t('avatar.add')}
        </button>
        {hasPhoto && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className={cn(btn, 'border-[#EADFC8] bg-white text-[#0B2E2B] hover:bg-[#FBF6EC]')}
          >
            <Trash2 className="h-3.5 w-3.5 text-[#F05252]" />
            {t('avatar.remove')}
          </button>
        )}
      </div>

      {!hasPhoto && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B2E2B]/45">{t('avatar.orColor')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {AVATAR_GRADIENTS.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickColor(i)}
                aria-label={`${t('profile.avatarColor')} ${i + 1}`}
                aria-pressed={currentUser.avatarColor === i}
                className={cn(
                  'h-8 w-8 rounded-full transition-transform hover:scale-110',
                  currentUser.avatarColor === i && 'ring-2 ring-[#FF6B4A] ring-offset-2',
                )}
                style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
