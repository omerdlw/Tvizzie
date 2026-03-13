'use client'

import { useState } from 'react'

import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { updateUserProfile } from '@/services/profile.service'
import { Button, Input, Textarea } from '@/ui/elements'

import { MODAL_BUTTON, MODAL_FIELD, MODAL_LAYOUT } from './constants'

export default function ProfileEditorModal({ close, data, header }) {
  const toast = useToast()
  const { profile, onSuccess, authActions } = data || {}

  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    avatarUrl: profile?.avatarUrl || '',
    bannerUrl: profile?.bannerUrl || '',
    description: profile?.description || '',
    displayName: profile?.displayName || '',
    username: profile?.username || '',
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return

    setIsSaving(true)
    try {
      const nextProfile = await updateUserProfile({
        updates: form,
        userId: profile.id,
      })

      if (authActions?.updateProfile) {
        try {
          await authActions.updateProfile({
            displayName: nextProfile.displayName,
            photoURL: nextProfile.avatarUrl || null,
          })
        } catch (syncError) {
          console.error('Auth sync error:', syncError)
        }
      }

      toast.success('Profile updated')
      if (typeof onSuccess === 'function') onSuccess(nextProfile)
      close()
    } catch (error) {
      toast.error(error?.message || 'Profile could not be updated')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="w-full sm:w-xl" header={{ ...header }} close={close}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-4 p-2.5"
      >
        <div className="grid gap-5 p-2 md:grid-cols-2">
          <div className="space-y-2">
            <label className={MODAL_FIELD.label}>
              Display Name
            </label>
            <Input
              value={form.displayName}
              onChange={(event) =>
                handleChange('displayName', event.target.value)
              }
              placeholder="Your name"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
          </div>
          <div className="space-y-2">
            <label className={MODAL_FIELD.label}>
              Username
            </label>
            <Input
              value={form.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="username"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
          </div>
          <div className="space-y-2">
            <label className={MODAL_FIELD.label}>
              Avatar URL
            </label>
            <Input
              value={form.avatarUrl}
              onChange={(event) =>
                handleChange('avatarUrl', event.target.value)
              }
              placeholder="https://"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
          </div>
          <div className="space-y-2">
            <label className={MODAL_FIELD.label}>
              Banner URL
            </label>
            <Input
              value={form.bannerUrl}
              onChange={(event) =>
                handleChange('bannerUrl', event.target.value)
              }
              placeholder="https://"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
          </div>
        </div>

        <div className="space-y-2 p-2">
          <Textarea
            value={form.description}
            onChange={(event) =>
              handleChange('description', event.target.value)
            }
            placeholder="Write something about yourself"
            maxHeight={120}
            className={{
              textarea: `${MODAL_FIELD.textarea} min-h-[150px]`,
            }}
          />
        </div>

        <div className={`${MODAL_LAYOUT.actionRow} pt-1`}>
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
            {isSaving ? 'Saving' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Container>
  )
}
