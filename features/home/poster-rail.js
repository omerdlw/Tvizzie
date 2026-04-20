import Carousel from '@/features/shared/carousel';
import MediaPosterCard from '@/features/shared/media-poster-card';

export function PosterRail({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <Carousel gap="gap-3" itemClassName="w-[7.2rem] sm:w-[8.2rem] md:w-[9rem] lg:w-[9.4rem]">
      {items.map((item) => (
        <MediaPosterCard key={item.id} item={item} />
      ))}
    </Carousel>
  );
}
