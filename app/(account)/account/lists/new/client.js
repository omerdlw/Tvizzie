'use client'

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  AUTH_ROUTES,
  buildAuthHref,
  getCurrentPathWithSearch,
} from '@/features/auth'
import { useAccountEditData } from '@/features/account/hooks'
import { useAuth } from '@/modules/auth'
import { useToast } from '@/modules/notification/hooks'
import { createUserListWithItems } from '@/services/media/lists.service'
import { TmdbService } from '@/services/tmdb/tmdb.service'
import AccountRouteSkeleton from '@/ui/skeletons/views/account'

import Registry from './registry'
import ListCreatorView from './view'

function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase()

  if (entityType !== 'movie') {
    return null
  }

  const entityId = String(item?.id ?? item?.entityId ?? '').trim()
  const title = String(item?.title || item?.original_title || '').trim()
  const name = String(item?.name || item?.original_name || '').trim()

  if (!entityId || (!title && !name)) {
    return null
  }

  return {
    backdrop_path: item?.backdrop_path || null,
    entityId,
    entityType,
    first_air_date: item?.first_air_date || null,
    id: entityId,
    media_type: entityType,
    name,
    overview: item?.overview || '',
    poster_path: item?.poster_path || null,
    release_date: item?.release_date || null,
    title,
    vote_average: Number.isFinite(Number(item?.vote_average))
      ? Number(item.vote_average)
      : null,
  }
}

function getDraftMediaKey(item) {
  return `${item?.entityType || item?.media_type}-${item?.entityId || item?.id}`
}

function getSeedItem(searchParams) {
  const entityId = String(searchParams.get('seedId') || '').trim()
  const entityType = String(searchParams.get('seedType') || '')
    .trim()
    .toLowerCase()

  if (!entityId || entityType !== 'movie') {
    return null
  }

  const title = String(searchParams.get('seedTitle') || '').trim()
  const name = String(searchParams.get('seedName') || '').trim()

  if (!title && !name) {
    return null
  }

  const voteAverage = Number(searchParams.get('seedVoteAverage') || '')

  return {
    backdrop_path: searchParams.get('seedBackdropPath') || null,
    entityId,
    entityType,
    first_air_date: searchParams.get('seedFirstAirDate') || null,
    id: entityId,
    media_type: entityType,
    name,
    poster_path: searchParams.get('seedPosterPath') || null,
    release_date: searchParams.get('seedReleaseDate') || null,
    title,
    vote_average: Number.isFinite(voteAverage) ? voteAverage : null,
  }
}

