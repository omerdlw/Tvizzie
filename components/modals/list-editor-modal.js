'use client'

import { useState } from 'react'

import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { createUserList, updateUserList } from '@/services/lists.service'
import { Button, Input, Textarea } from '@/ui/elements'

export default function ListEditorModal({ close, data, header }) {
  const toast = useToast()
  const { isOwner, userId, initialData = null, onSuccess } = data || {}

  const isEditing = Boolean(initialData?.id)

  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    coverUrl: initialData?.coverUrl || '',
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isOwner || isSaving) return
    if (!form.title.trim()) {
      toast.error('Please provide a list title')
      return
    }

    setIsSaving(true)

    try {
      if (isEditing) {
        const listData = {
          description: form.description,
          title: form.title,
          coverUrl: form.coverUrl || '',
        }
        const updatedList = await updateUserList({
          ...listData,
          listId: initialData.id,
          userId: userId,
        })

        toast.success(`"${updatedList.title}" was updated`)
        if (typeof onSuccess === 'function') onSuccess(updatedList)
      } else {
        const listData = {
          userId: userId,
          title: form.title,
          description: form.description,
          coverUrl: form.coverUrl || '',
        }
        const nextList = await createUserList(listData)

        toast.success(`"${nextList.title}" was created`)
        if (typeof onSuccess === 'function') onSuccess(nextList)
      }
      close()
    } catch (error) {
      toast.error(error?.message || 'The list could not be saved')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container
      className="w-full sm:w-[460px]"
      header={{ ...header, label: 'Collection' }} close={close}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-6 p-2.5"
      >
        <div className="space-y-5 p-2">
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
              List Title
            </label>
            <Input
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="e.g. 90s Sci-Fi Essentials"
              className={{
                input:
                  'w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
              Cover Image URL
            </label>
            <Input
              value={form.coverUrl}
              onChange={(event) => handleChange('coverUrl', event.target.value)}
              placeholder="https://"
              className={{
                input:
                  'w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
              Description
            </label>
            <Textarea
              value={form.description}
              onChange={(event) =>
                handleChange('description', event.target.value)
              }
              placeholder="Describe your collection"
              maxHeight={120}
              className={{
                textarea:
                  'min-h-[150px] resize-none w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 w-full">
          <Button
            type="button"
            onClick={close}
            className="center w-full flex-auto h-11 rounded-[20px] border border-white/10 bg-white/5 px-6 text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="center w-full flex-auto h-11 rounded-[20px] bg-white px-8 text-[10px] font-bold tracking-[0.2em] text-black uppercase transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50"
          >
            {isSaving
              ? isEditing
                ? 'Updating'
                : 'Creating'
              : isEditing
                ? 'Update List'
                : 'Create List'}
          </Button>
        </div>
      </form>
    </Container>
  )
}
