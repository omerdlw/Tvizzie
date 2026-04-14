'use client';

import { useState } from 'react';

import ImagePreviewModal from '@/features/modal/image-preview-modal';
import PersonAction from '@/features/navigation/actions/person-action';
import SearchAction from '@/features/navigation/actions/search-action';
import { createMoviePosterContextMenuItems } from '@/features/movie/context-menu-actions';
import { EASING, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';

const PERSON_BACKGROUND_ANIMATION = Object.freeze({
  exitDurationFactor: 0.4,
  transition: {
    duration: 1.2,
    delay: 0.4,
    ease: EASING.EMPHASIZED,
  },
  initial: {
    opacity: 0,
    scale: 1.12,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transitionEnd: {
      transform: 'none',
      willChange: 'auto',
    },
  },
  exit: {
    opacity: 0,
    scale: 1.05,
  },
});

const PERSON_POSTER_CONTEXT_TARGET = '[data-context-menu-target="person-poster-card"]';

function getNavDescription(person, age) {
  const ageLabel =
    age !== null && age !== undefined ? `${age}${person?.deathday ? ' years lived' : ' years old'}` : null;

  return [person?.known_for_department, ageLabel].filter(Boolean).join(' • ');
}

export default function Registry({
  person,
  activeView,
  setActiveView,
  age,
  backgroundImage,
  onSetPersonPoster,
  onResetPersonPoster,
  canResetPersonPoster = false,
  isLoading = false,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const title = person?.name || (isLoading ? '' : undefined);
  const description = getNavDescription(person, age) || undefined;
  const icon = person?.profile_path ? `${TMDB_IMG}/w342${person.profile_path}` : undefined;
  const shouldResetBackgroundForLoading = isLoading && !backgroundImage;

  useRegistry({
    nav: {
      title,
      description: isLoading ? undefined : description,
      icon,
      actions: [
        {
          key: 'search-overlay',
          tooltip: 'Search',
          icon: isSearching ? 'material-symbols:close-' : 'solar:magnifer-linear',
          order: 30,
          onClick: (event) => {
            event.stopPropagation();
            setIsSearching((value) => !value);
          },
        },
      ],
      action: isSearching ? (
        <SearchAction />
      ) : person ? (
        <PersonAction activeView={activeView} setActiveView={setActiveView} />
      ) : undefined,
    },
    ...(backgroundImage || shouldResetBackgroundForLoading
      ? {
          background: backgroundImage
            ? {
                animation: PERSON_BACKGROUND_ANIMATION,
                image: backgroundImage,
                overlay: true,
                overlayOpacity: 0.3,
                overlayColor: '#faf9f5',
                noiseStyle: {
                  opacity: 0.13,
                },
              }
            : {
                image: null,
                video: null,
                overlay: false,
                overlayOpacity: 0,
                noiseStyle: {
                  opacity: 0,
                },
              },
        }
      : {}),
    ...(typeof onSetPersonPoster === 'function' || typeof onResetPersonPoster === 'function'
      ? {
          contextMenu: {
            menus: [
              {
                key: 'person-poster-context-menu',
                target: PERSON_POSTER_CONTEXT_TARGET,
                priority: 225,
                resolveContext: (_event, context) => {
                  const target = context?.target;
                  const posterCard =
                    target && typeof target.closest === 'function'
                      ? target.closest(PERSON_POSTER_CONTEXT_TARGET)
                      : null;
                  const filePath = posterCard?.getAttribute('data-poster-file-path') || null;

                  return {
                    payload: {
                      filePath,
                      personId: person?.id || null,
                    },
                  };
                },
                items: (menuContext) => {
                  const filePath = menuContext?.payload?.filePath;

                  return createMoviePosterContextMenuItems({
                    filePath,
                    onSetMoviePoster: onSetPersonPoster,
                    onResetMoviePoster: onResetPersonPoster,
                    canResetPoster: canResetPersonPoster,
                  });
                },
              },
            ],
          },
        }
      : {}),
    loading: { isLoading, showOverlay: false },
    modal: {
      PREVIEW_MODAL: ImagePreviewModal,
    },
  });

  return null;
}
