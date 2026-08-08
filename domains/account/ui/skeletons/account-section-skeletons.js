'use client';

// ─── Shimmer Utility ──────────────────────────────────────────────────────────
// A single CSS class string used everywhere for a consistent pulse rhythm.
const S = 'animate-pulse';

// ─── Section Heading Skeleton (matches AccountSectionHeading 1-to-1) ──────────
export function SectionHeadingSkeleton({ titleWidth = 'w-32' }) {
  return (
    <div className="flex w-full flex-col gap-4 mb-4">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`size-5 shrink-0 rounded-md bg-black/10 ${S}`} />
          <div className={`h-3 ${titleWidth} rounded-md bg-black/10 ${S}`} />
        </div>
        <div className={`h-3 w-12 rounded-md bg-black/[0.07] ${S}`} />
      </div>
      <div className="h-px bg-black/10" />
    </div>
  );
}

// ─── Poster Cards Row Skeleton ────────────────────────────────────────────────
export function PosterCardsSkeletonRow({ count = 6 }) {
  return (
    <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`aspect-[2/3] w-full rounded-2xl bg-black/10 ${S}`}
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Activity Items Skeleton (matches real ActivityItem row 1-to-1) ───────────
// Real layout: grid-cols-[minmax(0,1fr)_auto], border-b, text line(s) + timestamp
const ACTIVITY_LINE_WIDTHS = ['w-3/4', 'w-2/3', 'w-4/5', 'w-1/2', 'w-3/5', 'w-2/5'];

export function ActivityItemsSkeletonList({ count = 6 }) {
  return (
    <div className="w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-black/10 py-5 last:border-b-0"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Text line(s) — mimics inline "OMERDLW rated ★★★★ [Film Title]" */}
          <div className="min-w-0 space-y-2 pt-0.5">
            <div
              className={`h-[1.05rem] ${ACTIVITY_LINE_WIDTHS[i % ACTIVITY_LINE_WIDTHS.length]} rounded-md bg-black/10 ${S}`}
            />
            {/* Some rows have a sub-line (e.g. review excerpt) */}
            {i % 3 === 0 && (
              <div className={`h-3 w-2/5 rounded-md bg-black/[0.07] ${S}`} />
            )}
          </div>
          {/* Timestamp pill */}
          <div className={`h-3.5 w-7 shrink-0 rounded-md bg-black/[0.07] ${S} mt-0.5`} />
        </div>
      ))}
    </div>
  );
}

