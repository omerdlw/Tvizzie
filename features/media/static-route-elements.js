'use client';

const ZERO_TIMING = 0;

export const MOVIE_ROUTE_TIMING = Object.freeze({
  hero: Object.freeze({
    backgroundDelay: ZERO_TIMING,
    containerDelay: ZERO_TIMING,
    titleDelay: ZERO_TIMING,
    titleClipDelay: ZERO_TIMING,
    titleDuration: ZERO_TIMING,
    socialProofDelay: ZERO_TIMING,
    taglineDelay: ZERO_TIMING,
  }),
  sidebar: Object.freeze({
    posterDelay: ZERO_TIMING,
    actionsDelay: ZERO_TIMING,
    actionStagger: ZERO_TIMING,
    taxonomyDelay: ZERO_TIMING,
    taxonomyStagger: ZERO_TIMING,
    rowsDelay: ZERO_TIMING,
    rowStagger: ZERO_TIMING,
  }),
  sections: Object.freeze({
    cast: ZERO_TIMING,
    reviews: ZERO_TIMING,
    groupDelay: ZERO_TIMING,
    groupStagger: ZERO_TIMING,
  }),
  reviewsPage: Object.freeze({
    sidebar: ZERO_TIMING,
    title: ZERO_TIMING,
    titleDuration: ZERO_TIMING,
    reviews: ZERO_TIMING,
  }),
});

export const PERSON_ROUTE_TIMING = Object.freeze({
  hero: Object.freeze({
    containerDelay: ZERO_TIMING,
    titleDelay: ZERO_TIMING,
    titleClipDelay: ZERO_TIMING,
    titleDuration: ZERO_TIMING,
    overviewDelay: ZERO_TIMING,
  }),
  sidebar: Object.freeze({
    containerDelay: ZERO_TIMING,
    portraitDelay: ZERO_TIMING,
    rowsDelay: ZERO_TIMING,
    rowStagger: ZERO_TIMING,
    bioDelay: ZERO_TIMING,
  }),
  sections: Object.freeze({
    gallery: ZERO_TIMING,
    filmography: ZERO_TIMING,
    timeline: ZERO_TIMING,
    awards: ZERO_TIMING,
  }),
});

export const SEARCH_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    filterDelay: ZERO_TIMING,
    resultDelay: ZERO_TIMING,
    itemStagger: ZERO_TIMING,
  }),
});

function StaticWrapper({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function MovieSectionGroup({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export const MovieClipReveal = StaticWrapper;
export const MovieHeroReveal = StaticWrapper;
export const MovieSectionReveal = StaticWrapper;
export const MovieSidebarReveal = StaticWrapper;
export const MovieSurfaceReveal = StaticWrapper;

export const PersonClipReveal = StaticWrapper;
export const PersonHeroReveal = StaticWrapper;
export const PersonSectionReveal = StaticWrapper;
export const PersonSidebarReveal = StaticWrapper;
export const PersonSurfaceReveal = StaticWrapper;
export const HomeSectionReveal = StaticWrapper;
export const SearchSectionReveal = StaticWrapper;

export function getSurfaceItemMotion() {
  return Object.freeze({});
}

export function getSurfacePanelMotion() {
  return Object.freeze({});
}

export function getPersonSurfaceItemMotion() {
  return Object.freeze({});
}

export function getPersonSurfacePanelMotion() {
  return Object.freeze({});
}

export function getSearchGridItemMotion() {
  return Object.freeze({});
}

export function useInitialItemRevealEnabled() {
  return false;
}

export function useInitialPersonItemRevealEnabled() {
  return false;
}
