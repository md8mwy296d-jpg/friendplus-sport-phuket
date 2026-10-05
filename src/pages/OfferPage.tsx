import { useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Check, Clock, MapPin, Sparkles, Undo2, X } from 'lucide-react';
import { categoryOf } from '@/lib/catalog';
import { useI18n } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import OfferMedia from '@/components/offer/OfferMedia';
import Rating from '@/components/offer/Rating';
import PriceTag from '@/components/offer/PriceTag';
import OfferCard from '@/components/offer/OfferCard';
import BookingWidget from '@/components/offer/BookingWidget';
import { choiceFromTrip, choiceToSearch, type BookingChoice } from '@/lib/booking';

function List({ items, icon: Icon, tone }: { items: string[]; icon: typeof Check; tone: string }) {
  return (
    <ul className="mt-3 grid gap-2">
      {items.map((it) => (
        <li key={it} className="flex gap-2.5 text-[15px] text-ink/75">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} /> {it}
        </li>
      ))}
    </ul>
  );
}

export default function OfferPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const { getOffer, offers, offersReady, trip } = useStore();
  const navigate = useNavigate();
  const widgetRef = useRef<HTMLDivElement>(null);
  const offer = getOffer(slug);

  const similar = useMemo(
    () => (offer ? offers.filter((o) => o.active && o.id !== offer.id && o.category === offer.category).slice(0, 3) : []),
    [offers, offer],
  );

  if (!offer) {
    if (!offersReady) return <p className="py-24 text-center text-sm text-ink/50">{t('common.loading')}</p>;
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="font-display text-2xl font-bold text-ink">{t('offer.notFound.title')}</p>
        <p className="mt-2 text-ink/60">{t('offer.notFound.body')}</p>
        <Link to="/explorer" className="mt-6 inline-flex h-12 items-center rounded-full bg-lagoon px-6 text-sm font-bold text-white">
          {t('offer.notFound.cta')}
        </Link>
      </div>
    );
  }

  const cat = categoryOf(offer.category);
  const CatIcon = cat.icon;
  const photos = offer.photos.length > 0 ? offer.photos : [''];
  const goCheckout = (c: BookingChoice) => navigate(`/reserver/${offer.slug}?${choiceToSearch(c)}`);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 md:pb-16">
      <Link to={`/explorer?cat=${offer.category}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 hover:text-ink">
        <CatIcon className="h-4 w-4" style={{ color: cat.from }} /> {t(`cat.${offer.category}`)}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink md:text-4xl">{offer.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/60">
        <Rating rating={offer.rating} count={offer.reviewCount} />
        {offer.area && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {offer.area}</span>}
        {offer.durationLabel && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {offer.durationLabel}</span>}
      </div>

      {/* gallery */}
      <div className={`mt-5 grid h-[260px] gap-2 overflow-hidden rounded-[24px] sm:h-[380px] ${photos.length > 1 ? 'sm:grid-cols-[2fr_1fr]' : ''}`}>
        <OfferMedia category={offer.category} photo={photos[0]} alt={offer.title} iconClassName="h-20 w-20" />
        <div className={photos.length > 1 ? 'hidden grid-rows-2 gap-2 sm:grid' : 'hidden'}>
          {[photos[1], photos[2]].map((p, i) => (
            <OfferMedia key={i} category={offer.category} photo={p} alt={offer.title} iconClassName="h-10 w-10 opacity-60" />
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {offer.summary && <p className="text-lg leading-relaxed text-ink/80">{offer.summary}</p>}

          {offer.highlights.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold text-ink">{t('offer.highlights')}</h2>
              <List items={offer.highlights} icon={Sparkles} tone="text-amber" />
            </section>
          )}

          {offer.description && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold text-ink">{t('offer.description')}</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/75">{offer.description}</p>
            </section>
          )}

          {(offer.included.length > 0 || offer.notIncluded.length > 0) && (
            <section className="mt-8 grid gap-6 sm:grid-cols-2">
              {offer.included.length > 0 && (
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">{t('offer.included')}</h2>
                  <List items={offer.included} icon={Check} tone="text-confirm" />
                </div>
              )}
              {offer.notIncluded.length > 0 && (
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">{t('offer.notIncluded')}</h2>
                  <List items={offer.notIncluded} icon={X} tone="text-cancel" />
                </div>
              )}
            </section>
          )}

          <section className="mt-8 grid gap-4 rounded-[20px] border border-sand-dark bg-white p-5 sm:grid-cols-2">
            {offer.meetingPoint && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{t('offer.meeting')}</p>
                <p className="mt-1 text-[15px] text-ink">{offer.meetingPoint}</p>
              </div>
            )}
            {offer.durationLabel && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/45">{t('offer.duration')}</p>
                <p className="mt-1 text-[15px] text-ink">{offer.durationLabel}</p>
              </div>
            )}
            {offer.cancellation && (
              <div className="sm:col-span-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink/45">
                  <Undo2 className="h-3.5 w-3.5" /> {t('offer.cancellation')}
                </p>
                <p className="mt-1 text-[15px] text-ink">{offer.cancellation}</p>
              </div>
            )}
          </section>
        </div>

        <aside ref={widgetRef} className="lg:sticky lg:top-[88px] lg:self-start" id="reserver">
          <BookingWidget key={trip?.arrivalDate ?? ''} offer={offer} onContinue={goCheckout} initial={choiceFromTrip(offer, trip)} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-ink">{t('offer.similar')}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        </section>
      )}

      {/* phones: price + book button always in reach */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-sand-dark bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <PriceTag price={offer.priceThb} unit={offer.priceUnit} />
          <button
            onClick={() => widgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="h-11 rounded-full bg-coral-pop px-6 text-sm font-bold text-white shadow-coral"
          >
            {t('book.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