// ─── List Card Skeleton (matches AccountListCard 3-D stack + glass panel) ─────
function SingleListCardSkeleton({ delay = 0 }) {
  return (
    <article className="relative w-full" style={{ animationDelay: `${delay}ms` }}>
      {/* 3-D Stack Panel */}
      <div className="relative h-[232px] w-full overflow-hidden rounded-2xl bg-black/[0.06]">
        <div className="absolute inset-0 flex items-center justify-center">
          {[-36, -18, 0, 18, 36].map((offset, idx) => (
            <div
              key={idx}
              className={`absolute h-[156px] w-[98px] rounded-xl bg-black/10 shadow-sm ${S}`}
              style={{
                transform: `translateX(${offset}px) rotate(${offset * 0.28}deg) scale(${1 - Math.abs(offset) * 0.003})`,
                zIndex: 5 - Math.abs(idx - 2),
                animationDelay: `${delay + idx * 30}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Glass Info Panel */}
      <div className="relative z-10 -mt-12 space-y-2 rounded-2xl border border-black/10 bg-white/80 p-4 backdrop-blur-md">
        {/* Title */}
        <div className={`h-5 w-2/3 rounded-lg bg-black/10 ${S}`} />
        {/* Description lines */}
        <div className={`h-3.5 w-full rounded bg-black/[0.08] ${S}`} />
        <div className={`h-3.5 w-4/5 rounded bg-black/[0.05] ${S}`} />
        {/* Footer row */}
        <div className="flex items-center justify-between border-t border-black/10 pt-3">
          <div className={`h-3 w-20 rounded bg-black/[0.08] ${S}`} />
          <div className={`h-3 w-16 rounded bg-black/[0.08] ${S}`} />
        </div>
      </div>
    </article>
  );
}

export function ListCardsSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SingleListCardSkeleton key={i} delay={i * 60} />
      ))}
    </div>
  );
}

// ─── Review Card Skeleton (matches ReviewCard poster + metadata layout) ────────
// Real layout: flex gap-4, poster (h-28 w-20 rounded-2xl), flex-1 with title + rating badge + 2 text lines + date
const REVIEW_TITLE_WIDTHS = ['w-48', 'w-36', 'w-52', 'w-40'];
const REVIEW_LINE_WIDTHS = ['w-full', 'w-5/6', 'w-4/5', 'w-full'];

export function ReviewCardsSkeletonList({ count = 4 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-black/10 py-5 last:border-b-0"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {/* Poster */}
          <div className={`h-28 w-20 shrink-0 rounded-2xl bg-black/10 ${S}`} />

          {/* Metadata column */}
          <div className="flex min-w-0 flex-1 flex-col justify-start gap-2 pt-0.5">
            {/* Title + Rating badge row */}
            <div className="flex items-center justify-between gap-3">
              <div className={`h-4 ${REVIEW_TITLE_WIDTHS[i % REVIEW_TITLE_WIDTHS.length]} rounded bg-black/10 ${S}`} />
              <div className={`h-6 w-14 shrink-0 rounded-xl bg-black/10 ${S}`} />
            </div>
            {/* Review text lines */}
            <div className={`h-3.5 ${REVIEW_LINE_WIDTHS[i % REVIEW_LINE_WIDTHS.length]} rounded bg-black/[0.08] ${S}`} />
            <div className={`h-3.5 w-3/4 rounded bg-black/[0.06] ${S}`} />
            {/* Date */}
            <div className={`mt-1 h-3 w-20 rounded bg-black/[0.06] ${S}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Media Grid Skeleton (Watched / Watchlist / Likes full-page) ──────────────
// No filter bar. Just the 12-poster grid that matches AccountMediaGridPage.
export function AccountMediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`aspect-[2/3] w-full rounded-2xl bg-black/10 ${S}`}
          style={{ animationDelay: `${i * 45}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Activity Feed Skeleton (full-page) ───────────────────────────────────────
// No filter bar. Just the rows.
export function AccountActivitySkeleton() {
  return <ActivityItemsSkeletonList count={8} />;
}

// ─── Reviews Skeleton (full-page) ─────────────────────────────────────────────
// No filter bar.
export function AccountReviewsSkeleton() {
  return <ReviewCardsSkeletonList count={6} />;
}

// ─── Lists Grid Skeleton (full-page) ─────────────────────────────────────────
// No sort bar.
export function AccountListsSkeleton() {
  return <ListCardsSkeletonGrid count={6} />;
}

// ─── Overview Section Skeleton ────────────────────────────────────────────────
// Shows a representative but plausible mix of sections (no filter bars anywhere).
export function AccountOverviewSkeleton() {
  return (
    <div className="w-full space-y-10 sm:space-y-12">
      {/* Watched/Favorites row */}
      <section>
        <SectionHeadingSkeleton titleWidth="w-24" />
        <PosterCardsSkeletonRow count={6} />
      </section>

      {/* Activity */}
      <section>
        <SectionHeadingSkeleton titleWidth="w-36" />
        <ActivityItemsSkeletonList count={4} />
      </section>

      {/* Lists */}
      <section>
        <SectionHeadingSkeleton titleWidth="w-20" />
        <ListCardsSkeletonGrid count={3} />
      </section>

      {/* Reviews */}
      <section>
        <SectionHeadingSkeleton titleWidth="w-32" />
        <ReviewCardsSkeletonList count={3} />
      </section>
    </div>
  );
}

// ─── Profile Edit Form Skeleton ───────────────────────────────────────────────
export function AccountEditSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white/40 p-6 backdrop-blur-md sm:p-8">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className={`size-28 rounded-2xl bg-black/10 ${S}`} />
        <div className={`h-3.5 w-28 rounded bg-black/[0.08] ${S}`} />
      </div>

      {/* Input fields */}
      <div className="space-y-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className={`h-3 w-24 rounded bg-black/[0.08] ${S}`} />
            <div className={`h-12 w-full rounded-2xl bg-white/50 ${S}`} />
          </div>
        ))}
        <div className="space-y-2">
          <div className={`h-3 w-20 rounded bg-black/[0.08] ${S}`} />
          <div className={`h-24 w-full rounded-2xl bg-white/50 ${S}`} />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <div className={`h-12 w-36 rounded-2xl bg-black/15 ${S}`} />
      </div>
    </div>
  );
}

// ─── FilterBarSkeleton — kept as export but intentionally empty ───────────────
// Some importing modules still reference this; we export a zero-height fragment
// so those call-sites don't break while rendering nothing visible.
export function FilterBarSkeleton() {
  return null;
}
