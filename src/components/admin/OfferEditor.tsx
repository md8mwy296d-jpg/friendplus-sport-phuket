import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import type { Offer, OfferOption, PriceUnit } from '@/lib/types';
import { CATEGORIES } from '@/lib/catalog';
import { useI18n } from '@/lib/i18n';
import { useStore, type OfferDraft } from '@/lib/store';
import { cn } from '@/lib/utils';

const UNITS: PriceUnit[] = ['person', 'group', 'day', 'night', 'hour', 'item'];

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const slugify = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/** "Assurance tous risques | 150 | unit" per line ⇄ options. */
function parseOptions(text: string): OfferOption[] {
  const seen = new Set<string>();
  return lines(text).flatMap((line) => {
    const [label = '', price = '', per = ''] = line.split('|').map((p) => p.trim());
    const value = Number(price.replace(/[^\d]/g, ''));
    if (!label || !Number.isFinite(value)) return [];
    let id = slugify(label).slice(0, 40) || 'option';
    while (seen.has(id)) id += '-2';
    seen.add(id);
    return [{ id, label, price_thb: value, per: per.toLowerCase().startsWith('u') ? 'unit' : 'booking' } as OfferOption];
  });
}
/** Empty = delivery not offered; otherwise a fee in THB (0 = free). */
const fee = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v.replace(/[^\d]/g, '')) || 0)));
const optionsText = (opts: OfferOption[]) => opts.map((o) => `${o.label} | ${o.price_thb} | ${o.per}`).join('\n');

function toDraft(o: Offer | null): OfferDraft {
  return {
    id: o?.id,
    slug: o?.slug ?? '',
    category: o?.category ?? 'excursion',
    title: o?.title ?? '',
    summary: o?.summary ?? '',
    description: o?.description ?? '',
    highlights: o?.highlights ?? [],
    included: o?.included ?? [],
    not_included: o?.notIncluded ?? [],
    area: o?.area ?? '',
    meeting_point: o?.meetingPoint ?? '',
    duration_label: o?.durationLabel ?? '',
    price_thb: o?.priceThb ?? 1000,
    price_unit: o?.priceUnit ?? 'person',
    min_qty: o?.minQty ?? 1,
    max_qty: o?.maxQty ?? 10,
    options: o?.options ?? [],
    photos: o?.photos ?? [],
    rating: o?.rating ?? 5,
    review_count: o?.reviewCount ?? 0,
    cancellation: o?.cancellation ?? '',
    featured: o?.featured ?? false,
    active: o?.active ?? true,
    sort: o?.sort ?? 100,
    delivery_airport_thb: o?.deliveryAirportThb ?? null,
    delivery_address_thb: o?.deliveryAddressThb ?? null,
    arrival_covers: o?.arrivalCovers ?? [],
  };
}

