import Carousel from '@/features/shared/carousel';
import MediaPosterCard from '@/features/shared/media-poster-card';

export function PosterRail({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <Carousel 
      gap="gap-3" 
      itemClassName="w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-3.75rem)/6)]"
    >
      {items.map((item) => (
        <MediaPosterCard key={item.id} item={item} />
      ))}
    </Carousel>
  );
}
