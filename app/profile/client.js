'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { doc } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'

import ConfirmationModal from '@/components/modals/confirmation-modal'
import FollowListModal from '@/components/modals/follow-list-modal'
import ListEditorModal from '@/components/modals/list-editor-modal'
import ProfileEditorModal from '@/components/modals/profile-editor-modal'
import ProfileAction from '@/components/nav-actions/profile-action'
import {
  EmptyState,
  FullScreenEmptyState,
} from '@/components/profile/empty-state'
import { ProfileHero } from '@/components/profile/hero'
import { ListCard } from '@/components/profile/list-card'
import { MediaGrid } from '@/components/profile/media-grid'
import { SortSelect } from '@/components/profile/sort-select'
import { useRegistry } from '@/lib/hooks/use-registry'
import { cn } from '@/lib/utils'
import { useAuth } from '@/modules/auth'
import { useModal } from '@/modules/modal/context'
import { useNavHeight } from '@/modules/nav/hooks'
import { useToast } from '@/modules/notification/hooks'
import {
  getFavoriteDocRef,
  subscribeToUserFavorites,
} from '@/services/favorites.service'
import { getUserListItemsCollection } from '@/services/firestore-media.service'
import {
  followUser,
  subscribeToFollowStatus,
  subscribeToFollowers,
  subscribeToFollowing,
  unfollowUser,
} from '@/services/follows.service'
import {
  deleteUserList,
  subscribeToUserListItems,
  subscribeToUserLists,
  toggleUserListItem,
} from '@/services/lists.service'
import {
  getUserIdByUsername,
  getUserProfile,
  subscribeToUserProfile,
} from '@/services/profile.service'
import { updateUserMediaPosition } from '@/services/user-media.service'
import {
  getWatchlistDocRef,
  subscribeToUserWatchlist,
} from '@/services/watchlist.service'
import { Button } from '@/ui/elements'
import Icon from '@/ui/icon/index'

const PROFILE_TABS = ['favorites', 'watchlist', 'lists']

function getMediaTitle(item = {}) {
  return (
    item?.title ||
    item?.name ||
    item?.original_title ||
    item?.original_name ||
    'Untitled'
  )
}

function getAvatarUrl(profile) {
  const seed = profile?.username || profile?.id || 'tvizzie'
  return (
    profile?.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
  )
}

