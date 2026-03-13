'use client'

import { useState } from 'react'

import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { createUserList, updateUserList } from '@/services/lists.service'
import { Button, Input, Textarea } from '@/ui/elements'

import { MODAL_BUTTON, MODAL_FIELD, MODAL_LAYOUT } from './constants'

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
            <label className={MODAL_FIELD.label}>
              List Title
            </label>
            <Input
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="e.g. 90s Sci-Fi Essentials"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
          </div>

          <div className="space-y-2">
            <label className={MODAL_FIELD.label}>
              Cover Image URL
            </label>
            <Input
              value={form.coverUrl}
              onChange={(event) => handleChange('coverUrl', event.target.value)}
              placeholder="https://"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
          </div>

          <div className="space-y-2">
            <label className={MODAL_FIELD.label}>
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
                textarea: `${MODAL_FIELD.textarea} min-h-[150px]`,
              }}
            />
          </div>
        </div>

        <div className={MODAL_LAYOUT.actionRow}>
          <Button
            type="button"
            onClick={close}
            className={MODAL_BUTTON.secondary}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className={MODAL_BUTTON.primary}
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
