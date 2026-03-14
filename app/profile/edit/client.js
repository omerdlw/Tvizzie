'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import AuthModal from '@/components/modals/auth-modal'
import AuthVerificationModal from '@/components/modals/auth-verification-modal'
import FollowListModal from '@/components/modals/follow-list-modal'
import ProfileAction from '@/components/nav-actions/profile-action'
import { ProfileHero } from '@/components/profile/hero'
import { EmptyState } from '@/components/shared/empty-state'
import { logAuthAuditEvent } from '@/lib/auth/audit.client'
import { EVENT_TYPES, globalEvents } from '@/lib/events'
import { useRegistry } from '@/lib/hooks/use-registry'
import { useAuth } from '@/modules/auth'
import { useModal } from '@/modules/modal/context'
import { useNavHeight } from '@/modules/nav/hooks'
import { useToast } from '@/modules/notification/hooks'
import { subscribeToUserFavorites } from '@/services/favorites.service'
import {
  subscribeToFollowers,
  subscribeToFollowing,
} from '@/services/follows.service'
import { subscribeToUserLists } from '@/services/lists.service'
import {
  getUserProfile,
  subscribeToUserProfile,
  syncUserProfileEmail,
  updateUserProfile,
} from '@/services/profile.service'
import { subscribeToUserWatchlist } from '@/services/watchlist.service'
import { Input, Textarea } from '@/ui/elements'
import { ProfileDetailSkeleton } from '@/ui/skeletons/profile-detail-skeleton'

const EDIT_TABS = [
  { key: 'general', icon: 'solar:user-circle-bold', label: 'General Info' },
  { key: 'security', icon: 'solar:shield-keyhole-bold', label: 'Security' },
]

const AUTH_PURPOSE = {
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const LABEL_CLASS =
  'text-[11px] font-medium tracking-[0.08em] text-white/55 uppercase'
const INPUT_CLASS =
  'h-12 w-full border-b border-white/14 bg-transparent px-0 text-[15px] text-white placeholder:text-white/28 outline-none transition focus:border-white/40'
const TEXTAREA_CLASS =
  'min-h-[140px] border-b border-white/14 bg-transparent px-0 py-3 text-[15px] text-white outline-none transition placeholder:text-white/28 focus:border-white/40'
const SECURITY_CARD_CLASS =
  'space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6'

const INITIAL_EMAIL_FLOW = {
  currentPassword: '',
  isSubmitting: false,
  newEmail: '',
}

const INITIAL_PASSWORD_FLOW = {
  confirmPassword: '',
  currentPassword: '',
  isSubmitting: false,
  newPassword: '',
}

const INITIAL_DELETE_FLOW = {
  confirmText: '',
  currentPassword: '',
  isSubmitting: false,
}

function getAvatarFallback(profile) {
  const seed = profile?.username || profile?.id || 'tvizzie'
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
}

function normalizeProviderIds(value) {
  return Array.isArray(value) ? value : []
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizeOptionalText(value) {
  return String(value || '').trim()
}

function isGmailEmail(value) {
  return normalizeEmail(value).endsWith('@gmail.com')
}

function resolveSecurityErrorMessage(error, fallbackMessage) {
  const message = String(error?.message || '').trim()
  const code = String(error?.code || '').trim()

  if (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    message.includes('auth/wrong-password') ||
    message.includes('auth/invalid-credential') ||
    message.includes('INVALID_LOGIN_CREDENTIALS')
  ) {
    return 'Current password is incorrect'
  }

  if (
    message.includes('Recent authentication is required') ||
    message.includes('auth/requires-recent-login')
  ) {
    return 'Please re-enter your current password and try again'
  }

  if (message.includes('Verification code has expired')) {
    return 'Verification code has expired. Request a new code'
  }

  if (message.includes('Verification code is invalid')) {
    return 'Verification code is invalid'
  }

  if (message.includes('Verification code has already been used')) {
    return 'Verification code already used. Request a new code'
  }

  if (message.includes('Verification code attempts are exhausted')) {
    return 'Too many invalid code attempts. Request a new code'
  }

  if (message.includes('supported email domains')) {
    return 'This email domain is not allowed'
  }

  if (message.includes('already in use')) {
    return 'This email address is already in use'
  }

  if (message.includes('email/password sign-in enabled')) {
    return 'Email/password sign-in must be enabled for this action'
  }

  if (message.includes('Google account email must match')) {
    return 'Google account email must match your current account email'
  }

  if (code === 'GOOGLE_GMAIL_REQUIRED' || message.includes('gmail.com')) {
    return 'Google sign-in is available only for gmail.com accounts'
  }

  if (message && !message.includes('Firebase: Error')) {
    return message
  }

  return fallbackMessage
}

function validatePassword(value) {
  const password = String(value || '')

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least 1 uppercase letter')
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least 1 symbol')
  }

  return password
}

async function deleteAccountRequest({ accessToken, currentPassword }) {
  const response = await fetch('/api/auth/account/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      currentPassword,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Account could not be deleted' }))

  if (!response.ok) {
    throw new Error(payload?.error || 'Account could not be deleted')
  }

  return payload
}

