import { useState } from 'react';
import { Check, Minus, Plus, ShieldCheck } from 'lucide-react';
import type { Offer } from '@/lib/types';
import { addDays, daysBetween, estimateAmount, todayInPhuket, usesDateRange } from '@/lib/catalog';
import { useI18n } from '@/lib/i18n';
import type { BookingChoice } from '@/lib/booking';
import { cn } from '@/lib/utils';
import PriceTag from './PriceTag';

/** Dates, quantity, extras and total estimate; hands the choice to the checkout page. */
export default function BookingWidget({ offer, onContinue, initial }: {
  offer: Offer;
  onContinue: (choice: BookingChoice) => void;
  initial?: Partial<BookingChoice>;
}) {
  const { t, formatTHB } = useI18n();
  const range = usesDateRange(offer.priceUnit);
  const today = todayInPhuket();
  const [start, setStart] = useState(initial?.start ?? addDays(today, 1));
  const [end, setEnd] = useState(initial?.end ?? addDays(today, offer.priceUnit === 'night' ? 3 : 2));
  const [time, setTime] = useState(initial?.time ?? '');
  const [qty, setQty] = useState(Math.min(offer.maxQty, Math.max(offer.minQty, initial?.qty ?? offer.minQty)));
  const [optionIds, setOptionIds] = useState<string[]>(initial?.optionIds ?? []);
  const [error, setError] = useState('');

  const units = range ? daysBetween(start, end) : 1;
  const total = estimateAmount(offer, qty, Math.max(units, 1), optionIds);
  const valid = Boolean(start) && start >= today && (!range || units >= 1);

  const toggle = (id: string) =>
    setOptionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!valid) { setError(t('checkout.errDate')); return; }
    onContinue({ start, end: range ? end : null, time, qty, optionIds });
  };

  const inputCls = 'mt-1.5 h-11 w-full rounded-xl border border-sand-dark bg-sand/60 px-3 text-[15px] text-ink outline-none focus:border-lagoon focus:bg-white';
  const labelCls = 'text-xs font-bold uppercase tracking-[0.12em] text-ink/50';

  return (
    <div className="rounded-[22px] border border-sand-dark bg-white p-5 shadow-paper">
      <PriceTag price={offer.priceThb} unit={offer.priceUnit} big />

      <div className="mt-4 grid gap-3">
        {range ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>{t('book.start')}</span>
              <input
                type="date" value={start} min={today}
                onChange={(e) => {
                  setStart(e.target.value); setError('');
                  if (end <= e.target.value) setEnd(addDays(e.target.value, 1));
                }}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>{t('book.end')}</span>
              <input
                type="date" value={end} min={addDays(start || today, 1)}
                onChange={(e) => { setEnd(e.target.value); setError(''); }}
                className={inputCls}
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>{t('book.date')}</span>
              <input
                type="date" value={start} min={today}
                onChange={(e) => { setStart(e.target.value); setError(''); }}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>{t('book.time')}</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </label>
          </div>
        )}

        <div>
          <span className={labelCls}>{t(`book.qty.${offer.priceUnit}`)}</span>
          <div className="mt-1.5 flex items-center justify-between rounded-xl border border-sand-dark bg-sand/60 p-1">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(offer.minQty, q - 1))}
              disabled={qty <= offer.minQty}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink shadow-sm disabled:opacity-35"
              aria-label="−"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-display text-lg font-bold text-ink" aria-live="polite">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(offer.maxQty, q + 1))}
              disabled={qty >= offer.maxQty}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink shadow-sm disabled:opacity-35"
              aria-label="+"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {offer.maxQty > offer.minQty && (
            <p className="mt-1 text-[11px] text-ink/45">{t('book.range', { min: offer.minQty, max: offer.maxQty })}</p>
          )}
        </div>

        {offer.options.length > 0 && (
          <div>
            <span className={labelCls}>{t('book.options')}</span>
            <ul className="mt-1.5 grid gap-1.5">
              {offer.options.map((o) => {
                const on = optionIds.includes(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => toggle(o.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                        on ? 'border-lagoon bg-lagoon/5' : 'border-sand-dark hover:border-lagoon/50',
                      )}
                    >
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-lagoon bg-lagoon text-white' : 'border-ink/25')}>
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 font-medium text-ink">{o.label}</span>
                      <span className="text-ink/60">+{formatTHB(o.price_thb)}{o.per === 'unit' ? ` ${t(`unit.${offer.priceUnit}`)}` : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-sand-dark pt-4">
        <div>
          <p className="text-sm font-semibold text-ink/60">{t('book.total')}</p>
          {range && units > 0 && (
            <p className="text-xs text-ink/45">
              {t(offer.priceUnit === 'night'
                ? (units === 1 ? 'book.nights.one' : 'book.nights.other')
                : (units === 1 ? 'book.days.one' : 'book.days.other'), { count: units })}
            </p>
          )}
        </div>
        <p className="font-display text-2xl font-bold text-ink">{valid ? formatTHB(total) : '—'}</p>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-cancel">{error}</p>}

      <button
        type="button"
        onClick={submit}
        className="mt-4 h-13 w-full rounded-full bg-coral-pop py-3.5 text-[15px] font-bold text-white shadow-coral transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        {t('book.continue')}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-ink/50">
        <ShieldCheck className="h-3.5 w-3.5 text-lagoon" /> {t('book.secure')}
      </p>
    </div>
  );
}
