import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  BedDouble, Check, ChevronRight, Hotel, Loader2, Luggage, MessageCircle, Motorbike, PlaneLanding, PlaneTakeoff,
  type LucideIcon,
} from 'lucide-react';
import type { ArrivalNeed, Booking, StayType, Trip } from '@/lib/types';
import { addDays, isFlightNumber, normalizeFlight, todayInPhuket } from '@/lib/catalog';
import { useDeliveryText } from '@/lib/booking';
import { contactHref } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import OfferCard from '@/components/offer/OfferCard';
import StatusPill from '@/components/offer/StatusPill';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const ACTIVE = ['pending_payment', 'paid', 'confirmed', 'completed'];
const STAY_TYPES: StayType[] = ['hotel', 'villa', 'condo', 'other'];

const NEEDS: { id: ArrivalNeed; icon: LucideIcon; cta: string }[] = [
  { id: 'welcome', icon: PlaneLanding, cta: '/explorer?cat=arrival' },
  { id: 'ride', icon: Motorbike, cta: '/explorer?cat=scooter' },
  { id: 'bags', icon: Luggage, cta: '/explorer?cat=arrival' },
];

const EMPTY_TRIP: Trip = {
  arrivalDate: '', arrivalTime: '', flightNumber: '', departureDate: '', stayType: 'hotel',
  stayName: '', stayAddress: '', travelers: 2, bags: 2, notes: '',
};

type Entry =
  | { kind: 'landing' | 'departure'; date: string; time: string }
  | { kind: 'booking'; date: string; time: string; booking: Booking };

