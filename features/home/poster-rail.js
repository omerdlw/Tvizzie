import Carousel from '@/ui/media/carousel';
import MediaPosterCard from '@/ui/media/media-poster-card';

export function PosterRail({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <Carousel gap="gap-3" itemClassName="home-poster-rail-item">
      {items.map((item) => (
        <MediaPosterCard key={item.id} item={item} />
      ))}
    </Carousel>
  );
}