export default function OfferEditor({ offer, onDone }: { offer: Offer | null; onDone: () => void }) {
  const { t } = useI18n();
  const { adminSaveOffer, adminUploadPhoto, pushToast } = useStore();
  const [d, setD] = useState<OfferDraft>(() => toDraft(offer));
  const [texts, setTexts] = useState({
    highlights: d.highlights.join('\n'),
    included: d.included.join('\n'),
    not_included: d.not_included.join('\n'),
    options: optionsText(d.options),
    delivery_airport_thb: d.delivery_airport_thb === null ? '' : String(d.delivery_airport_thb),
    delivery_address_thb: d.delivery_address_thb === null ? '' : String(d.delivery_address_thb),
  });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof OfferDraft>(k: K, v: OfferDraft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, 10)) {
      const url = await adminUploadPhoto(f);
      if (url) urls.push(url);
    }
    setD((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
    setUploading(false);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const draft: OfferDraft = {
      ...d,
      slug: d.slug || slugify(d.title),
      highlights: lines(texts.highlights),
      included: lines(texts.included),
      not_included: lines(texts.not_included),
      options: parseOptions(texts.options),
      delivery_airport_thb: fee(texts.delivery_airport_thb),
      delivery_address_thb: fee(texts.delivery_address_thb),
    };
    const id = await adminSaveOffer(draft);
    setBusy(false);
    if (id) { pushToast({ kind: 'success', title: t('admin.offer.saved') }); onDone(); }
  };

  const labelCls = 'text-xs font-bold uppercase tracking-[0.12em] text-ink/50';
  const inputCls = 'mt-1.5 w-full rounded-xl border border-sand-dark bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-lagoon';
  const field = (key: keyof OfferDraft, label: string, props: Record<string, unknown> = {}) => (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        value={String(d[key] ?? '')}
        onChange={(e) => set(key, (props.type === 'number' ? Number(e.target.value) : e.target.value) as never)}
        className={inputCls}
        {...props}
      />
    </label>
  );
  const area = (key: keyof typeof texts, label: string, rows = 3) => (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea value={texts[key]} onChange={(e) => setTexts({ ...texts, [key]: e.target.value })} rows={rows} className={`${inputCls} resize-y`} />
    </label>
  );

  return (
    <form onSubmit={save} className="grid gap-5">
      <button type="button" onClick={onDone} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink/55 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>

      <section className="grid gap-4 rounded-[20px] border border-sand-dark bg-white p-5">
        {field('title', t('admin.offer.title'), { required: true, minLength: 3, maxLength: 120 })}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{t('admin.offer.category')}</span>
            <select value={d.category} onChange={(e) => set('category', e.target.value as OfferDraft['category'])} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{t(`cat.${c.id}`)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>{t('admin.offer.slug')}</span>
            <input
              value={d.slug}
              onChange={(e) => set('slug', slugify(e.target.value))}
              placeholder={slugify(d.title)}
              className={inputCls}
            />
            <span className="mt-1 block text-[11px] text-ink/45">{t('admin.offer.slugHint')}</span>
          </label>
        </div>
        {field('summary', t('admin.offer.summary'), { maxLength: 300 })}
        <label className="block">
          <span className={labelCls}>{t('admin.offer.description')}</span>
          <textarea value={d.description} onChange={(e) => set('description', e.target.value)} rows={6} maxLength={5000} className={`${inputCls} resize-y`} />
        </label>
      </section>

      <section className="grid gap-4 rounded-[20px] border border-sand-dark bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {field('price_thb', t('admin.offer.price'), { type: 'number', min: 1, required: true })}
          <label className="block sm:col-span-2">
            <span className={labelCls}>{t('admin.offer.unit')}</span>
            <select value={d.price_unit} onChange={(e) => set('price_unit', e.target.value as PriceUnit)} className={inputCls}>
              {UNITS.map((u) => <option key={u} value={u}>{t(`admin.unit.${u}`)}</option>)}
            </select>
          </label>
          {field('min_qty', t('admin.offer.min'), { type: 'number', min: 1 })}
          {field('max_qty', t('admin.offer.max'), { type: 'number', min: 1 })}
          {field('sort', t('admin.offer.sort'), { type: 'number' })}
        </div>
        {area('options', t('admin.offer.options'), 3)}
        <div className="grid gap-4 sm:grid-cols-2">
          {(['delivery_airport_thb', 'delivery_address_thb'] as const).map((k) => (
            <label key={k} className="block">
              <span className={labelCls}>{t(`admin.offer.${k === 'delivery_airport_thb' ? 'deliveryAirport' : 'deliveryAddress'}`)}</span>
              <input
                value={texts[k]}
                onChange={(e) => setTexts({ ...texts, [k]: e.target.value })}
                inputMode="numeric"
                placeholder="—"
                className={inputCls}
              />
            </label>
          ))}
        </div>
        <p className="-mt-2 text-[11px] text-ink/45">{t('admin.offer.deliveryHint')}</p>
        <div>
          <span className={labelCls}>{t('admin.offer.covers')}</span>
          <div className="mt-2 flex flex-wrap gap-4">
            {(['welcome', 'ride', 'bags'] as const).map((need) => (
              <label key={need} className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={d.arrival_covers.includes(need)}
                  onChange={(e) => set('arrival_covers', e.target.checked
                    ? [...d.arrival_covers, need]
                    : d.arrival_covers.filter((x) => x !== need))}
                  className="h-4 w-4 accent-[#0E8C7F]"
                />
                {t(`arrival.need.${need}`)}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[20px] border border-sand-dark bg-white p-5">
        <span className={labelCls}>{t('admin.offer.photos')}</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {d.photos.map((p, i) => (
            <div key={p} className="group relative aspect-square overflow-hidden rounded-xl bg-sand">
              <img src={p} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button
                  type="button"
                  title="1re photo"
                  onClick={() => set('photos', [p, ...d.photos.filter((x) => x !== p)])}
                  className={cn('rounded-full bg-white/90 p-1.5', i === 0 && 'text-amber')}
                >
                  <Star className={cn('h-3.5 w-3.5', i === 0 && 'fill-amber')} />
                </button>
                <button type="button" onClick={() => set('photos', d.photos.filter((x) => x !== p))} className="rounded-full bg-white/90 p-1.5 text-cancel">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-sand-dark text-xs font-semibold text-ink/50 hover:border-lagoon hover:text-lagoon"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {t('admin.offer.addPhoto')}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { void upload(e.target.files); e.target.value = ''; }} />
      </section>

      <section className="grid gap-4 rounded-[20px] border border-sand-dark bg-white p-5">
        {area('highlights', t('admin.offer.highlights'))}
        <div className="grid gap-4 sm:grid-cols-2">
          {area('included', t('admin.offer.included'))}
          {area('not_included', t('admin.offer.notIncluded'))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {field('area', t('admin.offer.area'), { maxLength: 80 })}
          {field('duration_label', t('admin.offer.duration'), { maxLength: 60 })}
          {field('meeting_point', t('admin.offer.meeting'), { maxLength: 300 })}
        </div>
        <label className="block">
          <span className={labelCls}>{t('admin.offer.cancellation')}</span>
          <textarea value={d.cancellation} onChange={(e) => set('cancellation', e.target.value)} rows={2} maxLength={1000} className={`${inputCls} resize-y`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('rating', t('admin.offer.rating'), { type: 'number', min: 0, max: 5, step: 0.1 })}
          {field('review_count', t('admin.offer.reviews'), { type: 'number', min: 0 })}
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-[#0E8C7F]" />
            {t('admin.offer.active')}
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={d.featured} onChange={(e) => set('featured', e.target.checked)} className="h-4 w-4 accent-[#0E8C7F]" />
            {t('admin.offer.featured')}
          </label>
        </div>
      </section>

      <button type="submit" disabled={busy || uploading} className="h-12 rounded-full bg-lagoon text-sm font-bold text-white hover:bg-lagoon-deep disabled:opacity-60">
        {t('common.save')}
      </button>
    </form>
  );
}
