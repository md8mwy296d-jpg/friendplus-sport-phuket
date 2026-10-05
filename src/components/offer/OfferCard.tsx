import { Link } from 'react-router';
import { MapPin } from 'lucide-react';
import type { Offer } from '@/lib/types';
import { categoryOf } from '@/lib/catalog';
import { useI18n } from '@/lib/i18n';
import OfferMedia from './OfferMedia';
import PriceTag from './PriceTag';
import Rating from './Rating';

export default function OfferCard({ offer }: { offer: Offer }) {
  const { t } = useI18n();
  const cat = categoryOf(offer.category);
  const Icon = cat.icon;
  return (
    <Link
      to={`/offre/${offer.slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-sand-dark bg-white shadow-paper transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <OfferMedia
          category={offer.category}
          photo={offer.photos[0]}
          alt={offer.title}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink shadow">
          <Icon className="h-3.5 w-3.5" style={{ color: cat.from }} />
          {t(`cat.${offer.category}`)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {offer.area && (
          <p className="flex items-center gap-1 text-xs font-medium text-ink/50">
            <MapPin className="h-3.5 w-3.5" /> {offer.area}
          </p>
        )}
        <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-snug text-ink">{offer.title}</h3>
        <Rating rating={offer.rating} count={offer.reviewCount} />
        <PriceTag price={offer.priceThb} unit={offer.priceUnit} className="mt-auto pt-2" />
      </div>
    </Link>
  );
}
