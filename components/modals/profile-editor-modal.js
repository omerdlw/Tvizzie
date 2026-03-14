'use client'

import { useEffect, useState } from 'react'

import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { updateUserProfile } from '@/services/profile.service'
import { Button, Input, Textarea } from '@/ui/elements'

import { MODAL_BUTTON, MODAL_FIELD, MODAL_LAYOUT } from './constants'

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function isGmailEmail(value) {
  return normalizeEmail(value).endsWith('@gmail.com')
}

export default function ProfileEditorModal({ close, data, header }) {
  const toast = useToast()
  const { profile, onSuccess, authActions } = data || {}

  const [isSaving, setIsSaving] = useState(false)
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false)
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false)
  const [form, setForm] = useState({
    avatarUrl: profile?.avatarUrl || '',
    bannerUrl: profile?.bannerUrl || '',
    description: profile?.description || '',
    displayName: profile?.displayName || '',
    username: profile?.username || '',
  })

  const providerIdsFromAuth = authActions?.user?.metadata?.providerIds
  const normalizedProviderIds = Array.isArray(providerIdsFromAuth)
    ? providerIdsFromAuth
    : []

  const [linkedProviderIdsOverride, setLinkedProviderIdsOverride] = useState(null)
  const linkedProviderIds = Array.isArray(linkedProviderIdsOverride)
    ? linkedProviderIdsOverride
    : normalizedProviderIds
  const supportsGoogleLinking =
    authActions?.config?.adapter?.name === 'firebase' &&
    typeof authActions?.linkProvider === 'function' &&
    typeof authActions?.unlinkProvider === 'function'
  const isGoogleLinked = linkedProviderIds.includes('google.com')
  const isPasswordLinked = linkedProviderIds.includes('password')
  const currentAuthEmail = normalizeEmail(authActions?.user?.email || profile?.email)
  const isCurrentEmailGmail = isGmailEmail(currentAuthEmail)
  const showGoogleSignInMethod = isCurrentEmailGmail

  useEffect(() => {
    setLinkedProviderIdsOverride(null)
  }, [authActions?.user?.id])

  const updateLinkedProvidersFromSession = (session) => {
    const providerIds =
      session?.metadata?.providerIds ||
      session?.user?.metadata?.providerIds ||
      authActions?.user?.metadata?.providerIds ||
      []

    if (Array.isArray(providerIds)) {
      setLinkedProviderIdsOverride(providerIds)
    }
  }

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

  const handleLinkGoogle = async () => {
    if (isLinkingGoogle || isSaving || !supportsGoogleLinking) {
      return
    }

    if (!isCurrentEmailGmail) {
      toast.error('Google linking is available only for gmail.com accounts')
      return
    }

    setIsLinkingGoogle(true)
    try {
      const session = await authActions.linkProvider({ provider: 'google' })
      updateLinkedProvidersFromSession(session)
      toast.success('Google account linked successfully')
    } catch (error) {
      toast.error(error?.message || 'Google account could not be linked')
    } finally {
      setIsLinkingGoogle(false)
    }
  }

  const handleUnlinkGoogle = async () => {
    if (isUnlinkingGoogle || isSaving || !supportsGoogleLinking) {
      return
    }

    if (!isPasswordLinked) {
      toast.error(
        'Google can only be unlinked while email/password sign-in remains enabled'
      )
      return
    }

    setIsUnlinkingGoogle(true)
    try {
      const session = await authActions.unlinkProvider({ provider: 'google' })
      updateLinkedProvidersFromSession(session)
      toast.success('Google account unlinked successfully')
    } catch (error) {
      toast.error(error?.message || 'Google account could not be unlinked')
    } finally {
      setIsUnlinkingGoogle(false)
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

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <p className={MODAL_FIELD.label}>Sign-in Methods</p>
          <p className="text-xs text-white/65">
            Email/Password: {isPasswordLinked ? 'Enabled' : 'Not Linked'}
          </p>
          {showGoogleSignInMethod ? (
            <p className="text-xs text-white/65">
              Google: {isGoogleLinked ? 'Linked' : 'Not Linked'}
            </p>
          ) : null}
        </div>

        <div className={`${MODAL_LAYOUT.actionRow} pt-1`}>
          {supportsGoogleLinking && showGoogleSignInMethod ? (
            <Button
              type="button"
              onClick={isGoogleLinked ? handleUnlinkGoogle : handleLinkGoogle}
              disabled={
                isSaving ||
                isLinkingGoogle ||
                isUnlinkingGoogle ||
                (isGoogleLinked && !isPasswordLinked)
              }
              className={MODAL_BUTTON.secondary}
            >
              {isGoogleLinked
                ? isUnlinkingGoogle
                  ? 'Unlinking Google'
                  : 'Unlink Google Account'
                : isLinkingGoogle
                  ? 'Linking Google'
                  : 'Link Google Account'}
            </Button>
          ) : null}
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
