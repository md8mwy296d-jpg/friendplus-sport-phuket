import { useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Hotel, Loader2, Lock, PlaneLanding } from 'lucide-react';
import { choiceFromSearch } from '@/lib/booking';
import {
  daysBetween, deliveryFee, estimateAmount, isFlightNumber, normalizeFlight, todayInPhuket, usesDateRange,
} from '@/lib/catalog';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import OfferMedia from '@/components/offer/OfferMedia';

export default function Checkout() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, formatTHB, formatDate } = useI18n();
  const { getOffer, offersReady, profile, trip, createBooking, payBooking } = useStore();
  const offer = getOffer(slug);
  const choice = useMemo(() => choiceFromSearch(params), [params]);

  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [pickup, setPickup] = useState('');
  const [notes, setNotes] = useState('');
  const [flight, setFlight] = useState(trip?.flightNumber ?? '');
  const [landing, setLanding] = useState(trip?.arrivalTime || choice.time || '');
  const [address, setAddress] = useState(
    trip ? [trip.stayName, trip.stayAddress].map((x) => x.trim()).filter(Boolean).join(', ') : '',
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!offer) {
    if (!offersReady) return <p className="py-24 text-center text-sm text-ink/50">{t('common.loading')}</p>;
    return <Navigate to="/explorer" replace />;
  }

  const range = usesDateRange(offer.priceUnit);
  const start = choice.start ?? '';
  const end = range ? choice.end ?? null : null;
  const units = range ? daysBetween(start, end) : 1;
  const qty = Math.min(offer.maxQty, Math.max(offer.minQty, choice.qty ?? offer.minQty));
  const optionIds = (choice.optionIds ?? []).filter((id) => offer.options.some((o) => o.id === id));
  const chosen = offer.options.filter((o) => optionIds.includes(o.id));
  const dateOk = Boolean(start) && start >= todayInPhuket() && (!range || units >= 1);
  const delivery = choice.delivery && deliveryFee(offer, choice.delivery) !== null ? choice.delivery : 'none';
  const fee = deliveryFee(offer, delivery) ?? 0;
  const total = estimateAmount(offer, qty, Math.max(units, 1), optionIds) + fee;
  const fmtDay = (d: string) => formatDate(`${d}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dateOk) { setError(t('checkout.errDate')); return; }
    if (name.trim().length < 2 || phone.replace(/\D/g, '').length < 6) { setError(t('checkout.errContact')); return; }
    if (delivery === 'airport' && !isFlightNumber(flight)) { setError(t('checkout.errFlight')); return; }
    if (delivery === 'address' && address.trim().length < 5) { setError(t('checkout.errAddress')); return; }
    setError('');
    setBusy(true);
    const id = await createBooking({
      offerId: offer.id,
      startDate: start,
      endDate: end,
      startTime: delivery === 'airport' ? landing : range ? '' : choice.time ?? '',
      qty,
      optionIds,
      contactName: name,
      contactPhone: phone,
      pickup: delivery === 'none' ? pickup : '',
      notes,
      delivery,
      deliveryAddress: delivery === 'address' ? address : '',
      flightNumber: delivery === 'airport' ? normalizeFlight(flight) : trip?.flightNumber ?? '',
    });
    if (!id) { setBusy(false); return; }
    const redirected = await payBooking(id);
    // payment page unavailable: the booking is saved, the customer can pay from its page
    if (!redirected) navigate(`/reservations/${id}`);
  };

  const labelCls = 'text-xs font-bold uppercase tracking-[0.12em] text-ink/50';
  const inputCls = 'mt-1.5 w-full rounded-xl border border-sand-dark bg-white px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-ink/35 focus:border-lagoon';

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
      <Link to={`/offre/${offer.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">{t('checkout.title')}</h1>

      <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[22px] border border-sand-dark bg-white p-5 shadow-paper md:p-6">
          <h2 className="font-display text-xl font-semibold text-ink">{t('checkout.contact')}</h2>
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className={labelCls}>{t('checkout.name')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" required className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>{t('checkout.phone')}</span>
              <input
                value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30}
                type="tel" autoComplete="tel" inputMode="tel" required placeholder={t('onboard.phonePh')} className={inputCls}
              />
              <span className="mt-1 block text-xs text-ink/45">{t('checkout.phoneHint')}</span>
            </label>
            {delivery === 'airport' && (
              <div className="rounded-2xl border border-lagoon/30 bg-lagoon/5 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-lagoon-deep">
                  <PlaneLanding className="h-4 w-4" /> {t('checkout.airportTitle')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelCls}>{t('trip.flight')}</span>
                    <input
                      value={flight} onChange={(e) => setFlight(e.target.value.toUpperCase())} maxLength={10} required
                      placeholder="TG201" autoCapitalize="characters" className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t('trip.arrivalTime')}</span>
                    <input type="time" value={landing} onChange={(e) => setLanding(e.target.value)} className={inputCls} />
                  </label>
                </div>
                <p className="mt-2 text-xs text-ink/55">{t('checkout.airportHint')}</p>
              </div>
            )}
            {delivery === 'address' && (
              <label className="block">
                <span className={labelCls}>{t('checkout.deliveryAddress')}</span>
                <input
                  value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} required
                  placeholder={t('checkout.pickupPh')} className={inputCls}
                />
              </label>
            )}
            {delivery === 'none' && (
              <label className="block">
                <span className={labelCls}>{t('checkout.pickup')}</span>
                <input value={pickup} onChange={(e) => setPickup(e.target.value)} maxLength={300} placeholder={t('checkout.pickupPh')} className={inputCls} />
              </label>
            )}
            <label className="block">
              <span className={labelCls}>{t('checkout.notes')}</span>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3}
                placeholder={t('checkout.notesPh')} className={`${inputCls} resize-none`}
              />
            </label>
          </div>
        </section>

        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="overflow-hidden rounded-[22px] border border-sand-dark bg-white shadow-paper">
            <div className="h-32">
              <OfferMedia category={offer.category} photo={offer.photos[0]} alt={offer.title} iconClassName="h-10 w-10" />
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{t('checkout.summary')}</p>
              <p className="mt-1 font-display text-lg font-semibold leading-snug text-ink">{offer.title}</p>
              <dl className="mt-3 grid gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/55">{t('detail.when')}</dt>
                  <dd className="text-right font-medium text-ink">
                    {dateOk ? (end ? `${fmtDay(start)} → ${fmtDay(end)}` : fmtDay(start)) : '—'}
                    {!range && choice.time ? ` · ${choice.time}` : ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/55">{t(`book.qty.${offer.priceUnit}`)}</dt>
                  <dd className="font-medium text-ink">{qty}</dd>
                </div>
                {delivery !== 'none' && (
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-ink/55">
                      {delivery === 'airport' ? <PlaneLanding className="h-3.5 w-3.5" /> : <Hotel className="h-3.5 w-3.5" />}
                      {t(`book.delivery.${delivery}`)}
                    </dt>
                    <dd className="font-medium text-ink">{fee ? formatTHB(fee) : t('book.free')}</dd>
                  </div>
                )}
                {chosen.map((o) => (
                  <div key={o.id} className="flex justify-between gap-3">
                    <dt className="text-ink/55">+ {o.label}</dt>
                    <dd className="font-medium text-ink">{formatTHB(o.price_thb)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex items-end justify-between border-t border-sand-dark pt-4">
                <span className="font-semibold text-ink/60">{t('book.total')}</span>
                <span className="font-display text-2xl font-bold text-ink">{formatTHB(total)}</span>
              </div>
              {error && <p className="mt-3 text-sm font-medium text-cancel">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-coral-pop py-3.5 text-[15px] font-bold text-white shadow-coral disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {busy ? t('checkout.paying') : t('checkout.pay', { amount: formatTHB(total) })}
              </button>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-ink/50">
                {t('checkout.terms')}{' '}
                <Link to="/conditions" className="underline">{t('footer.terms')}</Link>
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
