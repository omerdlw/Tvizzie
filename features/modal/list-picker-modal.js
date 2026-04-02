'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { buildListCreatorHref } from '@/features/account/list-creator-utils'
import { TMDB_IMG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthSessionReady } from '@/modules/auth'
import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import {
  getUserListMemberships,
  subscribeToUserLists,
  toggleUserListItem,
} from '@/services/media/lists.service'
import { Button } from '@/ui/elements'
import Icon from '@/ui/icon'

function getMediaTitle(media = {}) {
  return media?.title || media?.name || 'this title'
}

function getPreviewImage(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`
  }

  return null
}

function ListPreviewStack({ list }) {
  const previewItems = Array.isArray(list?.previewItems)
    ? list.previewItems.slice(0, 4)
    : []

  return (
    <div className="hidden md:flex">
      <div className="relative flex h-20 w-22 items-end justify-start overflow-visible">
        {previewItems.length > 0 ? (
          previewItems.map((item, index) => (
            <div
              key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
              className="absolute bottom-0 overflow-hidden border border-white/5 rounded-[8px]"
              style={{
                height: `${68 - index * 4}px`,
                left: `${index * 14}px`,
                width: '46px',
                zIndex: previewItems.length - index,
              }}
            >
              {getPreviewImage(item) ? (
                <img
                  src={getPreviewImage(item)}
                  alt={item.title || item.name || 'Poster'}
                  className="h-full w-full object-cover rounded-[8px]"
                />
              ) : (
                <div className="center h-full w-full text-white/50 rounded-[8px]">
                  <Icon icon="solar:videocamera-record-bold" size={14} />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="center absolute left-0 bottom-0 h-16 w-12 border border-dashed border-white/5 text-white/50">
            <Icon icon="solar:list-heart-bold" size={16} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ListPickerModal({ close, data, header }) {
  const router = useRouter()
  const toast = useToast()
  const userId = data?.userId || null
  const isAuthSessionReady = useAuthSessionReady(userId)
  const media = data?.media || null
  const [lists, setLists] = useState([])
  const [memberships, setMemberships] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingListIds, setSavingListIds] = useState([])

  const mediaTitle = useMemo(() => getMediaTitle(media), [media])
  const isAnyListSaving = savingListIds.length > 0

  useEffect(() => {
    if (!userId) {
      setLists([])
      setIsLoading(false)
      return undefined
    }

    if (!isAuthSessionReady) {
      setLists([])
      setIsLoading(true)
      return undefined
    }

    setIsLoading(true)

    const unsubscribe = subscribeToUserLists(
      userId,
      (nextLists) => {
        setLists(nextLists)
        setIsLoading(false)
      },
      {
        onError: (error) => {
          toast.error(error?.message || 'Lists are temporarily unavailable')
          setIsLoading(false)
        },
      }
    )

    return () => unsubscribe()
  }, [isAuthSessionReady, toast, userId])

  useEffect(() => {
    let ignore = false

    async function loadMemberships() {
      if (!userId || !isAuthSessionReady || !media || lists.length === 0) {
        setMemberships({})
        return
      }

      try {
        const nextMemberships = await getUserListMemberships({
          listIds: lists.map((list) => list.id),
          media,
          userId,
        })

        if (!ignore) {
          setMemberships(nextMemberships)
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error?.message || 'List memberships could not be loaded')
        }
      }
    }

    loadMemberships()

    return () => {
      ignore = true
    }
  }, [isAuthSessionReady, lists, media, toast, userId])

  const handleOpenCreator = useCallback(() => {
    close()
    router.push(buildListCreatorHref(media))
  }, [close, media, router])

  async function handleToggleList(listId) {
    if (savingListIds.includes(listId) || !userId || !media) {
      return
    }

    setSavingListIds((prev) => [...prev, listId])

    try {
      const result = await toggleUserListItem({ listId, media, userId })

      setMemberships((prev) => ({
        ...prev,
        [listId]: result.isInList,
      }))

      toast.success(
        result.isInList
          ? `${mediaTitle} was added to the list`
          : `${mediaTitle} was removed from the list`
      )
    } catch (error) {
      toast.error(error?.message || 'The list could not be updated')
    } finally {
      setSavingListIds((prev) => prev.filter((id) => id !== listId))
    }
  }

  return (
    <Container
      className="w-full sm:w-[660px] max-h-[72dvh]"
      header={header}
      close={close}
    >
      <section className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 pt-2 px-2">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-white/70 ml-2 uppercase">
            <Icon icon="solar:list-bold" size={14} />
            Your Lists
          </div>
          <Button
            variant="info"
            type="button"
            onClick={handleOpenCreator}
            disabled={isAnyListSaving}
            className="h-8 w-auto shrink-0 px-3 rounded-[8px] text-xs"
          >
            Create New List
          </Button>
        </div>

        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="min-h-0 max-h-[56dvh] w-full flex-1 overflow-y-auto overscroll-contain space-y-2 p-2"
        >
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-[8px] border border-dashed border-white/5 bg-white/5"
                />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="flex min-h-40 rounded-[8px] flex-col items-center justify-center border border-dashed border-white/5 bg-white/5 text-center">
              <p className="text-xs font-semibold tracking-wider text-white/70 uppercase">
                No Lists Yet
              </p>
              <p className="text-sm text-white/70">
                Create your first list with the button above
              </p>
            </div>
          ) : (
            lists.map((list) => {
              const isActive = !!memberships[list.id]
              const isListSaving = savingListIds.includes(list.id)

              return (
                <button
                  type="button"
                  key={list.id}
                  onClick={() => handleToggleList(list.id)}
                  disabled={isListSaving}
                  className={cn(
                    'relative w-full cursor-pointer border p-2 text-left transition disabled:cursor-not-allowed rounded-[8px]',
                    isActive
                      ? 'success-classes'
                      : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/5',
                    'grid grid-cols-1 items-start gap-3 md:grid-cols-[88px_minmax(0,1fr)] md:gap-5'
                  )}
                >
                  <ListPreviewStack list={list} />
                  <div className="w-full pr-24 pt-9 md:pt-3">
                    <div className="flex flex-col gap-1">
                      <p className="truncate text-[1.05rem] leading-tight font-bold text-white">
                        {list.title}
                      </p>
                      {list.description ? (
                        <p className="line-clamp-2 max-w-xl text-sm text-white/70">
                          {list.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-3 py-1 text-[11px] rounded-[4px] font-bold center tracking-wider uppercase',
                      'absolute top-1.5 right-1.5',
                      isActive
                        ? 'success-classes'
                        : 'border border-white/5 bg-white/5 text-white/70',
                    )}
                  >
                    {isListSaving ? (
                      'Saving'
                    ) : isActive ? (
                      'Selected'
                    ) : (
                      'Add'
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </section>
    </Container>
  )
}