/** Airport concierge: the customer enters their flight and stay, we get everything ready for the landing. */
export default function Arrival() {
  const { t, formatDate } = useI18n();
  const { isAuthenticated, trip, saveTrip, bookings, offers, refreshBookings, pushToast } = useStore();
  const deliveryText = useDeliveryText();

  useEffect(() => { void refreshBookings(); }, [refreshBookings]);

  const active = useMemo(() => bookings.filter((b) => ACTIVE.includes(b.status)), [bookings]);

  // what is already booked for the landing
  const covered = useMemo(() => {
    const out = new Set<ArrivalNeed>();
    for (const b of active) {
      const offer = offers.find((o) => o.id === b.offerId);
      offer?.arrivalCovers.forEach((n) => out.add(n));
      if (b.category === 'scooter' || b.delivery !== 'none') out.add('ride');
    }
    return out;
  }, [active, offers]);

  const pack = useMemo(
    () => offers.find((o) => o.active && NEEDS.every((n) => o.arrivalCovers.includes(n.id))),
    [offers],
  );
  const arrivalOffers = useMemo(
    () => offers.filter((o) => o.active && o.category === 'arrival' && o.id !== pack?.id).slice(0, 2),
    [offers, pack],
  );

  // the programme: landing, every booking, departure — by date then time
  const programme = useMemo(() => {
    const entries: Entry[] = active
      .filter((b) => b.status !== 'completed' || b.startDate >= addDays(todayInPhuket(), -1))
      .map((b) => ({ kind: 'booking', date: b.startDate, time: b.startTime, booking: b }));
    if (trip?.arrivalDate) entries.push({ kind: 'landing', date: trip.arrivalDate, time: trip.arrivalTime });
    if (trip?.departureDate) entries.push({ kind: 'departure', date: trip.departureDate, time: '' });
    // landing opens its day, departure closes it, bookings in between by time
    const rank = (e: Entry) => (e.kind === 'landing' ? 0 : e.kind === 'departure' ? 2 : 1);
    entries.sort((a, b) => a.date.localeCompare(b.date) || rank(a) - rank(b)
      || (a.time || '99').localeCompare(b.time || '99'));
    const days: { date: string; entries: Entry[] }[] = [];
    for (const e of entries) {
      const last = days[days.length - 1];
      if (last?.date === e.date) last.entries.push(e); else days.push({ date: e.date, entries: [e] });
    }
    return days;
  }, [active, trip]);

  const day = (d: string) => formatDate(`${d}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' });

  const shareText = () => {
    const lines = [`My Phuket Key · ${t('arrival.share.subject')}`];
    if (trip?.arrivalDate) lines.push(`✈️ ${trip.arrivalDate} ${trip.arrivalTime} ${trip.flightNumber}`.trim());
    if (trip?.stayName || trip?.stayAddress) lines.push(`🏨 ${[trip.stayName, trip.stayAddress].filter(Boolean).join(', ')}`);
    if (trip) lines.push(`👥 ${t('trip.summaryPeople', { travelers: trip.travelers, bags: trip.bags })}`);
    for (const b of active) lines.push(`• ${b.startDate} ${b.offerTitle} (${b.ref})`);
    return lines.join('\n');
  };

  return (
    <div className="bg-sand pb-16">
      {/* hero */}
      <section className="relative -mt-[68px] overflow-hidden bg-lagoon-deep pt-[68px] text-white">
        <div className="palm-texture absolute inset-0 bg-white/[0.05]" aria-hidden />
        <div className="relative mx-auto max-w-[1100px] px-4 pb-14 pt-12 sm:px-6 md:pb-20 md:pt-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="text-xs font-bold uppercase tracking-[0.2em] text-amber"
          >
            {t('arrival.eyebrow')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            className="mt-3 max-w-3xl font-display text-[36px] font-bold leading-[1.05] tracking-[-0.02em] md:text-5xl"
          >
            {t('arrival.title')}
          </motion.h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/75">{t('arrival.subtitle')}</p>
          <ol className="mt-8 grid gap-3 md:grid-cols-3">
            {NEEDS.map(({ id, icon: Icon }, i) => (
              <motion.li
                key={id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ease: EASE }}
                className="flex items-start gap-3 rounded-[18px] bg-white/10 p-4 backdrop-blur-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber text-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{t(`arrival.step.${id}`)}</span>
                  <span className="mt-0.5 block text-sm text-white/70">{t(`arrival.step.${id}.body`)}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1100px] gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[1fr_400px]">
        <div className="grid min-w-0 content-start gap-8">
          {/* checklist */}
          <section>
            <h2 className="font-display text-2xl font-bold text-ink">{t('arrival.checklist.title')}</h2>
            <ul className="mt-4 grid gap-3">
              {NEEDS.map(({ id, icon: Icon, cta }) => {
                const done = covered.has(id);
                return (
                  <li key={id} className="flex items-center gap-3 rounded-[18px] border border-sand-dark bg-white p-4 shadow-paper">
                    <span className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      done ? 'bg-lagoon text-white' : 'bg-sand text-ink/50',
                    )}
                    >
                      {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{t(`arrival.need.${id}`)}</p>
                      <p className="text-sm text-ink/55">{t(done ? 'arrival.need.done' : `arrival.need.${id}.todo`)}</p>
                    </div>
                    {!done && (
                      <Link to={cta} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-coral-pop px-3.5 text-[13px] font-bold text-white">
                        {t('arrival.add')} <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* the all-in-one pack and the other landing services */}
          {(pack || arrivalOffers.length > 0) && (
            <section>
              <h2 className="font-display text-2xl font-bold text-ink">{t('arrival.offers.title')}</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {[pack, ...arrivalOffers].filter((o) => o !== undefined).map((o) => <OfferCard key={o.id} offer={o} />)}
              </div>
            </section>
          )}

          {/* programme */}
          {isAuthenticated && (
            <section>
              <div className="flex items-end justify-between gap-3">
                <h2 className="font-display text-2xl font-bold text-ink">{t('arrival.programme.title')}</h2>
                {(trip || active.length > 0) && (
                  <a
                    href={contactHref(shareText())}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-lagoon-deep hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" /> {t('arrival.share')}
                  </a>
                )}
              </div>
              {programme.length === 0 ? (
                <p className="mt-4 rounded-[18px] border border-dashed border-sand-dark bg-white/60 p-6 text-center text-sm text-ink/55">
                  {t('arrival.programme.empty')}
                </p>
              ) : (
                <ol className="mt-4 grid gap-6">
                  {programme.map((d) => (
                    <li key={d.date}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{day(d.date)}</p>
                      <ul className="mt-2 grid gap-2 border-l-2 border-sand-dark pl-4">
                        {d.entries.map((e, i) => (
                          <li key={e.kind === 'booking' ? e.booking.id : `${e.kind}-${i}`} className="relative">
                            <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-sand bg-lagoon" aria-hidden />
                            {e.kind === 'booking' ? (
                              <Link
                                to={`/reservations/${e.booking.id}`}
                                className="block rounded-[16px] border border-sand-dark bg-white p-3.5 shadow-paper transition-colors hover:border-lagoon/40"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  {e.time && <span className="text-sm font-bold text-ink">{e.time}</span>}
                                  <StatusPill status={e.booking.status} />
                                </div>
                                <p className="mt-1 font-semibold text-ink">{e.booking.offerTitle}</p>
                                {e.booking.delivery !== 'none' && (
                                  <p className="mt-0.5 text-[13px] text-lagoon-deep">{deliveryText(e.booking)}</p>
                                )}
                                {e.booking.status === 'pending_payment' && (
                                  <p className="mt-0.5 text-[12px] text-ink/50">{t('arrival.programme.unpaid')}</p>
                                )}
                              </Link>
                            ) : (
                              <div className="flex items-center gap-3 rounded-[16px] bg-ink p-3.5 text-white">
                                {e.kind === 'landing' ? <PlaneLanding className="h-5 w-5 text-amber" /> : <PlaneTakeoff className="h-5 w-5 text-amber" />}
                                <p className="text-sm font-semibold">
                                  {t(`arrival.programme.${e.kind}`)}
                                  {e.time ? ` · ${e.time}` : ''}
                                  {e.kind === 'landing' && trip?.flightNumber ? ` · ${t('trip.flightShort', { flight: trip.flightNumber })}` : ''}
                                </p>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>

        {/* my trip */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          {isAuthenticated ? (
            <TripForm
              key={trip ? JSON.stringify(trip) : 'new'}
              initial={trip ?? EMPTY_TRIP}
              onSave={async (next) => {
                const ok = await saveTrip(next);
                if (ok) pushToast({ kind: 'success', title: t('trip.saved') });
                return ok;
              }}
            />
          ) : (
            <div className="rounded-[22px] border border-sand-dark bg-white p-6 text-center shadow-paper">
              <BedDouble className="mx-auto h-8 w-8 text-lagoon" />
              <p className="mt-3 font-display text-xl font-semibold text-ink">{t('trip.title')}</p>
              <p className="mt-2 text-sm text-ink/60">{t('arrival.loginBody')}</p>
              <Link
                to={`/connexion?next=${encodeURIComponent('/mon-arrivee')}`}
                className="mt-5 inline-flex h-12 items-center rounded-full bg-coral-pop px-6 text-sm font-bold text-white shadow-coral"
              >
                {t('arrival.loginCta')}
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function TripForm({ initial, onSave }: { initial: Trip; onSave: (trip: Trip) => Promise<boolean> }) {
  const { t } = useI18n();
  const [f, setF] = useState<Trip>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Trip>(k: K, v: Trip[K]) => { setF((prev) => ({ ...prev, [k]: v })); setError(''); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.flightNumber && !isFlightNumber(f.flightNumber)) { setError(t('checkout.errFlight')); return; }
    if (f.arrivalDate && f.departureDate && f.departureDate < f.arrivalDate) { setError(t('trip.errDates')); return; }
    setBusy(true);
    await onSave({ ...f, flightNumber: normalizeFlight(f.flightNumber) });
    setBusy(false);
  };

  const labelCls = 'text-xs font-bold uppercase tracking-[0.12em] text-ink/50';
  const inputCls = 'mt-1.5 h-11 w-full rounded-xl border border-sand-dark bg-sand/60 px-3 text-[15px] text-ink outline-none focus:border-lagoon focus:bg-white';
  const counter = (k: 'travelers' | 'bags', min: number, max: number) => (
    <label className="block">
      <span className={labelCls}>{t(`trip.${k}`)}</span>
      <input
        type="number" min={min} max={max} value={f[k]}
        onChange={(e) => set(k, Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))}
        className={inputCls}
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="rounded-[22px] border border-sand-dark bg-white p-5 shadow-paper">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
        <PlaneLanding className="h-5 w-5 text-lagoon" /> {t('trip.title')}
      </h2>
      <p className="mt-1 text-sm text-ink/55">{t('trip.subtitle')}</p>

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>{t('trip.arrivalDate')}</span>
            <input type="date" value={f.arrivalDate} min={todayInPhuket()} onChange={(e) => set('arrivalDate', e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{t('trip.arrivalTime')}</span>
            <input type="time" value={f.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>{t('trip.flight')}</span>
            <input
              value={f.flightNumber} onChange={(e) => set('flightNumber', e.target.value.toUpperCase())}
              maxLength={10} placeholder="TG201" autoCapitalize="characters" className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{t('trip.departureDate')}</span>
            <input
              type="date" value={f.departureDate} min={f.arrivalDate || todayInPhuket()}
              onChange={(e) => set('departureDate', e.target.value)} className={inputCls}
            />
          </label>
        </div>

        <div>
          <span className={labelCls}>{t('trip.stayType')}</span>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {STAY_TYPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('stayType', s)}
                aria-pressed={f.stayType === s}
                className={cn(
                  'h-10 rounded-xl border text-[13px] font-semibold transition-colors',
                  f.stayType === s ? 'border-lagoon bg-lagoon/5 text-lagoon-deep' : 'border-sand-dark text-ink/60',
                )}
              >
                {t(`trip.stay.${s}`)}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className={labelCls}>{t('trip.stayName')}</span>
          <input value={f.stayName} onChange={(e) => set('stayName', e.target.value)} maxLength={120} placeholder={t('trip.stayNamePh')} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>{t('trip.stayAddress')}</span>
          <input value={f.stayAddress} onChange={(e) => set('stayAddress', e.target.value)} maxLength={300} placeholder={t('trip.stayAddressPh')} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {counter('travelers', 1, 30)}
          {counter('bags', 0, 40)}
        </div>
        <label className="block">
          <span className={labelCls}>{t('trip.notes')}</span>
          <textarea
            value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={1000} rows={2}
            placeholder={t('trip.notesPh')}
            className="mt-1.5 w-full resize-none rounded-xl border border-sand-dark bg-sand/60 px-3 py-2.5 text-[15px] text-ink outline-none focus:border-lagoon focus:bg-white"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-cancel">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lagoon text-sm font-bold text-white hover:bg-lagoon-deep disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hotel className="h-4 w-4" />}
        {t('trip.save')}
      </button>
    </form>
  );
}
