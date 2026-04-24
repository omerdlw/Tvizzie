import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';

function getCreditRole(credit) {
  if (credit?.character) {
    return `as ${credit.character}`;
  }

  if (credit?.job) {
    return credit.job;
  }

  if (credit?.department) {
    return credit.department;
  }

  return null;
}

export default function FilmographyCard({ credit, className = '', imagePriority = false, imageFetchPriority }) {
  const resolvedTitle = credit.title || credit.original_title || 'Untitled';
  const year = credit.release_date?.slice(0, 4);
  const role = getCreditRole(credit);
  const tooltipBase = year ? `${resolvedTitle} (${year})` : resolvedTitle;
  const tooltipText = role ? `${tooltipBase} ${role}` : tooltipBase;

  return (
    <MediaCard
      href={`/movie/${credit.id}`}
      className={`w-full ${className}`.trim()}
      imageSrc={credit.poster_path ? `${TMDB_IMG}/w342${credit.poster_path}` : null}
      imageAlt={resolvedTitle}
      imageSizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      imagePriority={imagePriority}
      imageFetchPriority={imageFetchPriority}
      tooltipText={tooltipText}
    />
  );
}