async function completeEmailChangeRequest({ accessToken, newEmail }) {
  const response = await fetch('/api/auth/account/change-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      newEmail,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Email could not be updated' }))

  if (!response.ok) {
    throw new Error(payload?.error || 'Email could not be updated')
  }

  return payload
}

function FieldGroup({ label, hint, children, className = '' }) {
  return (
    <div className={`w-full space-y-2.5 ${className}`.trim()}>
      <label className={LABEL_CLASS}>{label}</label>
      {hint ? <p className="text-xs text-white/38">{hint}</p> : null}
      {children}
    </div>
  )
}

export default function ProfileEditClient() {
  const auth = useAuth()
  const toast = useToast()
  const router = useRouter()
  const { openModal } = useModal()

  const formRef = useRef(null)
  const [activeTab, setActiveTab] = useState('general')
  const [profile, setProfile] = useState(null)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [watchlistCount, setWatchlistCount] = useState(0)
  const [listsCount, setListsCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false)
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false)
  const [emailFlow, setEmailFlow] = useState(INITIAL_EMAIL_FLOW)
  const [passwordFlow, setPasswordFlow] = useState(INITIAL_PASSWORD_FLOW)
  const [deleteFlow, setDeleteFlow] = useState(INITIAL_DELETE_FLOW)
  const { navHeight } = useNavHeight()

  const [form, setForm] = useState({
    avatarUrl: '',
    bannerUrl: '',
    description: '',
    displayName: '',
    username: '',
  })

  const providerIdsFromAuth = auth?.user?.metadata?.providerIds
  const normalizedProviderIds = normalizeProviderIds(providerIdsFromAuth)
  const [linkedProviderIdsOverride, setLinkedProviderIdsOverride] =
    useState(null)
  const linkedProviderIds = Array.isArray(linkedProviderIdsOverride)
    ? linkedProviderIdsOverride
    : normalizedProviderIds

  const supportsGoogleLinking =
    auth?.config?.adapter?.name === 'firebase' &&
    typeof auth?.linkProvider === 'function' &&
    typeof auth?.unlinkProvider === 'function'

  const isGoogleLinked = linkedProviderIds.includes('google.com')
  const isPasswordLinked = linkedProviderIds.includes('password')
  const canUsePasswordSecurity =
    isPasswordLinked &&
    typeof auth?.reauthenticate === 'function' &&
    typeof auth?.updateProfile === 'function'

  const avatarPreview = useMemo(() => {
    const url = form.avatarUrl?.trim()
    if (url) return url
    return getAvatarFallback(profile)
  }, [form.avatarUrl, profile])

  const totalContentCount = favoritesCount + watchlistCount + listsCount
  const currentAuthEmail = normalizeEmail(auth.user?.email || profile?.email || '')
  const isCurrentEmailGmail = isGmailEmail(currentAuthEmail)
  const showGoogleSignInMethod = isCurrentEmailGmail
  const isGeneralProfileDirty = useMemo(() => {
    if (!profile) {
      return false
    }

    return (
      normalizeOptionalText(form.displayName) !==
        normalizeOptionalText(profile.displayName) ||
      normalizeOptionalText(form.username) !==
        normalizeOptionalText(profile.username) ||
      normalizeOptionalText(form.description) !==
        normalizeOptionalText(profile.description) ||
      normalizeOptionalText(form.avatarUrl) !==
        normalizeOptionalText(profile.avatarUrl) ||
      normalizeOptionalText(form.bannerUrl) !==
        normalizeOptionalText(profile.bannerUrl)
    )
  }, [form, profile])

  const updateLinkedProvidersFromSession = (session) => {
    const providerIds =
      session?.metadata?.providerIds ||
      session?.user?.metadata?.providerIds ||
      auth?.user?.metadata?.providerIds ||
      []

    if (Array.isArray(providerIds)) {
      setLinkedProviderIdsOverride(providerIds)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resolveAccessToken = useCallback(
    async (sessionCandidate = null) => {
      const directToken =
        sessionCandidate?.accessToken || auth.session?.accessToken || ''

      if (directToken) {
        return directToken
      }

      if (typeof auth.refreshSession === 'function') {
        const refreshedSession = await auth.refreshSession()
        return refreshedSession?.accessToken || ''
      }

      return ''
    },
    [auth]
  )

  const reauthenticateWithPassword = useCallback(
    async (password) => {
      if (typeof auth?.reauthenticate !== 'function') {
        throw new Error('Reauthentication is not supported by this auth adapter')
      }

      return auth.reauthenticate({
        password: String(password || ''),
      })
    },
    [auth]
  )

  async function handleSignIn() {
    await openModal('AUTH_MODAL', 'bottom', {
      data: {
        mode: 'sign-in',
      },
    })
  }

  const handleOpenFollowList = useCallback(
    (type) => {
      if (!auth.user?.id || !profile) return

      const isFollowersType = type === 'followers'
      openModal('FOLLOW_LIST_MODAL', 'bottom', {
        header: {
          title: isFollowersType ? 'Followers' : 'Following',
        },
        data: {
          userId: auth.user.id,
          type: isFollowersType ? 'followers' : 'following',
        },
      })
    },
    [auth.user?.id, openModal, profile]
  )

  useRegistry({
    background: {
      image: profile?.bannerUrl || undefined,
      noiseStyle: {
        opacity: 0.4,
      },
      overlay: true,
      overlayOpacity: 0.8,
    },
    modal: {
      AUTH_MODAL: AuthModal,
      AUTH_VERIFICATION_MODAL: AuthVerificationModal,
      FOLLOW_LIST_MODAL: FollowListModal,
    },
    nav: {
      title: auth?.isAuthenticated ? 'Edit Profile' : 'Profile',
      icon: avatarPreview,
      description: auth?.isAuthenticated
        ? activeTab === 'general'
          ? 'Update your public profile details'
          : 'Manage account security and providers'
        : 'Sign in to see your profile',
      action: !auth?.isAuthenticated ? (
        <ProfileAction isAuthenticated={false} onSignIn={handleSignIn} />
      ) : activeTab === 'general' && isGeneralProfileDirty ? (
        <ProfileAction
          mode="save"
          onSave={() => formRef.current?.requestSubmit?.()}
          isSaveLoading={isSaving}
        />
      ) : null,
    },
  })

  useEffect(() => {
    if (!auth.isReady) return undefined

    if (!auth.isAuthenticated || !auth.user?.id) {
      setProfile(null)
      setFavoritesCount(0)
      setWatchlistCount(0)
      setListsCount(0)
      setFollowerCount(0)
      setFollowingCount(0)
      setIsLoading(false)
      return undefined
    }

    let unsubscribe = null
    let ignore = false

    async function load() {
      setIsLoading(true)
      try {
        const initial = await getUserProfile(auth.user.id)
        if (ignore) return

        setProfile(initial)
        setForm((prev) => ({
          ...prev,
          avatarUrl: initial?.avatarUrl || '',
          bannerUrl: initial?.bannerUrl || '',
          description: initial?.description || '',
          displayName: initial?.displayName || '',
          username: initial?.username || '',
        }))

        unsubscribe = subscribeToUserProfile(auth.user.id, (nextProfile) => {
          setProfile(nextProfile)
        })
      } catch (error) {
        if (!ignore) {
          toast.error(error?.message || 'Profile could not be loaded')
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    load()

    return () => {
      ignore = true
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [auth.isAuthenticated, auth.isReady, auth.user?.id, toast])

  useEffect(() => {
    if (!auth.user?.id) return undefined

    const unsubscribeFavorites = subscribeToUserFavorites(
      auth.user.id,
      (nextFavorites) => {
        setFavoritesCount(nextFavorites.length)
      }
    )

    const unsubscribeWatchlist = subscribeToUserWatchlist(
      auth.user.id,
      (nextWatchlist) => {
        setWatchlistCount(nextWatchlist.length)
      }
    )

    const unsubscribeLists = subscribeToUserLists(auth.user.id, (nextLists) => {
      setListsCount(nextLists.length)
    })

    const unsubscribeFollowers = subscribeToFollowers(
      auth.user.id,
      (followers) => {
        setFollowerCount(followers.length)
      }
    )

    const unsubscribeFollowing = subscribeToFollowing(
      auth.user.id,
      (following) => {
        setFollowingCount(following.length)
      }
    )

    return () => {
      unsubscribeFavorites()
      unsubscribeWatchlist()
      unsubscribeLists()
      unsubscribeFollowers()
      unsubscribeFollowing()
    }
  }, [auth.user?.id])

  useEffect(() => {
    setLinkedProviderIdsOverride(null)
  }, [auth.user?.id])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    if (!auth.user?.id || !profile) return
    if (isSaving) return

    setIsSaving(true)
    try {
      const nextProfile = await updateUserProfile({
        updates: {
          avatarUrl: form.avatarUrl,
          bannerUrl: form.bannerUrl,
          description: form.description,
          displayName: form.displayName,
          username: form.username,
        },
        userId: auth.user.id,
      })

      if (auth?.updateProfile) {
        try {
          await auth.updateProfile({
            displayName: nextProfile.displayName,
            photoURL: nextProfile.avatarUrl || null,
          })
        } catch (syncError) {
          console.error('Auth sync error:', syncError)
        }
      }

      toast.success('Profile updated')
      router.push('/profile')
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
      const session = await auth.linkProvider({ provider: 'google' })
      updateLinkedProvidersFromSession(session)
      toast.success('Google account linked successfully')
    } catch (error) {
      try {
        if (typeof auth.refreshSession === 'function') {
          const refreshedSession = await auth.refreshSession()
          updateLinkedProvidersFromSession(refreshedSession)
        } else {
          setLinkedProviderIdsOverride(null)
        }
      } catch {
        setLinkedProviderIdsOverride(null)
      }
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
      const session = await auth.unlinkProvider({ provider: 'google' })
      updateLinkedProvidersFromSession(session)
      toast.success('Google account unlinked successfully')
    } catch (error) {
      try {
        if (typeof auth.refreshSession === 'function') {
          const refreshedSession = await auth.refreshSession()
          updateLinkedProvidersFromSession(refreshedSession)
        } else {
          setLinkedProviderIdsOverride(null)
        }
      } catch {
        setLinkedProviderIdsOverride(null)
      }
      toast.error(error?.message || 'Google account could not be unlinked')
    } finally {
      setIsUnlinkingGoogle(false)
    }
  }

  const openVerificationModal = useCallback(
    async ({
      purpose,
      email,
      accessToken = '',
      title = 'Email verification',
      description = 'Code verification',
      label = 'Security',
    }) => {
      return openModal('AUTH_VERIFICATION_MODAL', 'bottom', {
        header: {
          title,
          description,
          label,
        },
        data: {
          purpose,
          email,
          accessToken,
        },
      })
    },
    [openModal]
  )

  const handleCompleteEmailChange = async () => {
    if (emailFlow.isSubmitting) return
    if (!canUsePasswordSecurity || !auth.user?.id) {
      toast.error('Email/password sign-in must be enabled for this action')
      return
    }

    const nextEmail = normalizeEmail(emailFlow.newEmail)
    const currentPassword = String(emailFlow.currentPassword || '')

    if (!nextEmail || !EMAIL_PATTERN.test(nextEmail)) {
      toast.error('Please provide a valid email address')
      return
    }

    if (nextEmail === currentAuthEmail) {
      toast.error('New email must be different from current email')
      return
    }

    if (!currentPassword) {
      toast.error('Current password is required')
      return
    }

    setEmailFlow((prev) => ({ ...prev, isSubmitting: true }))
    try {
      const reauthSession = await reauthenticateWithPassword(currentPassword)
      const accessToken = await resolveAccessToken(reauthSession)

      if (!accessToken) {
        throw new Error('Authentication token could not be resolved')
      }

      const verification = await openVerificationModal({
        accessToken,
        description: 'Verify your new email',
        email: nextEmail,
        label: 'Change email',
        purpose: AUTH_PURPOSE.EMAIL_CHANGE,
        title: 'Email verification',
      })

      if (!verification?.success) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }))
        return
      }

      await completeEmailChangeRequest({
        accessToken,
        newEmail: nextEmail,
      })

      if (typeof auth.refreshSession === 'function') {
        await auth.refreshSession()
      }

      await syncUserProfileEmail({
        userId: auth.user.id,
        email: nextEmail,
      })

      logAuthAuditEvent({
        eventType: 'email-change',
        status: 'success',
        userId: auth.user.id,
        email: nextEmail,
        provider: 'password',
        metadata: {
          source: 'app/profile/edit',
        },
      })

      setEmailFlow(INITIAL_EMAIL_FLOW)
      toast.success('Email updated successfully')
    } catch (error) {
      setEmailFlow((prev) => ({ ...prev, isSubmitting: false }))
      logAuthAuditEvent({
        eventType: 'failed-attempt',
        status: 'failure',
        userId: auth.user?.id || null,
        email: currentAuthEmail || null,
        provider: 'password',
        metadata: {
          action: 'email-change',
          message: error?.message || 'Email update failed',
          source: 'app/profile/edit',
        },
      })
      toast.error(
        resolveSecurityErrorMessage(error, 'Email could not be updated')
      )
    }
  }

  const handleCompletePasswordChange = async () => {
    if (passwordFlow.isSubmitting) return
    if (!canUsePasswordSecurity) {
      toast.error('Email/password sign-in must be enabled for this action')
      return
    }

    const currentPassword = String(passwordFlow.currentPassword || '')
    let newPassword = ''
    const confirmPassword = String(passwordFlow.confirmPassword || '')

    if (!currentPassword) {
      toast.error('Current password is required')
      return
    }

    try {
      newPassword = validatePassword(passwordFlow.newPassword)
    } catch (error) {
      toast.error(
        resolveSecurityErrorMessage(error, 'Password does not meet requirements')
      )
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }))
    try {
      const reauthSession = await reauthenticateWithPassword(currentPassword)
      const accessToken = await resolveAccessToken(reauthSession)

      if (!accessToken) {
        throw new Error('Authentication token could not be resolved')
      }

      const verification = await openVerificationModal({
        accessToken,
        description: 'Verify your current email',
        email: currentAuthEmail,
        label: 'Change password',
        purpose: AUTH_PURPOSE.PASSWORD_CHANGE,
        title: 'Password verification',
      })

      if (!verification?.success) {
        setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }))
        return
      }

      await auth.updateProfile({
        newPassword,
      })

      logAuthAuditEvent({
        eventType: 'password-change',
        status: 'success',
        userId: auth.user?.id || null,
        email: currentAuthEmail || null,
        provider: 'password',
        metadata: {
          source: 'app/profile/edit',
        },
      })

      setPasswordFlow(INITIAL_PASSWORD_FLOW)
      toast.success('Password updated successfully')
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }))
      logAuthAuditEvent({
        eventType: 'failed-attempt',
        status: 'failure',
        userId: auth.user?.id || null,
        email: currentAuthEmail || null,
        provider: 'password',
        metadata: {
          action: 'password-change',
          message: error?.message || 'Password update failed',
          source: 'app/profile/edit',
        },
      })
      toast.error(
        resolveSecurityErrorMessage(error, 'Password could not be updated')
      )
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteFlow.isSubmitting) return
    if (!canUsePasswordSecurity) {
      toast.error('Email/password sign-in must be enabled for this action')
      return
    }

    const currentPassword = String(deleteFlow.currentPassword || '')
    const confirmText = String(deleteFlow.confirmText || '').trim()

    if (!currentPassword) {
      toast.error('Current password is required')
      return
    }

    if (confirmText !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion')
      return
    }

    setDeleteFlow((prev) => ({ ...prev, isSubmitting: true }))
    globalEvents.emit(EVENT_TYPES.AUTH_ACCOUNT_DELETE_START, {
      user: auth.user || null,
    })

    try {
      const reauthSession = await reauthenticateWithPassword(currentPassword)
      const accessToken = await resolveAccessToken(reauthSession)

      if (!accessToken) {
        throw new Error('Authentication token could not be resolved')
      }

      await deleteAccountRequest({
        accessToken,
        currentPassword,
      })

      await auth.signOut({
        reason: 'delete-account',
        skipAdapter: true,
      })

      toast.success('Account deleted')
      router.replace('/')
    } catch (error) {
      globalEvents.emit(EVENT_TYPES.AUTH_ACCOUNT_DELETE_END, {
        status: 'failure',
      })
      setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }))
      toast.error(
        resolveSecurityErrorMessage(error, 'Account could not be deleted')
      )
    }
  }

  if (!auth.isReady || isLoading) return <ProfileDetailSkeleton />

  if (!auth.isAuthenticated) {
    return (
      <div className="center mx-auto h-dvh w-full max-w-6xl p-3 sm:p-4 md:p-6">
        <EmptyState
          icon="solar:user-circle-bold"
          title="Sign in to open your profile"
          description="Your favorites, watchlist, and custom lists are tied to your account"
        />
      </div>
    )
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 p-3 select-none [overflow-anchor:none] sm:p-4 md:p-6">
      <div>
        <ProfileHero
          profile={profile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={EDIT_TABS}
          contentCountByTab={{
            general: totalContentCount,
            security: totalContentCount,
          }}
          followerCount={followerCount}
          followingCount={followingCount}
          onFollowersClick={() => handleOpenFollowList('followers')}
          onFollowingClick={() => handleOpenFollowList('following')}
        />
      </div>

      {activeTab === 'general' ? (
        <form
          ref={formRef}
          onSubmit={handleProfileSubmit}
          className="mx-auto flex w-full max-w-4xl flex-col gap-12"
        >
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-white">
                General Information
              </h2>
              <p className="text-sm text-white/40">Public identity details.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FieldGroup label="Display Name">
                <Input
                  value={form.displayName}
                  onChange={(event) =>
                    handleChange('displayName', event.target.value)
                  }
                  placeholder="Your name"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>

              <FieldGroup label="Username">
                <Input
                  value={form.username}
                  onChange={(event) =>
                    handleChange('username', event.target.value)
                  }
                  placeholder="username"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>

              <FieldGroup label="Bio" className="sm:col-span-2">
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    handleChange('description', event.target.value)
                  }
                  placeholder="Write something about yourself"
                  maxHeight={220}
                  className={{
                    textarea: TEXTAREA_CLASS,
                  }}
                />
              </FieldGroup>
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-white">
                Profile Media
              </h2>
              <p className="text-sm text-white/40">Avatar and banner URLs.</p>
            </div>

            <div className="grid gap-6">
              <FieldGroup label="Avatar URL">
                <Input
                  value={form.avatarUrl}
                  onChange={(event) =>
                    handleChange('avatarUrl', event.target.value)
                  }
                  placeholder="https://"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>

              <FieldGroup label="Banner URL">
                <Input
                  value={form.bannerUrl}
                  onChange={(event) =>
                    handleChange('bannerUrl', event.target.value)
                  }
                  placeholder="https://"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>
            </div>
          </section>
        </form>
      ) : (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          {showGoogleSignInMethod ? (
            <section className={SECURITY_CARD_CLASS}>
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-white">
                    Link Your Account with Google
                  </h3>
                  <p className="text-sm text-white/45">
                    Add a Google link to sign in quickly with your Gmail account.
                  </p>
                  <p className="text-sm text-white/40">
                    {isGoogleLinked
                      ? 'Google account linked'
                      : 'Google account not linked'}
                  </p>
                </div>

                {supportsGoogleLinking ? (
                  <button
                    type="button"
                    onClick={
                      isGoogleLinked ? handleUnlinkGoogle : handleLinkGoogle
                    }
                    disabled={
                      isSaving ||
                      isLinkingGoogle ||
                      isUnlinkingGoogle ||
                      (isGoogleLinked && !isPasswordLinked)
                    }
                    className="border-b border-white/30 pb-1 text-[11px] font-semibold tracking-[0.14em] text-white uppercase transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isGoogleLinked
                      ? isUnlinkingGoogle
                        ? 'Unlinking'
                        : 'Unlink'
                      : isLinkingGoogle
                        ? 'Linking'
                        : 'Link'}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-white/35">
                    Unavailable
                  </span>
                )}
              </div>
            </section>
          ) : null}

          {!canUsePasswordSecurity ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              Email and password security actions are available only when
              email/password sign-in is linked to this account.
            </div>
          ) : null}

          <section className={SECURITY_CARD_CLASS}>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white">Change Email</h3>
              <p className="text-sm text-white/45">
                Confirm your current password, then verify your new email.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FieldGroup label="Current Password">
                <Input
                  type="password"
                  value={emailFlow.currentPassword}
                  onChange={(event) =>
                    setEmailFlow((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  placeholder="Current password"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>

              <FieldGroup label="New Email">
                <Input
                  type="email"
                  value={emailFlow.newEmail}
                  onChange={(event) =>
                    setEmailFlow((prev) => ({
                      ...prev,
                      newEmail: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCompleteEmailChange}
                disabled={emailFlow.isSubmitting}
                className="h-11 rounded-2xl bg-white px-5 text-[11px] font-bold tracking-[0.14em] text-black uppercase transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {emailFlow.isSubmitting ? 'Updating Email' : 'Verify and Update'}
              </button>
            </div>
          </section>

          <section className={SECURITY_CARD_CLASS}>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white">
                Change Password
              </h3>
              <p className="text-sm text-white/45">
                Confirm your current password and verify your current email.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FieldGroup label="Current Password">
                <Input
                  type="password"
                  value={passwordFlow.currentPassword}
                  onChange={(event) =>
                    setPasswordFlow((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  placeholder="Current password"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>

              <FieldGroup label="New Password">
                <Input
                  type="password"
                  value={passwordFlow.newPassword}
                  onChange={(event) =>
                    setPasswordFlow((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="Strong password"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>

              <FieldGroup label="Confirm New Password">
                <Input
                  type="password"
                  value={passwordFlow.confirmPassword}
                  onChange={(event) =>
                    setPasswordFlow((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Repeat new password"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCompletePasswordChange}
                disabled={passwordFlow.isSubmitting}
                className="h-11 rounded-2xl bg-white px-5 text-[11px] font-bold tracking-[0.14em] text-black uppercase transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {passwordFlow.isSubmitting ? 'Updating Password' : 'Verify and Update'}
              </button>
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-red-400/20 bg-red-500/5 p-5 sm:p-6">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-red-100">Danger Zone</h3>
              <p className="text-sm text-red-100/70">
                Deleting your account is permanent. Type DELETE and confirm with
                your current password.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FieldGroup label="Type DELETE to Confirm">
                <Input
                  value={deleteFlow.confirmText}
                  onChange={(event) =>
                    setDeleteFlow((prev) => ({
                      ...prev,
                      confirmText: event.target.value,
                    }))
                  }
                  placeholder="DELETE"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>
              <FieldGroup label="Current Password">
                <Input
                  type="password"
                  value={deleteFlow.currentPassword}
                  onChange={(event) =>
                    setDeleteFlow((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  placeholder="Current password"
                  className={{
                    input: INPUT_CLASS,
                  }}
                />
              </FieldGroup>
            </div>

            <button
              type="button"
              disabled={deleteFlow.isSubmitting}
              onClick={handleDeleteAccount}
              className="h-11 rounded-2xl border border-red-400/50 bg-red-500/15 px-5 text-[11px] font-bold tracking-[0.14em] text-red-100 uppercase transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleteFlow.isSubmitting ? 'Deleting Account' : 'Delete Account'}
            </button>
          </section>
        </div>
      )}
      <div className="shrink-0" style={{ height: navHeight }} />
    </div>
  )
}
