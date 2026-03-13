'use client'

import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import {
  createUserList,
  getUserListMemberships,
  subscribeToUserLists,
  toggleUserListItem,
} from '@/services/lists.service'
import { Button, Input, Textarea } from '@/ui/elements'
import Icon from '@/ui/icon'

function getMediaTitle(media = {}) {
  return media?.title || media?.name || 'this title'
}

export default function ListPickerModal({ close, data, header }) {
  const toast = useToast()
  const userId = data?.userId || null
  const media = data?.media || null
  const [lists, setLists] = useState([])
  const [memberships, setMemberships] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingListIds, setSavingListIds] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const mediaTitle = useMemo(() => getMediaTitle(media), [media])
  const normalizedTitle = title.trim()
  const isAnyListSaving = savingListIds.length > 0
  const isCreateDisabled =
    isCreating || isAnyListSaving || !userId || !media || normalizedTitle.length === 0

  useEffect(() => {
    if (!userId) {
      setLists([])
      setIsLoading(false)
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
  }, [toast, userId])

  useEffect(() => {
    let ignore = false

    async function loadMemberships() {
      if (!userId || !media || lists.length === 0) {
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
  }, [lists, media, toast, userId])

  async function handleToggleList(listId) {
    if (savingListIds.includes(listId) || isCreating || !userId || !media) return
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

  async function handleCreateList(event) {
    event.preventDefault()

    if (isCreating || isAnyListSaving || !userId || !media) return
    if (!normalizedTitle) {
      toast.error('List title is required')
      return
    }

    setIsCreating(true)

    try {
      const nextList = await createUserList({
        description: description.trim(),
        title: normalizedTitle,
        userId,
      })
      await toggleUserListItem({
        listId: nextList.id,
        media,
        userId,
      })

      setMemberships((prev) => ({
        ...prev,
        [nextList.id]: true,
      }))
      setDescription('')
      setTitle('')
      toast.success(`Created "${nextList.title}" and added ${mediaTitle}`)
    } catch (error) {
      toast.error(error?.message || 'The list could not be created')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Container
      header={{
        ...header,
        title: `Add ${mediaTitle}`,
      }}
      className="w-full sm:w-[800px]"
      close={close}
    >
      <div className="scrollbar-hide grid max-h-[76vh] min-h-0 w-full grid-cols-1 overflow-y-auto sm:grid-cols-[1.2fr_0.8fr]">
        <section className="flex min-h-0 flex-col border-b border-white/10 sm:border-r sm:border-b-0">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-white/55 uppercase">
              <Icon icon="solar:list-bold" size={14} />
              Your Lists
            </div>
            <span className="text-[11px] text-white/50 tracking-[0.2em] uppercase">
              {lists.length} total
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 px-5 py-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-[18px] border border-white/10 bg-white/5"
                  />
                ))}
              </div>
            ) : lists.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-[20px] border border-dashed border-white/12 bg-white/5 text-center">
                <p className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">
                  No Lists Yet
                </p>
                <p className="mt-2 text-sm text-white/40">
                  Create your first list on the right panel
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
                    disabled={isListSaving || isCreating}
                    className={cn(
                      'w-full cursor-pointer rounded-[18px] border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
                      isActive
                        ? 'border-emerald-400/35 bg-emerald-400/8'
                        : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-bold text-white">
                            {list.title}
                          </p>
                          {isActive ? (
                            <Icon
                              className="shrink-0 text-emerald-300"
                              icon="solar:check-circle-bold"
                              size={16}
                            />
                          ) : null}
                        </div>
                        <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
                          {list.itemsCount} items
                        </p>
                        {list.description ? (
                          <p className="mt-2 break-all text-sm text-white/50">
                            {list.description}
                          </p>
                        ) : null}
                      </div>

                      <span
                        className={cn(
                          'shrink-0 rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.16em] uppercase',
                          isActive
                            ? 'border border-emerald-400/35 bg-emerald-400/12 text-emerald-300'
                            : 'border border-white/15 bg-white/5 text-white/70'
                        )}
                      >
                        {isListSaving ? 'Saving' : isActive ? 'Selected' : 'Add'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="min-h-0">
          <form onSubmit={handleCreateList} className="flex h-full min-h-0 flex-col">
            <div className="flex items-center border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-white/55 uppercase">
                <Icon icon="solar:add-square-bold" size={14} />
                Create List
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 px-5 py-4">
              <p className="text-sm text-white/45">Lists are public on your profile</p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Weekend Marathon"
                className={{
                  input:
                    'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors outline-none placeholder:text-white/30 focus:border-white/25 focus:bg-white/8',
                }}
              />

              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description (optional)"
                maxHeight={140}
                className={{
                  textarea:
                    'min-h-[130px] w-full resize-none rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-white/30 focus:border-white/25 focus:bg-white/8',
                }}
              />
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <Button
                type="submit"
                disabled={isCreateDisabled}
                className="h-12 w-full cursor-pointer rounded-[18px] bg-white px-8 text-[11px] font-bold tracking-[0.2em] text-black uppercase transition hover:bg-white/90 disabled:opacity-50"
              >
                {isCreating ? 'Creating' : 'Create List'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </Container>
  )
}
