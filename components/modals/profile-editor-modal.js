'use client'

import { useState } from 'react'

import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { updateUserProfile } from '@/services/profile.service'
import { Button, Input, Textarea } from '@/ui/elements'

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

      toast.success('Profile updated.')
      if (typeof onSuccess === 'function') onSuccess(nextProfile)
      close()
    } catch (error) {
      toast.error(error?.message || 'Profile could not be updated.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container header={{ ...header }} close={close}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-4 p-2.5"
      >
        <div className="grid gap-5 p-2 md:grid-cols-2">
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
              Display Name
            </label>
            <Input
              value={form.displayName}
              onChange={(event) =>
                handleChange('displayName', event.target.value)
              }
              placeholder="Your name"
              className={{
                input:
                  'w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
              Username
            </label>
            <Input
              value={form.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="username"
              className={{
                input:
                  'w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
              Avatar URL
            </label>
            <Input
              value={form.avatarUrl}
              onChange={(event) =>
                handleChange('avatarUrl', event.target.value)
              }
              placeholder="https://..."
              className={{
                input:
                  'w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
              Banner URL
            </label>
            <Input
              value={form.bannerUrl}
              onChange={(event) =>
                handleChange('bannerUrl', event.target.value)
              }
              placeholder="https://..."
              className={{
                input:
                  'w-full rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
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
            placeholder="Write something about yourself..."
            maxHeight={120}
            className={{
              textarea:
                'min-h-[150px] w-full resize-none rounded-[20px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all outline-none placeholder:text-white/20 focus:border-white/20 focus:bg-white/8',
            }}
          />
        </div>

        <div className="flex w-full justify-end gap-4 pt-1">
          <Button
            type="button"
            onClick={close}
            className="center h-11 flex-auto cursor-pointer rounded-[20px] border border-white/10 bg-white/5 px-6 text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="center h-11 flex-auto cursor-pointer rounded-[20px] bg-white px-8 text-[10px] font-bold tracking-[0.2em] text-black uppercase transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Container>
  )
}