export default function Client({ initialSnapshot = null }) {
  const auth = useAuth()
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSaving, setIsSaving] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftItems, setDraftItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchError, setSearchError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [, startSearchTransition] = useTransition()
  const deferredSearchQuery = useDeferredValue(searchQuery.trim())
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams]
  )
  const seedItem = useMemo(() => getSeedItem(searchParams), [searchParams])
  const {
    isLoading,
    profile,
  } = useAccountEditData({
    auth,
    initialSnapshot,
    toast,
  })

  const listIndexHref = useMemo(() => {
    const username = profile?.username

    return username ? `/account/${username}/lists` : '/account'
  }, [profile?.username])

  const handleSubmit = useCallback(async () => {
    if (isSaving) {
      return
    }

    if (!auth.user?.id) {
      router.push(
        buildAuthHref(AUTH_ROUTES.SIGN_IN, {
          next: currentPath,
        })
      )
      return
    }

    if (!draftTitle.trim()) {
      toast.error('Please provide a list title')
      return
    }

    if (draftItems.length === 0) {
      toast.error('Add at least 1 title before publishing')
      return
    }

    setIsSaving(true)

    try {
      const nextList = await createUserListWithItems({
        description: draftDescription,
        items: draftItems,
        title: draftTitle,
        userId: auth.user.id,
      })

      toast.success(`"${nextList.title}" was created`)
      const ownerHandle =
        nextList?.ownerSnapshot?.username || profile?.username || null

      if (ownerHandle && nextList?.slug) {
        router.push(`/account/${ownerHandle}/lists/${nextList.slug}`)
        return
      }

      router.push(listIndexHref)
    } catch (error) {
      toast.error(error?.message || 'The list could not be created')
    } finally {
      setIsSaving(false)
    }
  }, [
    auth.user?.id,
    currentPath,
    draftDescription,
    draftItems,
    draftTitle,
    isSaving,
    listIndexHref,
    profile?.username,
    router,
    toast,
  ])

  const handleAddDraftItem = useCallback((item) => {
    const mediaKey = getDraftMediaKey(item)

    setDraftItems((currentItems) => {
      if (
        currentItems.some(
          (currentItem) => getDraftMediaKey(currentItem) === mediaKey
        )
      ) {
        return currentItems
      }

      return [...currentItems, item]
    })
  }, [])

  const handleRemoveDraftItem = useCallback((item) => {
    const mediaKey = getDraftMediaKey(item)

    setDraftItems((currentItems) =>
      currentItems.filter(
        (currentItem) => getDraftMediaKey(currentItem) !== mediaKey
      )
    )
  }, [])

  const handleQuickAddTopResult = useCallback(() => {
    if (!searchResults.length) {
      return
    }

    handleAddDraftItem(searchResults[0])
    setSearchQuery('')
    setSearchResults([])
    setSearchError('')
  }, [handleAddDraftItem, searchResults])

  useEffect(() => {
    if (!auth.isReady || isLoading || auth.isAuthenticated) {
      return
    }

    router.replace(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    )
  }, [auth.isAuthenticated, auth.isReady, currentPath, isLoading, router])

  useEffect(() => {
    if (!seedItem) {
      return
    }

    setDraftItems((currentItems) => {
      const seedMediaKey = getDraftMediaKey(seedItem)

      if (
        currentItems.some((item) => getDraftMediaKey(item) === seedMediaKey)
      ) {
        return currentItems
      }

      return [...currentItems, seedItem]
    })
  }, [seedItem])

  useEffect(() => {
    if (deferredSearchQuery.length < 2) {
      setSearchResults([])
      setSearchError('')
      setIsSearching(false)
      return
    }

    let ignore = false
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')

      try {
        const response = await TmdbService.searchContent(
          deferredSearchQuery,
          'movie',
          1
        )
        const nextResults = (response?.data?.results || [])
          .map(normalizeSearchResult)
          .filter(Boolean)
          .slice(0, 8)

        if (ignore) {
          return
        }

        startSearchTransition(() => {
          setSearchResults(nextResults)
        })

        if (nextResults.length === 0) {
          setSearchError('No matching titles found for that query.')
        }
      } catch {
        if (!ignore) {
          setSearchResults([])
          setSearchError('Search is temporarily unavailable.')
        }
      } finally {
        if (!ignore) {
          setIsSearching(false)
        }
      }
    }, 180)

    return () => {
      ignore = true
      window.clearTimeout(timeoutId)
    }
  }, [deferredSearchQuery, startSearchTransition])

  const registry = (
    <Registry
      authIsAuthenticated={auth.isAuthenticated}
      authIsReady={auth.isReady}
      isLoading={isLoading}
      isSaving={isSaving}
      onSave={handleSubmit}
      profile={profile}
      saveDisabled={!draftTitle.trim() || draftItems.length === 0}
    />
  )

  if (!auth.isReady || isLoading) {
    return (
      <>
        {registry}
        <AccountRouteSkeleton variant="lists" />
      </>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <>
        {registry}
        <AccountRouteSkeleton variant="lists" />
      </>
    )
  }

  return (
    <>
      {registry}
      <ListCreatorView
        canSubmit={Boolean(draftTitle.trim())}
        draftDescription={draftDescription}
        draftItems={draftItems}
        draftTitle={draftTitle}
        isSaving={isSaving}
        isSearching={isSearching}
        listIndexHref={listIndexHref}
        onDescriptionChange={setDraftDescription}
        onQuickAddTopResult={handleQuickAddTopResult}
        onRemoveDraftItem={handleRemoveDraftItem}
        onResultAdd={handleAddDraftItem}
        onSearchChange={setSearchQuery}
        onSubmit={handleSubmit}
        onTitleChange={setDraftTitle}
        searchError={searchError}
        searchQuery={searchQuery}
        searchResults={searchResults}
        seededItemTitle={seedItem?.title || seedItem?.name || ''}
      />
    </>
  )
}
