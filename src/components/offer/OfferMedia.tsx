import { categoryOf } from '@/lib/catalog';
import type { CategoryId } from '@/lib/types';
import { cn } from '@/lib/utils';

/** First photo of an offer, or a gradient with the category icon while no photo is uploaded. */
export default function OfferMedia({
  category, photo, alt, className, iconClassName,
}: {
  category: CategoryId;
  photo?: string;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  const cat = categoryOf(category);
  if (photo) {
    return <img src={photo} alt={alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }
  const Icon = cat.icon;
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('flex h-full w-full items-center justify-center', className)}
      style={{ background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}
    >
      <Icon className={cn('h-14 w-14 text-white/90', iconClassName)} strokeWidth={1.6} />
    </div>
  );
}
