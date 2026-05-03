'use client';

import {
  MOVIE_CINEMATIC_PROFILE,
  MOVIE_ROUTE_MOTION,
  MOVIE_ROUTE_TIMING,
  MovieClipReveal,
  MovieHeroReveal,
  MovieSectionReveal,
  MovieSidebarReveal,
  MovieSurfaceReveal,
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
  useMovieSurfaceInitialRevealState,
} from '@/app/(media)/movie/[id]/motion';

export const PERSON_CINEMATIC_PROFILE = MOVIE_CINEMATIC_PROFILE;

const PERSON_SURFACE_ITEM_PRESETS = Object.freeze({
  awardEntry: Object.freeze({
    axis: 'x',
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.micro,
    distance: -MOVIE_CINEMATIC_PROFILE.offsets.panelY,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    groupDelayStep: MOVIE_CINEMATIC_PROFILE.stagger.item,
    scale: MOVIE_CINEMATIC_PROFILE.scales.item,
  }),
  awardYear: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.mediaItem,
    distance: MOVIE_CINEMATIC_PROFILE.offsets.surfaceY,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    scale: MOVIE_CINEMATIC_PROFILE.scales.item,
  }),
  filmographyCard: Object.freeze({
    preset: 'mediaCard',
  }),
  galleryCard: Object.freeze({
    preset: 'mediaCard',
  }),
  sidebarRow: Object.freeze({
    preset: 'sidebarRow',
  }),
  timelineEntry: Object.freeze({
    axis: 'x',
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.micro,
    distance: -MOVIE_CINEMATIC_PROFILE.offsets.panelY,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    groupDelayStep: MOVIE_CINEMATIC_PROFILE.stagger.item,
    scale: MOVIE_CINEMATIC_PROFILE.scales.item,
  }),
  timelineYear: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.mediaItem,
    distance: MOVIE_CINEMATIC_PROFILE.offsets.surfaceY,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    scale: MOVIE_CINEMATIC_PROFILE.scales.item,
  }),
});

export const PERSON_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    itemLead: MOVIE_ROUTE_MOTION.orchestration.itemLead,
    itemStagger: MOVIE_ROUTE_MOTION.orchestration.itemStagger,
    sectionDelay: MOVIE_ROUTE_MOTION.orchestration.sectionDelay,
    yearGroupStagger: MOVIE_ROUTE_MOTION.orchestration.groupStagger,
  }),
  scroll: MOVIE_ROUTE_MOTION.scroll,
  sharedElements: Object.freeze({
    portrait: MOVIE_ROUTE_MOTION.sharedElements.poster,
  }),
});

export const PERSON_ROUTE_TIMING = Object.freeze({
  hero: Object.freeze({
    containerDelay: MOVIE_ROUTE_TIMING.hero.containerDelay,
    overviewDelay: MOVIE_ROUTE_TIMING.hero.overviewDelay,
    titleClipDelay: MOVIE_ROUTE_TIMING.hero.titleClipDelay,
    titleDelay: MOVIE_ROUTE_TIMING.hero.titleDelay,
    titleDuration: MOVIE_ROUTE_TIMING.hero.titleDuration,
  }),
  sections: Object.freeze({
    awards: MOVIE_ROUTE_TIMING.page.secondarySections,
    filmography: MOVIE_ROUTE_TIMING.page.secondarySections + MOVIE_ROUTE_MOTION.orchestration.groupStagger,
    gallery: MOVIE_ROUTE_TIMING.page.secondarySections,
    timeline: MOVIE_ROUTE_TIMING.page.secondarySections,
  }),
  sidebar: Object.freeze({
    bioDelay: MOVIE_ROUTE_TIMING.sidebar.rowsDelay + MOVIE_ROUTE_MOTION.orchestration.groupStagger,
    containerDelay: MOVIE_ROUTE_TIMING.page.primaryStructure,
    portraitDelay: MOVIE_ROUTE_TIMING.sidebar.posterDelay,
    rowsDelay: MOVIE_ROUTE_TIMING.sidebar.rowsDelay,
    rowStagger: MOVIE_ROUTE_TIMING.sidebar.rowStagger,
  }),
});

export const PersonClipReveal = MovieClipReveal;
export const PersonHeroReveal = MovieHeroReveal;
export const PersonSectionReveal = MovieSectionReveal;
export const PersonSidebarReveal = MovieSidebarReveal;
export const PersonSurfaceReveal = MovieSurfaceReveal;

export function usePersonSurfaceRevealState() {
  return useMovieSurfaceInitialRevealState();
}

export function getPersonSurfaceItemMotion(options = {}) {
  const { preset: presetName, ...motionOptions } = options;
  const personPreset = PERSON_SURFACE_ITEM_PRESETS[presetName] || null;
  const moviePreset = personPreset?.preset || (personPreset ? undefined : presetName);

  return getSurfaceItemMotion({
    ...personPreset,
    ...motionOptions,
    preset: moviePreset,
  });
}

export function getPersonSurfacePanelMotion(options = {}) {
  return getSurfacePanelMotion(options);
}

export function useInitialPersonItemRevealEnabled() {
  return useInitialItemRevealEnabled();
}
