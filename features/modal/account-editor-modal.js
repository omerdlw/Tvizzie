'use client'

import { useState } from 'react'

import { useAccountClient } from '@/modules/account'
import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { Button, Input, Textarea } from '@/ui/elements'

export default function AccountEditorModal({ close, data, header }) {
  const accountClient = useAccountClient()
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
      const nextProfile = await accountClient.updateAccount({
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

      toast.success('Account updated')
      if (typeof onSuccess === 'function') onSuccess(nextProfile)
      close()
    } catch (error) {
      toast.error(error?.message || 'Account could not be updated')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="w-full sm:w-xl" header={{ ...header }} close={close}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-3 p-2"
      >
        <div className="grid gap-5 p-2 md:grid-cols-2">
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-widest text-white uppercase">
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
                  'w-full border border-white/5  px-4 py-3 text-sm font-medium text-white transition-colors outline-none placeholder:text-white focus:border-white/10 focus:',
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-widest text-white uppercase">
              Username
            </label>
            <Input
              value={form.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="username"
              className={{
                input:
                  'w-full border border-white/5  px-4 py-3 text-sm font-medium text-white transition-colors outline-none placeholder:text-white focus:border-white/10 focus:',
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-widest text-white uppercase">
              Avatar URL
            </label>
            <Input
              value={form.avatarUrl}
              onChange={(event) =>
                handleChange('avatarUrl', event.target.value)
              }
              placeholder="https://"
              className={{
                input:
                  'w-full border border-white/5  px-4 py-3 text-sm font-medium text-white transition-colors outline-none placeholder:text-white focus:border-white/10 focus:',
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold tracking-widest text-white uppercase">
              Banner URL
            </label>
            <Input
              value={form.bannerUrl}
              onChange={(event) =>
                handleChange('bannerUrl', event.target.value)
              }
              placeholder="https://"
              className={{
                input:
                  'w-full border border-white/5  px-4 py-3 text-sm font-medium text-white transition-colors outline-none placeholder:text-white focus:border-white/10 focus:',
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
              textarea:
                'min-h-[150px] w-full resize-none border border-white/5  px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-white focus:border-white/10 focus:',
            }}
          />
        </div>

        <div className="flex w-full flex-col gap-2 pt-1 md:flex-row md:justify-end">
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
            {isSaving ? 'Saving' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Container>
  )
}
