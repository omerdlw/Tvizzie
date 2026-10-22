import { movieHref, personHref } from "@/config/routes";
import {
  SEARCH_OVERVIEW,
  SEARCH_OVERVIEW_LEAD,
  SEARCH_PER_PAGE,
} from "./constants";
import { MATCH } from "./rank";
import {
  SEARCH_TYPES,
  type SearchResults,
  type SearchScope,
  type SearchType,
} from "./types";
import { listHref, reviewHref, userHref } from "./utils";

export type SearchSection = {
  [K in SearchType]: { kind: K; hits: SearchResults[K] };
}[SearchType];

export interface SearchView {
  page: number;
  pages: number;
  perPage: number;
  sections: SearchSection[];
  total: number;
}

const TMDB_KINDS: ReadonlySet<SearchType> = new Set(["movies", "people"]);

function section<K extends SearchType>(
  kind: K,
  hits: SearchResults[K],
): SearchSection {
  return { kind, hits } as SearchSection;
}

// The overview leads with the kind that answers the query best, closeness
// and renown together: "tarantino" opens on the director, "la la land" on
// the film. A kind that only shares a word or two with the query is left
// out when another answers it outright, so "la la land" does not offer
// Ruth De la Lande; so is a film or a person far behind the one that leads
// ("dune" offers no Dune Streeter). The community's own rows are kept
// whenever they match: they are never famous next to a film.
const DISTANT = 0.6;

function overview(results: SearchResults): SearchSection[] {
  const top = (hits: readonly { match: number; score: number }[]) => ({
    match: Math.max(0, ...hits.map((hit) => hit.match)),
    score: Math.max(0, ...hits.map((hit) => hit.score)),
  });
  const ranked = SEARCH_TYPES.filter((kind) => results[kind].length > 0)
    .map((kind) => ({ kind, ...top(results[kind]) }))
    .sort((a, b) => b.score - a.score);

  const closest = Math.max(0, ...ranked.map(({ match }) => match));
  const answering = ranked.filter(
    ({ match }) => closest < MATCH.strong || match >= MATCH.weak,
  );
  const lead = answering[0]?.score ?? 0;
  return answering
    .filter(
      ({ kind, score }, index) =>
        index === 0 || !TMDB_KINDS.has(kind) || score >= lead * DISTANT,
    )
    .map(({ kind }, index) =>
      section(
        kind,
        results[kind].slice(
          0,
          (index === 0 ? SEARCH_OVERVIEW_LEAD : SEARCH_OVERVIEW)[kind],
        ),
      ),
    );
}

export function arrange(
  scope: SearchScope,
  results: SearchResults | null,
  page: number,
): SearchView {
  if (!results) {
    return { page: 0, pages: 1, perPage: 0, sections: [], total: 0 };
  }
  if (scope === "all") {
    const sections = overview(results);
    return { page: 0, pages: 1, perPage: 0, sections, total: 0 };
  }

  const hits = results[scope];
  const perPage = SEARCH_PER_PAGE[scope];
  const pages = Math.max(1, Math.ceil(hits.length / perPage));
  const safe = Math.min(Math.max(page, 0), pages - 1);
  const slice = hits.slice(safe * perPage, (safe + 1) * perPage);
  return {
    page: safe,
    pages,
    perPage,
    sections: slice.length > 0 ? [section(scope, slice)] : [],
    total: hits.length,
  };
}

export function hrefsOf(item: SearchSection): string[] {
  switch (item.kind) {
    case "movies":
      return item.hits.map((hit) => movieHref(hit.id));
    case "people":
      return item.hits.map((hit) => personHref(hit.id));
    case "users":
      return item.hits.map((hit) => userHref(hit.username));
    case "lists":
      return item.hits.map((hit) => listHref(hit.owner.username, hit.slug));
    case "reviews":
      return item.hits.map((hit) =>
        reviewHref(hit.tmdbId, hit.author.username),
      );
  }
}
