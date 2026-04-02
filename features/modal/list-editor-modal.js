'use client'

import { useState } from 'react'

import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { createUserList, updateUserList } from '@/services/media/lists.service'
import { Button, Input, Textarea } from '@/ui/elements'

export default function ListEditorModal({ close, data, header }) {
  const toast = useToast()
  const { isOwner, userId, initialData = null, onSuccess } = data || {}

  const isEditing = Boolean(initialData?.id)

  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
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
    <Container className="w-full sm:w-[460px]" header={header} close={close}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-6 p-2"
      >
        <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
              List Title
            </label>
            <Input
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="e.g. 90s Sci-Fi Essentials"
              className={{
                input:
                  'w-full p-3 surface-muted! text-sm transition-colors outline-none placeholder:text-white/50 font-medium',
              }}
            />
            <label className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
              Description
            </label>
            <Textarea
              value={form.description}
              onChange={(event) =>
                handleChange('description', event.target.value)
              }
              placeholder="Describe your collection"
            maxHeight={200}
              className={{
                textarea:
                'w-full p-3 surface-muted! text-sm transition-colors outline-none placeholder:text-white/50 font-medium',
              }}
            />
          </div>

        <div className="flex w-full flex-col gap-2 md:flex-row md:justify-end">
          <Button
            type="button"
            onClick={close}
            className="h-11 w-full flex-auto border border-white/5  px-6 text-[11px] font-bold tracking-widest text-white uppercase transition hover: hover:text-white active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="center h-11 w-full flex-auto gap-2  px-8 text-[11px] font-bold tracking-widest text-white uppercase transition hover: active:scale-95"
          >
            {isSaving ? (
              isEditing ? 'Updating' : 'Creating'
            ) : isEditing ? (
              'Update List'
            ) : (
              'Create List'
            )}
          </Button>
        </div>
      </form>
    </Container>
  )
}
