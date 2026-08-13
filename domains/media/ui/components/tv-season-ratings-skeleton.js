export default function TvSeasonRatingsSkeleton() {
  return (
    <section className="w-full">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-black/10 px-6">
        <div className="skeleton-block h-3 w-28" />
        <div className="skeleton-block-soft h-3 w-64" />
      </div>
      <div className="grid w-max grid-cols-[2rem_repeat(4,3.5rem)] gap-2 px-6 py-5 lg:mx-auto">
        <div />
        {[0, 1, 2, 3].map((index) => (
          <div key={`season-${index}`} className="skeleton-block-soft size-14" />
        ))}
        {[0, 1, 2, 3, 4, 5].flatMap((episode) => [
          <div key={`episode-${episode}`} className="skeleton-block-soft size-8 self-center" />,
          ...[0, 1, 2, 3].map((season) => (
            <div key={`${episode}-${season}`} className="skeleton-block size-14" />
          )),
        ])}
      </div>
    </section>
  );
}