export default function ProfilePage({
  username = null,
  activeTab: activeTabProp = null,
}) {
  const auth = useAuth()
  const toast = useToast()
  const { openModal } = useModal()
  const { navHeight } = useNavHeight()
  const heroRef = useRef(null)
  const [heroHeight, setHeroHeight] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [remoteUserId, setRemoteUserId] = useState(null)
  const [isResolvingProfile, setIsResolvingProfile] = useState(
    Boolean(username)
  )
  const [resolveError, setResolveError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [lists, setLists] = useState([])
  const [listItems, setListItems] = useState([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(true)
  const [isLoadingListItems, setIsLoadingListItems] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [tabSorts, setTabSorts] = useState({
    favorites: 'newest',
    watchlist: 'newest',
    lists: 'newest',
  })

  const [activeTab, setActiveTab] = useState(() => {
    if (activeTabProp && PROFILE_TABS.includes(activeTabProp)) {
      return activeTabProp
    }
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('tab')
      if (param && PROFILE_TABS.includes(param)) return param
    }
    return 'favorites'
  })
  const activeListId = searchParams.get('list') || ''

  const resolvedUserId = username ? remoteUserId : auth.user?.id || null

  const isOwner = useMemo(() => {
    if (!auth.isAuthenticated || !auth.user?.id) return false
    if (!username) return true
    return profile?.id === auth.user.id || resolvedUserId === auth.user.id
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    username,
    profile?.id,
    resolvedUserId,
  ])

  const selectedList = useMemo(
    () => lists.find((list) => list.id === activeListId) || null,
    [activeListId, lists]
  )

  const sortItems = useCallback((items, sortMethod) => {
    if (!items || items.length === 0) return []

    const sorted = [...items]

    switch (sortMethod) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt))
      case 'rating_high':
        return sorted.sort(
          (a, b) => (b.vote_average || 0) - (a.vote_average || 0)
        )
      case 'rating_low':
        return sorted.sort(
          (a, b) => (a.vote_average || 0) - (b.vote_average || 0)
        )
      case 'title_az':
        return sorted.sort((a, b) =>
          getMediaTitle(a).localeCompare(getMediaTitle(b))
        )
      case 'manual':
        return sorted.sort((a, b) => (b.position || 0) - (a.position || 0))
      default:
        return sorted
    }
  }, [])

  const sortedFavorites = useMemo(
    () => sortItems(favorites, tabSorts.favorites),
    [favorites, sortItems, tabSorts.favorites]
  )
  const sortedWatchlist = useMemo(
    () => sortItems(watchlist, tabSorts.watchlist),
    [watchlist, sortItems, tabSorts.watchlist]
  )
  const sortedListItems = useMemo(
    () => sortItems(listItems, tabSorts.lists),
    [listItems, sortItems, tabSorts.lists]
  )

  const isPageLoading =
    isResolvingProfile ||
    (!username && (!auth.isReady || auth.status === 'loading')) ||
    (Boolean(resolvedUserId) && (!profile || isLoadingCollections))

  const isFullScreenEmpty = useMemo(() => {
    if (activeTab === 'favorites') {
      return isLoadingCollections || favorites.length === 0
    }
    if (activeTab === 'watchlist') {
      return isLoadingCollections || watchlist.length === 0
    }
    if (activeTab === 'lists') {
      if (isLoadingCollections) return true
      if (!selectedList) return lists.length === 0
      return isLoadingListItems || listItems.length === 0
    }
    return false
  }, [
    activeTab,
    favorites.length,
    isLoadingCollections,
    isLoadingListItems,
    listItems.length,
    lists.length,
    selectedList,
    watchlist.length,
  ])

  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    const update = () => {
      const next = Math.round(el.getBoundingClientRect().height || 0)
      setHeroHeight(next)
    }

    update()

    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function updateQuery(nextEntries = {}) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(nextEntries).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    })
  }

  function handleTabChange(tab) {
    setActiveTab(tab)
    const base = username ? `/profile/${username}` : '/profile'
    const url = tab === 'favorites' ? base : `${base}?tab=${tab}`
    window.history.replaceState(null, '', url)
  }

  const handleEditList = (list) => {
    if (!isOwner) return
    openModal('LIST_EDITOR_MODAL', 'center', {
      data: {
        isOwner: true,
        userId: auth.user.id,
        initialData: list,
      },
      title: 'Edit Custom List',
    })
  }

  function handleDeleteList(list) {
    if (!isOwner) return
    openModal('CONFIRMATION_MODAL', 'bottom', {
      header: {
        title: 'DELETE LIST',
        description: `List ID: ${list.id}`,
      },
      data: {
        confirmText: 'Delete List',
        description:
          'This removes the list and all items inside it from your profile.',
        isDestructive: true,
        onConfirm: async () => {
          try {
            await deleteUserList({
              listId: list.id,
              userId: auth.user.id,
            })
            toast.success(`"${list.title}" was deleted.`)
            if (activeListId === list.id) {
              updateQuery({ list: null, tab: 'lists' })
            }
          } catch (error) {
            toast.error(error?.message || 'The list could not be deleted.')
          }
        },
      },
    })
  }

  const navDescription = useMemo(() => {
    if (!username && auth.isReady && !auth.isAuthenticated) {
      return 'Sign in to see your profile'
    }
    if (activeTab === 'favorites') return `Favorites`
    if (activeTab === 'watchlist') return `Watchlist`
    if (activeTab === 'lists') {
      if (selectedList) return `Lists / ${selectedList.title}`
      return `Custom Lists`
    }
    return ''
  }, [activeTab, auth.isAuthenticated, auth.isReady, selectedList, username])

  const handleFollow = async () => {
    if (!auth.isAuthenticated) {
      toast.error('Please sign in to follow users.')
      return
    }
    setIsFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(auth.user.id, profile.id)
      } else {
        await followUser(auth.user.id, profile.id)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsFollowLoading(false)
    }
  }

  const handleEditProfile = () => {
    if (!isOwner) return
    openModal('PROFILE_EDITOR_MODAL', 'center', {
      data: {
        profile,
        authActions: auth,
      },
    })
  }

  async function handleGoogleSignIn() {
    try {
      await auth.signIn({ provider: 'google' })
      toast.success('Signed in successfully.')
    } catch (error) {
      toast.error(error?.message || 'Sign in failed.')
    }
  }

  async function handleCreateList() {
    if (!isOwner) return

    openModal('LIST_EDITOR_MODAL', 'center', {
      data: {
        isOwner: true,
        userId: auth.user.id,
        onSuccess: (nextList) => {
          updateQuery({
            list: nextList.id,
            tab: 'lists',
          })
        },
      },
      title: 'Create Custom List',
    })
  }

  async function handleRemoveListItem(item) {
    if (!isOwner || !selectedList) return

    try {
      await toggleUserListItem({
        listId: selectedList.id,
        media: item,
        userId: auth.user.id,
      })
      toast.success(`${getMediaTitle(item)} was removed from the list.`)
    } catch (error) {
      toast.error(error?.message || 'The item could not be removed.')
    }
  }

  const handleReorder = async (nextItems, tab) => {
    if (!isOwner) return

    // Update local state first for instant feedback
    if (tab === 'favorites') setFavorites(nextItems)
    if (tab === 'watchlist') setWatchlist(nextItems)
    if (tab === 'lists') setListItems(nextItems)

    try {
      // We only update the position of the items that moved.
      // For simplicity, we can update positions based on the new array order.
      // Higher position = top of the list in 'manual' sort.
      const now = Date.now()
      const updates = nextItems
        .map((item, index) => {
          const newPosition = now - index // ensure strictly decreasing positions
          let docRef
          if (tab === 'favorites')
            docRef = getFavoriteDocRef(auth.user.id, item)
          if (tab === 'watchlist')
            docRef = getWatchlistDocRef(auth.user.id, item)
          if (tab === 'lists' && selectedList)
            docRef = doc(
              getUserListItemsCollection(auth.user.id, selectedList.id),
              item.mediaKey
            )

          if (docRef) {
            return updateUserMediaPosition(docRef, newPosition)
          }
          return null
        })
        .filter(Boolean)

      await Promise.all(updates)
    } catch (error) {
      console.error(`[Profile] Failed to persist reorder for ${tab}:`, error)
      toast.error('Could not save custom order.')
    }
  }

  useRegistry({
    background: {
      image: profile?.bannerUrl || undefined,
      noiseStyle: {
        opacity: 0.25,
      },
      overlay: true,
      overlayOpacity: profile?.bannerUrl ? 0.78 : 0.92,
    },
    loading: {
      isLoading: isPageLoading,
    },
    modal: {
      CONFIRMATION_MODAL: ConfirmationModal,
      LIST_EDITOR_MODAL: ListEditorModal,
      FOLLOW_LIST_MODAL: FollowListModal,
      PROFILE_EDITOR_MODAL: ProfileEditorModal,
    },
    nav: {
      description: navDescription,
      icon: getAvatarUrl(profile),
      isLoading: isPageLoading,
      title:
        username && !isOwner
          ? profile?.displayName || 'Profile'
          : profile?.displayName || 'Profile',
      action: (
        <ProfileAction
          isOwner={isOwner}
          isAuthenticated={auth.isAuthenticated}
          onSignIn={handleGoogleSignIn}
          onEditProfile={handleEditProfile}
          isFollowing={isFollowing}
          onFollow={handleFollow}
          isLoading={isFollowLoading}
          isNotFound={
            !profile &&
            !isResolvingProfile &&
            (Boolean(username) || Boolean(resolveError))
          }
        />
      ),
    },
  })

  useEffect(() => {
    if (username) {
      let ignore = false

      async function resolveProfile() {
        setIsResolvingProfile(true)
        setResolveError(null)

        try {
          let userId = await getUserIdByUsername(username)

          if (!userId && !ignore) {
            const profileSnapshot = await getUserProfile(username)
            if (profileSnapshot) {
              userId = username
            }
          }

          if (ignore) return

          setRemoteUserId(userId)
          setResolveError(userId ? null : 'Profile not found')
        } catch (error) {
          if (ignore) return
          setRemoteUserId(null) // Corrected: setRemoteUserId instead of setResolvedUserId
          setResolveError(error?.message || 'Profile not found')
        } finally {
          if (!ignore) {
            setIsResolvingProfile(false)
          }
        }
      }

      resolveProfile()

      return () => {
        ignore = true
      }
    }

    setRemoteUserId(null)
    setResolveError(null)
    setIsResolvingProfile(false)
  }, [auth.user?.id, username])

  useEffect(() => {
    if (!resolvedUserId) {
      setProfile(null)
      return undefined
    }

    return subscribeToUserProfile(
      resolvedUserId,
      (nextProfile) => {
        setProfile(nextProfile)
      },
      {
        onError: (error) => {
          toast.error(error?.message || 'Profile could not be loaded.')
        },
      }
    )
  }, [resolvedUserId, toast])

  useEffect(() => {
    if (!resolvedUserId) {
      setFavorites([])
      setWatchlist([])
      setLists([])
      setIsLoadingCollections(false)
      return undefined
    }

    setIsLoadingCollections(true)
    const resolvedOnce = {
      favorites: false,
      lists: false,
      watchlist: false,
    }

    const resolveStream = (key) => {
      if (resolvedOnce[key]) return

      resolvedOnce[key] = true

      if (
        resolvedOnce.favorites &&
        resolvedOnce.watchlist &&
        resolvedOnce.lists
      ) {
        setIsLoadingCollections(false)
      }
    }

    const unsubscribeFavorites = subscribeToUserFavorites(
      resolvedUserId,
      (nextFavorites) => {
        setFavorites(nextFavorites)
        resolveStream('favorites')
      },
      {
        onError: (error) => {
          toast.error(error?.message || 'Favorites could not be loaded.')
          resolveStream('favorites')
        },
      }
    )

    const unsubscribeWatchlist = subscribeToUserWatchlist(
      resolvedUserId,
      (nextWatchlist) => {
        setWatchlist(nextWatchlist)
        resolveStream('watchlist')
      },
      {
        onError: (error) => {
          toast.error(error?.message || 'Watchlist could not be loaded.')
          resolveStream('watchlist')
        },
      }
    )

    const unsubscribeLists = subscribeToUserLists(
      resolvedUserId,
      (nextLists) => {
        setLists(nextLists)
        resolveStream('lists')
      },
      {
        onError: (error) => {
          toast.error(error?.message || 'Lists could not be loaded.')
          resolveStream('lists')
        },
      }
    )

    return () => {
      unsubscribeFavorites()
      unsubscribeWatchlist()
      unsubscribeLists()
    }
  }, [resolvedUserId, toast])

  useEffect(() => {
    if (!resolvedUserId) return undefined

    const unsubFollowers = subscribeToFollowers(resolvedUserId, (followers) => {
      setFollowerCount(followers.length)
    })

    const unsubFollowing = subscribeToFollowing(resolvedUserId, (following) => {
      setFollowingCount(following.length)
    })

    let unsubStatus = () => {}
    if (!isOwner && auth.user?.id) {
      unsubStatus = subscribeToFollowStatus(
        auth.user.id,
        resolvedUserId,
        setIsFollowing
      )
    }

    return () => {
      unsubFollowers()
      unsubFollowing()
      unsubStatus()
    }
  }, [resolvedUserId, auth.user?.id, isOwner])

  useEffect(() => {
    if (activeTab !== 'lists' || !resolvedUserId || !activeListId) {
      setListItems([])
      setIsLoadingListItems(false)
      return undefined
    }

    setIsLoadingListItems(true)

    return subscribeToUserListItems(
      resolvedUserId,
      activeListId,
      (nextItems) => {
        setListItems(nextItems)
        setIsLoadingListItems(false)
      },
      {
        onError: (error) => {
          toast.error(error?.message || 'List items could not be loaded.')
          setIsLoadingListItems(false)
        },
      }
    )
  }, [activeListId, activeTab, resolvedUserId, toast])

  const publicLink = profile?.username ? `/profile/${profile.username}` : null
  const ownerLink = username ? '/profile' : null

  if (isPageLoading) return null

  if (!username && auth.isReady && !auth.isAuthenticated) {
    return (
      <div className="center h-screen w-screen p-4">
        <EmptyState
          icon="solar:user-circle-bold"
          title="Sign in to open your profile"
          description="Your favorites, watchlist, and custom lists are tied to your account."
        />
      </div>
    )
  }

  if (!resolvedUserId || !profile) {
    return (
      <div className="center h-screen w-screen p-4">
        <EmptyState
          icon="solar:user-block-bold"
          title="Profile not found"
          description="The requested profile does not exist or is no longer available."
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-6xl flex-col gap-8 p-3 select-none sm:p-4 md:p-6',
        isFullScreenEmpty ? 'h-dvh overflow-hidden' : 'min-h-dvh'
      )}
      style={{
        '--profile-hero-h': `${heroHeight}px`,
        '--profile-nav-h': `${Math.round(navHeight || 0)}px`,
      }}
    >
      <div ref={heroRef}>
        <ProfileHero
          isOwner={isOwner}
          ownerLink={ownerLink}
          profile={profile}
          publicLink={!username ? publicLink : null}
          onEditToggle={handleEditProfile}
          onCreateList={handleCreateList}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          favoritesCount={favorites.length}
          watchlistCount={watchlist.length}
          listsCount={lists.length}
          followerCount={followerCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          onFollow={handleFollow}
          isFollowLoading={isFollowLoading}
          isAuthenticated={auth.isAuthenticated}
          onSignIn={handleGoogleSignIn}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (activeListId || '')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {activeTab === 'favorites' ? (
            favorites.length === 0 ? (
              <FullScreenEmptyState
                icon="solar:heart-linear"
                title={isOwner ? 'No favorites yet' : 'No public favorites yet'}
                description={
                  isOwner
                    ? 'Open any title page and add favorites from the sidebar.'
                    : `${profile.displayName} has not shared favorites yet.`
                }
              />
            ) : (
              <section>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/30 uppercase">
                      Sort Items
                    </h3>
                  </div>
                  <SortSelect
                    value={tabSorts.favorites}
                    onChange={(v) =>
                      setTabSorts((prev) => ({ ...prev, favorites: v }))
                    }
                  />
                </div>
                <MediaGrid
                  items={sortedFavorites}
                  canReorder={isOwner && tabSorts.favorites === 'manual'}
                  onReorder={(next) => handleReorder(next, 'favorites')}
                />
              </section>
            )
          ) : null}

          {activeTab === 'watchlist' ? (
            watchlist.length === 0 ? (
              <FullScreenEmptyState
                icon="solar:bookmark-linear"
                title={
                  isOwner ? 'Watchlist is empty' : 'No public watchlist yet'
                }
                description={
                  isOwner
                    ? 'Use the watchlist action on detail pages to queue titles.'
                    : `${profile.displayName} has not shared watchlist items yet.`
                }
              />
            ) : (
              <section>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/30 uppercase">
                      Sort Items
                    </h3>
                  </div>
                  <SortSelect
                    value={tabSorts.watchlist}
                    onChange={(v) =>
                      setTabSorts((prev) => ({ ...prev, watchlist: v }))
                    }
                  />
                </div>
                <MediaGrid
                  items={sortedWatchlist}
                  canReorder={isOwner && tabSorts.watchlist === 'manual'}
                  onReorder={(next) => handleReorder(next, 'watchlist')}
                />
              </section>
            )
          ) : null}

          {activeTab === 'lists' ? (
            selectedList ? (
              <section>
                <div className="relative h-[280px] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:h-[320px] md:h-[360px]">
                  {selectedList.coverUrl ? (
                    <>
                      <img
                        src={selectedList.coverUrl}
                        alt={selectedList.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/50 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-white/10 to-white/5" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-6 sm:p-8">
                    <h1 className="text-2xl font-bold text-white drop-shadow-md sm:text-3xl md:text-4xl">
                      {selectedList.title}
                    </h1>
                    {isOwner && (
                      <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditList(selectedList)}
                          className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-[10px] font-bold tracking-[0.12em] text-white transition hover:bg-white/20 active:scale-95"
                        >
                          <Icon icon="solar:pen-bold" size={14} />
                          EDIT
                        </button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteList(selectedList)}
                          className="size-9 rounded-full"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" size={14} />
                        </Button>
                      </div>
                    )}
                    {selectedList.description ? (
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                        {selectedList.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] font-semibold tracking-[0.12em] text-white/50 uppercase">
                      {selectedList.itemsCount} item
                      {selectedList.itemsCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {listItems.length === 0 ? (
                  <FullScreenEmptyState
                    icon="solar:list-heart-linear"
                    title="This list is empty"
                    description="Add titles from movie or TV detail pages to populate it."
                  />
                ) : (
                  <>
                    <div className="mt-8 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/30 uppercase">
                          Sort Items
                        </h3>
                      </div>
                      <SortSelect
                        value={tabSorts.lists}
                        onChange={(v) =>
                          setTabSorts((prev) => ({ ...prev, lists: v }))
                        }
                      />
                    </div>
                    <MediaGrid
                      items={sortedListItems}
                      canReorder={isOwner && tabSorts.lists === 'manual'}
                      onReorder={(next) => handleReorder(next, 'lists')}
                      renderOverlay={
                        isOwner
                          ? (item) => (
                              <Button
                                variant="destructive"
                                onClick={() => handleRemoveListItem(item)}
                                className="absolute top-2 right-2 z-10 size-9 rounded-full bg-black/65 backdrop-blur-sm"
                              >
                                <Icon
                                  icon="solar:trash-bin-trash-bold"
                                  size={14}
                                />
                              </Button>
                            )
                          : null
                      }
                    />
                  </>
                )}
              </section>
            ) : lists.length === 0 ? (
              <FullScreenEmptyState
                icon="solar:list-heart-linear"
                title={isOwner ? 'No custom lists yet' : 'No public lists yet'}
                description={
                  isOwner
                    ? 'Create your first themed list, then add titles from detail pages.'
                    : `${profile.displayName} has not published lists yet.`
                }
              />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-5 lg:gap-6">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className="min-w-full flex-1 sm:min-w-[calc(50%-12px)]"
                    >
                      <ListCard
                        isOwner={isOwner}
                        list={list}
                        onDelete={handleDeleteList}
                        onEdit={handleEditList}
                        onOpen={(nextList) =>
                          updateQuery({
                            list: nextList.id,
                            tab: 'lists',
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : null}
        </motion.div>
      </AnimatePresence>

      {!isFullScreenEmpty ? <div style={{ height: navHeight }} /> : null}
    </div>
  )
}
