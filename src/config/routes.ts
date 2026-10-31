export function movieHref(id: number): string {
  return `/movie/${id}`;
}

export function personHref(id: number): string {
  return `/person/${id}`;
}

export function movieReviewsHref(
  movieId: number,
  { sort, user }: { sort?: string; user?: string } = {},
): string {
  const query = new URLSearchParams();
  if (sort) query.set("sort", sort);
  if (user) query.set("user", user);
  const search = query.toString();
  return `${movieHref(movieId)}/reviews${search ? `?${search}` : ""}`;
}

export function reviewHref(movieId: number, username: string): string {
  return movieReviewsHref(movieId, { user: username });
}

export function accountHref(username: string): string {
  return `/account/${encodeURIComponent(username)}`;
}

export function listHref(username: string, slug: string): string {
  return `${accountHref(username)}/lists/${encodeURIComponent(slug)}`;
}

export const OSCARS_HREF = "/oscars";
export const CANON_HREF = "/top-100";
export const DIRECTORS_HREF = "/directors";
