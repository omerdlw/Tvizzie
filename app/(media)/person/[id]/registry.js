'use client'

import { useState } from 'react'

import ImagePreviewModal from '@/features/modal/image-preview-modal'
import PersonAction from '@/features/navigation/actions/person-action'
import SearchAction from '@/features/navigation/actions/search-action'
import { TMDB_IMG } from '@/lib/constants'
import { useRegistry } from '@/modules/registry'

function getNavDescription(person, age) {
  const ageLabel =
    age !== null && age !== undefined
      ? `${age}${person?.deathday ? ' years lived' : ' years old'}`
      : null

  return [person?.known_for_department, ageLabel].filter(Boolean).join(' • ')
}

export default function Registry({
  person,
  activeView,
  setActiveView,
  age,
  backgroundImage,
  isLoading = false,
}) {
  const [isSearching, setIsSearching] = useState(false)
  const title = person?.name || (isLoading ? '' : undefined)
  const description = getNavDescription(person, age) || undefined
  const icon = person?.profile_path
    ? `${TMDB_IMG}/w342${person.profile_path}`
    : undefined

  useRegistry({
    nav: {
      title,
      description: isLoading ? undefined : description,
      icon,
      isLoading,
      actions: [
        {
          key: 'search-overlay',
          tooltip: 'Search',
          icon: isSearching
            ? 'material-symbols:close-rounded'
            : 'solar:magnifer-linear',
          order: 30,
          onClick: (event) => {
            event.stopPropagation()
            setIsSearching((value) => !value)
          },
        },
      ],
      action: isSearching ? (
        <SearchAction />
      ) : person ? (
        <PersonAction
          activeView={activeView}
          setActiveView={setActiveView}
        />
      ) : undefined,
    },
    background: backgroundImage
      ? {
          image: backgroundImage,
          overlay: true,
        overlayOpacity: 0.6,
        noiseStyle: {
          opacity: .4
          }
        }
      : undefined,
    loading: { isLoading },
    modal: {
      PREVIEW_MODAL: ImagePreviewModal,
    },
  })

  return null
}
