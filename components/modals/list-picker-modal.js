'use client'

import { useEffect, useMemo, useState } from 'react'

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
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const mediaTitle = useMemo(() => getMediaTitle(media), [media])

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
          toast.error(error?.message || 'Lists are temporarily unavailable.')
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
          toast.error(error?.message || 'List memberships could not be loaded.')
        }
      }
    }

    loadMemberships()

    return () => {
      ignore = true
    }
  }, [lists, media, toast, userId])

  async function handleToggleList(listId) {
    if (isSaving || !userId || !media) return

    setIsSaving(true)

    try {
      const result = await toggleUserListItem({ listId, media, userId })

      setMemberships((prev) => ({
        ...prev,
        [listId]: result.isInList,
      }))

      toast.success(
        result.isInList
          ? `${mediaTitle} was added to the list.`
          : `${mediaTitle} was removed from the list.`
      )
    } catch (error) {
      toast.error(error?.message || 'The list could not be updated.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateList(event) {
    event.preventDefault()

    if (isCreating || !userId || !media) return

    setIsCreating(true)

    try {
      const nextList = await createUserList({ description, title, userId })
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
      toast.success(`Created "${nextList.title}" and added ${mediaTitle}.`)
    } catch (error) {
      toast.error(error?.message || 'The list could not be created.')
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
      close={close}
    >
      <div className="scrollbar-hide flex max-h-[70vh] w-full min-w-xl flex-col gap-6 overflow-y-auto p-2.5">
        <div className="space-y-4 p-2">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
            <Icon icon="solar:list-bold" size={14} />
            Your Lists
          </div>

          {isLoading ? (
            <div className="flex min-h-24 items-center justify-center text-sm text-white/45">
              Loading your lists...
            </div>
          ) : lists.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/3 p-4 text-center text-xs text-white/30 italic">
              No custom lists yet. Create your first one below.
            </div>
          ) : (
            <div className="grid gap-3">
              {lists.map((list) => {
                const isActive = !!memberships[list.id]

                return (
                  <button
                    type="button"
                    key={list.id}
                    onClick={() => handleToggleList(list.id)}
                    disabled={isSaving}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-[16px] border border-white/5 bg-white/5 px-5 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white/90">
                        {list.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-medium tracking-widest text-white/30 uppercase">
                        <span>{list.itemsCount} items</span>
                        {list.description ? (
                          <span className="truncate">• {list.description}</span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase transition-all ${
                        isActive
                          ? 'bg-error/30 border border-error'
                          : 'border border-white/5 bg-white/5 text-white/30'
                      }`}
                    >
                      {isActive ? 'Remove' : 'Add'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleCreateList} className="">
          <div className="space-y-1 p-2">
            <p className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
              Create List
            </p>
            <p className="text-[11px] text-white/40">
              Lists are public on your profile.
            </p>
          </div>

          <div className="space-y-4 p-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Weekend Marathon"
              className={{
                input:
                  'w-full rounded-[20px] border border-white/5 bg-white/5 px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-white/20 focus:border-white/20',
              }}
            />

            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
              maxHeight={120}
              className={{
                textarea:
                  'min-h-[100px] w-full resize-none rounded-[20px] border border-white/5 bg-white/5 px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-white/20 focus:border-white/20',
              }}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={isCreating}
              className="h-12 w-full cursor-pointer rounded-[20px] bg-white px-8 text-[10px] font-bold tracking-[0.2em] text-black uppercase transition hover:bg-white/90 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </form>
      </div>
    </Container>
  )
}
