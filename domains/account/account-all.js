// ============================================================================
// DOMAINS/ACCOUNT CONSOLIDATED CODEBASE
// Generated: 2026-08-16T16:44:19.634Z
// Total Files: 99
// ============================================================================

// ============================================================================
// FILE: domains/account/client/account-api.client.js
// ============================================================================

'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { ensureAuthCsrfToken } from '@/core/modules/auth/http.client';

function toCollectionQuery({
  entityId = null,
  entityType = null,
  limitCount = null,
  listId = null,
  media = null,
  resource,
  slug = null,
  userId = null,
} = {}) {
  return {
    entityId: entityId || media?.entityId || media?.entity_id || media?.id || null,
    entityType: entityType || media?.entityType || media?.entity_type || media?.media_type || null,
    limitCount,
    listId,
    resource,
    slug,
    userId,
  };
}

export function fetchAccountProfile(query) {
  return requestApiJson('/api/account/profile', { query });
}

export function resolveAccountByUsername(username) {
  return requestApiJson('/api/account/resolve', { query: { username } });
}

export function searchAccountProfiles({ limitCount, searchTerm }) {
  return requestApiJson('/api/account/search', {
    query: { limitCount, searchTerm },
  });
}

export async function saveAccountProfile(body) {
  const csrfToken = await ensureAuthCsrfToken();

  return requestApiJson('/api/account/profile', {
    body,
    headers: { 'X-CSRF-Token': csrfToken },
    method: 'POST',
  });
}

export function fetchAccountResource(params) {
  return requestApiJson('/api/collections', {
    query: toCollectionQuery(params),
  });
}

export function fetchAccountActivityFeed(query) {
  return requestApiJson('/api/account/activity', { query });
}

export function fetchAccountReviewFeed(query) {
  return requestApiJson('/api/account/reviews', { query });
}


// ============================================================================
// FILE: domains/account/client/collections.client.js
// ============================================================================

import { fetchAccountResource } from './account-api.client';
import { getSupabaseClient } from '@/infrastructure/http/supabase-data-service';

function getResourceItems(response) {
  return response?.items || response?.data || [];
}

export async function fetchCollectionResource(arg1, arg2, arg3, arg4) {
  let params = {};

  if (typeof arg1 === 'string') {
    params = {
      resource: arg1,
      userId: arg2,
      ...(arg3 && typeof arg3 === 'object' ? arg3 : {}),
      ...(arg4 && typeof arg4 === 'object' ? arg4 : {}),
    };
  } else if (arg1 && typeof arg1 === 'object') {
    params = arg1;
  }

  const {
    entityId = null,
    entityType = null,
    limitCount = null,
    listId = null,
    media = null,
    resource,
    slug = null,
    userId = null,
  } = params;

  const res = await fetchAccountResource({
    entityId,
    entityType,
    limitCount,
    listId,
    media,
    resource,
    slug,
    userId,
  });
  return getResourceItems(res);
}

export async function fetchAccountListById({ listId, userId } = {}) {
  if (!listId) return null;

  const response = await fetchAccountResource({
    listId,
    resource: 'list-by-id',
    userId,
  });
  return response?.data || null;
}

export async function fetchAccountListBySlug({ slug, userId } = {}) {
  if (!slug) return null;

  const response = await fetchAccountResource({
    resource: 'list-by-slug',
    slug,
    userId,
  });
  return response?.data || null;
}

export async function fetchAccountListItems({ limitCount = null, listId, userId } = {}) {
  if (!listId || !userId) return [];

  const response = await fetchAccountResource({
    limitCount,
    listId,
    resource: 'list-items',
    userId,
  });
  return getResourceItems(response);
}

export async function fetchMediaCollectionStatus({ media = null, resource, userId = null } = {}) {
  const res = await fetchAccountResource({
    media,
    resource,
    userId,
  });
  return res?.data || null;
}

export function createMediaCollectionToggleRpcParams({ extras = {}, row = {}, userId }) {
  return {
    p_backdrop_path: row.backdrop_path || row.backdropPath || null,
    p_entity_id: String(row.entityId || row.entity_id || row.id || '').trim(),
    p_entity_type: String(row.entityType || row.entity_type || row.media_type || '')
      .trim()
      .toLowerCase(),
    p_media_key: row.mediaKey || row.media_key || null,
    p_payload: row.payload || {},
    p_poster_path: row.poster_path || row.posterPath || null,
    p_title: row.title || row.name || 'Untitled',
    p_user_id: userId,
    ...extras,
  };
}

export async function executeMediaCollectionRpc(
  fnNameOrOptions,
  paramsArg,
  fallbackMessageArg,
  clientArg,
) {
  let fnName;
  let params;
  let fallbackMessage;
  let client;

  if (typeof fnNameOrOptions === 'object' && fnNameOrOptions !== null) {
    ({ client, fnName, params, fallbackMessage } = fnNameOrOptions);
  } else {
    fnName = fnNameOrOptions;
    params = paramsArg;
    fallbackMessage = fallbackMessageArg;
    client = clientArg;
  }

  const supabase = client || getSupabaseClient();
  const result = await supabase.rpc(fnName, params);
  if (result.error)
    throw new Error(result.error.message || fallbackMessage || 'Collection action failed');
  return result.data;
}

export function buildUserMediaCollectionSubscriptionKey(resource, userId, options = {}) {
  const limit = options?.limitCount ?? null;
  const suffix = limit !== null ? `:${limit}` : '';
  return `account:collection:${resource}:${userId}${suffix}`;
}

export function buildMediaCollectionStatusSubscriptionKey(resource, userId, mediaKey) {
  return `account:status:${resource}:${userId}:${mediaKey}`;
}


// ============================================================================
// FILE: domains/account/client/index.js
// ============================================================================

export * from './account-api.client.js';

export * from './profile.client.js';
export * from './collections.client.js';


// ============================================================================
// FILE: domains/account/client/profile.client.js
// ============================================================================

'use client';

import {
  clearPendingAccountBootstrap,
  createCsrfHeaders,
  getPendingAccountBootstrap,
} from '@/domains/auth/client';
import { ensureAuthCsrfToken } from '@/core/modules/auth/http.client';
import { createAccountAdapter, createAccountClient } from '@/modules/account';
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/supabase-data-service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import { validateUsername } from '@/domains/account/utils';
import { cleanString, isValidUrl, normalizeValue } from '@/shared/utils';
import {
  resolveAccountByUsername,
  fetchAccountProfile,
  saveAccountProfile,
  searchAccountProfiles,
} from './account-api.client';

export function normalizeOptionalUrl(value) {
  const normalized = cleanString(value);
  if (!normalized) return null;
  if (!isValidUrl(normalized)) {
    throw new Error('Image URLs must start with http:// or https://');
  }
  return normalized;
}

export function createUserIdentity(user = {}) {
  const metadata = user.metadata || user.user_metadata || {};

  return {
    displayName:
      user.displayName ||
      user.name ||
      metadata.display_name ||
      metadata.full_name ||
      metadata.name ||
      user.email ||
      'Anonymous User',
    email: user.email || null,
    id: user.id || user.uid || null,
  };
}

export function normalizeMediaTarget(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'avatar') return 'avatar';
  if (normalized === 'logo' || normalized === 'banner') return 'banner';
  throw new Error('Media target must be avatar or logo');
}

export function normalizeEmailAddress(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

const ACCOUNT_RESOLVE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ACCOUNT_RESOLVE_CACHE_ENTRIES = 200;
const accountResolveRequestCache = new Map();

function cacheAccountResolution(username, value) {
  accountResolveRequestCache.set(username, value);

  if (accountResolveRequestCache.size > MAX_ACCOUNT_RESOLVE_CACHE_ENTRIES) {
    accountResolveRequestCache.delete(accountResolveRequestCache.keys().next().value);
  }
}

export async function getUserAccount(userId) {
  if (!userId) return null;
  const payload = await fetchAccountProfile({ userId });
  return payload?.profile || null;
}

export async function getUserIdByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const now = Date.now();
  const cachedEntry = accountResolveRequestCache.get(normalizedUsername);

  if (cachedEntry?.value !== undefined && (cachedEntry?.expiresAt || 0) > now) {
    return cachedEntry.value;
  }
  if (cachedEntry?.inFlightPromise) {
    return cachedEntry.inFlightPromise;
  }

  const inFlightPromise = resolveAccountByUsername(normalizedUsername)
    .then((payload) => {
      const userId = payload?.userId || null;
      cacheAccountResolution(normalizedUsername, {
        expiresAt: Date.now() + ACCOUNT_RESOLVE_CACHE_TTL_MS,
        inFlightPromise: null,
        value: userId,
      });
      return userId;
    })
    .catch((error) => {
      accountResolveRequestCache.delete(normalizedUsername);
      throw error;
    });

  cacheAccountResolution(normalizedUsername, {
    expiresAt: now + ACCOUNT_RESOLVE_CACHE_TTL_MS,
    inFlightPromise,
    value: undefined,
  });

  return inFlightPromise;
}

export async function getUserAccountByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const payload = await fetchAccountProfile({ username: normalizedUsername });
  return payload?.profile || null;
}

export async function searchUserAccounts(searchTerm, options = {}) {
  const rawSearchTerm = cleanString(searchTerm);
  if (!rawSearchTerm) return [];

  const payload = await searchAccountProfiles({
    limitCount: options.limitCount ?? null,
    searchTerm: rawSearchTerm,
  });

  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function requestEnsureUserAccount({ displayName, email, username }) {
  return saveAccountProfile({
    action: 'ensure',
    displayName,
    email,
    username,
  });
}

export async function requestUpdateUserAccount({
  avatarUrl,
  bannerUrl,
  description,
  displayName,
  isPrivate,
  username,
}) {
  return saveAccountProfile({
    action: 'update',
    avatarUrl,
    bannerUrl,
    description,
    displayName,
    isPrivate,
    username,
  });
}

export async function requestSyncUserAccountEmail({ email }) {
  return saveAccountProfile({ action: 'update', email });
}

const ACCOUNT_SUBSCRIPTION_INTERVAL_MS = 60000;
const ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 180000;
const ACCOUNT_REFRESH_TIMERS = new Map();
const DEFAULT_REFRESH_DELAY_MS = 250;

export function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', { userId });
}

export function primeUserAccount(userId, profile) {
  if (!userId || !profile) return;
  primePollingSubscription(getUserAccountSubscriptionKey(userId), profile, { emit: false });
}

export function subscribeToUserAccount(userId, callback, options = {}) {
  return createPollingSubscription(() => getUserAccount(userId), callback, {
    ...options,
    hiddenIntervalMs: options.hiddenIntervalMs ?? ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
    intervalMs: options.intervalMs ?? ACCOUNT_SUBSCRIPTION_INTERVAL_MS,
    subscriptionKey: getUserAccountSubscriptionKey(userId),
  });
}

export function getAccountSummarySubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', { userId });
}

export function refreshAccountSummaryNow(userId) {
  const normalizedUserId = cleanString(userId);
  if (!normalizedUserId) return;
  const key = getAccountSummarySubscriptionKey(normalizedUserId);
  invalidatePollingSubscription(key, { refetch: true });
}

export function scheduleAccountSummaryRefresh(userId, { delayMs = DEFAULT_REFRESH_DELAY_MS } = {}) {
  const normalizedUserId = cleanString(userId);
  if (!normalizedUserId) return;

  const existingTimer = ACCOUNT_REFRESH_TIMERS.get(normalizedUserId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(
    () => {
      ACCOUNT_REFRESH_TIMERS.delete(normalizedUserId);
      refreshAccountSummaryNow(normalizedUserId);
    },
    Math.max(0, Math.floor(Number(delayMs) || DEFAULT_REFRESH_DELAY_MS)),
  );

  ACCOUNT_REFRESH_TIMERS.set(normalizedUserId, timer);
}

export async function ensureUserAccount(user = {}, options = {}) {
  const identity = createUserIdentity(user);
  const preferredDisplayName = cleanString(options.displayName) || null;
  const preferredUsername =
    options.username !== undefined && options.username !== null
      ? validateUsername(options.username)
      : null;

  if (!identity.id) throw new Error('Authenticated user is required to bootstrap an account');

  const existingProfile = await getUserAccount(identity.id).catch(() => null);
  if (existingProfile?.id) {
    primeUserAccount(identity.id, existingProfile);
    return existingProfile;
  }

  const payload = await requestEnsureUserAccount({
    displayName: preferredDisplayName || identity.displayName,
    email: identity.email || null,
    username: preferredUsername,
  });
  const profile = payload?.profile;
  if (!profile) throw new Error('Could not generate an available username for this account');

  primeUserAccount(identity.id, profile);
  return profile;
}

export async function updateUserAccount({ userId, updates = {} }) {
  if (!userId) throw new Error('Authenticated user is required to update the account');

  const payload = await requestUpdateUserAccount({
    avatarUrl:
      updates.avatarUrl !== undefined ? normalizeOptionalUrl(updates.avatarUrl) : undefined,
    bannerUrl:
      updates.bannerUrl !== undefined ? normalizeOptionalUrl(updates.bannerUrl) : undefined,
    description: updates.description !== undefined ? cleanString(updates.description) : undefined,
    displayName:
      updates.displayName !== undefined
        ? cleanString(updates.displayName) || 'Anonymous User'
        : undefined,
    isPrivate: updates.isPrivate !== undefined ? Boolean(updates.isPrivate) : undefined,
    username: updates.username !== undefined ? validateUsername(updates.username) : undefined,
  });
  const profile = payload?.profile;
  if (!profile) throw new Error('Account update failed');

  primeUserAccount(userId, profile);
  return profile;
}

export async function uploadAccountMediaFile({ file, target = 'avatar' }) {
  if (!file || typeof file !== 'object') throw new Error('Select an image file');

  const normalizedTarget = normalizeMediaTarget(target);
  const csrfToken = await ensureAuthCsrfToken();
  const formData = new FormData();
  formData.set('target', normalizedTarget);
  formData.set('file', file);

  const response = await fetch('/api/account/media', {
    method: 'POST',
    credentials: 'include',
    headers: createCsrfHeaders({ 'X-CSRF-Token': csrfToken }),
    body: formData,
  });

  const payload = await response.json().catch(() => ({ error: 'Image upload failed' }));
  if (!response.ok) throw new Error(payload?.error || 'Image upload failed');

  const mediaResult = payload?.result || payload || {};
  const url = cleanString(payload?.url || mediaResult?.url);
  if (!url) throw new Error('Image upload returned an invalid URL');

  return {
    bucket: cleanString(payload?.bucket || mediaResult?.bucket) || null,
    path: cleanString(payload?.path || mediaResult?.path) || null,
    url,
  };
}

export async function deleteUsernameMapping(username) {
  if (!username) return;
  const normalized = validateUsername(username);
  const client = getSupabaseClient();
  const result = await client.from('usernames').delete().eq('username_lower', normalized);
  assertSupabaseResult(result, 'Username mapping could not be deleted');
}

export async function syncUserAccountEmail({ userId, email }) {
  if (!userId) throw new Error('Authenticated user is required to sync email');
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const payload = await requestSyncUserAccountEmail({ email: normalizedEmail });
  const profile = payload?.profile;
  if (!profile) throw new Error('Email could not be synced');

  primeUserAccount(userId, profile);
  return profile;
}

function isFreshEmailPasswordSession(user) {
  const providerIds = Array.isArray(user?.metadata?.providerIds) ? user.metadata.providerIds : [];
  const createdAt = Date.parse(user?.metadata?.creationTime || '');
  const lastSignInAt = Date.parse(user?.metadata?.lastSignInTime || '');
  if (!providerIds.includes('password')) return false;
  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) return false;
  return Math.abs(lastSignInAt - createdAt) <= 60 * 1000;
}

function resolveBootstrapPayload(user = null) {
  if (!isFreshEmailPasswordSession(user)) return null;
  return getPendingAccountBootstrap(user);
}

export const ACCOUNT_ADAPTER = createAccountAdapter({
  ensureAccount: ensureUserAccount,
  getAccount: getUserAccount,
  getAccountByUsername: getUserAccountByUsername,
  getAccountIdByUsername: getUserIdByUsername,
  primeAccount: primeUserAccount,
  searchAccounts: searchUserAccounts,
  subscribeToAccount: subscribeToUserAccount,
  syncAccountEmail: syncUserAccountEmail,
  updateAccount: updateUserAccount,
  validateUsername,
});

export const ACCOUNT_CLIENT = createAccountClient(ACCOUNT_ADAPTER);

export const ACCOUNT_PROVIDER_CONFIG = {
  adapter: ACCOUNT_ADAPTER,
  bootstrap: {
    clearPayload: clearPendingAccountBootstrap,
    resolvePayload: resolveBootstrapPayload,
  },
};


// ============================================================================
// FILE: domains/account/hooks/account-edit-data.hooks.js
// ============================================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAccountProfile } from '@/modules/account';
import { notifyAccountLoadError } from '@/domains/account/utils';

export function useAccountEditData({ auth, initialSnapshot = null, toast = null }) {
  const resolvedUserId = auth?.user?.id || null;
  const handleProfileError = useCallback(
    (err) => notifyAccountLoadError(toast, err, 'Profile details could not be loaded'),
    [toast],
  );
  const { hasLoadedProfile, profile, setProfile } = useAccountProfile({
    initialProfile: initialSnapshot?.profile || null,
    onError: handleProfileError,
    resolvedUserId,
  });

  const resolvedProfile = profile || initialSnapshot?.profile || null;

  const [form, setForm] = useState(() => ({
    avatarUrl: resolvedProfile?.avatarUrl || '',
    bannerUrl: resolvedProfile?.bannerUrl || '',
    description: resolvedProfile?.description || '',
    displayName: resolvedProfile?.displayName || '',
    isPrivate: resolvedProfile?.isPrivate === true,
    username: resolvedProfile?.username || '',
  }));

  const [linkedProviderIdsOverride, setLinkedProviderIdsOverride] = useState(null);
  const [linkedProviderDescriptorsOverride, setLinkedProviderDescriptorsOverride] = useState(null);

  const initializedUserIdRef = useRef(null);

  useEffect(() => {
    if (resolvedProfile && initializedUserIdRef.current !== resolvedProfile.id) {
      initializedUserIdRef.current = resolvedProfile.id;
      setForm({
        avatarUrl: resolvedProfile.avatarUrl || '',
        bannerUrl: resolvedProfile.bannerUrl || '',
        description: resolvedProfile.description || '',
        displayName: resolvedProfile.displayName || '',
        isPrivate: resolvedProfile.isPrivate === true,
        username: resolvedProfile.username || '',
      });
    }
  }, [resolvedProfile]);

  const applyProfile = useCallback(
    (nextProfile) => {
      if (typeof setProfile === 'function') {
        setProfile(nextProfile);
      }
      if (nextProfile) {
        setForm({
          avatarUrl: nextProfile.avatarUrl || '',
          bannerUrl: nextProfile.bannerUrl || '',
          description: nextProfile.description || '',
          displayName: nextProfile.displayName || '',
          isPrivate: nextProfile.isPrivate === true,
          username: nextProfile.username || '',
        });
      }
    },
    [setProfile],
  );

  const isLoading =
    !auth.isReady || (Boolean(resolvedUserId) && !hasLoadedProfile && !resolvedProfile);

  return {
    applyProfile,
    followerCount: Number(resolvedProfile?.followerCount || 0),
    followingCount: Number(resolvedProfile?.followingCount || 0),
    form,
    isLoading,
    likesCount: Number(resolvedProfile?.likesCount || 0),
    linkedProviderDescriptorsOverride,
    linkedProviderIdsOverride,
    listsCount: Number(resolvedProfile?.listsCount || 0),
    profile: resolvedProfile,
    setForm,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    watchedCount: Number(resolvedProfile?.watchedCount || 0),
    watchlistCount: Number(resolvedProfile?.watchlistCount || 0),
  };
}


// ============================================================================
// FILE: domains/account/hooks/account-edit-page-state.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  AUTH_ROUTES,
  buildAuthHref,
  getCurrentPathWithSearch,
  normalizeOAuthProvider,
} from '@/domains/auth/utils';
import { uploadAccountMediaFile } from '@/domains/account/client';
import { useAccountEditData, useAccountSecurityActions } from '@/domains/account/hooks';
import {
  ACCOUNT_MEDIA_UPLOAD_CONFIG,
  INITIAL_DELETE_FLOW,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  clearAccountFeedback,
  emitAccountFeedback,
  getAvatarFallback,
  logDataError,
  normalizeEmail,
  normalizeOptionalText,
} from '@/domains/account/utils';
import { useAccount } from '@/modules/account';
import { useAuth } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { useNavigationActions } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { createFileUploadSurfaceEntry } from '@/ui/feedback/file-upload-surface';

export function useAccountEditPageState({ initialSnapshot = null }) {
  const { updateCurrentAccount } = useAccount();
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openModal } = useModal();
  const { openSurface } = useNavigationActions();

  const formRef = useRef(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [emailFlow, setEmailFlow] = useState(INITIAL_EMAIL_FLOW);
  const [passwordFlow, setPasswordFlow] = useState(INITIAL_PASSWORD_FLOW);
  const [deleteFlow, setDeleteFlow] = useState(INITIAL_DELETE_FLOW);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [mediaUploadState, setMediaUploadState] = useState({
    avatar: null,
    banner: null,
  });

  const {
    followerCount,
    followingCount,
    form,
    isLoading,
    likesCount,
    linkedProviderIdsOverride,
    listsCount,
    profile,
    applyProfile,
    setForm,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    watchedCount,
    watchlistCount,
  } = useAccountEditData({
    auth,
    initialSnapshot,
    toast,
  });

  const userIdentities = Array.isArray(auth?.user?.identities)
    ? auth.user.identities
    : Array.isArray(auth?.user?.metadata?.identities)
      ? auth.user.metadata.identities
      : [];

  const providerIdsFromAuth =
    auth?.capabilities?.providerIds ||
    auth?.user?.metadata?.providerIds ||
    auth?.user?.providerIds ||
    userIdentities.map((i) => i?.provider || i?.identity_provider) ||
    [];

  const normalizedProviderIds = (Array.isArray(providerIdsFromAuth) ? providerIdsFromAuth : []).map(
    (p) =>
      String(p || '')
        .trim()
        .toLowerCase(),
  );

  const linkedProviderIds = Array.isArray(linkedProviderIdsOverride)
    ? linkedProviderIdsOverride
    : normalizedProviderIds;

  const isPasswordLinked =
    auth?.capabilities?.passwordEnabled === true ||
    linkedProviderIds.includes('password') ||
    linkedProviderIds.includes('email') ||
    userIdentities.some((i) =>
      ['email', 'password'].includes(String(i?.provider || i?.identity_provider).toLowerCase()),
    );

  const canUsePasswordSecurity = isPasswordLinked;
  const linkedOAuthProviders = Array.from(
    new Set(linkedProviderIds.map(normalizeOAuthProvider).filter(Boolean)),
  );

  const avatarPreview = useMemo(() => {
    const url = form?.avatarUrl?.trim();
    if (url) return url;
    return getAvatarFallback(profile);
  }, [form?.avatarUrl, profile]);

  const bannerPreview = useMemo(() => {
    return normalizeOptionalText(form?.bannerUrl) || profile?.bannerUrl || '';
  }, [form?.bannerUrl, profile?.bannerUrl]);

  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );
  const currentAuthEmail = normalizeEmail(profile?.email || auth?.user?.email || '');
  const heroProfile = useMemo(
    () => ({
      ...profile,
      avatarUrl: normalizeOptionalText(form?.avatarUrl),
      bannerUrl: normalizeOptionalText(form?.bannerUrl),
      description: normalizeOptionalText(form?.description),
      displayName: normalizeOptionalText(form?.displayName),
      username: normalizeOptionalText(form?.username),
      isPrivate: Boolean(form?.isPrivate),
    }),
    [form, profile],
  );
  const heroDisplayName = heroProfile?.displayName || heroProfile?.username || 'Account';
  const isGeneralAccountDirty = useMemo(() => {
    if (!profile || !form) {
      return false;
    }

    return (
      normalizeOptionalText(form.displayName) !== normalizeOptionalText(profile.displayName) ||
      normalizeOptionalText(form.username) !== normalizeOptionalText(profile.username) ||
      normalizeOptionalText(form.description) !== normalizeOptionalText(profile.description) ||
      Boolean(form.isPrivate) !== Boolean(profile.isPrivate) ||
      normalizeOptionalText(form.avatarUrl) !== normalizeOptionalText(profile.avatarUrl) ||
      normalizeOptionalText(form.bannerUrl) !== normalizeOptionalText(profile.bannerUrl)
    );
  }, [form, profile]);
  const activeMediaUpload = useMemo(() => {
    return mediaUploadState.avatar || mediaUploadState.banner || null;
  }, [mediaUploadState.avatar, mediaUploadState.banner]);
  const isAnyMediaUploading = Boolean(activeMediaUpload);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMediaUpload = useCallback(
    async (target, file) => {
      if (!file) {
        return;
      }

      const normalizedTarget =
        String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const field = normalizedTarget === 'avatar' ? 'avatarUrl' : 'bannerUrl';
      const label = normalizedTarget === 'avatar' ? 'Avatar' : 'Logo';

      // 0ms Instant Client-Side Image Preview
      let localBlobUrl = null;
      try {
        localBlobUrl = URL.createObjectURL(file);
        setForm((prev) => ({
          ...prev,
          [field]: localBlobUrl,
        }));
      } catch {}

      setMediaUploadState((prev) => ({
        ...prev,
        [normalizedTarget]: {
          fileName: file?.name || `${label}.image`,
        },
      }));

      try {
        const result = await uploadAccountMediaFile({
          file,
          target: normalizedTarget,
        });

        setForm((prev) => ({
          ...prev,
          [field]: result.url,
        }));
      } catch (error) {
        toast.error(error?.message || `${label} could not be uploaded`);
      } finally {
        setMediaUploadState((prev) => ({
          ...prev,
          [normalizedTarget]: null,
        }));
      }
    },
    [setForm, toast],
  );

  const handleClearMedia = useCallback(
    (target) => {
      const normalizedTarget =
        String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const field = normalizedTarget === 'avatar' ? 'avatarUrl' : 'bannerUrl';

      setForm((prev) => ({
        ...prev,
        [field]: '',
      }));
    },
    [setForm],
  );

  const handleSignIn = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      }),
    );
  }, [currentPath, router]);

  const handleSave = useCallback(() => {
    formRef.current?.requestSubmit?.();
  }, []);

  const handleCancel = useCallback(() => {
    if (!profile || isSaving || isAnyMediaUploading) {
      return;
    }

    setForm({
      avatarUrl: profile.avatarUrl || '',
      bannerUrl: profile.bannerUrl || '',
      description: profile.description || '',
      displayName: profile.displayName || '',
      isPrivate: profile.isPrivate === true,
      username: profile.username || '',
    });
  }, [isAnyMediaUploading, isSaving, profile, setForm]);

  const handleOpenMediaUpload = useCallback(
    async (target) => {
      if (isSaving || isAnyMediaUploading) {
        return;
      }

      const normalizedTarget =
        String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const selection = await openSurface(
        createFileUploadSurfaceEntry({
          ...ACCOUNT_MEDIA_UPLOAD_CONFIG[normalizedTarget],
          target: normalizedTarget,
        }),
      );

      if (!selection?.success || !selection?.file) {
        return;
      }

      await handleMediaUpload(normalizedTarget, selection.file);
    },
    [handleMediaUpload, isAnyMediaUploading, isSaving, openSurface],
  );

  useEffect(() => {
    if (!auth.isReady || isLoading || auth.isAuthenticated) {
      return;
    }

    router.replace(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      }),
    );
  }, [auth.isAuthenticated, auth.isReady, currentPath, isLoading, router]);

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    if (isAnyMediaUploading) {
      toast.error('Please wait for uploads to finish');
      return;
    }

    if (!auth.user?.id || !profile || isSaving) return;

    setIsSaving(true);

    try {
      emitAccountFeedback('account-update', 'start');

      const nextProfile = await updateCurrentAccount({
        avatarUrl: form.avatarUrl,
        bannerUrl: form.bannerUrl,
        description: form.description,
        displayName: form.displayName,
        isPrivate: form.isPrivate,
        username: form.username,
      });

      if (auth?.updateProfile) {
        try {
          await auth.updateProfile({
            displayName: nextProfile.displayName,
            photoURL: nextProfile.avatarUrl || null,
          });
        } catch (syncError) {
          logDataError('[Account Edit] Auth sync error:', syncError);
        }
      }

      applyProfile(nextProfile);
      emitAccountFeedback('account-update', 'success');
      router.push(
        nextProfile?.username ? `/account/${encodeURIComponent(nextProfile.username)}` : '/account',
      );
    } catch (error) {
      clearAccountFeedback('account-update');
      toast.error(error?.message || 'Account could not be updated');
    } finally {
      setIsSaving(false);
    }
  };

  const {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleUnlinkProvider,
    handleSetPassword,
    unlinkingProvider,
  } = useAccountSecurityActions({
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    deleteFlow,
    emailFlow,
    isPasswordLinked,
    isSaving,
    openModal,
    openSurface,
    passwordFlow,
    setDeleteConfirmation,
    setDeleteFlow,
    setEmailFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    setPasswordFlow,
    supportsGoogleLinking: false,
    toast,
  });

  return {
    activeTab,
    auth,
    avatarPreview,
    bannerPreview,
    canUsePasswordSecurity,
    currentAuthEmail,
    deleteConfirmation,
    deleteFlow,
    emailFlow,
    followerCount,
    followingCount,
    form,
    formRef,
    handleAccountSubmit,
    handleCancel,
    handleChange,
    handleClearMedia,
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleUnlinkProvider,
    handleOpenMediaUpload,
    handleSave,
    handleSetPassword,
    handleSignIn,
    heroDisplayName,
    heroProfile,
    isAnyMediaUploading,
    isGeneralAccountDirty,
    isLoading,
    isPasswordLinked,
    isSaving,
    likesCount,
    listsCount,
    linkedOAuthProviders,
    mediaUploadFileName: activeMediaUpload?.fileName || '',
    mediaUploadState,
    passwordFlow,
    profile,
    setActiveTab,
    setDeleteFlow,
    setEmailFlow,
    setPasswordFlow,
    unlinkingProvider,
    watchedCount,
    watchlistCount,
  };
}


// ============================================================================
// FILE: domains/account/hooks/account-overview-state.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { deleteStoredReview, toggleStoredReviewLike } from '@/domains/reviews/client';
import { createReviewEditorSurfaceEntry } from '@/domains/reviews/ui/nav-surfaces/review-editor-surface';
import { TMDB_IMG } from '@/shared/constants';
import { isPermissionDeniedError, logDataError } from '@/domains/account/utils';
import { fetchAccountReviewFeed } from '@/domains/account/client/account-api.client';
import { useAuth } from '@/modules/auth';
import { useNavigationActions } from '@/modules/nav/context';
import { useToast } from '@/modules/notification';
import { hasMatchingSeededFeed, useDeferredPreviewFeed } from './page.hooks';
import { useAccountSectionEngine } from './account-section-state';

const COLLECTION_PREVIEW_LIMITS = Object.freeze({
  likes: 12,
  lists: 6,
  watched: 12,
  watchlist: 12,
});
const PREVIEW_REVIEW_LIMIT = 6;

function useOverviewPreviewFeed({
  canLoad,
  errorMessage,
  hasSeededFeed,
  initialFeed = null,
  loadFeed,
  logLabel,
}) {
  return useDeferredPreviewFeed({
    canLoad,
    hasSeededFeed,
    initialFeed,
    loadFeed,
    onLoadError: useCallback(
      (error) => {
        if (isPermissionDeniedError(error)) return null;

        logDataError(`[Account] ${logLabel} could not be loaded:`, error);
        return errorMessage;
      },
      [errorMessage, logLabel],
    ),
  });
}

function updateReviewLikes(review, userId, isLiked) {
  const currentLikes = Array.isArray(review.likes) ? review.likes : [];
  const likes = isLiked
    ? Array.from(new Set([...currentLikes, userId]))
    : currentLikes.filter((likeUserId) => likeUserId !== userId);

  return { ...review, likes };
}

export function useAccountOverviewState(routeData = null) {
  const { initialActivityFeed = null, initialReviewFeed = null } = routeData || {};
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { openSurface } = useNavigationActions();
  const handledMissingAccountRef = useRef(false);
  const {
    routeData: resolvedRouteData,
    sectionProviderValue,
    sectionState,
  } = useAccountSectionEngine({
    activeTab: 'overview',
    auth,
    collectionPreviewLimits: COLLECTION_PREVIEW_LIMITS,
    routeData,
  });
  const { username = null, initialResolvedUserId = null } = resolvedRouteData;
  const {
    canViewPrivateContent,
    canViewProfileCollections,
    handleSignInRequest,
    isCurrentAccountMissing,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isViewerReady,
    itemRemoveConfirmation,
    profile,
    resolvedUserId,
  } = sectionState;
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );
  const effectiveResolvedUserId = resolvedUserId || initialResolvedUserId || null;
  const profileHandle = profile?.username || username || null;
  const seededCurrentAccount = Boolean(!username && initialResolvedUserId);
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const canLoadPreviews =
    Boolean(isViewerReady && effectiveResolvedUserId && canViewProfileCollections) &&
    (Boolean(username) || auth.isAuthenticated);
  const hasSeededReviewFeed =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: 'authored',
      initialFeed: initialReviewFeed,
      resolvedUserId: effectiveResolvedUserId,
    });
  const editableReviewUser = useMemo(() => {
    if (!isOwner || !auth.user?.id) return null;

    return { ...(profile || {}), ...(auth.user || {}), id: auth.user.id };
  }, [auth.user, isOwner, profile]);
  const [reviewDeleteConfirmation, setReviewDeleteConfirmation] = useState(null);

  useEffect(() => {
    if (username || !profileHandle) return;

    router.replace(`/account/${encodeURIComponent(profileHandle)}`);
  }, [profileHandle, router, username]);

  useEffect(() => {
    if (username || !isViewerReady || auth.isAuthenticated) return;

    router.replace(buildAuthHref(AUTH_ROUTES.SIGN_IN, { next: currentPath }));
  }, [auth.isAuthenticated, currentPath, isViewerReady, router, username]);

  useEffect(() => {
    if (!isCurrentAccountMissing || handledMissingAccountRef.current) return;

    handledMissingAccountRef.current = true;
    toast.error('Your account profile could not be initialized. Refresh the page and try again.', {
      dedupeKey: 'current-account-missing',
      duration: 6000,
    });
  }, [isCurrentAccountMissing, toast]);

  const reviewPreview = useOverviewPreviewFeed({
    canLoad: canLoadPreviews,
    errorMessage: 'Reviews could not be loaded right now.',
    hasSeededFeed: hasSeededReviewFeed,
    initialFeed: initialReviewFeed,
    loadFeed: useCallback(
      () =>
        fetchAccountReviewFeed({
          mode: 'authored',
          pageSize: PREVIEW_REVIEW_LIMIT,
          userId: effectiveResolvedUserId,
        }),
      [effectiveResolvedUserId],
    ),
    logLabel: 'Review previews',
  });
  const { setItems: setReviewItems } = reviewPreview;

  const handleEditReview = useCallback(
    (review) => {
      if (!editableReviewUser) return;

      openSurface(
        createReviewEditorSurfaceEntry({
          onSuccess: (updatedReview) => {
            setReviewItems((items) =>
              items.map((item) =>
                (item.docPath || item.id) === (review.docPath || review.id)
                  ? { ...item, ...updatedReview }
                  : item,
              ),
            );
          },
          review,
          user: editableReviewUser,
        }),
      );
    },
    [editableReviewUser, openSurface, setReviewItems],
  );

  const handleDeleteReview = useCallback(
    (review) => {
      if (!auth.user?.id || !isOwner) return;

      const poster = review?.subjectPoster;
      setReviewDeleteConfirmation({
        confirmLoadingText: 'Deleting',
        confirmText: 'Delete',
        description: 'This review will be permanently removed from your profile.',
        icon: poster ? (poster.startsWith('/') ? `${TMDB_IMG}/w342${poster}` : poster) : undefined,
        isDestructive: true,
        onCancel: () => setReviewDeleteConfirmation(null),
        onConfirm: async () => {
          try {
            await deleteStoredReview({ review, userId: auth.user.id });
            setReviewItems((items) =>
              items.filter((item) => (item.docPath || item.id) !== (review.docPath || review.id)),
            );
            setReviewDeleteConfirmation(null);
          } catch (error) {
            toast.error(error?.message || 'Review could not be deleted');
            throw error;
          }
        },
        title: 'Delete Review?',
      });
    },
    [auth.user?.id, isOwner, setReviewItems, toast],
  );

  const handleLikeReview = useCallback(
    async (review) => {
      if (!auth.isAuthenticated || !auth.user?.id) {
        handleSignInRequest();
        return;
      }

      const reviewId = review.docPath || review.id;
      const currentUserId = auth.user.id;
      let previousItems = [];

      setReviewItems((items) => {
        previousItems = items;
        return items.map((item) => {
          if ((item.docPath || item.id) !== reviewId) {
            return item;
          }
          const currentLikes = Array.isArray(item.likes) ? item.likes : [];
          const currentlyLiked = currentLikes.includes(currentUserId);
          return updateReviewLikes(item, currentUserId, !currentlyLiked);
        });
      });

      try {
        await toggleStoredReviewLike({ review, userId: currentUserId });
      } catch (error) {
        setReviewItems(previousItems);
        toast.error(error?.message || 'Review could not be updated');
      }
    },
    [auth.isAuthenticated, auth.user?.id, handleSignInRequest, setReviewItems, toast],
  );

  const providerValue = useMemo(
    () => ({
      ...sectionProviderValue,
      isPageLoading:
        isPageLoading ||
        (!username && !seededCurrentAccount && (!isViewerReady || auth.status === 'loading')),
      itemRemoveConfirmation: reviewDeleteConfirmation || itemRemoveConfirmation,
      navDescription:
        !username && isViewerReady && !auth.isAuthenticated
          ? 'Sign in to see your account'
          : 'Profile Overview',
      profileHandle,
    }),
    [
      auth.isAuthenticated,
      auth.status,
      isPageLoading,
      isViewerReady,
      itemRemoveConfirmation,
      profileHandle,
      reviewDeleteConfirmation,
      sectionProviderValue,
      seededCurrentAccount,
      username,
    ],
  );

  return {
    isCurrentAccountMissing,
    overviewData: {
      authoredReviews: reviewPreview.items,
      authoredReviewsError: reviewPreview.feedError,
      authoredReviewsLoading: reviewPreview.isFeedLoading,
      handleDeleteReview,
      handleEditReview,
      handleLikeReview,
      hasMoreAuthoredReviews: reviewPreview.hasMore,
      initialActivityFeed,
    },
    providerValue,
  };
}


// ============================================================================
// FILE: domains/account/hooks/account-registry-state.js
// ============================================================================

'use client';

import { buildAccountPageState } from '@/app/(account)/registry';

export const EMPTY_ACCOUNT_REGISTRY_AUTH = Object.freeze({
  isAuthenticated: false,
});

export function noopAccountRegistryHandler() {}

export function buildAccountRegistryState(sectionState = null, overrides = null) {
  const {
    auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
    followState = 'follow',
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isFollowLoading = false,
    isOwner = false,
    isPageLoading = false,
    isResolvingProfile = false,
    itemRemoveConfirmation = null,
    listDeleteConfirmation = null,
    pendingFollowRequestCount = 0,
    profile = null,
    resolveError = null,
    unfollowConfirmation = null,
    username,
  } = sectionState || {};

  return buildAccountPageState({
    authIsAuthenticated: auth.isAuthenticated,
    authUser: auth.user || null,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    extraNavActions: overrides?.extraNavActions ?? [],
    isFollowLoading,
    isOwner,
    isPageLoading: overrides?.isPageLoading ?? isPageLoading,
    isResolvingProfile,
    isSectionEditing: false,
    isSectionOrderDirty: false,
    isSectionSaveLoading: false,
    itemRemoveConfirmation: overrides?.itemRemoveConfirmation ?? itemRemoveConfirmation,
    listDeleteConfirmation: overrides?.listDeleteConfirmation ?? listDeleteConfirmation,
    navActionOverride: overrides?.navActionOverride ?? null,
    navDescription: overrides?.navDescription ?? null,
    navSurface: overrides?.navSurface ?? null,
    navRegistrySource: overrides?.navRegistrySource,
    onDeleteList: overrides?.onDeleteList,
    onEditList: overrides?.onEditList,
    onOpenReviewComposer: overrides?.onOpenReviewComposer,
    ownReview: overrides?.ownReview,
    onSaveSectionOrder: null,
    onToggleLike: overrides?.onToggleLike,
    pendingFollowRequestCount,
    profile,
    resolveError,
    reviewState: overrides?.reviewState,
    showProfileFollowAction: overrides?.showProfileFollowAction ?? true,
    showToolbarFollowActionWithOverride: overrides?.showToolbarFollowActionWithOverride,
    unfollowConfirmation: overrides?.unfollowConfirmation ?? unfollowConfirmation,
    username,
    isLiked: overrides?.isLiked ?? false,
    isLikeLoading: overrides?.isLikeLoading ?? false,
  });
}


// ============================================================================
// FILE: domains/account/hooks/account-section-state.js
// ============================================================================

'use client';

import { createContext, useContext, useMemo } from 'react';

import { useAccountSectionPage } from '@/domains/account/hooks';
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  noopAccountRegistryHandler,
} from '@/domains/account/hooks/account-registry-state';

const DEFAULT_ACCOUNT_SECTION_STATE = Object.freeze({
  auth: EMPTY_ACCOUNT_REGISTRY_AUTH,
  canViewProfileCollections: false,
  followerCount: 0,
  followingCount: 0,
  followState: 'follow',
  handleEditProfile: noopAccountRegistryHandler,
  handleFollow: noopAccountRegistryHandler,
  handleOpenFollowList: noopAccountRegistryHandler,
  handleSignInRequest: noopAccountRegistryHandler,
  isCurrentAccountMissing: false,
  isFollowLoading: false,
  isOwner: false,
  isPageLoading: false,
  isResolvingProfile: false,
  itemRemoveConfirmation: null,
  likeCount: 0,
  likedLists: [],
  likes: [],
  listCount: 0,
  navDescription: null,
  pendingFollowRequestCount: 0,
  profile: null,
  profileHandle: null,
  resolveError: null,
  resolvedUserId: null,
  unfollowConfirmation: null,
  username: null,
  watchlistCount: 0,
});
const EMPTY_ROUTE_DATA = Object.freeze({});

const AccountSectionStateContext = createContext(DEFAULT_ACCOUNT_SECTION_STATE);

export function useAccountSectionEngine({
  activeListId = '',
  activeTab,
  auth,
  collectionPreviewLimits = null,
  routeData = null,
  selectedList = null,
}) {
  const resolvedRouteData =
    routeData && typeof routeData === 'object' ? routeData : EMPTY_ROUTE_DATA;
  const rawSectionState = useAccountSectionPage({
    activeListId,
    activeTab,
    auth,
    collectionPreviewLimits,
    initialCollections: resolvedRouteData.initialCollections ?? null,
    initialFollowRelationship: resolvedRouteData.initialFollowRelationship ?? null,
    initialProfile: resolvedRouteData.initialProfile ?? null,
    initialResolvedUserId: resolvedRouteData.initialResolvedUserId ?? null,
    initialResolveError: resolvedRouteData.initialResolveError ?? null,
    selectedList,
    username: resolvedRouteData.username,
  });
  const sectionState = useMemo(
    () => ({
      ...rawSectionState,
      username: resolvedRouteData.username ?? null,
    }),
    [rawSectionState, resolvedRouteData.username],
  );
  const sectionProviderValue = useMemo(() => ({ auth, ...sectionState }), [auth, sectionState]);

  return {
    routeData: resolvedRouteData,
    sectionProviderValue,
    sectionState,
  };
}

export function AccountSectionStateProvider({ children, value = null }) {
  const resolvedValue = useMemo(
    () => ({
      ...DEFAULT_ACCOUNT_SECTION_STATE,
      ...(value ?? {}),
      auth: value?.auth || DEFAULT_ACCOUNT_SECTION_STATE.auth,
    }),
    [value],
  );

  return (
    <AccountSectionStateContext.Provider value={resolvedValue}>
      {children}
    </AccountSectionStateContext.Provider>
  );
}

export function useAccountSectionState() {
  return useContext(AccountSectionStateContext);
}

export function buildAccountPageShellProps(sectionState, overrides = null) {
  return {
    activeSection: overrides?.activeSection ?? 'overview',
    followerCount: sectionState.followerCount,
    followState: sectionState.followState,
    followingCount: sectionState.followingCount,
    isLoading: sectionState.isPageLoading,
    isFollowLoading: sectionState.isFollowLoading,
    isOwner: sectionState.isOwner,
    likesCount: sectionState.likeCount,
    listsCount: sectionState.listCount,
    onFollow: sectionState.handleFollow,
    onOpenFollowList: sectionState.handleOpenFollowList,
    profile: sectionState.profile,
    resolvedUserId: sectionState.resolvedUserId,
    skeletonVariant: overrides?.skeletonVariant ?? 'overview',
    username: sectionState.username,
    watchedCount: sectionState.profile?.watchedCount ?? 0,
    watchlistCount: sectionState.watchlistCount,
  };
}


// ============================================================================
// FILE: domains/account/hooks/collections.hooks.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/modules/notification';
import { TMDB_IMG } from '@/shared/constants';
import {
  getLikeDocRef,
  removeUserLike,
  subscribeToUserLikes,
} from '@/domains/media/client/collections/likes';
import {
  toggleUserListItem,
  subscribeToUserLists,
  subscribeToLikedLists,
} from '@/domains/media/client/collections/lists';
import {
  getWatchlistDocRef,
  removeUserWatchedItem,
  removeUserWatchlistItem,
  subscribeToUserWatched,
  subscribeToUserWatchlist,
} from '@/domains/media/client/collections/watched-watchlist';
import { updateUserMediaPosition } from '@/domains/media/utils/user-media';
import {
  getMediaTitle,
  notifyAccountLoadError,
  removeAccountCollectionItem,
} from '@/domains/account/utils';

export const EMPTY_COLLECTION_COUNTS = Object.freeze({
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
  likedLists: 0,
});

export const UNRESOLVED_COLLECTION_COUNTS = Object.freeze({
  likes: null,
  lists: null,
  watched: null,
  watchlist: null,
  likedLists: null,
});

const EMPTY_COLLECTION_ITEMS = Object.freeze({
  likes: [],
  lists: [],
  watched: [],
  watchlist: [],
  likedLists: [],
});

function normalizeCollectionCount(value) {
  if (value === null || value === undefined) return null;
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function getCollectionItems(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(initialCollections?.[key])) return [];
  return initialCollections[key];
}

function getCollectionCount(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot) return null;
  return normalizeCollectionCount(initialCollections?.counts?.[key]);
}

function hasUsableSeededItems(items, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(items)) return false;

  // An empty server snapshot can also be the fallback from an optional load
  // timeout. Let the client subscription confirm empty collections so the
  // Overview renders a skeleton instead of a premature empty state.
  return items.length > 0;
}

export function getCollectionPreviewLimits(previewLimits = null) {
  return {
    likes: Number(previewLimits?.likes) || 0,
    lists: Number(previewLimits?.lists) || 0,
    watched: Number(previewLimits?.watched) || 0,
    watchlist: Number(previewLimits?.watchlist) || 0,
  };
}

export function hasAnyCollectionPreviewLimit(previewLimits = {}) {
  return Object.values(previewLimits).some((value) => Number(value) > 0);
}

export function createCollectionCountsForUnavailableState(isPreviewOnlyMode) {
  return isPreviewOnlyMode ? UNRESOLVED_COLLECTION_COUNTS : EMPTY_COLLECTION_COUNTS;
}

export function createSeededCollectionState({ initialCollections = null, resolvedUserId }) {
  const hasSeededCollectionSnapshot =
    Boolean(initialCollections?.userId) &&
    Boolean(resolvedUserId) &&
    initialCollections.userId === resolvedUserId;

  const items = {
    likes: getCollectionItems(initialCollections, 'likes', hasSeededCollectionSnapshot),
    lists: getCollectionItems(initialCollections, 'lists', hasSeededCollectionSnapshot),
    watched: getCollectionItems(initialCollections, 'watched', hasSeededCollectionSnapshot),
    watchlist: getCollectionItems(initialCollections, 'watchlist', hasSeededCollectionSnapshot),
    likedLists: getCollectionItems(initialCollections, 'likedLists', hasSeededCollectionSnapshot),
  };
  const counts = {
    likes: getCollectionCount(initialCollections, 'likes', hasSeededCollectionSnapshot),
    lists: getCollectionCount(initialCollections, 'lists', hasSeededCollectionSnapshot),
    watched: getCollectionCount(initialCollections, 'watched', hasSeededCollectionSnapshot),
    watchlist: getCollectionCount(initialCollections, 'watchlist', hasSeededCollectionSnapshot),
    likedLists: getCollectionCount(initialCollections, 'likedLists', hasSeededCollectionSnapshot),
  };

  return {
    counts: hasSeededCollectionSnapshot ? counts : UNRESOLVED_COLLECTION_COUNTS,
    hasSeededCollectionSnapshot,
    hasSeededItems: {
      likes: hasUsableSeededItems(items.likes, hasSeededCollectionSnapshot),
      lists: hasUsableSeededItems(items.lists, hasSeededCollectionSnapshot),
      watched: hasUsableSeededItems(items.watched, hasSeededCollectionSnapshot),
      watchlist: hasUsableSeededItems(items.watchlist, hasSeededCollectionSnapshot),
      likedLists: hasUsableSeededItems(items.likedLists, hasSeededCollectionSnapshot),
    },
    items,
  };
}

export function getSeededCollectionUsage({ hasSeededItems, shouldForcePrivateRefresh }) {
  return {
    likes: Boolean(hasSeededItems?.likes && !shouldForcePrivateRefresh),
    lists: Boolean(hasSeededItems?.lists && !shouldForcePrivateRefresh),
    watched: Boolean(hasSeededItems?.watched && !shouldForcePrivateRefresh),
    watchlist: Boolean(hasSeededItems?.watchlist && !shouldForcePrivateRefresh),
    likedLists: Boolean(hasSeededItems?.likedLists && !shouldForcePrivateRefresh),
  };
}

function normalizeMediaIdentity(item = {}) {
  const mediaKey = String(item?.mediaKey || '').trim();
  if (mediaKey) return mediaKey;

  const entityType = String(item?.entityType || item?.media_type || '')
    .trim()
    .toLowerCase();
  const entityId = String(item?.entityId || item?.id || '').trim();
  if (!entityType || !entityId) return '';
  return `${entityType}:${entityId}`;
}

function hasGenreMetadata(item = {}) {
  return (
    (Array.isArray(item?.genre_ids) && item.genre_ids.length > 0) ||
    (Array.isArray(item?.genreNames) && item.genreNames.length > 0) ||
    (Array.isArray(item?.genres) && item.genres.length > 0)
  );
}

export function mergeCollectionItemsWithExistingMetadata(currentItems = [], nextItems = []) {
  const previousItemMap = new Map(
    (Array.isArray(currentItems) ? currentItems : [])
      .map((item) => [normalizeMediaIdentity(item), item])
      .filter(([key]) => Boolean(key)),
  );

  return (Array.isArray(nextItems) ? nextItems : []).map((item) => {
    if (hasGenreMetadata(item)) return item;
    const previousItem = previousItemMap.get(normalizeMediaIdentity(item));
    if (!previousItem || !hasGenreMetadata(previousItem)) return item;

    return {
      ...item,
      genreNames: Array.isArray(previousItem.genreNames)
        ? previousItem.genreNames
        : item.genreNames,
      genre_ids: Array.isArray(previousItem.genre_ids) ? previousItem.genre_ids : item.genre_ids,
      genres: Array.isArray(previousItem.genres) ? previousItem.genres : item.genres,
    };
  });
}

function createRemoveConfirmation({ item, onCancel, onConfirm, scope }) {
  const poster = item?.poster_path || item?.posterPath;
  return {
    title: `Remove ${scope.title}?`,
    description: `${getMediaTitle(item)} will be removed from your ${scope.descriptionTarget}.`,
    confirmText: 'Remove',
    confirmLoadingText: 'Removing',
    isDestructive: true,
    icon: poster ? `${TMDB_IMG}/w342${poster}` : undefined,
    onCancel,
    onConfirm,
  };
}

async function removeWithOptimisticState({
  item,
  serviceCall,
  setConfirmation,
  setItems,
  toast,
  onRemove,
}) {
  let previousItems = null;
  setItems((currentItems) => {
    previousItems = currentItems;
    return removeAccountCollectionItem(currentItems, item);
  });

  try {
    await serviceCall();
    setConfirmation(null);
    onRemove?.(item);
  } catch (error) {
    if (previousItems) setItems(previousItems);
    toast.error(error?.message || 'The item could not be removed');
    throw error;
  }
}

export function useAccountCollectionRemoveActions({
  auth,
  decrementCollectionCount,
  isOwner,
  selectedList,
  setItemRemoveConfirmation,
  setLikes,
  setListItems,
  setWatched,
  setWatchlist,
  toast,
}) {
  const canMutateCollection = isOwner && Boolean(auth.user?.id);
  const clearConfirmation = useCallback(
    () => setItemRemoveConfirmation(null),
    [setItemRemoveConfirmation],
  );

  const handleRemoveListItem = useCallback(
    async (item) => {
      if (!canMutateCollection || !selectedList) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          toggleUserListItem({ listId: selectedList.id, media: item, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setListItems,
        toast,
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      selectedList,
      setItemRemoveConfirmation,
      setListItems,
      toast,
    ],
  );

  const handleRemoveLike = useCallback(
    async (item) => {
      if (!canMutateCollection) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          removeUserLike({ media: item, mediaKey: item?.mediaKey || null, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setLikes,
        toast,
        onRemove: () => decrementCollectionCount?.('likes'),
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      decrementCollectionCount,
      setItemRemoveConfirmation,
      setLikes,
      toast,
    ],
  );

  const handleRemoveWatchlistItem = useCallback(
    async (item) => {
      if (!canMutateCollection) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          removeUserWatchlistItem({
            media: item,
            mediaKey: item?.mediaKey || null,
            userId: auth.user.id,
          }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setWatchlist,
        toast,
        onRemove: () => decrementCollectionCount?.('watchlist'),
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      decrementCollectionCount,
      setItemRemoveConfirmation,
      setWatchlist,
      toast,
    ],
  );

  const handleRemoveWatchedItem = useCallback(
    async (item) => {
      if (!canMutateCollection) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          removeUserWatchedItem({
            media: item,
            mediaKey: item?.mediaKey || null,
            userId: auth.user.id,
          }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setWatched,
        toast,
        onRemove: () => decrementCollectionCount?.('watched'),
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      decrementCollectionCount,
      setItemRemoveConfirmation,
      setWatched,
      toast,
    ],
  );

  const requestRemove = useCallback(
    ({ item, onConfirm, scope }) => {
      if (!isOwner) return;
      setItemRemoveConfirmation(
        createRemoveConfirmation({
          item,
          onCancel: clearConfirmation,
          onConfirm: () => onConfirm(item),
          scope,
        }),
      );
    },
    [clearConfirmation, isOwner, setItemRemoveConfirmation],
  );

  return {
    handleRemoveLike,
    handleRemoveListItem,
    handleRemoveWatchedItem,
    handleRemoveWatchlistItem,
    handleRequestRemoveLike: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveLike,
        scope: { descriptionTarget: 'likes', title: 'Like' },
      }),
    handleRequestRemoveListItem: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveListItem,
        scope: { descriptionTarget: 'this list', title: 'List Item' },
      }),
    handleRequestRemoveWatchedItem: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveWatchedItem,
        scope: { descriptionTarget: 'watched titles', title: 'Watched Item' },
      }),
    handleRequestRemoveWatchlistItem: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveWatchlistItem,
        scope: { descriptionTarget: 'watchlist', title: 'Watchlist Item' },
      }),
  };
}

function getCollectionItemReference({ item, selectedList, tab, userId }) {
  if (tab === 'likes') return getLikeDocRef(userId, item);
  if (tab === 'watchlist') return getWatchlistDocRef(userId, item);
  if (tab !== 'lists' || !selectedList?.id) return null;

  const id = item?.mediaKey || item?.entityId || item?.id || null;
  if (!id) return null;

  return {
    id,
    listId: selectedList.id,
    table: 'list_items',
    userId,
  };
}

export function useAccountCollectionReorderActions({
  auth,
  isOwner,
  selectedList,
  setLikes,
  setListItems,
  setWatchlist,
  toast,
}) {
  return useCallback(
    async (nextItems, tab) => {
      const userId = auth.user?.id;
      const setItems =
        tab === 'likes'
          ? setLikes
          : tab === 'watchlist'
            ? setWatchlist
            : tab === 'lists'
              ? setListItems
              : null;

      if (!isOwner || !userId || !setItems || !Array.isArray(nextItems)) return;

      let previousItems = null;
      setItems((currentItems) => {
        previousItems = currentItems;
        return nextItems;
      });

      try {
        const updatedAt = Date.now();
        const updates = nextItems
          .map((item, index) => {
            const reference = getCollectionItemReference({ item, selectedList, tab, userId });
            return reference ? updateUserMediaPosition(reference, updatedAt - index) : null;
          })
          .filter(Boolean);

        await Promise.all(updates);
      } catch (error) {
        if (previousItems) setItems(previousItems);
        toast.error('Could not save custom order');
        throw error;
      }
    },
    [auth.user?.id, isOwner, selectedList, setLikes, setListItems, setWatchlist, toast],
  );
}

const COLLECTION_SUBSCRIPTIONS = Object.freeze([
  Object.freeze({
    key: 'likes',
    label: 'Likes',
    mergeMetadata: true,
    subscribe: subscribeToUserLikes,
  }),
  Object.freeze({
    key: 'watched',
    label: 'Watched movies',
    mergeMetadata: true,
    subscribe: subscribeToUserWatched,
  }),
  Object.freeze({
    key: 'watchlist',
    label: 'Watchlist',
    mergeMetadata: true,
    subscribe: subscribeToUserWatchlist,
  }),
  Object.freeze({
    key: 'lists',
    label: 'Lists',
    mergeMetadata: false,
    subscribe: subscribeToUserLists,
  }),
  Object.freeze({
    key: 'likedLists',
    label: 'Liked lists',
    mergeMetadata: false,
    subscribe: subscribeToLikedLists,
  }),
]);

function subscribeToAccountCollection({
  config,
  isDisposed,
  limitCount,
  seededItems,
  setCollectionCounts,
  setItems,
  setLoading,
  toast,
  userId,
}) {
  const hasSeededCollectionItems = Array.isArray(seededItems);

  return config.subscribe(
    userId,
    (nextItems) => {
      if (isDisposed()) return;
      const items = Array.isArray(nextItems) ? nextItems : [];

      setItems((currentItems) =>
        config.mergeMetadata
          ? mergeCollectionItemsWithExistingMetadata(currentItems, items)
          : items,
      );
      setCollectionCounts((currentCounts) => ({
        ...currentCounts,
        [config.key]: limitCount > 0 ? currentCounts[config.key] : items.length,
      }));
      setLoading(false);
    },
    {
      emitCachedPayloadOnSubscribe: hasSeededCollectionItems,
      fetchOnSubscribe: true,
      limitCount,
      onError: (error) => {
        if (isDisposed()) return;
        setLoading(false);
        notifyAccountLoadError(toast, error, config.label);
      },
      refreshOnSubscribe: !hasSeededCollectionItems,
      seededItems,
    },
  );
}

function applyCollectionSnapshot({
  counts,
  items,
  setCollectionCounts,
  setItemsByKey,
  setLoadingByKey,
}) {
  Object.entries(setItemsByKey).forEach(([key, setItems]) => {
    setItems(items[key] || []);
    setLoadingByKey[key](false);
  });
  setCollectionCounts(counts);
}

export function useAccountCollections({
  activeTab = null,
  authIsAuthenticated,
  authIsReady,
  canViewPrivateContent,
  initialCollections = null,
  isOwner,
  isPrivateProfile,
  previewLimits = null,
  resolvedUserId,
}) {
  const toast = useToast();
  const normalizedPreviewLimits = useMemo(
    () => getCollectionPreviewLimits(previewLimits),
    [previewLimits],
  );
  const seededState = useMemo(
    () => createSeededCollectionState({ initialCollections, resolvedUserId }),
    [initialCollections, resolvedUserId],
  );
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const shouldUseSeeded = useMemo(
    () =>
      getSeededCollectionUsage({
        hasSeededItems: seededState.hasSeededItems,
        shouldForcePrivateRefresh,
      }),
    [seededState.hasSeededItems, shouldForcePrivateRefresh],
  );

  const [likes, setLikes] = useState(seededState.items.likes);
  const [watched, setWatched] = useState(seededState.items.watched);
  const [watchlist, setWatchlist] = useState(seededState.items.watchlist);
  const [lists, setLists] = useState(seededState.items.lists);
  const [likedLists, setLikedLists] = useState(seededState.items.likedLists || []);
  const [collectionCounts, setCollectionCounts] = useState(seededState.counts);
  const [isLikesLoading, setIsLikesLoading] = useState(!shouldUseSeeded.likes);
  const [isWatchedLoading, setIsWatchedLoading] = useState(!shouldUseSeeded.watched);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(!shouldUseSeeded.watchlist);
  const [isListsLoading, setIsListsLoading] = useState(!shouldUseSeeded.lists);
  const [isLikedListsLoading, setIsLikedListsLoading] = useState(!shouldUseSeeded.likedLists);

  useEffect(() => {
    const isPreviewOnlyMode = hasAnyCollectionPreviewLimit(normalizedPreviewLimits);
    const normalizedActiveTab = String(activeTab || '')
      .trim()
      .toLowerCase();
    const shouldScopeByActiveTab = normalizedActiveTab && normalizedActiveTab !== 'overview';
    const activeCollectionKey = shouldScopeByActiveTab ? normalizedActiveTab : null;
    const setItemsByKey = {
      likedLists: setLikedLists,
      likes: setLikes,
      lists: setLists,
      watched: setWatched,
      watchlist: setWatchlist,
    };
    const setLoadingByKey = {
      likedLists: setIsLikedListsLoading,
      likes: setIsLikesLoading,
      lists: setIsListsLoading,
      watched: setIsWatchedLoading,
      watchlist: setIsWatchlistLoading,
    };

    if (!resolvedUserId) {
      applyCollectionSnapshot({
        counts: EMPTY_COLLECTION_COUNTS,
        items: EMPTY_COLLECTION_ITEMS,
        setCollectionCounts,
        setItemsByKey,
        setLoadingByKey,
      });
      return undefined;
    }

    if (!authIsReady) return undefined;

    if (isOwner && !authIsAuthenticated) {
      applyCollectionSnapshot({
        counts: seededState.hasSeededCollectionSnapshot
          ? seededState.counts
          : createCollectionCountsForUnavailableState(isPreviewOnlyMode),
        items: seededState.hasSeededCollectionSnapshot ? seededState.items : EMPTY_COLLECTION_ITEMS,
        setCollectionCounts,
        setItemsByKey,
        setLoadingByKey,
      });
      return undefined;
    }

    let isDisposed = false;
    const hasBeenDisposed = () => isDisposed;

    const unsubscribers = COLLECTION_SUBSCRIPTIONS.map((config) => {
      const shouldSubscribe = !activeCollectionKey || activeCollectionKey === config.key;
      if (!shouldSubscribe) {
        setLoadingByKey[config.key](false);
        return () => {};
      }

      return subscribeToAccountCollection({
        config,
        isDisposed: hasBeenDisposed,
        limitCount: normalizedPreviewLimits[config.key],
        seededItems: shouldUseSeeded[config.key] ? seededState.items[config.key] : null,
        setCollectionCounts,
        setItems: setItemsByKey[config.key],
        setLoading: setLoadingByKey[config.key],
        toast,
        userId: resolvedUserId,
      });
    });

    return () => {
      isDisposed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    activeTab,
    authIsAuthenticated,
    authIsReady,
    isOwner,
    normalizedPreviewLimits,
    resolvedUserId,
    seededState.counts,
    seededState.hasSeededCollectionSnapshot,
    seededState.items,
    shouldUseSeeded,
    toast,
  ]);

  return {
    collectionCounts,
    isLoadingCollections:
      isLikesLoading ||
      isWatchedLoading ||
      isWatchlistLoading ||
      isListsLoading ||
      isLikedListsLoading,
    isLikedListsLoading,
    isLikesLoading,
    isListsLoading,
    isWatchedLoading,
    isWatchlistLoading,
    likedLists,
    likes,
    lists,
    setCollectionCounts,
    setLikedLists,
    setLikes,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  };
}


// ============================================================================
// FILE: domains/account/hooks/feed-state.hooks.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export function hasMatchingSeededFeed({
  expectedValue = null,
  initialFeed = null,
  resolvedUserId = null,
  valueKey = 'mode',
}) {
  if (!initialFeed?.userId || !resolvedUserId || initialFeed.userId !== resolvedUserId)
    return false;
  if (!valueKey) return true;
  return (initialFeed?.[valueKey] ?? expectedValue) === expectedValue;
}

export function shouldBlockAccountFeedLoad({
  canViewPrivateContent,
  hasSeededFeed = false,
  isOwner,
  isPrivateProfile,
  isViewerReady,
  resolvedUserId,
}) {
  if (hasSeededFeed) return false;
  if (!isViewerReady || !resolvedUserId) return true;
  return !isOwner && isPrivateProfile && !canViewPrivateContent;
}

export function useSeededFeedState(initialFeed = null) {
  const [items, setItems] = useState(Array.isArray(initialFeed?.items) ? initialFeed.items : []);
  const [cursor, setCursor] = useState(initialFeed?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(Boolean(initialFeed?.hasMore));
  const [totalCount, setTotalCount] = useState(
    Number.isFinite(Number(initialFeed?.totalCount))
      ? Math.max(0, Math.floor(Number(initialFeed.totalCount)))
      : Array.isArray(initialFeed?.items)
        ? initialFeed.items.length
        : 0,
  );
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(initialFeed?.error || null);

  const resetFeed = useCallback(() => {
    setItems([]);
    setCursor(null);
    setFeedError(null);
    setHasMore(false);
    setTotalCount(0);
    setIsFeedLoading(false);
  }, []);

  const applyFeedResult = useCallback((result, { append = false } = {}) => {
    const incomingItems = Array.isArray(result?.items) ? result.items : [];
    const explicitTotalCount = Number.isFinite(Number(result?.totalCount))
      ? Math.max(0, Math.floor(Number(result.totalCount)))
      : null;

    setItems((current) => (append ? [...current, ...incomingItems] : incomingItems));
    setCursor(result?.nextCursor ?? null);
    setFeedError(null);
    setHasMore(Boolean(result?.hasMore));

    if (explicitTotalCount !== null) {
      setTotalCount(explicitTotalCount);
    } else if (append) {
      setTotalCount((current) => current + incomingItems.length);
    } else {
      setTotalCount(incomingItems.length);
    }
  }, []);

  const syncFeed = useCallback((nextFeed = null) => {
    const nextItems = Array.isArray(nextFeed?.items) ? nextFeed.items : [];
    const nextTotalCount = Number.isFinite(Number(nextFeed?.totalCount))
      ? Math.max(0, Math.floor(Number(nextFeed.totalCount)))
      : nextItems.length;

    setItems(nextItems);
    setCursor(nextFeed?.nextCursor ?? null);
    setFeedError(nextFeed?.error || null);
    setHasMore(Boolean(nextFeed?.hasMore));
    setTotalCount(nextTotalCount);
    setIsFeedLoading(false);
  }, []);

  return useMemo(
    () => ({
      applyFeedResult,
      cursor,
      feedError,
      hasMore,
      isFeedLoading,
      items,
      resetFeed,
      setFeedError,
      setIsFeedLoading,
      setItems,
      setTotalCount,
      syncFeed,
      totalCount,
    }),
    [
      applyFeedResult,
      cursor,
      feedError,
      hasMore,
      isFeedLoading,
      items,
      resetFeed,
      setFeedError,
      setIsFeedLoading,
      setItems,
      setTotalCount,
      syncFeed,
      totalCount,
    ],
  );
}

export function useDeferredPreviewFeed({
  canLoad,
  hasSeededFeed = false,
  initialFeed = null,
  loadFeed,
  onLoadError = null,
}) {
  const feedState = useSeededFeedState(initialFeed);
  const { applyFeedResult, resetFeed, setFeedError, setIsFeedLoading, syncFeed } = feedState;

  const hasUsableSeededFeed = hasSeededFeed && Array.isArray(initialFeed?.items);

  useEffect(() => {
    if (hasUsableSeededFeed) syncFeed(initialFeed);
  }, [hasUsableSeededFeed, initialFeed, syncFeed]);

  useEffect(() => {
    if (!canLoad && !hasUsableSeededFeed) {
      resetFeed();
      return undefined;
    }
    if (hasUsableSeededFeed) {
      setIsFeedLoading(false);
      return undefined;
    }

    let ignore = false;
    async function loadDeferredFeed() {
      setIsFeedLoading(true);
      setFeedError(null);
      const result = await loadFeed().then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason }),
      );
      if (ignore) return;
      if (result.status === 'fulfilled') {
        applyFeedResult(result.value);
      } else {
        resetFeed();
        const nextError = typeof onLoadError === 'function' ? onLoadError(result.reason) : null;
        if (nextError) setFeedError(nextError);
      }
      setIsFeedLoading(false);
    }

    const timer = setTimeout(loadDeferredFeed, 150);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [
    applyFeedResult,
    canLoad,
    hasSeededFeed,
    hasUsableSeededFeed,
    loadFeed,
    onLoadError,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
  ]);

  return feedState;
}


// ============================================================================
// FILE: domains/account/hooks/index.js
// ============================================================================

export * from './collections.hooks.js';
export * from './account-overview-state.js';
export * from './account-edit-page-state.js';
export * from './page.hooks.js';
export * from './security.hooks.js';


// ============================================================================
// FILE: domains/account/hooks/list-items.hooks.js
// ============================================================================

'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/modules/notification';
import { subscribeToUserListItems } from '@/domains/media/client/collections/lists';
import { notifyAccountLoadError } from '@/domains/account/utils';

export function useAccountListItems({
  activeListId,
  activeTab,
  canViewPrivateContent,
  isOwner,
  isPrivateProfile,
  resolvedUserId,
}) {
  const toast = useToast();
  const [listItems, setListItems] = useState([]);
  const [isLoadingListItems, setIsLoadingListItems] = useState(false);

  useEffect(() => {
    if (activeTab !== 'lists' || !resolvedUserId || !activeListId) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    setIsLoadingListItems(true);
    return subscribeToUserListItems(
      resolvedUserId,
      activeListId,
      (nextItems) => {
        setListItems(nextItems);
        setIsLoadingListItems(false);
      },
      {
        activeTab,
        onError: (err) => {
          setListItems([]);
          notifyAccountLoadError(toast, err, 'List items could not be loaded');
          setIsLoadingListItems(false);
        },
      },
    );
  }, [
    activeListId,
    activeTab,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile,
    resolvedUserId,
    toast,
  ]);

  return { isLoadingListItems, listItems, setListItems };
}


// ============================================================================
// FILE: domains/account/hooks/media-feed-state.js
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  MEDIA_FILTER_QUERY_KEYS,
  buildCollectionBasePath,
  buildManagedQueryString,
  parseMediaFilters,
  parsePageFromSearch,
  toMediaQueryValues,
} from '@/domains/account/ui/filters/filtering';

function parseMediaFeedState(searchString, allowedEyeFlags) {
  const params = new URLSearchParams(searchString);
  return {
    media: parseMediaFilters(params, { allowedEyeFlags }),
    page: parsePageFromSearch(params),
  };
}

export function useAccountMediaFeedState({ allowedEyeFlags }) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);
  const [viewState, setViewState] = useState(() =>
    parseMediaFeedState(searchString, allowedEyeFlags),
  );

  useEffect(() => {
    setViewState(parseMediaFeedState(searchString, allowedEyeFlags));
  }, [allowedEyeFlags, searchString]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryString = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: MEDIA_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toMediaQueryValues(viewState.media),
    });
    const params = new URLSearchParams(queryString);
    if (viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');

    const nextUrl = params.toString()
      ? `${collectionRootPath}?${params.toString()}`
      : collectionRootPath;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [collectionRootPath, viewState]);

  return {
    collectionRootPath,
    updateView: (updates) => setViewState((current) => ({ ...current, ...updates })),
    viewState,
  };
}


// ============================================================================
// FILE: domains/account/hooks/page-actions.hooks.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useModal } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { deleteUserList } from '@/domains/media/client/collections/lists';
import {
  FOLLOW_STATUSES,
  cancelFollowRequest,
  followUser,
  unfollowUser,
} from '@/domains/social/client/follows';
import { getUserAvatarUrl } from '@/domains/account/utils';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { useNavigationActions } from '@/modules/nav';
import { createListEditorSurfaceEntry } from '@/domains/account/ui/nav-surfaces/list-editor-surface';
import {
  useAccountCollectionRemoveActions,
  useAccountCollectionReorderActions,
} from './collections.hooks';

export function useAccountPageActions({
  activeListId,
  auth,
  canViewPrivateContent = false,
  followRelationship,
  isOwner,
  isPrivateProfile = false,
  profile,
  resolvedUserId,
  selectedList,
  listItems = [],
  setFollowRelationship,
  setFollowerCount,
  setFollowingCount,
  setLikes,
  setCollectionCounts,
  setLists,
  setListItems,
  setWatched,
  setWatchlist,
  updateQuery,
  profileHandle,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { openModal } = useModal();
  const { openSurface } = useNavigationActions();

  const decrementCollectionCount = useCallback(
    (key) => {
      if (typeof setCollectionCounts !== 'function') return;
      setCollectionCounts((current) => {
        const value = Number(current?.[key]);
        return {
          ...current,
          [key]: Number.isFinite(value) ? Math.max(0, value - 1) : (current?.[key] ?? null),
        };
      });
    },
    [setCollectionCounts],
  );

  const [itemRemoveConfirmation, setItemRemoveConfirmation] = useState(null);
  const [listDeleteConfirmation, setListDeleteConfirmation] = useState(null);
  const [unfollowConfirmation, setUnfollowConfirmation] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );

  const handleEditList = useCallback(
    (list) => {
      const targetList = list || selectedList;
      if (!isOwner || !auth.user?.id || !targetList?.id) return;
      openSurface(
        createListEditorSurfaceEntry({
          isOwner: true,
          userId: auth.user.id,
          initialData: targetList,
          initialItems:
            targetList?.id === selectedList?.id
              ? listItems
              : targetList?.items || targetList?.previewItems || [],
          onItemsChange: targetList?.id === selectedList?.id ? setListItems : null,
          onSuccess: (updatedList) => {
            if (typeof setLists === 'function') {
              setLists((cur) => {
                if (!Array.isArray(cur)) return cur;
                return cur.map((l) => (l.id === updatedList.id ? { ...l, ...updatedList } : l));
              });
            }
          },
        }),
      );
    },
    [auth.user?.id, isOwner, listItems, openSurface, selectedList, setListItems, setLists],
  );

  const handleDeleteList = useCallback(
    (list) => {
      const targetList = list || selectedList;
      if (!isOwner || !auth.user?.id || !targetList?.id) return;

      setListDeleteConfirmation({
        title: 'Delete List?',
        confirmText: 'Delete List',
        description: 'This removes the list and all items inside it from your profile',
        isDestructive: true,
        onCancel: () => setListDeleteConfirmation(null),
        onConfirm: async () => {
          let previousLists = null;
          if (typeof setLists === 'function') {
            setLists((cur) => {
              previousLists = cur;
              return cur.filter((c) => c?.id !== targetList.id);
            });
          }
          try {
            await deleteUserList({ listId: targetList.id, userId: auth.user.id });
            decrementCollectionCount('lists');
            setListDeleteConfirmation(null);
            if (activeListId === targetList.id) {
              if (pathname.includes('/lists/') && profileHandle) {
                router.push(`/account/${profileHandle}/lists`);
              } else {
                updateQuery({ list: null, tab: 'lists' });
              }
            }
          } catch (error) {
            if (previousLists && typeof setLists === 'function') setLists(previousLists);
            toast.error(error?.message || 'The list could not be deleted');
            throw error;
          }
        },
      });
    },
    [
      activeListId,
      auth.user?.id,
      decrementCollectionCount,
      isOwner,
      pathname,
      profileHandle,
      router,
      selectedList,
      setLists,
      toast,
      updateQuery,
    ],
  );

  const handleConfirmUnfollow = useCallback(async () => {
    if (!auth.user?.id || !profile?.id) return;
    const previousRelationship = followRelationship;

    if (typeof setFollowRelationship === 'function') {
      setFollowRelationship((prev) => ({
        ...prev,
        canViewPrivateContent: prev.isPrivateProfile ? false : prev.canViewPrivateContent,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isTargetProfileLoaded: true,
        outboundStatus: null,
        showFollowBack: prev.inboundStatus === FOLLOW_STATUSES.ACCEPTED,
      }));
    }
    if (typeof setFollowerCount === 'function') {
      setFollowerCount((count) => Math.max(0, count - 1));
    }

    setIsFollowLoading(true);
    try {
      await unfollowUser(auth.user.id, profile.id);
      setUnfollowConfirmation(null);
    } catch (error) {
      if (typeof setFollowRelationship === 'function') {
        setFollowRelationship(previousRelationship);
      }
      if (typeof setFollowerCount === 'function') {
        setFollowerCount((count) => Math.max(0, count + 1));
      }
      toast.error(error?.message || 'Follow state could not be updated');
      throw error;
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    auth.user?.id,
    followRelationship,
    profile?.id,
    setFollowRelationship,
    setFollowerCount,
    toast,
  ]);

  const handleSignInRequest = useCallback(() => {
    router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { next: currentPath }));
  }, [currentPath, router]);

  const promptUnfollow = useCallback(() => {
    const handle = profile?.username ? `@${profile.username}` : 'this user';
    const name = profile?.displayName || profile?.username || 'This user';
    setUnfollowConfirmation({
      title: `Unfollow ${handle}`,
      description:
        name === handle
          ? `${handle} will be removed from your following list until you follow again`
          : `${name} ${handle} will be removed from your following list until you follow again`,
      icon: getUserAvatarUrl(profile),
      confirmText: 'Unfollow',
      isDestructive: true,
      onCancel: () => setUnfollowConfirmation(null),
      onConfirm: handleConfirmUnfollow,
    });
  }, [handleConfirmUnfollow, profile]);

  const handleFollow = useCallback(async () => {
    if (!auth.isAuthenticated) {
      handleSignInRequest();
      return;
    }
    if (!auth.user?.id || !profile?.id) return;

    if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) {
      promptUnfollow();
      return;
    }

    const previousRelationship = followRelationship;
    const isCancelRequest = followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING;
    const isTargetPrivate = Boolean(isPrivateProfile || profile?.isPrivate);
    const nextStatus = isCancelRequest
      ? null
      : isTargetPrivate
        ? FOLLOW_STATUSES.PENDING
        : FOLLOW_STATUSES.ACCEPTED;

    if (typeof setFollowRelationship === 'function') {
      setFollowRelationship((prev) => ({
        ...prev,
        canViewPrivateContent:
          prev.canViewPrivateContent || nextStatus === FOLLOW_STATUSES.ACCEPTED,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isPrivateProfile: isTargetPrivate,
        isTargetProfileLoaded: true,
        outboundStatus: nextStatus,
        showFollowBack: false,
      }));
    }
    if (
      !isCancelRequest &&
      nextStatus === FOLLOW_STATUSES.ACCEPTED &&
      typeof setFollowerCount === 'function'
    ) {
      setFollowerCount((count) => Math.max(0, count + 1));
    }

    setIsFollowLoading(true);
    try {
      if (isCancelRequest) {
        await cancelFollowRequest(auth.user.id, profile.id);
      } else {
        await followUser(auth.user.id, profile.id);
      }
    } catch (error) {
      if (typeof setFollowRelationship === 'function') {
        setFollowRelationship(previousRelationship);
      }
      if (
        !isCancelRequest &&
        nextStatus === FOLLOW_STATUSES.ACCEPTED &&
        typeof setFollowerCount === 'function'
      ) {
        setFollowerCount((count) => Math.max(0, count - 1));
      }
      toast.error(error?.message || 'Follow state could not be updated');
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    followRelationship,
    handleConfirmUnfollow,
    handleSignInRequest,
    isPrivateProfile,
    profile,
    promptUnfollow,
    setFollowRelationship,
    setFollowerCount,
    toast,
  ]);

  useEffect(() => {
    if (followRelationship.outboundStatus !== FOLLOW_STATUSES.ACCEPTED) {
      setUnfollowConfirmation(null);
    }
  }, [followRelationship.outboundStatus]);

  const handleEditProfile = useCallback(() => {
    if (!isOwner) return;
    router.push('/account/edit');
  }, [isOwner, router]);

  const handleOpenFollowList = useCallback(
    (type) => {
      if (!resolvedUserId || !profile) return;
      if (isPrivateProfile && !isOwner && !canViewPrivateContent) return;
      openModal(
        'ACCOUNT_SOCIAL_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            canManageRequests: isOwner && profile?.isPrivate === true,
            userId: resolvedUserId,
            tab: type,
          },
        },
      );
    },
    [canViewPrivateContent, isOwner, isPrivateProfile, openModal, profile, resolvedUserId],
  );

  const removeActions = useAccountCollectionRemoveActions({
    auth,
    decrementCollectionCount,
    isOwner,
    selectedList,
    setItemRemoveConfirmation,
    setLikes,
    setListItems,
    setWatched,
    setWatchlist,
    toast,
  });
  const handleReorder = useAccountCollectionReorderActions({
    auth,
    isOwner,
    selectedList,
    setLikes,
    setListItems,
    setWatchlist,
    toast,
  });

  return {
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    ...removeActions,
    handleReorder,
    handleSignInRequest,
    isFollowLoading,
    itemRemoveConfirmation,
    listDeleteConfirmation,
    unfollowConfirmation,
  };
}


// ============================================================================
// FILE: domains/account/hooks/page-data.hooks.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccountClient, useAccountProfile, useResolvedAccountUser } from '@/modules/account';
import { useAuthSessionReady } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { notifyAccountLoadError } from '@/domains/account/utils';
import { useAccountCollections } from './collections.hooks';
import { useAccountListItems } from './list-items.hooks';
import { useAccountRelationshipData, useAccountSocialProof } from './relationship.hooks';

export function useAccountPageData({
  activeListId,
  activeTab,
  auth,
  collectionPreviewLimits = null,
  initialCollections = null,
  initialFollowRelationship = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  isSocialFollowsEnabled,
  username,
}) {
  const isAuthSessionReady = useAuthSessionReady(
    auth.isAuthenticated ? auth.user?.id || null : null,
  );
  const toast = useToast();
  const handleProfileError = useCallback(
    (err) => notifyAccountLoadError(toast, err, 'Profile could not be loaded'),
    [toast],
  );

  const accountClient = useAccountClient();
  const { isResolvingProfile, resolveError, resolvedUserId } = useResolvedAccountUser({
    authUserId: auth.user?.id || null,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const { hasLoadedProfile, profile, setProfile } = useAccountProfile({
    resolvedUserId,
    initialProfile,
    onError: handleProfileError,
  });

  const [isBootstrappingProfile, setIsBootstrappingProfile] = useState(false);
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  useEffect(() => {
    if (
      !username &&
      auth.isAuthenticated &&
      auth.user?.id &&
      resolvedUserId === auth.user.id &&
      hasLoadedProfile &&
      !profile &&
      !bootstrapAttempted
    ) {
      let ignore = false;
      setIsBootstrappingProfile(true);

      if (typeof accountClient?.ensureAccount === 'function') {
        accountClient
          .ensureAccount(auth.user)
          .then((bootstrappedProfile) => {
            if (!ignore && bootstrappedProfile && typeof setProfile === 'function') {
              setProfile(bootstrappedProfile);
            }
          })
          .catch(() => null)
          .finally(() => {
            if (!ignore) {
              setIsBootstrappingProfile(false);
              setBootstrapAttempted(true);
            }
          });
      } else {
        setIsBootstrappingProfile(false);
        setBootstrapAttempted(true);
      }

      return () => {
        ignore = true;
      };
    }
  }, [
    accountClient,
    auth.isAuthenticated,
    auth.user,
    bootstrapAttempted,
    hasLoadedProfile,
    profile,
    resolvedUserId,
    setProfile,
    username,
  ]);

  const isCurrentAccountMissing =
    !username &&
    auth.isAuthenticated &&
    Boolean(resolvedUserId) &&
    !profile &&
    hasLoadedProfile &&
    !isBootstrappingProfile &&
    bootstrapAttempted;
  const isOwner = useMemo(() => {
    if (isCurrentAccountMissing) return false;
    if (!username) return Boolean(auth.user?.id || initialResolvedUserId);
    if (!auth.isAuthenticated || !auth.user?.id) return false;
    return profile?.id === auth.user.id || resolvedUserId === auth.user.id;
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    initialResolvedUserId,
    isCurrentAccountMissing,
    profile?.id,
    resolvedUserId,
    username,
  ]);

  const isPrivateProfile = profile?.isPrivate === true;
  const {
    followerCount,
    setFollowerCount,
    followingCount,
    setFollowingCount,
    followRelationship,
    setFollowRelationship,
    pendingFollowRequestCount,
  } = useAccountRelationshipData({
    authIsReady: auth.isReady && isAuthSessionReady,
    authUserId: auth.user?.id || null,
    canManageRequests: Boolean(isOwner && isSocialFollowsEnabled && isPrivateProfile),
    initialFollowRelationship,
    isOwner,
    isPrivateProfile,
    isProfileLoaded: Boolean(profile),
    publicFollowerCount: Number(profile?.followerCount || 0),
    publicFollowingCount: Number(profile?.followingCount || 0),
    resolvedUserId,
  });

  const hasKnownPrivacyState =
    !resolvedUserId || isOwner || Boolean(profile) || followRelationship.isTargetProfileLoaded;
  const normalizedIsPrivateProfile = hasKnownPrivacyState
    ? isPrivateProfile || followRelationship.isPrivateProfile
    : Boolean(resolvedUserId) && !isOwner;
  const canViewPrivateContent =
    isOwner || !normalizedIsPrivateProfile || followRelationship.canViewPrivateContent;

  const {
    collectionCounts,
    isLoadingCollections,
    isLikesLoading,
    isListsLoading,
    isWatchedLoading,
    isWatchlistLoading,
    likedLists = [],
    likes,
    lists,
    setLikes,
    setCollectionCounts,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  } = useAccountCollections({
    activeTab,
    authIsAuthenticated: auth.isAuthenticated,
    authIsReady: auth.isReady && isAuthSessionReady,
    canViewPrivateContent,
    initialCollections,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    previewLimits: collectionPreviewLimits,
    resolvedUserId,
  });

  const { isLoadingListItems, listItems, setListItems } = useAccountListItems({
    activeListId,
    activeTab,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    resolvedUserId,
  });
  const { profileSocialProof } = useAccountSocialProof({
    authUserId: auth.user?.id || null,
    canViewPrivateContent,
    isOwner,
    isSocialFollowsEnabled,
    resolvedUserId,
  });

  return {
    canViewPrivateContent,
    favoriteShowcase: Array.isArray(profile?.favoriteShowcase) ? profile.favoriteShowcase : [],
    followerCount,
    followingCount,
    followRelationship,
    hasResolvedAccessState: true,
    likeCount: collectionCounts.likes === null ? likes.length : collectionCounts.likes,
    isLoadingCollections,
    isLikesLoading,
    isListsLoading,
    isWatchedLoading,
    isWatchlistLoading,
    isLoadingListItems,
    isAuthSessionReady,
    isCurrentAccountMissing,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    isResolvingProfile,
    likedLists,
    likes,
    listCount: collectionCounts.lists === null ? lists.length : collectionCounts.lists,
    listItems,
    lists,
    pendingFollowRequestCount,
    profile,
    profileSocialProof,
    resolveError,
    resolvedUserId,
    setFollowRelationship,
    setFollowerCount,
    setFollowingCount,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    watched,
    watchedCount: collectionCounts.watched === null ? watched.length : collectionCounts.watched,
    watchlist,
    watchlistCount:
      collectionCounts.watchlist === null ? watchlist.length : collectionCounts.watchlist,
  };
}


// ============================================================================
// FILE: domains/account/hooks/page.hooks.js
// ============================================================================

'use client';

export { useAccountRelationshipData, useAccountSocialProof } from './relationship.hooks';
export { useAccountListItems } from './list-items.hooks';
export { useAccountPageData } from './page-data.hooks';
export { useAccountPageActions } from './page-actions.hooks';
export {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useDeferredPreviewFeed,
  useSeededFeedState,
} from './feed-state.hooks';
export { useAccountSectionPage } from './section-page.hooks';
export { useAccountEditData } from './account-edit-data.hooks';


// ============================================================================
// FILE: domains/account/hooks/relationship.hooks.js
// ============================================================================

'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAccountSocialProof } from '@/domains/media/client/social-proof';
import {
  FOLLOW_STATUSES,
  primeFollowRelationshipState,
  subscribeToFollowRelationship,
  subscribeToFollowers,
  subscribeToFollowing,
} from '@/domains/social/client/follows';
import { logDataError } from '@/domains/account/utils';

export function useAccountRelationshipData({
  authIsReady,
  authUserId,
  canManageRequests,
  initialFollowRelationship = null,
  isOwner,
  isPrivateProfile,
  isProfileLoaded,
  publicFollowerCount = 0,
  publicFollowingCount = 0,
  resolvedUserId,
}) {
  const [followRelationship, setFollowRelationship] = useState(() => ({
    canViewPrivateContent: initialFollowRelationship?.canViewPrivateContent ?? false,
    inboundStatus: initialFollowRelationship?.inboundStatus ?? null,
    isInboundRelationshipLoaded: Boolean(
      initialFollowRelationship?.isInboundRelationshipLoaded ?? initialFollowRelationship,
    ),
    isOutboundRelationshipLoaded: Boolean(
      initialFollowRelationship?.isOutboundRelationshipLoaded ?? initialFollowRelationship,
    ),
    isPrivateProfile: initialFollowRelationship?.isPrivateProfile ?? Boolean(isPrivateProfile),
    isTargetProfileLoaded: Boolean(
      initialFollowRelationship?.isTargetProfileLoaded ?? isProfileLoaded,
    ),
    outboundStatus: initialFollowRelationship?.outboundStatus ?? null,
    showFollowBack: initialFollowRelationship?.showFollowBack ?? false,
  }));
  const [followerCount, setFollowerCount] = useState(publicFollowerCount);
  const [followingCount, setFollowingCount] = useState(publicFollowingCount);
  const [pendingFollowRequestCount, setPendingFollowRequestCount] = useState(0);

  const followPollingOptions = useMemo(() => ({ hiddenIntervalMs: 60000, intervalMs: 15000 }), []);

  useEffect(() => {
    if (initialFollowRelationship && authUserId && resolvedUserId) {
      primeFollowRelationshipState(authUserId, resolvedUserId, initialFollowRelationship);
    }
  }, [authUserId, initialFollowRelationship, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowRelationship({
        canViewPrivateContent: false,
        inboundStatus: null,
        isInboundRelationshipLoaded: false,
        isOutboundRelationshipLoaded: false,
        isPrivateProfile: false,
        isTargetProfileLoaded: false,
        outboundStatus: null,
        showFollowBack: false,
      });
      return undefined;
    }

    if (isOwner) {
      setFollowRelationship({
        canViewPrivateContent: true,
        inboundStatus: null,
        isInboundRelationshipLoaded: true,
        isOutboundRelationshipLoaded: true,
        isPrivateProfile: Boolean(isPrivateProfile),
        isTargetProfileLoaded: true,
        outboundStatus: null,
        showFollowBack: false,
      });
      return undefined;
    }

    return subscribeToFollowRelationship(
      authUserId || null,
      resolvedUserId,
      (rel) => setFollowRelationship(rel),
      followPollingOptions,
    );
  }, [authIsReady, authUserId, followPollingOptions, isOwner, isPrivateProfile, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowerCount(0);
      setFollowingCount(0);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    const hasKnownPrivacyState =
      isOwner || isProfileLoaded || followRelationship.isTargetProfileLoaded;
    const resolvedIsPrivateProfile = isProfileLoaded
      ? isPrivateProfile
      : followRelationship.isPrivateProfile;

    if (
      !hasKnownPrivacyState ||
      (!isOwner && resolvedIsPrivateProfile && !followRelationship.canViewPrivateContent)
    ) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);
      setPendingFollowRequestCount(0);
      return undefined;
    }

    if (isOwner) {
      setFollowerCount(publicFollowerCount);
      setFollowingCount(publicFollowingCount);

      const unsubFollowers = subscribeToFollowers(
        resolvedUserId,
        (f) => setFollowerCount(f.length),
        {
          ...followPollingOptions,
          onError: () => setFollowerCount(publicFollowerCount),
          status: FOLLOW_STATUSES.ACCEPTED,
        },
      );
      const unsubFollowing = subscribeToFollowing(
        resolvedUserId,
        (f) => setFollowingCount(f.length),
        {
          ...followPollingOptions,
          onError: () => setFollowingCount(publicFollowingCount),
          status: FOLLOW_STATUSES.ACCEPTED,
        },
      );
      const unsubPending = canManageRequests
        ? subscribeToFollowers(
            resolvedUserId,
            (reqs) => setPendingFollowRequestCount(reqs.length),
            {
              ...followPollingOptions,
              enablePendingFallback: false,
              onError: () => setPendingFollowRequestCount(0),
              status: FOLLOW_STATUSES.PENDING,
            },
          )
        : () => {};

      return () => {
        unsubFollowers();
        unsubFollowing();
        unsubPending();
      };
    }

    const unsubFollowers = subscribeToFollowers(resolvedUserId, (f) => setFollowerCount(f.length), {
      ...followPollingOptions,
      onError: () => setFollowerCount(publicFollowerCount),
    });
    const unsubFollowing = subscribeToFollowing(
      resolvedUserId,
      (f) => setFollowingCount(f.length),
      { ...followPollingOptions, onError: () => setFollowingCount(publicFollowingCount) },
    );
    const unsubPending = canManageRequests
      ? subscribeToFollowers(resolvedUserId, (reqs) => setPendingFollowRequestCount(reqs.length), {
          ...followPollingOptions,
          enablePendingFallback: false,
          onError: () => setPendingFollowRequestCount(0),
          status: FOLLOW_STATUSES.PENDING,
        })
      : () => {};

    return () => {
      unsubFollowers();
      unsubFollowing();
      unsubPending();
    };
  }, [
    authIsReady,
    canManageRequests,
    followRelationship.canViewPrivateContent,
    followRelationship.isPrivateProfile,
    followRelationship.isTargetProfileLoaded,
    followPollingOptions,
    isOwner,
    isPrivateProfile,
    isProfileLoaded,
    publicFollowerCount,
    publicFollowingCount,
    resolvedUserId,
  ]);

  return {
    followerCount,
    setFollowerCount,
    followingCount,
    setFollowingCount,
    followRelationship,
    setFollowRelationship,
    pendingFollowRequestCount,
  };
}

export function useAccountSocialProof({
  authUserId,
  canViewPrivateContent,
  isOwner,
  isSocialFollowsEnabled,
  resolvedUserId,
}) {
  const [profileSocialProof, setProfileSocialProof] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (
      !isSocialFollowsEnabled ||
      !authUserId ||
      !resolvedUserId ||
      isOwner ||
      !canViewPrivateContent
    ) {
      setProfileSocialProof(null);
      return undefined;
    }

    getAccountSocialProof({
      canViewPrivateContent,
      targetUserId: resolvedUserId,
      viewerId: authUserId,
    })
      .then((proof) => {
        if (!ignore) setProfileSocialProof(proof);
      })
      .catch((err) => {
        if (!ignore) {
          logDataError('[Profile] Social proof warning:', err);
          setProfileSocialProof(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authUserId, canViewPrivateContent, isOwner, isSocialFollowsEnabled, resolvedUserId]);

  return { profileSocialProof };
}


// ============================================================================
// FILE: domains/account/hooks/section-page.hooks.js
// ============================================================================

'use client';

import { getFollowState } from '@/domains/account/utils';
import { useAccountPageActions } from './page-actions.hooks';
import { useAccountPageData } from './page-data.hooks';

export function useAccountSectionPage({
  activeListId = '',
  activeTab,
  auth,
  collectionPreviewLimits = null,
  initialCollections = null,
  initialFollowRelationship = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  selectedList = null,
  username,
}) {
  const pageData = useAccountPageData({
    activeListId,
    activeTab,
    auth,
    collectionPreviewLimits,
    initialCollections,
    initialFollowRelationship,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    isSocialFollowsEnabled: true,
    username,
  });
  const {
    canViewPrivateContent,
    followRelationship,
    hasResolvedAccessState,
    isAuthSessionReady,
    isCurrentAccountMissing,
    isLoadingCollections,
    isOwner,
    isResolvingProfile,
    isPrivateProfile,
    listItems,
    profile,
    resolvedUserId,
    setFollowRelationship,
    setFollowerCount,
    setFollowingCount,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
  } = pageData;

  const pageActions = useAccountPageActions({
    activeListId,
    auth,
    canViewPrivateContent,
    followRelationship,
    isOwner,
    isPrivateProfile,
    listItems,
    profile,
    resolvedUserId,
    selectedList,
    setFollowRelationship,
    setFollowerCount,
    setFollowingCount,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    updateQuery: () => {},
    profileHandle: username,
  });

  return {
    ...pageActions,
    ...pageData,
    canViewProfileCollections: !isPrivateProfile || isOwner || canViewPrivateContent,
    followState: getFollowState(followRelationship),
    isPageLoading:
      isResolvingProfile ||
      (!isCurrentAccountMissing &&
        Boolean(resolvedUserId) &&
        (!profile || !hasResolvedAccessState)),
    isViewerReady: auth.isReady && isAuthSessionReady,
  };
}


// ============================================================================
// FILE: domains/account/hooks/security.hooks.js
// ============================================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AUTH_PURPOSE,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  clearAccountFeedback,
  completeEmailChangeRequest,
  completePasswordChangeRequest,
  completePasswordSetRequest,
  deleteAccountRequest,
  emitAccountFeedback,
  normalizeEmail,
  normalizeProviderDescriptors,
  resolveSecurityErrorMessage,
} from '@/domains/account/utils';
import { AuthVerificationSurface } from '@/domains/auth/ui';
import {
  AUTH_ROUTES,
  buildAuthHref,
  getOAuthProviderLabel,
  normalizeOAuthProvider,
} from '@/domains/auth/utils';

export function resetLinkedProviderOverrides({
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
}) {
  if (typeof setLinkedProviderIdsOverride === 'function') setLinkedProviderIdsOverride(null);
  if (typeof setLinkedProviderDescriptorsOverride === 'function')
    setLinkedProviderDescriptorsOverride(null);
}

function resolveLinkedProviderIds(session) {
  const providerIds =
    session?.capabilities?.providerIds ||
    session?.user?.metadata?.authCapabilities?.providerIds ||
    session?.user?.metadata?.providerIds ||
    session?.user?.providerIds ||
    [];

  return Array.from(
    new Set(
      (Array.isArray(providerIds) ? providerIds : [])
        .map((provider) =>
          String(provider || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );
}

export async function logCredentialAuditSuccess(event, metadata = {}) {
  try {
    const { logAuditServer } = await import('@/domains/auth/api/audit.server');
    await logAuditServer({ event, metadata });
  } catch {}
}

export async function logCredentialAuditFailure(event, error) {
  try {
    const { logAuditServer } = await import('@/domains/auth/api/audit.server');
    await logAuditServer({ event, metadata: { error: error?.message || 'Action failed' } });
  } catch {}
}

export async function signOutIfRequested(auth, nextAction, { email, router } = {}) {
  if (nextAction !== 'signed_out' || typeof auth?.signOut !== 'function') return;
  await auth.signOut({ reason: 'security-credential-update', redirect: false }).catch(() => {});
  router?.replace?.(buildAuthHref(AUTH_ROUTES.SIGN_IN, { email }));
}

export function redirectToSignInWithEmail(router, email) {
  if (!router || typeof router.push !== 'function') return;
  router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { email }));
}

export function validateEmailChangeInput({
  currentEmail,
  currentPassword,
  newEmail,
  isPasswordLinked,
}) {
  if (isPasswordLinked && !currentPassword) return 'Current password is required';
  if (!newEmail || !newEmail.includes('@')) return 'Valid new email address is required';
  if (currentEmail && newEmail.toLowerCase() === currentEmail.toLowerCase())
    return 'New email must be different from current email';
  return null;
}

export function validateNewPasswordPair(newPassword, confirmPassword) {
  if (!newPassword || newPassword.length < 6) return 'Password must be at least 6 characters';
  if (newPassword !== confirmPassword) return 'Passwords do not match';
  return null;
}

export function validatePasswordChangeInput({
  currentPassword,
  newPassword,
  confirmPassword,
  isPasswordLinked,
}) {
  if (isPasswordLinked && !currentPassword) return 'Current password is required';
  const pairError = validateNewPasswordPair(newPassword, confirmPassword);
  if (pairError) return pairError;
  if (isPasswordLinked && currentPassword === newPassword)
    return 'New password must be different from current password';
  return null;
}

export async function openAccountVerificationPrompt({
  description,
  email,
  openModal,
  openSurface,
  purpose,
  title,
  toast,
}) {
  const verificationEmail = normalizeEmail(email);
  try {
    const config = { header: { description, title }, data: { email: verificationEmail, purpose } };
    if (typeof openSurface === 'function') return openSurface(AuthVerificationSurface, config);
    if (typeof openModal === 'function')
      return openModal('AUTH_VERIFICATION_MODAL', 'bottom', config);
    return { error: new Error('Verification prompt is unavailable'), success: false };
  } catch (error) {
    toast?.error?.(error?.message || 'Verification prompt is unavailable');
    return { error, success: false };
  }
}

export function useAccountCredentialActions({
  auth,
  canUsePasswordSecurity,
  currentAuthEmail,
  emailFlow,
  openModal,
  openSurface,
  passwordFlow,
  setEmailFlow,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  setPasswordFlow,
  toast,
}) {
  const router = useRouter();
  const resetLinkedProviders = useCallback(() => {
    resetLinkedProviderOverrides({
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
    });
  }, [setLinkedProviderDescriptorsOverride, setLinkedProviderIdsOverride]);

  const reauthenticateWithPassword = useCallback(
    async (password) => {
      if (typeof auth?.reauthenticate !== 'function') {
        throw new Error('Reauthentication is not supported by this auth adapter');
      }
      return auth.reauthenticate({ password });
    },
    [auth],
  );

  const handleUpdatePassword = useCallback(
    async (isPasswordLinked) => {
      if (passwordFlow.isSubmitting) return;

      const currentPassword = String(passwordFlow.currentPassword || '');
      const newPassword = String(passwordFlow.newPassword || '');
      const confirmPassword = String(passwordFlow.confirmPassword || '');

      const validationError = validatePasswordChangeInput({
        confirmPassword,
        currentPassword,
        isPasswordLinked,
        newPassword,
      });
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }));

      try {
        if (isPasswordLinked) {
          await reauthenticateWithPassword(currentPassword);
        }

        const verification = await openAccountVerificationPrompt({
          description: isPasswordLinked
            ? 'Verify your email before updating password'
            : 'Verify your email before setting password',
          email: currentAuthEmail,
          openModal,
          openSurface,
          purpose: isPasswordLinked ? AUTH_PURPOSE.PASSWORD_UPDATE : AUTH_PURPOSE.PASSWORD_SET,
          title: isPasswordLinked ? 'Update password verification' : 'Set password verification',
          toast,
        });

        if (!verification?.success) {
          setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
          return;
        }

        const feedbackFlow = isPasswordLinked ? 'password-change' : 'password-set';
        emitAccountFeedback(feedbackFlow, 'start');

        const result = isPasswordLinked
          ? await completePasswordChangeRequest({ currentPassword, newPassword })
          : await completePasswordSetRequest({ newPassword });

        resetLinkedProviders();
        setPasswordFlow(INITIAL_PASSWORD_FLOW);
        toast.success(
          isPasswordLinked ? 'Password updated successfully' : 'Password created successfully',
        );
        await logCredentialAuditSuccess(isPasswordLinked ? 'password_update' : 'password_set', {
          userId: auth?.user?.id,
        });

        await signOutIfRequested(auth, result?.nextAction, {
          email: currentAuthEmail,
          router,
        });
      } catch (error) {
        setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
        const errorMessage = resolveSecurityErrorMessage(error, 'Password update failed');
        toast.error(errorMessage);
        await logCredentialAuditFailure(
          isPasswordLinked ? 'password_update' : 'password_set',
          error,
        );
      } finally {
        const feedbackFlow = isPasswordLinked ? 'password-change' : 'password-set';
        clearAccountFeedback(feedbackFlow);
      }
    },
    [
      auth,
      currentAuthEmail,
      openModal,
      openSurface,
      passwordFlow,
      reauthenticateWithPassword,
      resetLinkedProviders,
      router,
      setPasswordFlow,
      toast,
    ],
  );

  const handleUpdateEmail = useCallback(
    async (isPasswordLinked) => {
      if (emailFlow.isSubmitting) return;

      const currentPassword = String(emailFlow.currentPassword || '');
      const newEmail = normalizeEmail(emailFlow.newEmail);

      const validationError = validateEmailChangeInput({
        currentEmail: currentAuthEmail,
        currentPassword,
        isPasswordLinked,
        newEmail,
      });
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setEmailFlow((prev) => ({ ...prev, isSubmitting: true }));

      try {
        if (isPasswordLinked) {
          await reauthenticateWithPassword(currentPassword);
        }

        const verification = await openAccountVerificationPrompt({
          description: 'Verify your new email address to complete change',
          email: newEmail,
          openModal,
          openSurface,
          purpose: AUTH_PURPOSE.EMAIL_CHANGE,
          title: 'New email verification',
          toast,
        });

        if (!verification?.success) {
          setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
          return;
        }

        emitAccountFeedback('email-update', 'start');

        const result = await completeEmailChangeRequest({
          currentPassword: isPasswordLinked ? currentPassword : '',
          newEmail,
        });
        setEmailFlow(INITIAL_EMAIL_FLOW);
        toast.success('Email update completed successfully');
        await logCredentialAuditSuccess('email_change', { newEmail, userId: auth?.user?.id });

        await signOutIfRequested(auth, result?.nextAction, {
          email: newEmail,
          router,
        });
      } catch (error) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
        const errorMessage = resolveSecurityErrorMessage(error, 'Email update failed');
        toast.error(errorMessage);
        await logCredentialAuditFailure('email_change', error);
      } finally {
        clearAccountFeedback('email-update');
      }
    },
    [
      auth,
      currentAuthEmail,
      emailFlow,
      openModal,
      openSurface,
      reauthenticateWithPassword,
      router,
      setEmailFlow,
      toast,
    ],
  );

  const handleCompletePasswordChange = useCallback(
    () => handleUpdatePassword(true),
    [handleUpdatePassword],
  );

  const handleSetPassword = useCallback(() => handleUpdatePassword(false), [handleUpdatePassword]);

  const handleCompleteEmailChange = useCallback(() => handleUpdateEmail(true), [handleUpdateEmail]);

  return {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleSetPassword,
    handleUpdateEmail,
    handleUpdatePassword,
    reauthenticateWithPassword,
  };
}

export function useAccountDeleteAction({
  auth,
  deleteFlow,
  isPasswordLinked,
  reauthenticateWithPassword,
  currentAuthEmail,
  openModal,
  openSurface,
  setDeleteConfirmation,
  setDeleteFlow,
  toast,
}) {
  const router = useRouter();
  const deleteRequestLockRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteFlow.isSubmitting || deleteRequestLockRef.current) return;

    const currentPassword = String(deleteFlow.currentPassword || '');
    const confirmText = String(deleteFlow.confirmText || '').trim();

    if (isPasswordLinked && !currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (confirmText !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion');
      return;
    }

    setDeleteConfirmation({
      cancelText: 'Cancel',
      confirmText: 'Delete Account',
      description: 'This action permanently deletes your account and signs you out',
      icon: 'solar:danger-triangle-bold',
      isDestructive: true,
      onCancel: () => {
        if (isMountedRef.current) setDeleteConfirmation(null);
      },
      onConfirm: async () => {
        if (deleteRequestLockRef.current) return;
        deleteRequestLockRef.current = true;
        if (isMountedRef.current) {
          setDeleteFlow((prev) => ({ ...prev, isSubmitting: true }));
        }

        try {
          if (isPasswordLinked) {
            await reauthenticateWithPassword(currentPassword);

            const verification = await openAccountVerificationPrompt({
              description: 'Verify your current email before deletion',
              email: currentAuthEmail,
              openModal,
              openSurface,
              purpose: AUTH_PURPOSE.ACCOUNT_DELETE,
              title: 'Delete account verification',
              toast,
            });

            if (!verification?.success) {
              if (isMountedRef.current) {
                setDeleteConfirmation(null);
                setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
              }
              deleteRequestLockRef.current = false;
              return;
            }
          }

          emitAccountFeedback('account-delete', 'start');
          const result = await deleteAccountRequest({
            currentPassword: isPasswordLinked ? currentPassword : '',
          });
          if (isMountedRef.current) {
            setDeleteConfirmation(null);
          }

          if (result?.deleted || result?.nextAction === 'signed_out') {
            await auth.signOut({ reason: 'delete-account', redirect: false }).catch(() => {});
          }

          toast.success('Account deleted successfully');
          await logCredentialAuditSuccess('account_delete', { userId: auth?.user?.id });
          router.push('/');
        } catch (error) {
          deleteRequestLockRef.current = false;
          if (isMountedRef.current) {
            setDeleteConfirmation(null);
            setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
          }
          const errorMessage = resolveSecurityErrorMessage(error, 'Account deletion failed');
          toast.error(errorMessage);
          await logCredentialAuditFailure('account_delete', error);
        } finally {
          clearAccountFeedback('account-delete');
        }
      },
    });
  }, [
    auth,
    currentAuthEmail,
    deleteFlow,
    isPasswordLinked,
    openModal,
    openSurface,
    reauthenticateWithPassword,
    router,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  ]);

  return { handleDeleteAccount };
}

export function useAccountSecurityActions({
  auth,
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  isPasswordLinked,
  openModal,
  openSurface,
  passwordFlow,
  setEmailFlow,
  setDeleteConfirmation,
  setDeleteFlow,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  setPasswordFlow,
  toast,
}) {
  const [unlinkingProvider, setUnlinkingProvider] = useState(null);
  const credentialActions = useAccountCredentialActions({
    auth,
    canUsePasswordSecurity: true,
    currentAuthEmail,
    emailFlow,
    openModal,
    openSurface,
    passwordFlow,
    setEmailFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    setPasswordFlow,
    toast,
  });

  const deleteAction = useAccountDeleteAction({
    auth,
    currentAuthEmail,
    deleteFlow,
    isPasswordLinked,
    openModal,
    openSurface,
    reauthenticateWithPassword: credentialActions.reauthenticateWithPassword,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  });

  const handleUnlinkProvider = useCallback(
    (provider) => {
      const normalizedProvider = normalizeOAuthProvider(provider);
      if (!normalizedProvider || unlinkingProvider) return;

      const providerLabel = getOAuthProviderLabel(normalizedProvider);
      setDeleteConfirmation({
        cancelText: 'Cancel',
        confirmLoadingText: 'Disconnecting',
        confirmText: `Disconnect ${providerLabel}`,
        description: `You will no longer be able to sign in with ${providerLabel}. Your other sign-in methods will remain available.`,
        icon: 'solar:shield-warning-bold',
        isDestructive: true,
        title: `Disconnect ${providerLabel}?`,
        onCancel: () => setDeleteConfirmation(null),
        onConfirm: async () => {
          setUnlinkingProvider(normalizedProvider);

          try {
            const updatedSession = await auth.unlinkProvider({ provider: normalizedProvider });
            setLinkedProviderIdsOverride(
              resolveLinkedProviderIds(updatedSession).filter(
                (providerId) => normalizeOAuthProvider(providerId) !== normalizedProvider,
              ),
            );
            setLinkedProviderDescriptorsOverride(null);
            toast.success(`${providerLabel} disconnected`);
            await logCredentialAuditSuccess('unlink-provider', {
              provider: normalizedProvider,
              userId: auth?.user?.id,
            });
          } catch (error) {
            toast.error(
              resolveSecurityErrorMessage(error, `${providerLabel} could not be disconnected`),
            );
            await logCredentialAuditFailure('unlink-provider', error);
            throw error;
          } finally {
            setUnlinkingProvider(null);
            setDeleteConfirmation(null);
          }
        },
      });
    },
    [
      auth,
      setDeleteConfirmation,
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
      toast,
      unlinkingProvider,
    ],
  );

  return {
    ...credentialActions,
    ...deleteAction,
    handleUnlinkProvider,
    unlinkingProvider,
  };
}


// ============================================================================
// FILE: domains/account/index.js
// ============================================================================

export * from './utils/index.js';
export * from './client/index.js';
export * from './ui/index.js';
export * from './hooks/index.js';
export * as server from './server/index.js';


// ============================================================================
// FILE: domains/account/server/actions/profile.server.js
// ============================================================================

'use server';

import { getAccountIdByUsername, getAccountProfileByUserId } from '../profile.server';
import { getViewerSessionContext } from '../routes.server';
export async function getAccountProfileServer({ userId, username }) {
  try {
    let targetUserId = userId || null;
    if (!targetUserId && username) {
      targetUserId = await getAccountIdByUsername(username);
    }
    const sessionContext = await getViewerSessionContext().catch(() => null);
    const authenticatedViewerId = sessionContext?.userId || null;
    if (!targetUserId && authenticatedViewerId) targetUserId = authenticatedViewerId;

    if (!targetUserId) {
      return { success: true, profile: null };
    }

    const profile = await getAccountProfileByUserId(targetUserId, {
      viewerId: authenticatedViewerId,
    });
    return { success: true, profile: profile || null };
  } catch (error) {
    return { success: false, error: error.message || 'Profile could not be loaded' };
  }
}


// ============================================================================
// FILE: domains/account/server/api-handlers.server.js
// ============================================================================

import 'server-only';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  requireSessionRequest,
  resolveOptionalSessionRequest,
} from '@/domains/auth/server/session.server.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.server.js';
import {
  claimUsernameForProfile,
  ensureAccountProfileRecord,
} from '@/domains/auth/server/account.server.js';
import {
  getEditableAccountSnapshotByUserId,
  getAccountProfileByUserId,
  invalidateCachedAccountProfiles,
} from './profile.server';
import { resolveAccountRequestUserId } from './request-target.server';
import { fetchAccountActivityFeedServer } from './feed.server';
import { fetchProfileReviewFeedServer } from '@/domains/reviews/server/feeds.server';
import {
  ACCOUNT_READ_FUNCTION,
  ACCOUNT_WRITE_FUNCTION,
  normalizeAccountDisplayNameSearchValue,
  sanitizeAccountSearchTerm,
  sanitizeUsername,
  validateUsername,
} from '@/domains/account/utils';
import {
  CACHE_CONTROL,
  cacheControlHeaders,
  getOrLoadCachedValue,
} from '@/infrastructure/http/http-server';
import { publishUserEvent } from '@/infrastructure/realtime/user-events.server';
import { normalizeValue } from '@/shared/utils';

export async function handleAccountCollectionsGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const resource = normalizeValue(searchParams.get('resource'));
    const slug = searchParams.get('slug');
    const listId = searchParams.get('listId');
    const limitCount = searchParams.get('limitCount');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const resolvedUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!resolvedUserId && resource !== 'list-by-slug') {
      return NextResponse.json({ data: null, items: [] });
    }

    const media = entityType && entityId ? { entityId, entityType } : null;
    const { getAccountResource, isAccountResource } = await import('./collections.server');
    if (!isAccountResource(resource)) {
      return NextResponse.json({ error: 'Unsupported account resource' }, { status: 400 });
    }

    const data = await getAccountResource({
      limitCount,
      listId,
      media,
      resource,
      slug,
      userId: resolvedUserId,
      viewerId,
    });

    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_COLLECTIONS);

    return NextResponse.json({ data, items: Array.isArray(data) ? data : [] }, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;

    // Private profile access denied — return empty data silently, not an error toast
    if (status === 403) {
      return NextResponse.json({ data: null, items: [], private: true });
    }

    console.error('Collections could not be loaded:', error);
    return NextResponse.json({ error: 'Collections could not be loaded' }, { status });
  }
}

export async function handleAccountActivityGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const pageSize = searchParams.get('pageSize');
    const scope = searchParams.get('scope');
    const sort = searchParams.get('sort');
    const subject = searchParams.get('subject');
    const resolvedUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!resolvedUserId) {
      return NextResponse.json({ hasMore: false, items: [], nextCursor: null, totalCount: 0 });
    }

    const payload = await fetchAccountActivityFeedServer({
      cursor,
      pageSize,
      scope,
      sort,
      subject,
      userId: resolvedUserId,
      viewerId,
    });

    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_COLLECTIONS);

    return NextResponse.json(payload, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;

    if (status === 403) {
      return NextResponse.json({ items: [], private: true });
    }

    console.error('Activity feed could not be loaded:', error);
    return NextResponse.json({ error: 'Activity feed could not be loaded' }, { status });
  }
}

export async function handleAccountProfileGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const targetUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!targetUserId) {
      return NextResponse.json({ profile: null });
    }

    const bypassCache = searchParams.get('fresh') === '1' || searchParams.get('noCache') === '1';
    let profile = await getAccountProfileByUserId(targetUserId, { viewerId, bypassCache });

    if (!profile && viewerId && targetUserId === viewerId) {
      const userEmail = sessionContext?.email || sessionContext?.user?.email || null;
      if (userEmail) {
        try {
          await ensureAccountProfileRecord({
            email: userEmail,
            userId: viewerId,
          });
          invalidateCachedAccountProfiles(viewerId);
          profile = await getAccountProfileByUserId(targetUserId, { viewerId });
        } catch (bootstrapErr) {
          console.error(
            'Failed auto-bootstrapping profile in handleAccountProfileGet:',
            bootstrapErr,
          );
        }
      }
    }

    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_ACCOUNT_RESOLVE);

    return NextResponse.json({ profile: profile || null }, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;

    if (status === 403) {
      return NextResponse.json({ profile: null, private: true });
    }

    console.error('Profile could not be loaded:', error);
    return NextResponse.json({ error: 'Profile could not be loaded' }, { status });
  }
}

export async function handleAccountProfilePost(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireSessionRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body.action);

    if (action === 'ensure') {
      const preferredDisplayName = normalizeValue(body.displayName);
      const preferredUsername = body.username ? validateUsername(body.username) : null;
      const email = normalizeValue(body.email);

      await ensureAccountProfileRecord({
        displayName: preferredDisplayName || null,
        email: email || null,
        userId: authContext.userId,
        username: preferredUsername || null,
      });
      invalidateCachedAccountProfiles(authContext.userId);
      const profile = await getAccountProfileByUserId(authContext.userId, {
        viewerId: authContext.userId,
      });

      return NextResponse.json({ profile });
    }

    if (action === 'update') {
      const admin = createAdminClient();
      const userId = authContext.userId;

      const newUsername = body.username ? validateUsername(body.username) : null;
      const newDisplayName =
        body.displayName !== undefined ? normalizeValue(body.displayName) : null;

      if (newUsername) {
        await claimUsernameForProfile({
          avatarUrl: body.avatarUrl !== undefined ? normalizeValue(body.avatarUrl) || null : null,
          displayName: newDisplayName || newUsername,
          email: authContext.email || null,
          failIfProfileHasUsername: false,
          preserveExisting: false,
          userId,
          username: newUsername,
        });
      }

      const updates = {};

      if (newDisplayName !== null) {
        updates.display_name = newDisplayName;
        updates.display_name_lower = newDisplayName.toLowerCase();
      }
      if (newUsername) {
        updates.username = newUsername;
        updates.username_lower = newUsername.toLowerCase();
      }
      if (body.avatarUrl !== undefined) updates.avatar_url = normalizeValue(body.avatarUrl) || null;
      if (body.bannerUrl !== undefined) updates.banner_url = normalizeValue(body.bannerUrl) || null;
      if (body.description !== undefined) updates.description = normalizeValue(body.description);
      if (body.isPrivate !== undefined) updates.is_private = Boolean(body.isPrivate);

      updates.updated_at = new Date().toISOString();

      const { error } = await admin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('id')
        .single();
      if (error) {
        console.error('Account update failed:', error);
        throw new Error('Account update failed');
      }

      if (newUsername) {
        try {
          await admin.from('usernames').upsert(
            {
              user_id: userId,
              username: newUsername,
              username_lower: newUsername.toLowerCase(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );
        } catch {}
      }

      invalidateCachedAccountProfiles(userId);
      const profile = await getAccountProfileByUserId(userId, {
        viewerId: userId,
      });
      await publishUserEvent(userId, 'account:updated', { profile });
      return NextResponse.json({ profile });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    console.error('Account action failed:', error);
    return NextResponse.json({ error: 'Account action failed' }, { status });
  }
}

export async function handleAccountResolveGet(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = normalizeValue(searchParams.get('username'));
    if (!username) return NextResponse.json({ userId: null });

    const userId = await getOrLoadCachedValue({
      cacheKey: `account-resolve|username=${username}`,
      enabled: true,
      ttlMs: 3000,
      loader: () => getAccountIdByUsername(username),
    });

    return NextResponse.json(
      { userId: userId || null },
      { headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_ACCOUNT_RESOLVE) },
    );
  } catch (error) {
    console.error('Username could not be resolved:', error);
    return NextResponse.json(
      { error: 'Username could not be resolved' },
      { status: 500, headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE) },
    );
  }
}

export async function handleAccountReviewsGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const requestedMode = normalizeValue(searchParams.get('mode'));
    const mode = requestedMode === 'liked' ? 'liked' : 'authored';
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const resolvedUserId = await resolveAccountRequestUserId({ searchParams });

    if (!resolvedUserId) {
      return NextResponse.json({ hasMore: false, items: [], nextCursor: null, totalCount: 0 });
    }

    const payload = await fetchProfileReviewFeedServer({
      cursor,
      mode,
      pageSize,
      userId: resolvedUserId,
      viewerId,
    });

    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_REVIEWS);

    return NextResponse.json(payload, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;

    if (status === 403) {
      return NextResponse.json({ items: [], private: true });
    }

    console.error('Reviews could not be loaded:', error);
    return NextResponse.json({ error: 'Reviews could not be loaded' }, { status });
  }
}

export async function handleAccountSearchGet(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = sanitizeAccountSearchTerm(searchParams.get('searchTerm'));
    const limitCount = Math.min(50, Math.max(1, Number(searchParams.get('limitCount')) || 10));

    if (!searchTerm) return NextResponse.json({ items: [] });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_private')
      .or(
        `username_lower.ilike.%${searchTerm.toLowerCase()}%,display_name_lower.ilike.%${searchTerm.toLowerCase()}%`,
      )
      .limit(limitCount);

    if (error) {
      console.error('Search failed:', error);
      throw new Error('Search failed');
    }

    const items = (data || []).map((row) => ({
      avatarUrl: row.avatar_url || null,
      displayName: row.display_name || 'Anonymous User',
      id: row.id,
      isPrivate: Boolean(row.is_private),
      username: row.username,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Account search failed:', error);
    return NextResponse.json({ error: 'Account search failed' }, { status: 500 });
  }
}


// ============================================================================
// FILE: domains/account/server/collections.server.js
// ============================================================================

import { createAdminClient } from '@/infrastructure/supabase/admin';
import { canViewerAccessUserContent, createPrivateProfileError } from './profile.server';
import { normalizeTimestamp, normalizeValue } from '@/shared/utils';

import { buildMediaItemKey } from '@/domains/media/shared/media';
import { isTitleMediaType } from '@/domains/media/utils';
import {
  LIST_COLLECTION_SELECT,
  LIST_ITEM_SELECT,
  MEDIA_COLLECTION_SELECT,
  WATCHED_SELECT,
  assertResult,
  isValidUuid,
} from '@/domains/account/utils';

const ACCOUNT_COLLECTION_RESOURCE_KEYS = new Set([
  'likes',
  'lists',
  'liked-lists',
  'watched',
  'watchlist',
]);

const ACCOUNT_LIST_RESOURCE_KEYS = new Set(['list-by-id', 'list-by-slug', 'list-items']);

const ACCOUNT_MEDIA_STATUS_RESOURCE_KEYS = new Set([
  'like-status',
  'watchlist-status',
  'watched-status',
]);

const ACCOUNT_RESOURCE_KEYS = new Set([
  ...ACCOUNT_COLLECTION_RESOURCE_KEYS,
  ...ACCOUNT_LIST_RESOURCE_KEYS,
  ...ACCOUNT_MEDIA_STATUS_RESOURCE_KEYS,
]);

const PROTECTED_ACCOUNT_RESOURCE_KEYS = new Set(ACCOUNT_RESOURCE_KEYS);

export function isAccountResource(resource) {
  return ACCOUNT_RESOURCE_KEYS.has(resource);
}

export function resolveLimitCount(value, fallback = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

export async function executeCollectionQuery(
  query,
  {
    fallbackValue = { data: [], error: null },
    label = 'Collection query',
    strict = false,
    timeoutMs = 4000,
  } = {},
) {
  if (strict) return query;

  let timer = null;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs);
  });
  let result;
  try {
    result = await Promise.race([query, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (result?.timedOut) {
    console.warn(`[Supabase ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`);
    return result;
  }
  return result;
}

export async function countListLikesByListIds(client, assertQueryResult, listIds = []) {
  if (!Array.isArray(listIds) || listIds.length === 0) return new Map();
  const likesMap = new Map();

  for (let index = 0; index < listIds.length; index += 100) {
    const ids = listIds.slice(index, index + 100);
    const result = await client.from('list_likes').select('list_id').in('list_id', ids);
    assertQueryResult(result, 'List likes could not be loaded');

    (result.data || []).forEach((row) => {
      likesMap.set(row.list_id, (likesMap.get(row.list_id) || 0) + 1);
    });
  }
  return likesMap;
}

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function decodeRouteValue(value) {
  try {
    return decodeURIComponent(String(value || '')).trim();
  } catch {
    return '';
  }
}

export function normalizeMediaPayload(payload = {}, row = {}) {
  const entityId = normalizeValue(payload.entityId || row.entity_id || payload.id || '');
  const entityType = normalizeValue(
    payload.entityType || row.entity_type || payload.media_type,
  ).toLowerCase();

  return {
    addedAt: normalizeTimestamp(payload.addedAt || row.added_at),
    backdrop_path: payload.backdrop_path || payload.backdropPath || row.backdrop_path || null,
    entityId: entityId || null,
    entityType: entityType || null,
    first_air_date: payload.first_air_date || null,
    genreNames: normalizeArray(payload.genreNames || payload.genre_names),
    genre_ids: normalizeArray(payload.genre_ids || payload.genreIds),
    genres: normalizeArray(payload.genres),
    id: entityId || normalizeValue(payload.id || row.media_key) || null,
    mediaKey:
      payload.mediaKey ||
      row.media_key ||
      (entityType && entityId ? buildMediaItemKey(entityType, entityId) : null),
    media_type: entityType || null,
    name: payload.name || payload.original_name || '',
    original_name: payload.original_name || null,
    original_title: payload.original_title || null,
    poster_path: payload.poster_path || payload.posterPath || row.poster_path || null,
    popularity: normalizeNumber(payload.popularity, null),
    position: normalizeNumber(payload.position ?? row.position, null),
    providerIds: normalizeArray(payload.providerIds || payload.provider_ids),
    providerNames: normalizeArray(payload.providerNames || payload.provider_names),
    providers: normalizeArray(payload.providers),
    rating: normalizeNumber(payload.rating ?? row.rating, null),
    release_date: payload.release_date || null,
    runtime: normalizeNumber(payload.runtime, null),
    title:
      payload.title ||
      payload.original_title ||
      row.title ||
      payload.name ||
      payload.original_name ||
      '',
    updatedAt: normalizeTimestamp(payload.updatedAt || row.updated_at),
    userRating: normalizeNumber(payload.userRating ?? payload.rating ?? row.rating, null),
    userId: payload.userId || row.user_id || null,
    vote_average: normalizeNumber(payload.vote_average, null),
    vote_count: normalizeNumber(payload.vote_count, null),
    watchProviders:
      payload.watchProviders && typeof payload.watchProviders === 'object'
        ? payload.watchProviders
        : null,
  };
}

export function normalizeWatchedRow(row = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const baseMedia = normalizeMediaPayload(payload, row);

  return {
    ...baseMedia,
    firstWatchedAt: normalizeTimestamp(payload.firstWatchedAt || row.created_at),
    lastWatchedAt: normalizeTimestamp(payload.lastWatchedAt || row.last_watched_at),
    sourceLastAction: payload.sourceLastAction || 'watched',
    watchCount: Number.isFinite(Number(payload.watchCount ?? row.watch_count))
      ? Number(payload.watchCount ?? row.watch_count)
      : 1,
  };
}

function normalizeListOwnerSnapshot(value = {}, fallbackOwnerId = null) {
  const ownerId = value?.id || fallbackOwnerId || null;
  return ownerId
    ? {
        avatarUrl: value?.avatarUrl || null,
        displayName: value?.displayName || value?.username || 'Anonymous User',
        id: ownerId,
        username: value?.username || null,
      }
    : null;
}

function normalizeListPreviewItem(value = {}) {
  const normalized = normalizeMediaPayload(value, value);
  if (!normalized.entityId || !isTitleMediaType(normalized.entityType)) return null;
  return { ...normalized, id: normalized.entityId };
}

export function normalizeListRow(row = {}, likesMap = new Map()) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const ownerSnapshot = normalizeListOwnerSnapshot(payload.ownerSnapshot || {}, row.user_id);
  const computedLikesCount = Number(likesMap.get(row.id) || 0);
  const rawLikes = Array.isArray(payload.likes)
    ? payload.likes
    : Array.isArray(row.likes)
      ? row.likes
      : [];

  return {
    coverUrl: payload.coverUrl || row.poster_path || '',
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || payload.description || '',
    id: row.id,
    itemsCount: Number.isFinite(Number(payload.itemsCount)) ? Number(payload.itemsCount) : 0,
    likes: rawLikes,
    likesCount: Number.isFinite(Number(row.likes_count))
      ? Number(row.likes_count)
      : computedLikesCount,
    ownerId: row.user_id,
    ownerSnapshot,
    previewItems: Array.isArray(payload.previewItems)
      ? payload.previewItems.map(normalizeListPreviewItem).filter(Boolean)
      : [],
    reviewsCount: Number.isFinite(Number(row.reviews_count))
      ? Number(row.reviews_count)
      : Number(payload.reviewsCount || 0),
    slug: row.slug || payload.slug || row.id,
    title: row.title || payload.title || 'Untitled List',
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function resolveMediaKey(media = null) {
  return (
    media?.mediaKey ||
    (media?.entityType && media?.entityId
      ? buildMediaItemKey(media.entityType, media.entityId)
      : null)
  );
}

const STANDARD_COLLECTION_CONFIG = Object.freeze({
  likes: Object.freeze({
    filter: (item) => isTitleMediaType(item?.entityType),
    label: 'Likes',
    limit: 200,
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [['added_at', { ascending: false }]],
    select: MEDIA_COLLECTION_SELECT,
    table: 'likes',
  }),
  watchlist: Object.freeze({
    label: 'Watchlist',
    limit: 200,
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [['added_at', { ascending: false }]],
    select: MEDIA_COLLECTION_SELECT,
    table: 'watchlist',
  }),
  watched: Object.freeze({
    label: 'Watched items',
    limit: 200,
    normalize: normalizeWatchedRow,
    order: [['last_watched_at', { ascending: false }]],
    select: WATCHED_SELECT,
    table: 'watched',
  }),
});

const STATUS_COLLECTION_CONFIG = Object.freeze({
  'like-status': Object.freeze({
    itemKey: 'like',
    label: 'Like status',
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [
      ['updated_at', { ascending: false }],
      ['added_at', { ascending: false }],
    ],
    select: MEDIA_COLLECTION_SELECT,
    statusKey: 'isLiked',
    table: 'likes',
  }),
  'watchlist-status': Object.freeze({
    itemKey: 'item',
    label: 'Watchlist status',
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [
      ['updated_at', { ascending: false }],
      ['added_at', { ascending: false }],
    ],
    select: MEDIA_COLLECTION_SELECT,
    statusKey: 'isInWatchlist',
    table: 'watchlist',
  }),
  'watched-status': Object.freeze({
    itemKey: 'watched',
    label: 'Watched status',
    normalize: normalizeWatchedRow,
    order: [
      ['last_watched_at', { ascending: false }],
      ['updated_at', { ascending: false }],
    ],
    select: WATCHED_SELECT,
    statusKey: 'isWatched',
    table: 'watched',
  }),
});

function getFirstResultRow(result) {
  return Array.isArray(result?.data) ? result.data[0] || null : null;
}

function applyQueryOrder(query, order = []) {
  return order.reduce(
    (currentQuery, [column, options]) => currentQuery.order(column, options),
    query,
  );
}

function createListQuery(admin, { reference, select, userId, usesSlugFallback = false }) {
  let query = admin.from('lists').select(select);
  if (userId) query = query.eq('user_id', userId);

  if (usesSlugFallback) {
    return isValidUuid(reference)
      ? query.or(`id.eq.${reference},slug.eq.${reference}`)
      : query.eq('slug', reference);
  }

  return isValidUuid(reference) ? query.eq('id', reference) : query.eq('slug', reference);
}

async function findListRow({
  admin,
  checkAssert,
  execQuery,
  fallbackMessage,
  label,
  reference,
  select = LIST_COLLECTION_SELECT,
  strict,
  userId,
  usesSlugFallback = false,
}) {
  const decodedReference = decodeRouteValue(reference);
  if (!decodedReference) return null;

  const result = await execQuery(
    createListQuery(admin, {
      reference: decodedReference,
      select,
      userId,
      usesSlugFallback,
    }).limit(1),
    {
      fallbackValue: { data: [], error: null },
      label,
      strict,
    },
  );

  if (result?.timedOut) return null;
  checkAssert(result, fallbackMessage);
  return getFirstResultRow(result);
}

async function normalizeListRowWithLikes({ admin, checkAssert, row }) {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  let likes = Array.isArray(payload.likes) ? payload.likes : [];

  if (row.id) {
    const { data: likesData } = await admin
      .from('list_likes')
      .select('user_id')
      .eq('list_id', row.id);
    if (Array.isArray(likesData) && likesData.length > 0) {
      likes = likesData.map((l) => l.user_id);
    }
  }

  const likesMap = Number.isFinite(Number(row.likes_count))
    ? new Map([[row.id, Number(row.likes_count)]])
    : new Map([[row.id, likes.length]]);

  const normalized = normalizeListRow(row, likesMap);
  return {
    ...normalized,
    likes,
    likesCount: Math.max(normalized.likesCount, likes.length),
  };
}

async function loadStandardCollection({
  admin,
  calcLimit,
  checkAssert,
  config,
  execQuery,
  limitCount,
  strict,
  userId,
}) {
  let query = applyQueryOrder(
    admin.from(config.table).select(config.select).eq('user_id', userId),
    config.order,
  );
  const limit = calcLimit(limitCount, 0, config.limit);
  if (limit > 0) query = query.limit(limit);

  const result = await execQuery(query, {
    fallbackValue: { data: [], error: null },
    label: `${config.label} for user ${userId}`,
    strict,
  });
  if (result?.timedOut) return null;

  checkAssert(result, `${config.label} could not be loaded`);
  const items = (result.data || []).map(config.normalize);
  return config.filter ? items.filter(config.filter) : items;
}

export async function resolveAccountCollectionStatusResource({
  admin,
  assertResult: localAssert,
  media,
  resource,
  userId,
}) {
  const config = STATUS_COLLECTION_CONFIG[resource];
  if (!config) return { data: null, handled: false };

  const mediaKey = resolveMediaKey(media);
  if (!userId || !mediaKey) {
    return {
      data: { [config.itemKey]: null, [config.statusKey]: false },
      handled: true,
    };
  }

  const result = await applyQueryOrder(
    admin.from(config.table).select(config.select).eq('user_id', userId).eq('media_key', mediaKey),
    config.order,
  ).limit(1);
  (localAssert || assertResult)(result, `${config.label} could not be loaded`);

  const row = getFirstResultRow(result);
  return {
    data: {
      [config.itemKey]: row ? config.normalize(row) : null,
      [config.statusKey]: Boolean(row),
    },
    handled: true,
  };
}

export async function getAccountResource({
  admin: customAdmin,
  assertResult: customAssertResult,
  canViewerAccessUserContent: customAccessCheck,
  createPrivateProfileError: customPrivateError,
  executeCollectionQuery: customQueryExec,
  limitCount = null,
  listId = null,
  media = null,
  resolveLimitCount: customResolveLimit,
  resource,
  slug = null,
  strict = false,
  userId,
  viewerId = null,
}) {
  const admin = customAdmin || createAdminClient();
  const checkAssert = customAssertResult || assertResult;
  const accessCheck = customAccessCheck || canViewerAccessUserContent;
  const makePrivateError = customPrivateError || createPrivateProfileError;
  const execQuery = customQueryExec || executeCollectionQuery;
  const calcLimit = customResolveLimit || resolveLimitCount;

  if (PROTECTED_ACCOUNT_RESOURCE_KEYS.has(resource)) {
    const canAccess = await accessCheck({ ownerId: userId, viewerId });
    if (!canAccess) throw makePrivateError();
  }

  const statusResource = await resolveAccountCollectionStatusResource({
    admin,
    assertResult: checkAssert,
    media,
    resource,
    userId,
  });
  if (statusResource.handled) return statusResource.data;

  const standardCollectionConfig = STANDARD_COLLECTION_CONFIG[resource];
  if (standardCollectionConfig) {
    const items = await loadStandardCollection({
      admin,
      calcLimit,
      checkAssert,
      config: standardCollectionConfig,
      execQuery,
      limitCount,
      strict,
      userId,
    });

    return items || [];
  }

  if (resource === 'lists') {
    const rows = await loadStandardCollection({
      admin,
      calcLimit,
      checkAssert,
      config: {
        label: 'Lists',
        limit: 200,
        normalize: (row) => row,
        order: [['updated_at', { ascending: false }]],
        select: LIST_COLLECTION_SELECT,
        table: 'lists',
      },
      execQuery,
      limitCount,
      strict,
      userId,
    });
    if (!rows) return [];

    const likesMap = await countListLikesByListIds(
      admin,
      checkAssert,
      rows.filter((row) => !Number.isFinite(Number(row.likes_count))).map((row) => row.id),
    );
    return rows.map((row) => normalizeListRow(row, likesMap));
  }

  if (resource === 'list-by-slug' || resource === 'list-by-id') {
    const row = await findListRow({
      admin,
      checkAssert,
      execQuery,
      fallbackMessage: 'List could not be loaded',
      label: resource === 'list-by-slug' ? `List by slug ${slug}` : `List by id ${listId}`,
      reference: resource === 'list-by-slug' ? slug : listId,
      strict,
      userId,
      usesSlugFallback: resource === 'list-by-slug',
    });

    return normalizeListRowWithLikes({ admin, checkAssert, row });
  }

  if (resource === 'list-items') {
    let resolvedTargetListId = listId;

    if (!resolvedTargetListId || !isValidUuid(resolvedTargetListId)) {
      const list = await findListRow({
        admin,
        checkAssert,
        execQuery,
        fallbackMessage: 'List items could not be loaded',
        label: `Resolve list ID for ${slug || listId}`,
        reference: slug || listId,
        select: 'id',
        strict,
        userId,
        usesSlugFallback: Boolean(slug),
      });
      resolvedTargetListId = list?.id || null;
    }

    if (!resolvedTargetListId) return [];

    let query = admin
      .from('list_items')
      .select(LIST_ITEM_SELECT)
      .eq('list_id', resolvedTargetListId)
      .order('position', { ascending: true, nullsFirst: false })
      .order('added_at', { ascending: true });
    const limit = calcLimit(limitCount, 0, 500);
    if (limit > 0) query = query.limit(limit);

    const result = await execQuery(query, {
      fallbackValue: { data: [], error: null },
      label: `List items for list ${resolvedTargetListId}`,
      strict,
    });
    if (result?.timedOut) return [];

    checkAssert(result, 'List items could not be loaded');
    return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row));
  }

  if (resource === 'liked-lists') {
    if (!userId) return [];
    let likesQuery = admin
      .from('list_likes')
      .select('list_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const limit = calcLimit(limitCount, 0, 200);
    if (limit > 0) likesQuery = likesQuery.limit(limit);

    const likesResult = await execQuery(likesQuery, {
      label: `Liked lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });
    if (likesResult?.timedOut) return [];
    checkAssert(likesResult, 'Liked lists could not be loaded');

    const likedRows = likesResult.data || [];
    if (likedRows.length === 0) return [];
    const listIds = likedRows.map((r) => r.list_id).filter(Boolean);

    const listsResult = await execQuery(
      admin.from('lists').select(LIST_COLLECTION_SELECT).in('id', listIds),
      {
        label: `Lists by ids for user ${userId}`,
        fallbackValue: { data: [], error: null },
        strict,
      },
    );
    if (listsResult?.timedOut) return [];
    checkAssert(listsResult, 'Liked lists could not be loaded');

    const listsMap = new Map((listsResult.data || []).map((row) => [row.id, row]));
    const allLikesMap = await countListLikesByListIds(
      admin,
      checkAssert,
      (listsResult.data || [])
        .filter((list) => !Number.isFinite(Number(list.likes_count)))
        .map((list) => list.id),
    );
    return listIds
      .map((id) => listsMap.get(id))
      .filter(Boolean)
      .map((row) => normalizeListRow(row, allLikesMap));
  }

  return [];
}


// ============================================================================
// FILE: domains/account/server/feed.server.js
// ============================================================================

import 'server-only';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { ACTIVITY_EVENT_TYPES, ACTIVITY_EVENT_TYPE_SET } from '@/domains/social/utils';
import {
  canViewerAccessUserContent,
  createPrivateProfileError,
  getAccountProfileByUserId,
} from './profile.server';
import { getAccountResource } from './collections.server';
import { fetchProfileReviewFeedServer } from '@/domains/reviews/server/feeds.server';
import {
  ACTIVITY_SELECT,
  ACTIVITY_SORT_MODES,
  ACTIVITY_SUBJECT_FILTERS,
  FOLLOW_STATUS_ACCEPTED,
} from '@/domains/account/utils';
import { normalizeMediaType } from '@/domains/media/utils';
import { chunkArray, normalizeTimestamp, normalizeValue } from '@/shared/utils';

const ACTIVITY_QUERY_MINIMUM_WINDOW = 50;
const ACTIVITY_QUERY_WINDOW_MULTIPLIER = 3;

// ============================================================
// Feed Normalizers
// ============================================================

function normalizeActor(value = {}) {
  return {
    avatarUrl: value?.avatarUrl || null,
    displayName: value?.displayName || value?.name || 'Someone',
    id: value?.id || null,
    username: value?.username || null,
  };
}

function normalizeSubject(value = {}) {
  return {
    href: value?.href || null,
    id: value?.id || null,
    ownerId: value?.ownerId || null,
    ownerUsername: value?.ownerUsername || null,
    poster: value?.poster || null,
    slug: value?.slug || null,
    title: value?.title || 'Untitled',
    type: normalizeMediaType(value?.type),
  };
}

function normalizeReviewCard(value = {}) {
  if (!value || typeof value !== 'object') return null;
  return {
    authorId: value.authorId || value.reviewUserId || null,
    content: value.content || '',
    createdAt: normalizeTimestamp(value.createdAt),
    id: value.id || null,
    isSpoiler: Boolean(value.isSpoiler),
    likes: Array.isArray(value.likes) ? value.likes : [],
    rating: value.rating === null || value.rating === undefined ? null : Number(value.rating),
    reviewUserId: value.reviewUserId || value.authorId || null,
    subjectHref: value.subjectHref || null,
    subjectId: value.subjectId || null,
    subjectKey: value.subjectKey || null,
    subjectOwnerId: value.subjectOwnerId || null,
    subjectOwnerUsername: value.subjectOwnerUsername || null,
    subjectPoster: value.subjectPoster || null,
    subjectPreviewItems: Array.isArray(value.subjectPreviewItems) ? value.subjectPreviewItems : [],
    subjectSlug: value.subjectSlug || null,
    subjectTitle: value.subjectTitle || 'Untitled',
    subjectType: normalizeMediaType(value.subjectType),
    updatedAt: normalizeTimestamp(value.updatedAt || value.createdAt),
    user: {
      avatarUrl: value?.user?.avatarUrl || null,
      id: value?.user?.id || value.reviewUserId || value.authorId || null,
      name: value?.user?.name || 'Anonymous User',
      username: value?.user?.username || null,
    },
  };
}

function normalizeActivityRow(row = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  if (Number(payload.version) !== 2) return null;

  return {
    actor: normalizeActor(payload.actor || {}),
    createdAt: normalizeTimestamp(row.created_at || payload.occurredAt),
    dedupeKey: row.dedupe_key || payload.dedupeKey || null,
    details: payload.details && typeof payload.details === 'object' ? payload.details : {},
    eventType: row.event_type || payload.eventType || 'UNKNOWN',
    id: row.id || null,
    occurredAt: normalizeTimestamp(payload.occurredAt || row.updated_at || row.created_at),
    renderKind: payload.renderKind === 'text_with_review' ? 'text_with_review' : 'text',
    reviewCard: normalizeReviewCard(payload.reviewCard),
    slotType: payload.slotType || null,
    sourceUserId: row.user_id || null,
    subject: normalizeSubject(payload.subject || {}),
    updatedAt: normalizeTimestamp(row.updated_at || payload.occurredAt || row.created_at),
    version: 2,
    visibility: payload.visibility || 'public',
  };
}

function isVisibleActivityItem(item = {}) {
  if (!item || !ACTIVITY_EVENT_TYPE_SET.has(item.eventType)) return false;
  const subjectType = String(item.subject?.type || '').toLowerCase();
  return !subjectType || subjectType === 'movie' || subjectType === 'tv' || subjectType === 'list';
}

function getActivityTimestamp(item = {}) {
  const timestamp = item?.occurredAt || item?.updatedAt || item?.createdAt;
  const parsed = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortActivityItems(items = []) {
  return [...items].sort((left, right) => {
    const timestampDiff = getActivityTimestamp(right) - getActivityTimestamp(left);
    if (timestampDiff !== 0) return timestampDiff;
    return String(right?.id || '').localeCompare(String(left?.id || ''));
  });
}

function normalizeActivitySubjectFilter(value) {
  const normalized = normalizeValue(value).toLowerCase();
  return ACTIVITY_SUBJECT_FILTERS.has(normalized) ? normalized : 'all';
}

function normalizeActivitySort(value) {
  const normalized = normalizeValue(value).toLowerCase();
  return ACTIVITY_SORT_MODES.has(normalized) ? normalized : 'newest';
}

function filterActivityItemsBySubject(items = [], subject = 'all') {
  const normalizedSubject = normalizeActivitySubjectFilter(subject);
  if (normalizedSubject === 'all') return Array.isArray(items) ? items : [];
  return (Array.isArray(items) ? items : []).filter(
    (item) => normalizeMediaType(item?.subject?.type) === normalizedSubject,
  );
}

function sortActivityItemsForMode(items = [], sort = 'newest') {
  const normalizedItems = sortActivityItems(items);
  if (normalizeActivitySort(sort) === 'oldest') return [...normalizedItems].reverse();
  return normalizedItems;
}

function getActivityDeduplicationKey(item = {}) {
  const eventType = normalizeValue(item?.eventType).toUpperCase();
  const actorId = normalizeValue(item?.sourceUserId || item?.actor?.id);
  const subjectId = normalizeValue(item?.subject?.id);
  const subjectType = normalizeMediaType(item?.subject?.type);

  // Persisted activity uses canonical slot keys, while legacy fallbacks use
  // derived keys. They still describe the same user action, so reconcile them
  // by their stable event/actor/subject identity before falling back to a row
  // identifier for events without a complete subject.
  if (eventType && actorId && subjectType && subjectId) {
    return `activity:${eventType}:${actorId}:${subjectType}:${subjectId}`;
  }

  return normalizeValue(item?.dedupeKey) || normalizeValue(item?.id);
}

function dedupeActivityItems(items = []) {
  const seenKeys = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const key = getActivityDeduplicationKey(item);
    if (!key || seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

function paginateItems(items = [], cursor = null, pageSize = 20) {
  const offset = Number.isFinite(Number(cursor)) ? Math.max(0, Number(cursor)) : 0;
  const normalizedPageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Number(pageSize)) : 20;
  const nextItems = items.slice(offset, offset + normalizedPageSize);
  const nextOffset = offset + nextItems.length;

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
  };
}

// ============================================================
// Feed Projector & Item Line Builder
// ============================================================

function buildAccountHref({ id = null, username = null } = {}) {
  const normalizedUsername = normalizeValue(username);
  const normalizedId = normalizeValue(id);
  if (normalizedUsername) return `/account/${normalizedUsername}`;
  if (normalizedId) return `/account/${normalizedId}`;
  return null;
}

function createTextPart(text) {
  return { kind: 'text', text };
}

function createRatingPart(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return { kind: 'rating', rating: numericValue };
}

function createLinkPart(kind, text, href = null) {
  return { href: href || null, kind, text };
}

function getPossessiveSuffix(label) {
  return normalizeValue(label).toLowerCase().endsWith('s') ? "' " : "'s ";
}

function createActorPart(actor = {}, viewerId = null) {
  const isViewerActor =
    normalizeValue(actor.id) && normalizeValue(actor.id) === normalizeValue(viewerId);
  return {
    href: buildAccountHref(actor),
    kind: 'actor',
    text: isViewerActor ? 'You' : actor.displayName || actor.username || 'Someone',
  };
}

function createSubjectPart(subject = {}) {
  return createLinkPart('subject', subject.title || 'Untitled', subject.href || null);
}

function buildListReferenceParts(item, viewerId = null) {
  const isViewerActor =
    normalizeValue(item?.actor?.id) && normalizeValue(item.actor.id) === normalizeValue(viewerId);
  const isOwnList =
    normalizeValue(item?.subject?.ownerId) &&
    normalizeValue(item.subject.ownerId) === normalizeValue(item?.actor?.id);

  if (isOwnList) {
    return [
      createTextPart(isViewerActor ? 'your own ' : 'their own '),
      createSubjectPart(item.subject),
      createTextPart(' list'),
    ];
  }
  const ownerLabel = item?.subject?.ownerUsername || 'someone';
  return [
    createTextPart(`${ownerLabel}${getPossessiveSuffix(ownerLabel)}`),
    createSubjectPart(item.subject),
    createTextPart(' list'),
  ];
}

function projectActivityLine(item = {}, viewerId = null) {
  const actorPart = createActorPart(item.actor, viewerId);
  const subjectPart = createSubjectPart(item.subject);
  const ratingPart = createRatingPart(item?.details?.rating);

  switch (item.eventType) {
    case ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED:
      return {
        parts: [
          actorPart,
          createTextPart(' added '),
          subjectPart,
          createTextPart(actorPart.text === 'You' ? ' to your watchlist' : ' to their watchlist'),
        ],
      };
    case ACTIVITY_EVENT_TYPES.LIKED_ADDED:
      return { parts: [actorPart, createTextPart(' liked '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.WATCHED_ADDED:
      return { parts: [actorPart, createTextPart(' watched '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.RATING_LOGGED:
      return {
        parts: [
          actorPart,
          createTextPart(' rated '),
          subjectPart,
          ...(ratingPart ? [createTextPart(' '), ratingPart] : []),
        ],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED:
      return { parts: [actorPart, createTextPart(' reviewed '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.LIST_CREATED:
      return { parts: [actorPart, createTextPart(' created a list: '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.LIST_COMMENTED:
      return {
        parts: [
          actorPart,
          createTextPart(' commented on '),
          ...buildListReferenceParts(item, viewerId),
        ],
      };
    case ACTIVITY_EVENT_TYPES.LIST_LIKED:
      return {
        parts: [actorPart, createTextPart(' liked '), ...buildListReferenceParts(item, viewerId)],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_LIKED: {
      const reviewOwnerLabel =
        item?.details?.reviewOwnerDisplayName || item?.details?.reviewOwnerUsername || 'Someone';
      const reviewOwnerHref = buildAccountHref({
        id: item?.details?.reviewOwnerId,
        username: item?.details?.reviewOwnerUsername,
      });
      const likedReviewRatingPart =
        normalizeMediaType(item?.subject?.type) === 'movie'
          ? createRatingPart(item?.details?.reviewRating)
          : null;
      return {
        parts: likedReviewRatingPart
          ? [
              actorPart,
              createTextPart(' liked '),
              createLinkPart('account', reviewOwnerLabel, reviewOwnerHref),
              createTextPart(getPossessiveSuffix(reviewOwnerLabel)),
              likedReviewRatingPart,
              createTextPart(' review of '),
              subjectPart,
            ]
          : [
              actorPart,
              createTextPart(' liked '),
              createLinkPart('account', reviewOwnerLabel, reviewOwnerHref),
              createTextPart(`${getPossessiveSuffix(reviewOwnerLabel)}review of `),
              subjectPart,
            ],
      };
    }
    default:
      return { parts: [actorPart, createTextPart(' updated '), subjectPart] };
  }
}

function projectActivityItem(item = {}, viewerId = null) {
  const line = projectActivityLine(item, viewerId);
  return {
    ...item,
    line,
    renderKind:
      item.renderKind === 'text_with_review' && item.reviewCard ? 'text_with_review' : 'text',
    reviewCard: item.renderKind === 'text_with_review' ? item.reviewCard : null,
  };
}

// ============================================================
// Derived Feed Generators & Readers
// ============================================================

export async function fetchDerivedUserActivityItems({
  offset = 0,
  pageSize = 20,
  userId,
  viewerId = null,
}) {
  const normalizedOffset = Number.isFinite(Number(offset))
    ? Math.max(0, Math.floor(Number(offset)))
    : 0;
  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Math.floor(Number(pageSize)))
    : 20;
  const fetchLimit = Math.min(50, Math.max(normalizedOffset + normalizedPageSize * 2, 8));

  const [profile, likes, watchlist, watched, lists, likedLists, reviewFeed] = await Promise.all([
    getAccountProfileByUserId(userId, { viewerId }).catch(() => null),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'likes',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'watchlist',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'watched',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'lists',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'liked-lists',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    fetchProfileReviewFeedServer({
      mode: 'authored',
      pageSize: fetchLimit,
      userId,
      viewerId,
    }).catch(() => ({ items: [] })),
  ]);

  const actor = normalizeActor({
    avatarUrl: profile?.avatarUrl || null,
    displayName: profile?.displayName || profile?.username || 'Someone',
    id: profile?.id || userId || null,
    username: profile?.username || null,
  });
  const derivedItems = [];

  (reviewFeed?.items || []).forEach((review) => {
    const timestamp = normalizeTimestamp(review.createdAt || review.updatedAt || review.created_at);
    const mediaKey = String(
      review.mediaKey || review.subjectKey || review.docPath || '',
    ).toLowerCase();
    const inferredType = mediaKey.startsWith('tv_')
      ? 'tv'
      : mediaKey.startsWith('list:')
        ? 'list'
        : 'movie';
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:review:${review.id || review.docPath}`,
      details: { rating: review.rating ?? null },
      eventType: ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED,
      id: `derived-review-${review.id || review.docPath}`,
      occurredAt: timestamp,
      renderKind: 'text_with_review',
      reviewCard: normalizeReviewCard({
        ...review,
        authorId: userId,
        reviewUserId: userId,
        user: { avatarUrl: actor.avatarUrl, name: actor.displayName, username: actor.username },
      }),
      sourceUserId: userId,
      subject: normalizeSubject({
        id: review.subjectId || review.mediaId || review.id,
        poster: review.subjectPoster || review.posterPath || review.poster_path,
        title: review.subjectTitle || review.title || review.name,
        type: review.subjectType || review.mediaType || inferredType,
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  (Array.isArray(watched) ? watched : []).forEach((item) => {
    const timestamp = normalizeTimestamp(
      item.addedAt || item.added_at || item.created_at || item.updated_at,
    );
    const mediaKey = String(item.mediaKey || item.media_key || item.id || '').toLowerCase();
    const inferredType =
      item.entityType ||
      item.entity_type ||
      item.media_type ||
      (mediaKey.startsWith('tv_') ? 'tv' : 'movie');
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:watched:${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      details: {},
      eventType: ACTIVITY_EVENT_TYPES.WATCHED_ADDED,
      id: `derived-watched-${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      occurredAt: timestamp,
      renderKind: 'text',
      reviewCard: null,
      sourceUserId: userId,
      subject: normalizeSubject({
        id: item.entityId || item.entity_id || item.id,
        poster: item.poster_path || item.posterPath,
        title: item.title || item.name,
        type: inferredType,
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  (Array.isArray(lists) ? lists : []).forEach((list) => {
    const timestamp = normalizeTimestamp(list.createdAt || list.updated_at || list.created_at);
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:list:${list.id || list.slug}`,
      details: { itemCount: list.itemCount || 0 },
      eventType: ACTIVITY_EVENT_TYPES.LIST_CREATED,
      id: `derived-list-${list.id || list.slug}`,
      occurredAt: timestamp,
      renderKind: 'text',
      reviewCard: null,
      sourceUserId: userId,
      subject: normalizeSubject({
        id: list.id,
        poster: list.coverPosterPath || list.posterPath || list.poster_path,
        slug: list.slug,
        title: list.title || list.name,
        type: 'list',
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  (Array.isArray(likes) ? likes : []).forEach((item) => {
    const timestamp = normalizeTimestamp(item.addedAt || item.added_at || item.created_at);
    const mediaKey = String(item.mediaKey || item.media_key || item.id || '').toLowerCase();
    const inferredType =
      item.entityType ||
      item.entity_type ||
      item.media_type ||
      (mediaKey.startsWith('tv_') ? 'tv' : 'movie');
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:like:${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      details: {},
      eventType: ACTIVITY_EVENT_TYPES.LIKED_ADDED,
      id: `derived-like-${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      occurredAt: timestamp,
      renderKind: 'text',
      reviewCard: null,
      sourceUserId: userId,
      subject: normalizeSubject({
        id: item.entityId || item.entity_id || item.id,
        poster: item.poster_path || item.posterPath,
        title: item.title || item.name,
        type: inferredType,
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  return derivedItems.filter(isVisibleActivityItem);
}

export async function fetchAccountActivityFeedServer({
  cursor = null,
  pageSize = 20,
  scope = 'user',
  sort = 'newest',
  subject = 'all',
  userId,
  viewerId = null,
}) {
  if (!userId) return { hasMore: false, items: [], nextCursor: null };

  const admin = createAdminClient();
  const canViewProfile = await canViewerAccessUserContent({
    client: admin,
    ownerId: userId,
    viewerId,
  });
  if (!canViewProfile) throw createPrivateProfileError();

  let followingIds = [];
  if (scope === 'following') {
    const followingResult = await admin
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', FOLLOW_STATUS_ACCEPTED);
    if (followingResult.error) {
      throw new Error(followingResult.error.message || 'Following accounts could not be loaded');
    }
    followingIds = (followingResult.data || []).map((i) => i.following_id).filter(Boolean);
  }
  const sourceIds = scope === 'following' ? [...new Set(followingIds)] : [userId];

  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Math.floor(Number(pageSize)))
    : 20;
  const normalizedOffset = Number.isFinite(Number(cursor))
    ? Math.max(0, Math.floor(Number(cursor)))
    : 0;
  const normalizedSubject = normalizeActivitySubjectFilter(subject);
  const normalizedSort = normalizeActivitySort(sort);
  const queryWindowSize = Math.max(
    ACTIVITY_QUERY_MINIMUM_WINDOW,
    normalizedOffset + normalizedPageSize * ACTIVITY_QUERY_WINDOW_MULTIPLIER,
  );

  if (sourceIds.length === 0) return { hasMore: false, items: [], nextCursor: null };

  const groups = await Promise.all(
    chunkArray(sourceIds, 100).map(async (idChunk) => {
      const res = await admin
        .from('activity')
        .select(ACTIVITY_SELECT)
        .in('event_type', [...ACTIVITY_EVENT_TYPE_SET])
        .in('user_id', idChunk)
        .order('updated_at', { ascending: normalizedSort === 'oldest' })
        .range(0, queryWindowSize);
      if (res.error) throw new Error(res.error.message || 'Activity feed could not be loaded');
      const rows = res.data || [];
      const hasMore = rows.length > queryWindowSize;
      const windowRows = hasMore ? rows.slice(0, queryWindowSize) : rows;
      const items = windowRows.map(normalizeActivityRow).filter(isVisibleActivityItem);
      return {
        hasMore,
        items,
        totalCount: items.length,
      };
    }),
  );

  const rawActivityItems = sortActivityItemsForMode(
    groups.flatMap((group) => group.items),
    normalizedSort,
  ).map((item) => ({
    ...item,
    isFromFollowing: normalizeValue(item?.sourceUserId) !== normalizeValue(userId),
  }));
  const hasMoreSourceItems = groups.some((group) => group.hasMore);

  // Activity is now persisted for every supported event. The derived readers
  // remain as a compatibility fallback for legacy users, but they fan out to
  // all collections and reviews and can be much slower than the activity
  // query itself. Only pay that cost when the persisted feed cannot fill the
  // requested page after subject filtering and the persisted source is
  // exhausted.
  const rawFilteredItemCount = filterActivityItemsBySubject(
    dedupeActivityItems(rawActivityItems),
    normalizedSubject,
  ).length;
  const minimumItemsNeeded = normalizedOffset + normalizedPageSize;
  const shouldLoadDerivedUserActivity =
    scope === 'user' && !hasMoreSourceItems && rawFilteredItemCount < minimumItemsNeeded;

  const derivedUserActivityItems = shouldLoadDerivedUserActivity
    ? (
        await fetchDerivedUserActivityItems({
          offset: normalizedOffset,
          pageSize: normalizedPageSize,
          userId,
          viewerId,
        })
      ).map((item) => ({ ...item, isFromFollowing: false }))
    : [];

  const combinedItems = dedupeActivityItems([...rawActivityItems, ...derivedUserActivityItems]);

  const items = sortActivityItemsForMode(
    filterActivityItemsBySubject(combinedItems, normalizedSubject),
    normalizedSort,
  );

  const paginated = paginateItems(items, cursor, pageSize);
  const hasMore = paginated.hasMore || (paginated.items.length > 0 && hasMoreSourceItems);
  const nextCursor = hasMore ? normalizedOffset + paginated.items.length : null;
  return {
    ...paginated,
    hasMore,
    items: paginated.items.map((item) => projectActivityItem(item, viewerId)),
    nextCursor,
    totalCount: Math.max(
      items.length,
      groups.reduce((total, group) => total + group.totalCount, 0),
    ),
  };
}


// ============================================================================
// FILE: domains/account/server/index.js
// ============================================================================

export * as collections from './collections.server.js';
export * as feed from './feed.server.js';
export * as mediaUpload from './media-upload.server.js';
export * as profile from './profile.server.js';
export * as routes from './routes.server.js';


// ============================================================================
// FILE: domains/account/server/media-upload.server.js
// ============================================================================

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  assertCsrfRequest,
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/domains/auth/server/security.server.js';
import { getRequestContext, requireSessionRequest } from '@/domains/auth/server/session.server.js';
import {
  ALLOWED_MIME_TYPES,
  AVIF_BRANDS,
  DEFAULT_MEDIA_BUCKET,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES_BY_TARGET,
  MIME_EXTENSION_MAP,
} from '@/domains/account/utils';

// ============================================================
// Media Shared Helpers
// ============================================================

function normalizeValue(value) {
  return String(value || '').trim();
}

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeTarget(value) {
  const normalized = normalizeValue(value).toLowerCase();
  if (normalized === 'avatar') return 'avatar';
  if (normalized === 'banner' || normalized === 'logo') return 'banner';
  throw createHttpError('Media target must be avatar or logo');
}

function resolveExtension(mimeType) {
  const extension = MIME_EXTENSION_MAP[mimeType];
  if (!extension) throw createHttpError('Only JPG, PNG, WEBP, GIF and AVIF images are allowed');
  return extension;
}

function assertMimeSignature(fileBuffer, mimeType) {
  if (!fileBuffer || !(fileBuffer instanceof Uint8Array) || fileBuffer.length < 12) {
    throw createHttpError('Selected image file is empty or corrupted');
  }

  const header = Array.from(fileBuffer.subarray(0, 12));

  if (mimeType === 'image/jpeg') {
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return;
    throw createHttpError('Invalid JPEG file');
  }

  if (mimeType === 'image/png') {
    if (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a
    )
      return;
    throw createHttpError('Invalid PNG file');
  }

  if (mimeType === 'image/webp') {
    const isRiff =
      header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
    const isWebp =
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
    if (isRiff && isWebp) return;
    throw createHttpError('Invalid WEBP file');
  }

  if (mimeType === 'image/gif') {
    const isGif87 =
      header[0] === 0x47 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x38 &&
      header[4] === 0x37 &&
      header[5] === 0x61;
    const isGif89 =
      header[0] === 0x47 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x38 &&
      header[4] === 0x39 &&
      header[5] === 0x61;
    if (isGif87 || isGif89) return;
    throw createHttpError('Invalid GIF file');
  }

  if (mimeType === 'image/avif') {
    const isFtyp =
      header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70;
    const brand = String.fromCharCode(...header.slice(8, 12)).toLowerCase();
    if (isFtyp && AVIF_BRANDS.has(brand)) return;
    throw createHttpError('Invalid AVIF file');
  }

  throw createHttpError('Unsupported image format');
}

// ============================================================
// Direct 1-Hop Supabase Storage Upload
// ============================================================

export async function uploadDirectMediaFile({
  fileBuffer,
  fileExtension,
  mimeType,
  target,
  userId,
}) {
  const adminClient = createAdminClient();
  const bucket = DEFAULT_MEDIA_BUCKET;
  const path = `accounts/${userId}/${target}-${Date.now()}-${randomUUID()}.${fileExtension}`;

  const uploadResult = await adminClient.storage.from(bucket).upload(path, fileBuffer, {
    upsert: true,
    contentType: mimeType,
    cacheControl: '31536000',
  });

  if (uploadResult.error)
    throw createHttpError(uploadResult.error.message || 'Image upload failed', 500);

  const { data: { publicUrl = '' } = {} } = adminClient.storage.from(bucket).getPublicUrl(path);
  const url = normalizeValue(publicUrl);
  if (!url) throw createHttpError('Image upload succeeded but URL could not be generated', 500);

  return { bucket, path, url };
}

// ============================================================
// Media Upload HTTP Endpoint Handler
// ============================================================

export async function handleAccountMediaPost(request) {
  try {
    const authContext = await requireSessionRequest(request, { allowBearerFallback: true });
    assertCsrfRequest(request, getRequestContext(request));

    await enforceSlidingWindowRateLimit({
      namespace: 'account-media-upload',
      windowMs: 60 * 1000,
      dimensions: [{ id: 'user', value: authContext.userId, limit: 15 }],
    });

    const formData = await request.formData();
    const target = normalizeTarget(formData.get('target'));
    const file = formData.get('file');

    if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
      throw createHttpError('Select an image file');
    }

    const mimeType = normalizeValue(file.type).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType))
      throw createHttpError('Only JPG, PNG, WEBP, GIF and AVIF images are allowed');

    const fileSize = Number(file.size || 0);
    const targetMaxBytes = MAX_UPLOAD_BYTES_BY_TARGET[target] || MAX_UPLOAD_BYTES;
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > targetMaxBytes) {
      throw createHttpError(
        `Image file size must be less than ${Math.round(targetMaxBytes / (1024 * 1024))}MB`,
      );
    }

    const fileExtension = resolveExtension(mimeType);
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    assertMimeSignature(fileBuffer, mimeType);

    const mediaResult = await uploadDirectMediaFile({
      fileBuffer,
      fileExtension,
      mimeType,
      target,
      userId: authContext.userId,
    });

    return NextResponse.json({
      bucket: mediaResult.bucket || null,
      path: mediaResult.path || null,
      url: mediaResult.url || null,
      success: true,
    });
  } catch (error) {
    if (isSlidingWindowRateLimitError(error)) {
      return NextResponse.json({ error: error.message || 'Rate limit exceeded' }, { status: 429 });
    }
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Image upload failed' }, { status });
  }
}


// ============================================================================
// FILE: domains/account/server/profile.server.js
// ============================================================================

import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { cleanString, normalizeTimestamp } from '@/shared/utils';
import { normalizeFavoriteShowcaseItems } from '@/domains/media/shared/media';
import {
  ACCOUNT_PROFILE_SELECT,
  COUNTER_SELECT,
  EMPTY_EDITABLE_ACCOUNT_COUNTS,
  FOLLOW_COUNTS_TIMEOUT_MS,
  FOLLOW_STATUS_ACCEPTED,
  PROFILE_COUNTERS_TIMEOUT_MS,
  assertResult,
  isValidUuid,
} from '@/domains/account/utils';

// ============================================================
// Profile Normalizers & Data Transforms
// ============================================================

export function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeCount(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function normalizeAccountData(
  data = {},
  id = null,
  { includeEmail = false, includePrivateDetails = false } = {},
) {
  const displayName = data.display_name || data.displayName || 'Anonymous User';
  const isPrivate = data.is_private === true || data.isPrivate === true;
  const canIncludePrivateDetails = !isPrivate || includePrivateDetails;
  const favoriteShowcaseRaw =
    Array.isArray(data.favorite_showcase) && data.favorite_showcase.length > 0
      ? data.favorite_showcase
      : Array.isArray(data.favoriteShowcase)
        ? data.favoriteShowcase
        : [];

  return {
    avatarUrl: data.avatar_url || data.avatarUrl || null,
    bannerUrl: data.banner_url || data.bannerUrl || null,
    createdAt: normalizeTimestamp(data.created_at || data.createdAt),
    description: data.description || '',
    displayName,
    displayNameLower:
      data.display_name_lower || data.displayNameLower || String(displayName).toLowerCase(),
    id: id || data.id || null,
    isPrivate,
    followerCount: normalizeCount(data.follower_count ?? data.followerCount, 0),
    followingCount: normalizeCount(data.following_count ?? data.followingCount, 0),
    updatedAt: normalizeTimestamp(data.updated_at || data.updatedAt),
    username: data.username || null,
    usernameLower:
      data.username_lower ||
      data.usernameLower ||
      (data.username ? String(data.username).toLowerCase() : null),
    ...(includeEmail ? { email: data.email || null } : {}),
    ...(canIncludePrivateDetails
      ? {
          favoriteShowcase: normalizeFavoriteShowcaseItems(favoriteShowcaseRaw),
          lastActivityAt: normalizeTimestamp(data.last_activity_at || data.lastActivityAt),
          likesCount: normalizeCount(data.likes_count ?? data.likesCount, 0),
          listsCount: normalizeCount(data.lists_count ?? data.listsCount, 0),
          watchedCount: normalizeCount(data.watched_count ?? data.watchedCount, 0),
          watchlistCount: normalizeCount(data.watchlist_count ?? data.watchlistCount, 0),
        }
      : {
          favoriteShowcase: [],
          lastActivityAt: null,
          likesCount: 0,
          listsCount: 0,
          watchedCount: 0,
          watchlistCount: 0,
        }),
  };
}

async function resolveWithTimeout(operation, timeoutMs) {
  let timer = null;
  try {
    return await Promise.race([
      operation,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ data: null, error: null, timedOut: true }), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ============================================================
// Server-Side Profile Readers & Snapshot Loaders
// ============================================================

async function getUserIdByUsername(username) {
  const normalizedUsername = normalizeValue(username).toLowerCase();
  if (!normalizedUsername) return null;

  const result = await createAdminClient()
    .from('usernames')
    .select('user_id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  if (result.error) throw new Error(result.error.message || 'Username lookup failed');
  return result.data?.user_id || null;
}

async function loadProfileCounters(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const admin = createAdminClient();
  const timeoutResult = await resolveWithTimeout(
    admin
      .from('profile_counters')
      .select(COUNTER_SELECT)
      .eq('user_id', normalizedUserId)
      .maybeSingle(),
    PROFILE_COUNTERS_TIMEOUT_MS,
  );

  if (timeoutResult?.timedOut) return null;
  if (timeoutResult.error)
    throw new Error(timeoutResult.error.message || 'Profile counters could not be loaded');
  return timeoutResult.data || null;
}

async function loadFollowCounts(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const admin = createAdminClient();
  const timeoutResult = await resolveWithTimeout(
    Promise.all([
      admin
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', normalizedUserId)
        .eq('status', FOLLOW_STATUS_ACCEPTED),
      admin
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', normalizedUserId)
        .eq('status', FOLLOW_STATUS_ACCEPTED),
    ]),
    FOLLOW_COUNTS_TIMEOUT_MS,
  );

  if (timeoutResult?.timedOut) return null;
  const [followersResult, followingResult] = timeoutResult;

  if (followersResult?.error)
    throw new Error(followersResult.error.message || 'Follower count could not be loaded');
  if (followingResult?.error)
    throw new Error(followingResult.error.message || 'Following count could not be loaded');

  return {
    followerCount: normalizeCount(followersResult?.count, 0),
    followingCount: normalizeCount(followingResult?.count, 0),
  };
}

async function loadCollectionCounts(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const admin = createAdminClient();
  const timeoutResult = await resolveWithTimeout(
    Promise.all([
      admin
        .from('likes')
        .select('media_key', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
      admin
        .from('lists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
      admin
        .from('watched')
        .select('media_key', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
      admin
        .from('watchlist')
        .select('media_key', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
    ]),
    PROFILE_COUNTERS_TIMEOUT_MS,
  );

  if (timeoutResult?.timedOut) return null;
  const [likesResult, listsResult, watchedResult, watchlistResult] = timeoutResult;
  const firstError = [likesResult, listsResult, watchedResult, watchlistResult].find(
    (r) => r?.error,
  )?.error;

  if (firstError) throw new Error(firstError.message || 'Collection counts could not be loaded');

  return {
    likesCount: normalizeCount(likesResult?.count, 0),
    listsCount: normalizeCount(listsResult?.count, 0),
    watchedCount: normalizeCount(watchedResult?.count, 0),
    watchlistCount: normalizeCount(watchlistResult?.count, 0),
  };
}

export const getAccountProfile = cache(
  async (userId, { includeEmail = false, includePrivateDetails = false } = {}) => {
    const normalizedUserId = normalizeValue(userId);
    if (!normalizedUserId) return null;

    const admin = createAdminClient();
    const [profileResult, counters] = await Promise.all([
      admin
        .from('profiles')
        .select(ACCOUNT_PROFILE_SELECT)
        .eq('id', normalizedUserId)
        .maybeSingle(),
      loadProfileCounters(normalizedUserId).catch(() => null),
    ]);

    if (profileResult.error)
      throw new Error(profileResult.error.message || 'Account lookup failed');
    if (!profileResult.data) return null;

    // profile_counters is maintained by the collection/follow RPCs and gives
    // us one consistent snapshot. Only fall back to exact counts for legacy
    // rows where the counter record has not been created yet.
    const fallbackCounts = counters
      ? null
      : await Promise.all([
          loadFollowCounts(normalizedUserId).catch(() => null),
          loadCollectionCounts(normalizedUserId).catch(() => null),
        ]);
    const [followCounts, collectionCounts] = fallbackCounts || [];

    return normalizeAccountData(
      {
        ...profileResult.data,
        follower_count:
          Number.isFinite(Number(followCounts?.followerCount)) &&
          Number(followCounts.followerCount) >= 0
            ? Number(followCounts.followerCount)
            : Number.isFinite(Number(counters?.follower_count))
              ? Number(counters.follower_count)
              : 0,
        following_count:
          Number.isFinite(Number(followCounts?.followingCount)) &&
          Number(followCounts.followingCount) >= 0
            ? Number(followCounts.followingCount)
            : Number.isFinite(Number(counters?.following_count))
              ? Number(counters.following_count)
              : 0,
        likes_count: Number.isFinite(Number(collectionCounts?.likesCount))
          ? Number(collectionCounts.likesCount)
          : (counters?.likes_count ?? 0),
        lists_count: Number.isFinite(Number(collectionCounts?.listsCount))
          ? Number(collectionCounts.listsCount)
          : (counters?.lists_count ?? 0),
        watched_count: Number.isFinite(Number(collectionCounts?.watchedCount))
          ? Number(collectionCounts.watchedCount)
          : Number.isFinite(Number(counters?.watched_count))
            ? Number(counters.watched_count)
            : Number(profileResult.data?.watched_count ?? 0),
        watchlist_count: Number.isFinite(Number(collectionCounts?.watchlistCount))
          ? Number(collectionCounts.watchlistCount)
          : (counters?.watchlist_count ?? 0),
      },
      profileResult.data.id,
      { includeEmail, includePrivateDetails },
    );
  },
);

export async function getAccountSnapshotByUserId(userId, options = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) {
    return { profile: null, resolvedUserId: null, resolveError: 'Account not found' };
  }
  try {
    const profile = await getAccountProfile(normalizedUserId, options);
    return { profile: profile || null, resolvedUserId: normalizedUserId, resolveError: null };
  } catch (error) {
    return {
      profile: null,
      resolvedUserId: normalizedUserId,
      resolveError: error?.message || 'Account could not be loaded',
    };
  }
}

export async function getAccountSnapshotByUsername(username, options = {}) {
  try {
    const userId = await getUserIdByUsername(username);
    if (!userId) {
      return { profile: null, resolvedUserId: null, resolveError: 'Account not found' };
    }
    const profile = await getAccountProfile(userId, options);
    if (!profile) {
      return { profile: null, resolvedUserId: null, resolveError: 'Account not found' };
    }
    return { profile, resolvedUserId: userId, resolveError: null };
  } catch (error) {
    return {
      profile: null,
      resolvedUserId: null,
      resolveError: error?.message || 'Account could not be loaded',
    };
  }
}

export async function getEditableAccountSnapshotByUserId(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) {
    return {
      counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
      profile: null,
      resolvedUserId: null,
      resolveError: 'Account not found',
    };
  }

  try {
    const profile = await getAccountProfile(normalizedUserId, {
      includeEmail: true,
      includePrivateDetails: true,
    });

    if (!profile) {
      return {
        counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
        profile: null,
        resolvedUserId: normalizedUserId,
        resolveError: null,
      };
    }

    return {
      counts: {
        followers: normalizeCount(profile.followerCount, 0),
        following: normalizeCount(profile.followingCount, 0),
        likes: normalizeCount(profile.likesCount, 0),
        lists: normalizeCount(profile.listsCount, 0),
        watched: normalizeCount(profile.watchedCount, 0),
        watchlist: normalizeCount(profile.watchlistCount, 0),
      },
      profile,
      resolvedUserId: normalizedUserId,
      resolveError: null,
    };
  } catch (error) {
    return {
      counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
      profile: null,
      resolvedUserId: normalizedUserId,
      resolveError: error?.message || 'Account could not be loaded',
    };
  }
}

// ============================================================
// Public Access Controls & Username Resolvers
// ============================================================

export const canViewerAccessUserContent = cache(
  async ({ client = null, ownerId, viewerId = null }) => {
    const normalizedOwnerId = normalizeValue(ownerId);
    const normalizedViewerId = normalizeValue(viewerId);

    if (!normalizedOwnerId) return false;
    if (normalizedViewerId && normalizedViewerId === normalizedOwnerId) return true;

    const admin = client || createAdminClient();
    const profileResult = await admin
      .from('profiles')
      .select('is_private')
      .eq('id', normalizedOwnerId)
      .maybeSingle();

    assertResult(profileResult, 'Profile visibility could not be checked');
    if (!profileResult.data) return false;
    if (profileResult.data.is_private !== true) return true;
    if (!normalizedViewerId) return false;

    const followResult = await admin
      .from('follows')
      .select('status')
      .eq('follower_id', normalizedViewerId)
      .eq('following_id', normalizedOwnerId)
      .eq('status', FOLLOW_STATUS_ACCEPTED)
      .maybeSingle();

    assertResult(followResult, 'Profile visibility could not be checked');
    return Boolean(followResult.data);
  },
);

export function createPrivateProfileError() {
  const error = new Error('This profile is private');
  error.status = 403;
  return error;
}

async function resolveAccountIdByUsernameLegacy(username) {
  const normalizedUsername = cleanString(username).toLowerCase();
  if (!normalizedUsername) return null;

  const admin = createAdminClient();
  const usernameLookup = await admin
    .from('usernames')
    .select('user_id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  assertResult(usernameLookup, 'Username could not be resolved');
  if (usernameLookup.data?.user_id) return usernameLookup.data.user_id;

  const profileByUsernameLookup = await admin
    .from('profiles')
    .select('id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  assertResult(profileByUsernameLookup, 'Username could not be resolved');
  if (profileByUsernameLookup.data?.id) return profileByUsernameLookup.data.id;

  if (!isValidUuid(normalizedUsername)) return null;

  const profileByIdLookup = await admin
    .from('profiles')
    .select('id')
    .eq('id', normalizedUsername)
    .maybeSingle();

  assertResult(profileByIdLookup, 'Username could not be resolved');
  return profileByIdLookup.data?.id || null;
}

const USERNAME_ACCOUNT_ID_CACHE = new Map();
const USERNAME_ACCOUNT_ID_CACHE_TTL_MS = 60 * 1000;

export const getAccountIdByUsername = cache(async (username) => {
  const normalizedUsername = cleanString(username);
  if (!normalizedUsername) return null;

  const cached = USERNAME_ACCOUNT_ID_CACHE.get(normalizedUsername);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId;
  }

  const resolvedUserId = await resolveAccountIdByUsernameLegacy(normalizedUsername);

  if (resolvedUserId) {
    USERNAME_ACCOUNT_ID_CACHE.set(normalizedUsername, {
      expiresAt: Date.now() + USERNAME_ACCOUNT_ID_CACHE_TTL_MS,
      userId: resolvedUserId,
    });
    if (USERNAME_ACCOUNT_ID_CACHE.size > 300) {
      const firstKey = USERNAME_ACCOUNT_ID_CACHE.keys().next().value;
      USERNAME_ACCOUNT_ID_CACHE.delete(firstKey);
    }
  }

  return resolvedUserId;
});

async function loadAccountProfileFallback(userId, viewerId = null) {
  const includePrivateDetails = await canViewerAccessUserContent({
    ownerId: userId,
    viewerId,
  }).catch(() => false);
  const snapshot = await getAccountSnapshotByUserId(userId, { includePrivateDetails });
  return snapshot.profile || null;
}

const SERVER_PROFILE_CACHE = new Map();
const SERVER_PROFILE_INFLIGHT = new Map();
const SERVER_PROFILE_CACHE_TTL_MS = 30000;

function getServerProfileCacheKey(userId, viewerId = null) {
  return `${normalizeValue(userId)}:${normalizeValue(viewerId) || 'anon'}`;
}

export function invalidateCachedAccountProfiles(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return;

  for (const key of SERVER_PROFILE_CACHE.keys()) {
    if (key.startsWith(`${normalizedUserId}:`)) SERVER_PROFILE_CACHE.delete(key);
  }
}

export async function getAccountProfileByUserId(
  userId,
  { viewerId = null, bypassCache = false } = {},
) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const cacheKey = getServerProfileCacheKey(normalizedUserId, viewerId);
  const now = Date.now();
  const cached = SERVER_PROFILE_CACHE.get(cacheKey);

  if (!bypassCache && cached && cached.expiresAt > now) {
    return cached.profile;
  }

  if (bypassCache) {
    SERVER_PROFILE_CACHE.delete(cacheKey);
  }

  if (!bypassCache && SERVER_PROFILE_INFLIGHT.has(cacheKey)) {
    return SERVER_PROFILE_INFLIGHT.get(cacheKey);
  }

  const profilePromise = (async () => {
    const profile = await loadAccountProfileFallback(normalizedUserId, viewerId);

    if (profile) {
      SERVER_PROFILE_CACHE.set(cacheKey, {
        expiresAt: Date.now() + SERVER_PROFILE_CACHE_TTL_MS,
        profile,
      });
      if (SERVER_PROFILE_CACHE.size > 300) {
        const firstKey = SERVER_PROFILE_CACHE.keys().next().value;
        SERVER_PROFILE_CACHE.delete(firstKey);
      }
    }

    return profile;
  })();

  SERVER_PROFILE_INFLIGHT.set(cacheKey, profilePromise);
  try {
    return await profilePromise;
  } finally {
    SERVER_PROFILE_INFLIGHT.delete(cacheKey);
  }
}

export async function getAccountProfileByUsername(username, { viewerId = null } = {}) {
  const normalizedUsername = cleanString(username);
  if (!normalizedUsername) return null;

  const accountId = await getAccountIdByUsername(normalizedUsername);
  if (!accountId) return null;
  return getAccountProfileByUserId(accountId, { viewerId });
}


// ============================================================================
// FILE: domains/account/server/request-target.server.js
// ============================================================================

import 'server-only';

import { normalizeValue } from '@/shared/utils';
import { getAccountIdByUsername } from './profile.server';

export async function resolveAccountRequestUserId({ fallbackUserId = null, searchParams } = {}) {
  const userId = normalizeValue(searchParams?.get('userId'));
  if (userId) return userId;

  const username = normalizeValue(searchParams?.get('username'));
  if (username) return getAccountIdByUsername(username);

  return normalizeValue(fallbackUserId) || null;
}


// ============================================================================
// FILE: domains/account/server/routes.server.js
// ============================================================================

import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSessionFromRequest } from '@/domains/auth/server/session.server.js';
import {
  getAccountIdByUsername,
  getAccountProfileByUserId,
  getEditableAccountSnapshotByUserId,
} from './profile.server';
import { getAccountResource } from './collections.server';
import { fetchAccountActivityFeedServer } from './feed.server';
import {
  fetchListReviewFeedServer,
  fetchProfileReviewFeedServer,
} from '@/domains/reviews/server/feeds.server';
import { getFollowResource } from '@/domains/social/server/follows/resources.server';
import {
  ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS,
  EMPTY_ARRAY,
  EMPTY_ROUTE_FEED,
  OVERVIEW_ACTIVITY_LIMIT,
  OVERVIEW_LIKES_LIMIT,
  OVERVIEW_LISTS_LIMIT,
  OVERVIEW_REVIEW_LIMIT,
  OVERVIEW_WATCHED_LIMIT,
  OVERVIEW_WATCHLIST_LIMIT,
} from '@/domains/account/utils';

function buildCookieRequest(cookieStore) {
  return {
    cookies: {
      get(name) {
        return cookieStore.get(name);
      },
      getAll() {
        return cookieStore.getAll();
      },
    },
    headers: {
      get(name) {
        if (String(name || '').toLowerCase() !== 'cookie') return '';
        return cookieStore
          .getAll()
          .map((c) => `${c.name}=${c.value}`)
          .join('; ');
      },
    },
  };
}

export async function getViewerSessionContext() {
  const cookieStore = await cookies();
  const request = buildCookieRequest(cookieStore);
  return readSessionFromRequest(request).catch(() => null);
}

function createRouteState(base = null, extras = null) {
  return {
    ...(base && typeof base === 'object' ? base : {}),
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

function createInitialCollections({
  counts = null,
  likedLists = [],
  likes = [],
  lists = [],
  resolvedUserId = null,
  watched = [],
  watchlist = [],
}) {
  const normalizedLikes = Array.isArray(likes) ? likes : [];
  const normalizedLists = Array.isArray(lists) ? lists : [];
  const normalizedLikedLists = Array.isArray(likedLists) ? likedLists : [];
  const normalizedWatched = Array.isArray(watched) ? watched : [];
  const normalizedWatchlist = Array.isArray(watchlist) ? watchlist : [];

  const resolveCount = (value, items = []) => {
    const parsed = Number(value);
    const listLength = Array.isArray(items) ? items.length : 0;
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed), listLength) : listLength;
  };

  return {
    counts: {
      likedLists: resolveCount(counts?.likedLists, normalizedLikedLists),
      likes: resolveCount(counts?.likes, normalizedLikes),
      lists: resolveCount(counts?.lists, normalizedLists),
      watched: resolveCount(counts?.watched, normalizedWatched),
      watchlist: resolveCount(counts?.watchlist, normalizedWatchlist),
    },
    likedLists: normalizedLikedLists,
    likes: normalizedLikes,
    lists: normalizedLists,
    userId: resolvedUserId,
    watched: normalizedWatched,
    watchlist: normalizedWatchlist,
  };
}

function createInitialFeed(feed = null, resolvedUserId = null, extras = null) {
  if (!feed || !resolvedUserId) return null;
  const normalizedItems = Array.isArray(feed.items) ? feed.items : [];
  const normalizedTotalCount = Number.isFinite(Number(feed.totalCount))
    ? Math.max(0, Math.floor(Number(feed.totalCount)))
    : normalizedItems.length;

  return {
    error: null,
    hasMore: Boolean(feed.hasMore),
    items: normalizedItems,
    nextCursor: feed.nextCursor ?? null,
    totalCount: normalizedTotalCount,
    userId: resolvedUserId,
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

function createInitialListFeed(items = [], resolvedUserId = null, extras = null) {
  if (!resolvedUserId) return null;
  return {
    items: Array.isArray(items) ? items : [],
    userId: resolvedUserId,
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

function resolveSnapshotUserId(snapshot = null) {
  return snapshot?.initialResolvedUserId || snapshot?.resolvedUserId || null;
}

function resolveSnapshotCounts(snapshot = null) {
  return snapshot?.initialCounts || snapshot?.counts || null;
}

function createSnapshotInitialCollections(snapshot = null, collections = {}) {
  return createInitialCollections({
    counts: resolveSnapshotCounts(snapshot),
    resolvedUserId: resolveSnapshotUserId(snapshot),
    ...(collections && typeof collections === 'object' ? collections : {}),
  });
}

function createCurrentOverviewFallback(snapshot = null) {
  const resolvedUserId = resolveSnapshotUserId(snapshot);
  return {
    initialActivityFeed: null,
    initialCollections: null,
    initialCounts: null,
    initialProfile: null,
    initialResolveError: snapshot?.resolveError || null,
    initialResolvedUserId: resolvedUserId,
    initialReviewFeed: null,
    username: null,
  };
}

function createCurrentAuthPendingRouteState() {
  return {
    initialActivityFeed: null,
    initialCollections: null,
    initialCounts: null,
    initialProfile: null,
    initialResolveError: null,
    initialResolvedUserId: null,
    initialReviewFeed: null,
    username: null,
  };
}

function createMissingUsernameRouteState(snapshot, username, extras = {}) {
  return createRouteState(snapshot, { initialCollections: null, username, ...extras });
}

export async function getCurrentEditableAccountSnapshot(userId = null) {
  const resolvedUserId = userId || (await getViewerSessionContext())?.userId || null;
  if (!resolvedUserId) return null;
  return getEditableAccountSnapshotByUserId(resolvedUserId);
}

export const getUsernameAccountSnapshot = cache(async (username) => {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;
  const resolvedUserId = await getAccountIdByUsername(username);

  if (!resolvedUserId) {
    return {
      initialCounts: null,
      initialFollowRelationship: null,
      initialProfile: null,
      initialResolveError: 'Account not found',
      initialResolvedUserId: null,
      viewerId,
    };
  }

  const [profile, initialFollowRelationship] = await Promise.all([
    getAccountProfileByUserId(resolvedUserId, { viewerId }),
    viewerId && viewerId !== resolvedUserId
      ? safeLoad(
          () =>
            getFollowResource({
              resource: 'relationship',
              targetId: resolvedUserId,
              viewerId,
            }),
          null,
        )
      : null,
  ]);

  return {
    initialCounts: {
      likes: Number(profile?.likesCount || 0),
      lists: Number(profile?.listsCount || 0),
      watched: Number(profile?.watchedCount || 0),
      watchlist: Number(profile?.watchlistCount || 0),
    },
    initialFollowRelationship: initialFollowRelationship || null,
    initialProfile: profile,
    initialResolveError: profile ? null : 'Account not found',
    initialResolvedUserId: profile ? resolvedUserId : null,
    viewerId,
  };
});

async function withTimeout(loadPromise, timeoutMs = ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS) {
  let timer = null;
  try {
    return await Promise.race([
      loadPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error('Account route optional load timed out');
          err.code = 'ACCOUNT_ROUTE_LOAD_TIMEOUT';
          reject(err);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function safeLoad(
  load,
  fallback,
  { timeoutMs = ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS } = {},
) {
  try {
    return await withTimeout(Promise.resolve().then(load), timeoutMs);
  } catch {
    return fallback;
  }
}

async function loadAccountResource(
  snapshot = null,
  { resource, fallback = [], limitCount = null, listId = null, media = null, slug = null } = {},
) {
  const userId = resolveSnapshotUserId(snapshot);
  if (!userId) return fallback;

  try {
    const result = await withTimeout(
      getAccountResource({
        ...(limitCount !== null ? { limitCount } : {}),
        ...(listId ? { listId } : {}),
        ...(media ? { media } : {}),
        ...(slug ? { slug } : {}),
        resource,
        strict: false,
        userId,
        viewerId: snapshot?.viewerId || null,
      }),
    );
    return result && typeof result === 'object' && Object.hasOwn(result, 'data')
      ? result.data
      : (result ?? fallback);
  } catch {
    return fallback;
  }
}

async function loadOverviewCollections(snapshot = null) {
  const userId = resolveSnapshotUserId(snapshot);
  if (!userId) return { likedLists: [], likes: [], lists: [], watched: [], watchlist: [] };

  const [likes, watched, watchlist, lists, likedLists] = await Promise.all([
    loadAccountResource(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_LIKES_LIMIT,
      resource: 'likes',
    }),
    loadAccountResource(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_WATCHED_LIMIT,
      resource: 'watched',
    }),
    loadAccountResource(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_WATCHLIST_LIMIT,
      resource: 'watchlist',
    }),
    loadAccountResource(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_LISTS_LIMIT,
      resource: 'lists',
    }),
    loadAccountResource(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_LISTS_LIMIT,
      resource: 'liked-lists',
    }),
  ]);
  return { likedLists, likes, lists, watched, watchlist };
}

function loadAccountActivityRouteFeed({
  cursor = null,
  pageSize = 20,
  scope = 'user',
  sort = 'newest',
  subject = 'all',
  userId,
  viewerId = null,
} = {}) {
  return safeLoad(
    () =>
      fetchAccountActivityFeedServer({ cursor, pageSize, scope, sort, subject, userId, viewerId }),
    EMPTY_ROUTE_FEED,
  );
}

function loadProfileReviewRouteFeed({
  mode = 'authored',
  pageSize = null,
  userId,
  viewerId = null,
} = {}) {
  return safeLoad(
    () =>
      fetchProfileReviewFeedServer({
        mode,
        ...(pageSize !== null ? { pageSize } : {}),
        userId,
        viewerId,
      }),
    EMPTY_ROUTE_FEED,
  );
}

function loadListReviewRouteFeed({ listId, ownerId, viewerId = null } = {}) {
  return safeLoad(() => fetchListReviewFeedServer({ listId, ownerId, viewerId }), EMPTY_ARRAY);
}

export async function getCurrentAccountOverviewRouteData() {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;
  if (!viewerId) return createCurrentAuthPendingRouteState();

  const snapshot = await getCurrentEditableAccountSnapshot(viewerId);
  if (!snapshot?.resolvedUserId) return createCurrentOverviewFallback(snapshot);
  return {
    initialCounts: snapshot.counts,
    initialProfile: snapshot.profile,
    initialResolveError: snapshot.resolveError,
    initialResolvedUserId: snapshot.resolvedUserId,
    initialReviewFeed: null,
    username: snapshot.profile?.username || null,
  };
}

export async function redirectCurrentAccountSection(sectionKey) {
  const normalizedSectionKey = String(sectionKey || '')
    .trim()
    .toLowerCase();
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;

  if (!viewerId) redirect('/account');
  const snapshot = await getCurrentEditableAccountSnapshot(viewerId);
  const username = snapshot?.profile?.username || null;

  if (username && normalizedSectionKey) redirect(`/account/${username}/${normalizedSectionKey}`);
  redirect('/account');
}

export async function getUsernameAccountOverviewRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, {
      initialActivityFeed: null,
      initialReviewFeed: null,
    });
  }

  const [{ likedLists, likes, lists, watched, watchlist }, rawActivityFeed] = await Promise.all([
    loadOverviewCollections(snapshot),
    loadAccountActivityRouteFeed({
      pageSize: OVERVIEW_ACTIVITY_LIMIT,
      scope: 'user',
      sort: 'newest',
      subject: 'all',
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    }),
  ]);

  return createRouteState(snapshot, {
    initialActivityFeed: createInitialFeed(rawActivityFeed, snapshot.initialResolvedUserId),
    initialCollections: createSnapshotInitialCollections(snapshot, {
      likedLists,
      likes,
      lists,
      watched,
      watchlist,
    }),
    initialReviewFeed: null,
    username,
  });
}

export async function getUsernameAccountListsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const lists = await loadAccountResource(snapshot, { fallback: [], resource: 'lists' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { lists }),
    username,
  });
}

export async function getUsernameAccountActivityRouteData(username, query = {}) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId)
    return createMissingUsernameRouteState(snapshot, username, { initialActivityFeed: null });

  const scope = query?.scope === 'following' ? 'following' : 'user';
  const sort = query?.sort || (query?.asort === 'oldest' ? 'oldest' : 'newest');
  const subject =
    query?.subject ||
    (query?.asub === 'list' || query?.asub === 'movie' || query?.asub === 'tv'
      ? query.asub
      : 'all');
  const page = Number.isFinite(Number(query?.page))
    ? Math.max(1, Math.floor(Number(query.page)))
    : 1;

  const rawFeed = await loadAccountActivityRouteFeed({
    cursor: (page - 1) * 36,
    pageSize: 36,
    scope,
    sort,
    subject,
    userId: snapshot.initialResolvedUserId,
    viewerId: snapshot.viewerId,
  });

  return createRouteState(snapshot, {
    initialActivityFeed: createInitialFeed(rawFeed, snapshot.initialResolvedUserId, {
      page,
      scope,
      sort,
      subject,
    }),
    username,
  });
}

export async function getUsernameAccountLikesRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const likes = await loadAccountResource(snapshot, { fallback: [], resource: 'likes' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { likes }),
    username,
  });
}

export async function getUsernameAccountListDetailRouteData(username, slug) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const list = await loadAccountResource(snapshot, {
    fallback: null,
    resource: 'list-by-slug',
    slug,
  });
  const [listItems, listReviews] = list?.id
    ? await Promise.all([
        loadAccountResource(snapshot, {
          fallback: [],
          listId: list.id,
          resource: 'list-items',
        }),
        loadListReviewRouteFeed({
          listId: list.id,
          ownerId: list?.userId || list?.user_id || snapshot.initialResolvedUserId,
          viewerId: snapshot.viewerId,
        }),
      ])
    : [[], []];

  return createRouteState(snapshot, {
    initialList: list,
    initialListFeed: createInitialListFeed(listItems, snapshot.initialResolvedUserId, {
      reviews: listReviews,
    }),
    initialListItems: listItems,
    initialListReviews: listReviews,
    username,
  });
}

export async function getUsernameAccountReviewsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId)
    return createMissingUsernameRouteState(snapshot, username, { initialReviewFeed: null });

  const rawFeed = await loadProfileReviewRouteFeed({
    mode: 'authored',
    userId: snapshot.initialResolvedUserId,
    viewerId: snapshot.viewerId,
  });

  return createRouteState(snapshot, {
    initialReviewFeed: createInitialFeed(rawFeed, snapshot.initialResolvedUserId, {
      mode: 'authored',
    }),
    username,
  });
}

export async function getUsernameAccountWatchedRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const watched = await loadAccountResource(snapshot, { fallback: [], resource: 'watched' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { watched }),
    username,
  });
}

export async function getUsernameAccountWatchlistRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const watchlist = await loadAccountResource(snapshot, { fallback: [], resource: 'watchlist' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { watchlist }),
    username,
  });
}


// ============================================================================
// FILE: domains/account/ui/components/account-media-grid.js
// ============================================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MediaCard from '@/domains/media/ui/components/media-card';
import { TMDB_IMG } from '@/shared/constants';
import { useModal } from '@/modules/modal';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import AccountPagination from './account-pagination';
import {
  buildAccountCollectionPageHref,
  formatPaginationSummaryLabel,
} from '@/domains/account/utils';
import { AccountInlineSectionState } from '../sections/account-section';
import AccountSectionLayout, {
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '../sections/account-section';
import { MediaCardsSkeletonGrid } from '../skeletons/account-section-skeletons';
import { useNavigationActions } from '@/modules/nav';
import { useAuth } from '@/modules/auth';
import { createListPickerSurfaceEntry } from '@/domains/account/ui/nav-surfaces/list-picker-surface';
import { createListItemPayload } from '@/domains/account/utils/media-card';
const ITEMS_PER_PAGE = 36;

function createPosterSource(item, mediaType) {
  const normalizedMediaType = String(mediaType || '')
    .trim()
    .toLowerCase();
  const preferredPoster =
    normalizedMediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  if (preferredPoster) {
    return preferredPoster;
  }
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }
  const posterFilePath = item?.poster_path || item?.profile_path || null;
  return posterFilePath ? `${TMDB_IMG}/w342${posterFilePath}` : null;
}

function extractMediaDetails(item) {
  const explicitType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();
  if (!explicitType) return null;
  const detailId = item?.entityId || item?.id;
  if (!detailId) return null;
  const title = item?.title || item?.name || item?.original_title || 'Untitled';
  const year = item?.release_date?.slice?.(0, 4) || item?.first_air_date?.slice?.(0, 4) || null;
  const poster = createPosterSource(item, explicitType);
  return {
    href: `/${explicitType}/${detailId}`,
    id: item?.mediaKey || `${explicitType}-${detailId}`,
    imageAlt: title,
    imageSrc: poster,
    item,
    tooltipText: year ? `${title}(${year})` : title,
  };
}

export function ProfileMediaActions({
  item,
  extraActions = [],
  isRemoving = false,
  onRemoveItem = null,
  removeLabel = 'Remove item',
  currentUserId = null,
}) {
  const { openSurface } = useNavigationActions();
  const auth = useAuth();
  const resolvedCurrentUserId = currentUserId || auth.user?.id || null;

  const handleRemove = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (typeof onRemoveItem === 'function') {
      onRemoveItem(item);
    }
  };

  const handleAddToList = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (resolvedCurrentUserId && item) {
      const resolvedMedia = createListItemPayload(item);
      openSurface(
        createListPickerSurfaceEntry({ userId: resolvedCurrentUserId, media: resolvedMedia }),
      );
    }
  };

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onMouseUp={(event) => {
        event.stopPropagation();
      }}
      className="pointer-events-auto absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100"
    >
      {extraActions.map((action, index) => {
        if (action.node) {
          return <div key={action.key || `extra-action-${index}`}>{action.node}</div>;
        }
        return (
          <button
            key={action.key || `extra-action-${index}`}
            type="button"
            aria-label={action.label}
            title={action.label}
            disabled={action.disabled}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              action.onClick?.(item);
            }}
            className="center size-8 cursor-pointer bg-black/50 text-white/70 backdrop-blur-md transition-all duration-300 ease-in-out hover:bg-black/70 hover:text-white"
          >
            <Icon icon={action.icon} size={16} />
          </button>
        );
      })}

      {resolvedCurrentUserId && item && (
        <Button
          className="center size-8 cursor-pointer bg-black/50 text-white/70 backdrop-blur-md transition-all duration-300 ease-in-out hover:bg-black/70 hover:text-white"
          aria-label="Add to list"
          title="Add to list"
          onClick={handleAddToList}
        >
          <Icon icon="solar:list-broken" size={16} />
        </Button>
      )}
      {typeof onRemoveItem === 'function' && (
        <Button
          className="hover:text-error center size-8 cursor-pointer bg-black/50 text-white/70 backdrop-blur-md transition-all duration-300 ease-in-out hover:bg-black/70"
          aria-label={removeLabel}
          title={removeLabel}
          disabled={isRemoving}
          onClick={handleRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
        </Button>
      )}
    </div>
  );
}

export default function AccountMediaGridPage({
  baseDelay = 0,
  currentPage = 1,
  emptyMessage = 'No items yet',
  icon = 'solar:heart-bold',
  isInitialSection = true,
  isLoading = false,
  items = [],
  onPageChange = null,
  pageBasePath,
  renderHeaderAction = null,
  renderOverlay = null,
  showHeader = true,
  showTopRule = true,
  toolbar = null,
  title,
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isQueryPagination = typeof pageBasePath === 'string' && pageBasePath.includes('?');
  const requestedQueryPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const canControlPagination = typeof onPageChange === 'function';
  const resolvedCurrentPage = canControlPagination
    ? currentPage
    : isQueryPagination && requestedQueryPage > 0
      ? requestedQueryPage
      : currentPage;
  const cards = useMemo(
    () => items.map(extractMediaDetails).filter(Boolean),
    [items, posterPreferenceVersion],
  );
  const totalPages = cards.length ? Math.ceil(cards.length / ITEMS_PER_PAGE) : 0;
  const activePage = totalPages ? Math.min(resolvedCurrentPage, totalPages) : 1;
  const pageStart = (activePage - 1) * ITEMS_PER_PAGE;
  const visibleCards = cards.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const paginationSummaryLabel = formatPaginationSummaryLabel({
    pageSize: ITEMS_PER_PAGE,
    startIndex: pageStart,
    totalCount: cards.length,
  });
  useEffect(() => {
    if (!totalPages || resolvedCurrentPage <= totalPages || !pageBasePath) return;
    if (canControlPagination) {
      onPageChange(totalPages);
    } else {
      router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages));
    }
  }, [canControlPagination, onPageChange, pageBasePath, resolvedCurrentPage, router, totalPages]);

  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      showHeader={showHeader}
      showTopRule={showTopRule}
      summaryLabel={showHeader ? paginationSummaryLabel : null}
      title={title}
      action={typeof renderHeaderAction === 'function' ? renderHeaderAction() : null}
      toolbar={toolbar}
    >
      {isLoading && cards.length === 0 ? (
        <MediaCardsSkeletonGrid />
      ) : cards.length === 0 ? (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {visibleCards.map((card, index) => {
              return (
                <MediaCard
                  key={`${card.id}-${pageStart + index}`}
                  href={card.href}
                  className="w-full"
                  imageSrc={card.imageSrc}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 419px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                  topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
                  tooltipText={card.tooltipText}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
              <AccountPagination
                currentPage={activePage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  if (canControlPagination) {
                    onPageChange(page);
                  } else if (pageBasePath) {
                    router.push(buildAccountCollectionPageHref(pageBasePath, page));
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </AccountSectionLayout>
  );
}


// ============================================================================
// FILE: domains/account/ui/components/account-pagination.js
// ============================================================================

'use client';

import Link from 'next/link';
import { cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';

const DEFAULT_NAV_CLASS =
  'inline-flex h-10 min-w-[96px] items-center justify-center border border-white/5 px-3 text-xs font-semibold tracking-widest text-white/70 uppercase hover:border-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[112px] sm:px-4 sm:text-xs';

export function getAccountPaginationItems(currentPage, totalPages) {
  if (totalPages <= 8) {
    return Array.from(
      {
        length: totalPages,
      },
      (_, index) => index + 1,
    );
  }
  const pinnedStartCount = 4;
  const pinnedEdgeCount = 2;
  const pages = new Set();
  const addRange = (start, end) => {
    for (let page = Math.max(1, start); page <= Math.min(end, totalPages); page++) {
      pages.add(page);
    }
  };
  addRange(1, pinnedEdgeCount);
  addRange(totalPages - pinnedEdgeCount + 1, totalPages);
  if (currentPage <= pinnedStartCount) {
    addRange(1, pinnedStartCount);
  } else if (currentPage >= totalPages - (pinnedStartCount - 1)) {
    addRange(totalPages - pinnedStartCount + 1, totalPages);
  } else {
    addRange(currentPage - 1, currentPage + 1);
  }
  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items = [];
  sortedPages.forEach((page, index) => {
    if (index > 0) {
      const prevPage = sortedPages[index - 1];
      if (page - prevPage === 2) items.push(prevPage + 1);
      else if (page - prevPage > 2) items.push(`ellipsis-${prevPage}-${page}`);
    }
    items.push(page);
  });
  return items;
}

export default function AccountPagination({
  className = null,
  currentPage = 1,
  ellipsisClassName = null,
  getPageHref = null,
  hideDisabledNav = false,
  iconSize = 15,
  inactivePageClassName = null,
  layout = 'split',
  navClassName = null,
  nextLabel = 'Next',
  nextAriaLabel = 'Go to next page',
  onPageChange = null,
  pageListClassName = null,
  pageClassName = null,
  activePageClassName = null,
  prevLabel = 'Previous',
  prevAriaLabel = 'Go to previous page',
  showPrevNext = true,
  splitClassName = null,
  splitNavSlotClassName = null,
  splitPrevSlotClassName = null,
  splitNextSlotClassName = null,
  totalPages = 1,
}) {
  if (totalPages <= 1) return null;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const paginationItems = getAccountPaginationItems(safeCurrentPage, totalPages);
  const config = {
    canUseLinks: typeof getPageHref === 'function',
    canUseButtons: typeof onPageChange === 'function',
  };
  const pageItems = paginationItems.map((item, index) =>
    typeof item === 'number' ? (
      <PaginationPageItem
        key={item}
        pageNumber={item}
        safeCurrentPage={safeCurrentPage}
        pageClassName={pageClassName}
        activePageClassName={activePageClassName}
        inactivePageClassName={inactivePageClassName}
        getPageHref={getPageHref}
        onPageChange={onPageChange}
        config={config}
      />
    ) : (
      <span
        key={`${item}-${index}`}
        className={ellipsisClassName ?? 'px-1 text-sm text-white/50 select-none'}
      >
        ...
      </span>
    ),
  );
  const prevNavProps = {
    direction: 'previous',
    safeCurrentPage,
    totalPages,
    hideDisabledNav,
    getPageHref,
    onPageChange,
    iconSize,
    navClassName,
    ariaLabel: prevAriaLabel,
    label: prevLabel,
    iconName: 'solar:skip-previous-bold',
    config,
  };
  const nextNavProps = {
    ...prevNavProps,
    direction: 'next',
    ariaLabel: nextAriaLabel,
    label: nextLabel,
    iconName: 'solar:skip-next-bold',
  };
  if (layout === 'split') {
    return (
      <div
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3',
          splitClassName,
          className,
        )}
      >
        <div className={cn('flex justify-start', splitNavSlotClassName, splitPrevSlotClassName)}>
          {showPrevNext && <PaginationNavButton {...prevNavProps} />}
        </div>
        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-3 sm:gap-4',
            pageListClassName,
          )}
        >
          {pageItems}
        </div>
        <div className={cn('flex justify-end', splitNavSlotClassName, splitNextSlotClassName)}>
          {showPrevNext && <PaginationNavButton {...nextNavProps} />}
        </div>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {showPrevNext && <PaginationNavButton {...prevNavProps} />}
      {pageItems}
      {showPrevNext && <PaginationNavButton {...nextNavProps} />}
    </div>
  );
}
function PaginationPageItem({
  pageNumber,
  safeCurrentPage,
  pageClassName,
  activePageClassName,
  inactivePageClassName,
  getPageHref,
  onPageChange,
  config,
}) {
  const isActive = pageNumber === safeCurrentPage;
  const toneClass = isActive
    ? (activePageClassName ?? 'text-white')
    : (inactivePageClassName ?? 'text-white/50');
  const resolvedClass = cn(
    pageClassName ?? 'px-1 text-sm font-semibold leading-none select-none cursor-pointer',
    toneClass,
  );
  if (isActive) {
    return (
      <span aria-current="page" className={resolvedClass}>
        {pageNumber}
      </span>
    );
  }
  if (config.canUseLinks) {
    return (
      <Link href={getPageHref(pageNumber)} className={resolvedClass}>
        {pageNumber}
      </Link>
    );
  }
  if (config.canUseButtons) {
    return (
      <button
        type="button"
        onClick={() => onPageChange(pageNumber)}
        aria-label={`Go to page ${pageNumber}`}
        className={resolvedClass}
      >
        {pageNumber}
      </button>
    );
  }
  return <span className={resolvedClass}>{pageNumber}</span>;
}
function PaginationNavButton({
  direction,
  safeCurrentPage,
  totalPages,
  hideDisabledNav,
  getPageHref,
  onPageChange,
  iconSize,
  navClassName,
  ariaLabel,
  label,
  iconName,
  config,
}) {
  const isPrevious = direction === 'previous';
  const targetPage = isPrevious ? safeCurrentPage - 1 : safeCurrentPage + 1;
  const disabled = isPrevious ? safeCurrentPage <= 1 : safeCurrentPage >= totalPages;
  const navContent = String(label || '').trim() || <Icon size={iconSize} icon={iconName} />;
  const resolvedClass = cn(DEFAULT_NAV_CLASS, navClassName);
  if (disabled && hideDisabledNav) return null;
  if (config.canUseLinks && !disabled) {
    return (
      <Link href={getPageHref(targetPage)} aria-label={ariaLabel} className={resolvedClass}>
        {navContent}
      </Link>
    );
  }
  if (config.canUseButtons) {
    return (
      <button
        type="button"
        onClick={() => onPageChange(targetPage)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={resolvedClass}
      >
        {navContent}
      </button>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(resolvedClass, disabled && 'cursor-not-allowed opacity-40')}
    >
      {navContent}
    </span>
  );
}


// ============================================================================
// FILE: domains/account/ui/components/lists/list-card.js
// ============================================================================

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TMDB_IMG } from '@/shared/constants';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import Icon from '@/ui/primitives/icon';

const CARD_SCALE = 1.16;
const BACK_PANEL_HEIGHT = Math.round(200 * CARD_SCALE);
const STACK_SIZE = 5;

function getPreviewImage(item) {
  if (!item) return null;
  const mediaType = item?.media_type || item?.entityType;
  const preferredPoster = mediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  if (preferredPoster) {
    return preferredPoster;
  }
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }
  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }
  return null;
}

function getListHref(list, ownerUsername = null) {
  const ownerHandle = ownerUsername || list?.ownerSnapshot?.username || list?.ownerId;
  if (!ownerHandle || !list?.slug) {
    return '#';
  }
  return `/account/${ownerHandle}/lists/${list.slug}`;
}

function formatListDate(value) {
  if (!value) {
    return 'Recently updated';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently updated';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function AccountListCard({ list, ownerUsername = null, renderActions = null }) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const [isHovered, setIsHovered] = useState(false);

  const availableImages = useMemo(() => {
    const items = Array.isArray(list?.previewItems) ? list.previewItems : [];
    const imgs = items.map(getPreviewImage).filter(Boolean);
    return imgs;
  }, [list?.previewItems, posterPreferenceVersion]);

  const imagePositions = useMemo(() => {
    const count = STACK_SIZE;
    const positions = [];
    const totalSpread = 152;
    const step = count > 1 ? totalSpread / (count - 1) : 0;
    const startX = -totalSpread / 2;

    for (let i = 0; i < count; i++) {
      const x = count > 1 ? startX + step * i : 0;
      const normalizedPos = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      const rotate = normalizedPos * 10;
      positions.push({ x, rotate });
    }
    return positions;
  }, []);

  const listTitle = String(list?.title || '').trim() || 'Untitled List';
  const listDescription = String(list?.description || '').trim();
  const updatedLabel = formatListDate(list?.updatedAt || list?.createdAt);
  const itemsCount = Number.isFinite(Number(list?.itemsCount))
    ? Number(list.itemsCount)
    : Array.isArray(list?.previewItems)
      ? list.previewItems.length
      : 0;
  const likesCount = Number.isFinite(Number(list?.likesCount))
    ? Number(list.likesCount)
    : Array.isArray(list?.likes)
      ? list.likes.length
      : 0;
  const reviewsCount = Number.isFinite(Number(list?.reviewsCount)) ? Number(list.reviewsCount) : 0;

  const actionsElement = typeof renderActions === 'function' ? renderActions(list) : null;
  const hasActions = Boolean(actionsElement);

  return (
    <article
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={getListHref(list, ownerUsername)} className="block">
        <div
          className="group relative w-full cursor-pointer"
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          <motion.div
            className="relative z-0 border border-white/5"
            animate={{ rotateX: isHovered ? 15 : 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
            style={{
              height: `${BACK_PANEL_HEIGHT}px`,
              transformStyle: 'preserve-3d',
              transformOrigin: 'center bottom',
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ rotateX: isHovered ? -15 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
              style={{ transformStyle: 'flat', transformOrigin: 'center bottom' }}
            >
              {[0, 1, 2, 3, 4].map((imgIndex) => {
                const pos = imagePositions[imgIndex];
                const centerIndex = 2;
                const distanceFromCenter = Math.abs(imgIndex - centerIndex);
                const zIndex = 10 - distanceFromCenter;

                const brightness =
                  distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.6 : 0.35;
                const blurAmount =
                  distanceFromCenter === 0 ? 0 : distanceFromCenter === 1 ? 0.5 : 1.5;
                const yOffset = -16 * (1 - distanceFromCenter / centerIndex) || 0;
                const scale =
                  distanceFromCenter === 0 ? 1.05 : distanceFromCenter === 1 ? 0.95 : 0.88;

                const xPos = isHovered ? pos.x * 1.38 : pos.x;
                const yPos = isHovered ? -12 + yOffset : 6 + yOffset;
                const rotation = isHovered ? pos.rotate * 1.3 : pos.rotate;
                const finalScale = isHovered ? scale * 1.04 : scale;
                const staggerDelay = distanceFromCenter * 0.08;

                const imageUrl =
                  availableImages.length > 0
                    ? availableImages[imgIndex % availableImages.length]
                    : null;

                return (
                  <motion.div
                    key={imgIndex}
                    className="absolute top-0 left-1/2"
                    initial={false}
                    animate={{
                      x: `calc(-50% + ${xPos}px)`,
                      y: yPos,
                      rotate: rotation,
                      scale: finalScale,
                      opacity: 1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 100,
                      damping: 16,
                      mass: 1,
                      delay: staggerDelay,
                      opacity: { duration: 0.35, ease: 'easeOut', delay: staggerDelay },
                    }}
                    style={{ zIndex }}
                  >
                    <div className="h-[156px] w-[98px] overflow-hidden border border-white/5 bg-black/70">
                      {imageUrl ? (
                        <motion.img
                          src={imageUrl}
                          alt={`Preview ${imgIndex + 1}`}
                          className="h-full w-full object-cover"
                          animate={{
                            filter: `brightness(${isHovered ? Math.min(1, brightness + 0.2) : brightness}) contrast(1.08) saturate(${1 - distanceFromCenter * 0.2}) blur(${isHovered ? 0 : blurAmount}px)`,
                          }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        />
                      ) : (
                        <div className="center h-full w-full bg-black/50 text-white/40">
                          <Icon icon="solar:gallery-wide-bold" size={20} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden border border-white/5 bg-black/70 backdrop-blur-md"
            animate={{
              rotateX: isHovered ? -25 : 0,
            }}
            transition={{
              rotateX: { type: 'spring', stiffness: 180, damping: 22, mass: 0.8 },
              backgroundColor: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
            }}
            style={{ transformOrigin: 'center bottom' }}
          >
            <div className="relative px-4 py-4">
              <h3 className="line-clamp-1 text-[19px] leading-[1.22] font-semibold text-white transition-all duration-300 ease-in-out group-hover:text-white">
                {listTitle}
              </h3>
              <p
                className={`mt-1 line-clamp-2 text-xs leading-relaxed ${
                  listDescription ? 'font-normal text-white/50' : 'font-normal text-white/40 italic'
                }`}
              >
                {listDescription || 'No description'}
              </p>
            </div>
            <div className="relative h-11 border-t border-white/5">
              <div
                className={`absolute inset-0 flex items-center justify-between pl-3 text-[13px] text-white/70 ${
                  hasActions ? 'pr-1.5' : 'pr-3'
                }`}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Icon icon="solar:calendar-mark-bold" size={14} />
                  <span>{updatedLabel}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:list-broken" size={14} />
                      <span>{itemsCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:heart-bold" size={14} />
                      <span>{likesCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:chat-round-bold" size={14} />
                      <span>{reviewsCount}</span>
                    </span>
                  </div>
                  {actionsElement ? (
                    <div
                      className="shrink-0"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      {actionsElement}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Link>
    </article>
  );
}


// ============================================================================
// FILE: domains/account/ui/components/lists/list-grid.js
// ============================================================================

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AccountListCard from './list-card';
import AccountSectionLayout, {
  AccountInlineSectionState,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import { ListCardsSkeletonGrid } from '@/domains/account/ui/skeletons/account-section-skeletons';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import {
  buildAccountCollectionPageHref,
  formatPaginationSummaryLabel,
} from '@/domains/account/utils';
const DEFAULT_ITEMS_PER_PAGE = 36;

export default function AccountPaginatedListGrid({
  baseDelay = 0,
  currentPage = 1,
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  isInitialSection = true,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  isLoading = false,
  lists = [],
  loadError = null,
  onPageChange = null,
  ownerUsername = null,
  pageBasePath,
  renderActions = null,
  renderHeaderAction = null,
  showHeader = true,
  toolbar = null,
  title,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedItemsPerPage = Math.max(1, Number(itemsPerPage) || DEFAULT_ITEMS_PER_PAGE);
  const isQueryPagination = typeof pageBasePath === 'string' && pageBasePath.includes('?');
  const requestedQueryPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const canControlPagination = typeof onPageChange === 'function';
  const resolvedCurrentPage = canControlPagination
    ? currentPage
    : isQueryPagination && Number.isFinite(requestedQueryPage) && requestedQueryPage > 0
      ? requestedQueryPage
      : currentPage;
  const totalPages = lists.length ? Math.ceil(lists.length / resolvedItemsPerPage) : 0;
  const activePage = totalPages ? Math.min(resolvedCurrentPage, totalPages) : 1;
  const pageStart = (activePage - 1) * resolvedItemsPerPage;
  const paginationSummaryLabel = formatPaginationSummaryLabel({
    emptyLabel: '0 total',
    pageSize: resolvedItemsPerPage,
    startIndex: pageStart,
    totalCount: lists.length,
  });
  const visibleLists = useMemo(
    () => lists.slice(pageStart, pageStart + resolvedItemsPerPage),
    [lists, pageStart, resolvedItemsPerPage],
  );
  useEffect(() => {
    if (!totalPages || resolvedCurrentPage <= totalPages || !pageBasePath) {
      return;
    }
    if (canControlPagination) {
      onPageChange(totalPages);
      return;
    }
    router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages));
  }, [canControlPagination, onPageChange, pageBasePath, resolvedCurrentPage, router, totalPages]);

  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      showHeader={showHeader}
      summaryLabel={showHeader ? paginationSummaryLabel : null}
      title={title}
      action={typeof renderHeaderAction === 'function' ? renderHeaderAction() : null}
      toolbar={toolbar && (lists.length > 0 || isLoading) ? toolbar : null}
    >
      {isLoading && lists.length === 0 ? (
        <ListCardsSkeletonGrid count={6} />
      ) : lists.length === 0 ? (
        <AccountInlineSectionState>{loadError || emptyMessage}</AccountInlineSectionState>
      ) : (
        <>
          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {visibleLists.map((list) => {
              return (
                <AccountListCard
                  key={`${list.ownerId || list.ownerSnapshot?.id || 'owner'}-${list.id}`}
                  list={list}
                  ownerUsername={ownerUsername}
                  renderActions={renderActions}
                />
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div
              key={`list-grid-pagination-${activePage}-${totalPages}`}
              className={ACCOUNT_SECTION_PAGINATION_CLASS}
            >
              <AccountPagination
                className="w-full"
                currentPage={activePage}
                onPageChange={canControlPagination ? onPageChange : null}
                totalPages={totalPages}
                getPageHref={
                  canControlPagination
                    ? null
                    : (page) => buildAccountCollectionPageHref(pageBasePath, page)
                }
              />
            </div>
          ) : null}
        </>
      )}
    </AccountSectionLayout>
  );
}


// ============================================================================
// FILE: domains/account/ui/filters/activity.js
// ============================================================================

import {
  isSameFilterState,
  matchesRange,
  normalizeFiniteNumber,
  normalizeRatingMode,
  normalizeStarValue,
  normalizeString,
  normalizeToken,
  parseFlagSet,
} from '../../utils/filtering-shared';

export const ACTIVITY_FILTER_QUERY_KEYS = Object.freeze([
  'aevt',
  'asub',
  'asort',
  'ar',
  'amin',
  'amax',
  'aeye',
]);

const ACTIVITY_SORT_VALUE_SET = new Set(['newest', 'oldest']);

const DEFAULT_ACTIVITY_FILTERS = Object.freeze({
  event: 'all',
  maxRating: 5,
  minRating: 0.5,
  ratingMode: 'any',
  sort: 'newest',
  subject: 'all',
});

const ACTIVITY_SUBJECT_LABELS = Object.freeze({
  all: 'Any content',
  list: 'Lists',
  movie: 'Movies',
  other: 'Other',
  tv: 'TV Series',
  user: 'People',
});

function normalizeActivitySort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return ACTIVITY_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_ACTIVITY_FILTERS.sort;
}

function resolveActivityEventToken(item = {}) {
  return normalizeToken(item?.eventType);
}

function resolveActivitySubjectToken(item = {}) {
  const subjectType = normalizeToken(item?.subject?.type);

  if (subjectType === 'movie' || subjectType === 'film') {
    return 'movie';
  }

  if (subjectType === 'tv' || subjectType === 'series') {
    return 'tv';
  }

  if (subjectType === 'list') {
    return 'list';
  }

  if (subjectType === 'user' || subjectType === 'profile' || subjectType === 'account') {
    return 'user';
  }

  return subjectType || 'other';
}

function resolveActivityTimestamp(item = {}) {
  const value = item?.updatedAt || item?.createdAt || null;

  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveActivityRating(item = {}) {
  const directRating = normalizeFiniteNumber(item?.activityState?.rating, null);

  if (Number.isFinite(directRating)) {
    return directRating;
  }

  const payloadRating = normalizeFiniteNumber(item?.payload?.rating, null);

  if (Number.isFinite(payloadRating)) {
    return payloadRating;
  }

  return normalizeFiniteNumber(item?.rating, null);
}

function resolveActivityNormalizedEventToken(item = {}) {
  const eventToken = resolveActivityEventToken(item);
  const subjectToken = resolveActivitySubjectToken(item);

  if (eventToken === 'list_liked' && subjectToken === 'movie') {
    return 'movie_liked';
  }

  return eventToken;
}

export function parseActivityFilters(searchParams) {
  const ratingMode = normalizeRatingMode(
    searchParams?.get?.('ar'),
    DEFAULT_ACTIVITY_FILTERS.ratingMode,
  );
  const parsedMin = normalizeStarValue(
    searchParams?.get?.('amin'),
    DEFAULT_ACTIVITY_FILTERS.minRating,
  );
  const parsedMax = normalizeStarValue(
    searchParams?.get?.('amax'),
    DEFAULT_ACTIVITY_FILTERS.maxRating,
  );
  const minRating = Math.min(parsedMin, parsedMax);
  const maxRating = Math.max(parsedMin, parsedMax);
  const sort = normalizeActivitySort(searchParams?.get?.('asort'));
  const event = normalizeToken(searchParams?.get?.('aevt')) || DEFAULT_ACTIVITY_FILTERS.event;
  const subject = normalizeToken(searchParams?.get?.('asub')) || DEFAULT_ACTIVITY_FILTERS.subject;
  const eyeFlags = parseFlagSet(searchParams?.get?.('aeye'));

  return {
    event,
    eyeFlags,
    maxRating,
    minRating,
    ratingMode,
    sort,
    subject,
  };
}

export function toActivityQueryValues(filters = DEFAULT_ACTIVITY_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_ACTIVITY_FILTERS,
    ...(filters || {}),
  };

  const nextValues = {};

  if (normalizedFilters.subject !== DEFAULT_ACTIVITY_FILTERS.subject) {
    nextValues.asub = normalizeToken(normalizedFilters.subject);
  }

  if (normalizedFilters.sort !== DEFAULT_ACTIVITY_FILTERS.sort) {
    nextValues.asort = normalizedFilters.sort;
  }

  return nextValues;
}

export function hasActiveActivityFilters(filters = DEFAULT_ACTIVITY_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_ACTIVITY_FILTERS,
    ...(filters || {}),
  };

  return !isSameFilterState(normalizedFilters, DEFAULT_ACTIVITY_FILTERS, ['sort', 'subject']);
}

export function collectActivitySubjectOptions() {
  return [
    { label: ACTIVITY_SUBJECT_LABELS.all, value: 'all' },
    { label: ACTIVITY_SUBJECT_LABELS.movie, value: 'movie' },
    { label: ACTIVITY_SUBJECT_LABELS.tv, value: 'tv' },
    { label: ACTIVITY_SUBJECT_LABELS.list, value: 'list' },
  ];
}

export function getActivitySubjectOptionValues(options = []) {
  return new Set(
    (Array.isArray(options) ? options : [])
      .map((option) => normalizeToken(option?.value))
      .filter((value) => value && value !== 'all'),
  );
}

export function applyActivityFilters(items = [], filters = DEFAULT_ACTIVITY_FILTERS) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedFilters = {
    ...DEFAULT_ACTIVITY_FILTERS,
    ...(filters || {}),
  };

  const filteredItems = sourceItems.filter((item) => {
    const eventToken = resolveActivityNormalizedEventToken(item);
    const subjectToken = resolveActivitySubjectToken(item);
    const rating = resolveActivityRating(item);

    if (normalizedFilters.event !== 'all' && eventToken !== normalizedFilters.event) {
      return false;
    }

    if (normalizedFilters.subject !== 'all' && subjectToken !== normalizedFilters.subject) {
      return false;
    }

    if (normalizedFilters.ratingMode === 'none' && rating !== null) {
      return false;
    }

    if (
      normalizedFilters.ratingMode === 'range' &&
      !matchesRange(rating, normalizedFilters.minRating, normalizedFilters.maxRating)
    ) {
      return false;
    }

    const eyeFlags = normalizedFilters.eyeFlags;

    if (eyeFlags.has('hide_watchlist_events') && eventToken === 'watchlist_added') {
      return false;
    }

    if (eyeFlags.has('hide_rewatch_events') && item?.activityState?.isRewatch) {
      return false;
    }

    if (eyeFlags.has('hide_without_rating') && !Number.isFinite(rating)) {
      return false;
    }

    if (eyeFlags.has('hide_without_poster') && !normalizeString(item?.subject?.poster)) {
      return false;
    }

    return true;
  });

  return [...filteredItems].sort((left, right) => {
    const diff = resolveActivityTimestamp(right) - resolveActivityTimestamp(left);

    if (normalizedFilters.sort === 'oldest') {
      return -diff;
    }

    return diff;
  });
}


// ============================================================================
// FILE: domains/account/ui/filters/content-filter-primitives.js
// ============================================================================

export { AccountActivityFilterBar } from './content-filter/activity-filter-bar';
export { AccountListSortBar } from './content-filter/list-sort-bar';
export { AccountMediaFilterBar } from './content-filter/media-filter-bar';
export { AccountReviewFilterBar } from './content-filter/review-filter-bar';
export { SearchMovieFilterBar } from './content-filter/search-movie-filter-bar';


// ============================================================================
// FILE: domains/account/ui/filters/content-filter/activity-filter-bar.js
// ============================================================================

'use client';

import { cn } from '@/shared/utils';

import { ACTIVITY_SORT_OPTIONS } from './content-filter-options';
import {
  DefaultMenuItem,
  FilterPopover,
  OptionSection,
  ResetButton,
  UI,
  resolveOptionLabel,
} from './content-filter-controls';

export function AccountActivityFilterBar({
  className = '',
  filters,
  onChange,
  onReset,
  subjectOptions = [],
}) {
  const subjectLabel = resolveOptionLabel(subjectOptions, filters?.subject, 'Any content');
  const sortLabel = resolveOptionLabel(ACTIVITY_SORT_OPTIONS, filters?.sort, 'Newest First');
  const isDefaultSort = filters?.sort === 'newest';

  return (
    <div className={cn(UI.bar, className)}>
      <FilterPopover label={`Content: ${subjectLabel}`} active={filters?.subject !== 'all'}>
        <OptionSection
          options={subjectOptions}
          value={filters?.subject}
          onChange={(value) => onChange({ subject: value })}
        />
      </FilterPopover>

      <FilterPopover label={`${sortLabel}`} active={filters?.sort !== 'newest'}>
        <DefaultMenuItem
          active={isDefaultSort}
          label="Default sort: Newest first"
          onClick={() => onChange({ sort: 'newest' })}
        />

        <OptionSection
          options={ACTIVITY_SORT_OPTIONS}
          value={filters?.sort}
          onChange={(value) => onChange({ sort: value })}
        />
      </FilterPopover>

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/filters/content-filter/content-filter-controls.js
// ============================================================================

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { cn } from '@/shared/utils';
import RatingRangeSelector from '@/domains/reviews/ui/components/rating-range-selector';
import Icon from '@/ui/primitives/icon';
export const UI = {
  bar: 'flex w-full flex-nowrap items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none',
  trigger:
    'inline-flex cursor-pointer flex-1 min-w-max items-center justify-center gap-1.5 whitespace-nowrap border-0 bg-transparent p-0 text-xs font-semibold tracking-widest uppercase text-white/70 hover:text-white transition-all duration-300 ease-in-out focus-visible:outline-none',
  triggerActive: 'text-info font-bold hover:text-info',
  iconButton:
    'inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-white/70 hover:text-white transition-all duration-300 ease-in-out focus-visible:outline-none',
  resetButton:
    'ml-auto inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 text-xs font-semibold tracking-widest uppercase text-white/50 hover:text-white transition-all duration-300 ease-in-out focus-visible:outline-none',
  menu: 'z-50 overflow-y-auto overscroll-contain border border-white/10 bg-black/80 backdrop-blur-md p-1',
  sectionLabel: 'px-2 py-1.5 text-[10px] uppercase text-white/50',
  menuItem:
    'flex w-full items-center justify-between cursor-pointer p-2 text-left text-sm text-white/80 hover:bg-white/5',
  menuItemActive: 'bg-white/5 font-medium text-white',
  divider: 'border-t border-white/10',
  inputWrap: 'flex h-8 min-w-0 flex-1 items-center gap-2 bg-transparent px-1',
  input: 'min-w-0 flex-1 text-xs text-white bg-transparent outline-none placeholder:text-white/40',
  helperText: 'px-1 text-[10px] text-white/50',
  visibilityItem:
    'flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5',
  visibilityItemActive: 'bg-white/5 font-medium text-white',
  dot: 'size-2.5 border border-white/5',
  dotActive: 'bg-white',
  dotInactive: 'bg-white/5',
};
export function resolveOptionLabel(options = [], value, fallback = 'Any') {
  return options.find((option) => option.value === value)?.label || fallback;
}
export function buildRatingLabel(filters = {}) {
  if (filters.ratingMode === 'none') return 'No rating';
  if (filters.ratingMode === 'range') {
    return filters.minRating === filters.maxRating
      ? `${filters.maxRating} stars`
      : `${filters.minRating}-${filters.maxRating}`;
  }
  return 'Any rating';
}
export function SectionLabel({ children }) {
  return <p className={UI.sectionLabel}>{children}</p>;
}
export function ResetButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className={UI.resetButton}>
      Reset
    </button>
  );
}
const FilterPopoverContext = createContext({
  close: () => {},
});
export function FilterMenuItem({ active = false, children, onClick }) {
  const { close } = useContext(FilterPopoverContext);
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        close();
      }}
      className={cn(UI.menuItem, active && UI.menuItemActive)}
    >
      <span>{children}</span>
      {active ? (
        <Icon icon="material-symbols:check-rounded" size={16} className="text-white" />
      ) : null}
    </button>
  );
}
export function DefaultMenuItem({ active = false, label = 'Default', onClick }) {
  return (
    <div className="space-y-1">
      <FilterMenuItem active={active} onClick={onClick}>
        {label}
      </FilterMenuItem>
    </div>
  );
}
export function FilterPopover({ label, active = false, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const contextValue = useMemo(
    () => ({
      close: () => setIsOpen(false),
    }),
    [],
  );
  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className={cn(UI.trigger, active && UI.triggerActive)}>
          <span>{label}</span>
          <Icon icon="solar:alt-arrow-down-linear" size={14} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          avoidCollisions={false}
          side="bottom"
          sideOffset={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className={UI.menu}
          style={{
            maxHeight: '60dvh',
            minWidth: 'var(--radix-popover-trigger-width)',
          }}
        >
          <FilterPopoverContext.Provider value={contextValue}>
            <div>{children}</div>
          </FilterPopoverContext.Provider>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
export function OptionSection({ title = '', options, value, onChange }) {
  return (
    <div className="space-y-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      {options.map((option) => (
        <FilterMenuItem
          key={option.value}
          active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </FilterMenuItem>
      ))}
    </div>
  );
}
export function RatingRangeEditor({ filters, onChange }) {
  return (
    <div className={cn(UI.divider, 'mt-1 space-y-2 px-2 pt-3')}>
      <div className="space-y-1">
        <span className="block text-[10px] font-semibold tracking-wide text-white/50 uppercase">
          Rating (or range)
        </span>
        <div className="border border-white/10 bg-black px-2 py-2">
          <RatingRangeSelector
            maxValue={filters.maxRating}
            minValue={filters.minRating}
            onChange={onChange}
          />
        </div>
      </div>

      <p className={UI.helperText}>
        Click to pick one rating, or drag across the stars to choose a range.
      </p>
    </div>
  );
}
export function VisibilityGroup({ title = '', options = [], selectedFlags, onToggle }) {
  const { close } = useContext(FilterPopoverContext);
  return (
    <div className="space-y-1">
      {title ? <SectionLabel>{title}</SectionLabel> : null}

      {options.length === 0 ? (
        <p className="px-2 py-2 text-xs text-white/50">No visibility filters available.</p>
      ) : (
        options.map((option) => {
          const active = selectedFlags.has(option.key);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onToggle(option.key);
                close();
              }}
              className={cn(UI.visibilityItem, active && UI.visibilityItemActive)}
            >
              <span>{option.label}</span>
              <span className={cn(UI.dot, active ? UI.dotActive : UI.dotInactive)} />
            </button>
          );
        })
      )}
    </div>
  );
}
export function SearchChip({ value, open, onOpen, onClose, onChange, inputRef }) {
  const [localQuery, setLocalQuery] = useState(value);
  const debouncedQuery = useDebounce(localQuery, 400);
  useEffect(() => {
    if (debouncedQuery !== localQuery || debouncedQuery === value) {
      return;
    }
    onChange(debouncedQuery);
  }, [debouncedQuery, localQuery, onChange, value]);
  useEffect(() => {
    if (!open) setLocalQuery('');
  }, [open]);
  useEffect(() => {
    setLocalQuery(value);
  }, [value]);
  const handleClose = useCallback(() => {
    setLocalQuery('');
    onChange('');
    onClose();
  }, [onChange, onClose]);
  if (!open) {
    return (
      <button type="button" aria-label="Search titles" onClick={onOpen} className={UI.iconButton}>
        <Icon icon="solar:magnifer-linear" size={16} />
      </button>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <label className={UI.inputWrap}>
        <Icon icon="solar:magnifer-linear" size={18} className="shrink-0 text-white/50" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(event) => setLocalQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') handleClose();
          }}
          placeholder="Search titles"
          className={UI.input}
        />
      </label>

      <button type="button" onClick={handleClose} className={UI.resetButton}>
        Close
      </button>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/filters/content-filter/content-filter-options.js
// ============================================================================

import { REVIEW_SORT_MODE } from '@/domains/reviews/shared/review-data';

export const REVIEW_SORT_OPTIONS = Object.freeze([
  { label: 'When Reviewed (Newest)', value: REVIEW_SORT_MODE.NEWEST },
  { label: 'When Reviewed (Oldest)', value: REVIEW_SORT_MODE.OLDEST },
  { label: 'Rating (Highest)', value: REVIEW_SORT_MODE.RATING_DESC },
  { label: 'Rating (Lowest)', value: REVIEW_SORT_MODE.RATING_ASC },
  { label: 'Likes (Most)', value: REVIEW_SORT_MODE.LIKES_DESC },
  { label: 'Likes (Least)', value: REVIEW_SORT_MODE.LIKES_ASC },
]);

export const RATING_MODE_OPTIONS = Object.freeze([
  { label: 'Any rating', value: 'any' },
  { label: 'Rating range', value: 'range' },
  { label: 'No rating', value: 'none' },
]);

export const REVIEW_VISIBILITY_OPTIONS = Object.freeze([
  { key: 'hide_ratings_only', label: 'Hide rating-only entries' },
  { key: 'hide_text_reviews', label: 'Hide written reviews' },
]);

export const ACTIVITY_SORT_OPTIONS = Object.freeze([
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
]);


// ============================================================================
// FILE: domains/account/ui/filters/content-filter/list-sort-bar.js
// ============================================================================

'use client';

import { LIST_SORT_OPTIONS } from '@/domains/account/ui/filters/filtering';
import { cn } from '@/shared/utils';

import {
  DefaultMenuItem,
  FilterPopover,
  OptionSection,
  ResetButton,
  UI,
  resolveOptionLabel,
} from './content-filter-controls';

export function AccountListSortBar({ className = '', sort = 'updated_desc', onChange, onReset }) {
  const sortLabel = resolveOptionLabel(LIST_SORT_OPTIONS, sort, 'Recently Updated');
  const isDefaultSort = sort === 'updated_desc';

  return (
    <div className={cn(UI.bar, className)}>
      <FilterPopover label={`${sortLabel}`} active={sort !== 'updated_desc'}>
        <DefaultMenuItem
          active={isDefaultSort}
          label="Default sort: Recently updated"
          onClick={() => onChange?.('updated_desc')}
        />

        <OptionSection
          options={LIST_SORT_OPTIONS}
          value={sort}
          onChange={(value) => onChange?.(value)}
        />
      </FilterPopover>

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/filters/content-filter/media-filter-bar.js
// ============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { MEDIA_SORT_GROUPS, resolveMediaSortOption } from '@/domains/account/ui/filters/filtering';
import { cn } from '@/shared/utils';

import {
  DefaultMenuItem,
  FilterPopover,
  OptionSection,
  ResetButton,
  SearchChip,
  UI,
  VisibilityGroup,
  resolveOptionLabel,
} from './content-filter-controls';

export function AccountMediaFilterBar({
  className = '',
  decadeOptions = [],
  defaultSort = 'release_desc',
  defaultSortLabel = 'Default sort: Release date, newest first',
  filters,
  genreOptions = [],
  onChange,
  onReset,
  visibilityOptions = [],
}) {
  const searchInputRef = useRef(null);
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(filters?.query));

  const selectedEyeFlags = filters?.eyeFlags instanceof Set ? filters.eyeFlags : new Set();
  const searchQuery = typeof filters?.query === 'string' ? filters.query : '';
  const decadeLabel = resolveOptionLabel(decadeOptions, filters?.decade, 'Any decade');
  const genreLabel = resolveOptionLabel(genreOptions, filters?.genre, 'Any genre');

  const isDefaultSort = filters?.sort === defaultSort;
  const sortLabel = useMemo(() => {
    const selectedOption = resolveMediaSortOption(filters?.sort);
    if (selectedOption) {
      return `${selectedOption.groupLabel}: ${selectedOption.label}`;
    }
    return defaultSort === 'list_order'
      ? 'Sort: List order'
      : 'Release Date: Newest release first';
  }, [filters?.sort, defaultSort]);

  useEffect(() => {
    if (searchQuery) setIsSearchOpen(true);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  return (
    <div className={cn(UI.bar, className)}>
      <SearchChip
        value={searchQuery}
        open={isSearchOpen}
        onOpen={() => setIsSearchOpen(true)}
        onClose={() => setIsSearchOpen(false)}
        onChange={(query) => onChange({ query })}
        inputRef={searchInputRef}
      />

      {!isSearchOpen && (
        <>
          <FilterPopover label={`Decade: ${decadeLabel}`} active={filters?.decade !== 'all'}>
            <OptionSection
              options={decadeOptions}
              value={filters?.decade}
              onChange={(value) => onChange({ decade: value })}
            />
          </FilterPopover>
          <FilterPopover label={`Genre: ${genreLabel}`} active={filters?.genre !== 'all'}>
            <OptionSection
              options={genreOptions}
              value={filters?.genre}
              onChange={(value) => onChange({ genre: value })}
            />
          </FilterPopover>

          <FilterPopover label={`${sortLabel}`} active={!isDefaultSort}>
            <DefaultMenuItem
              active={isDefaultSort}
              label={defaultSortLabel}
              onClick={() => onChange({ sort: defaultSort })}
            />

            {MEDIA_SORT_GROUPS.map((group) => (
              <OptionSection
                key={group.label}
                title={group.label}
                options={group.options}
                value={filters?.sort}
                onChange={(value) => onChange({ sort: value })}
              />
            ))}
          </FilterPopover>

          <FilterPopover label="Visibility" active={selectedEyeFlags.size > 0}>
            <VisibilityGroup
              options={visibilityOptions}
              selectedFlags={selectedEyeFlags}
              onToggle={(key) => {
                const nextFlags = new Set(selectedEyeFlags);

                if (nextFlags.has(key)) nextFlags.delete(key);
                else nextFlags.add(key);

                onChange({ eyeFlags: nextFlags });
              }}
            />
          </FilterPopover>

          {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
        </>
      )}
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/filters/content-filter/review-filter-bar.js
// ============================================================================

'use client';

import { REVIEW_SORT_MODE } from '@/domains/reviews/shared/review-data';
import { cn } from '@/shared/utils';

import {
  RATING_MODE_OPTIONS,
  REVIEW_SORT_OPTIONS,
  REVIEW_VISIBILITY_OPTIONS,
} from './content-filter-options';
import {
  DefaultMenuItem,
  FilterPopover,
  OptionSection,
  RatingRangeEditor,
  ResetButton,
  UI,
  VisibilityGroup,
  buildRatingLabel,
  resolveOptionLabel,
} from './content-filter-controls';

export function AccountReviewFilterBar({
  className = '',
  filters,
  onChange,
  onReset,
  showRatingFilter = true,
  sortOptions = REVIEW_SORT_OPTIONS,
  visibilityOptions = REVIEW_VISIBILITY_OPTIONS,
  yearOptions = [],
}) {
  const selectedEyeFlags = filters?.eyeFlags instanceof Set ? filters.eyeFlags : new Set();
  const ratingLabel = buildRatingLabel(filters);
  const yearLabel = resolveOptionLabel(yearOptions, filters?.year, 'Any year');
  const sortLabel = resolveOptionLabel(sortOptions, filters?.sort, 'When Reviewed (Newest)');
  const isDefaultSort = filters?.sort === REVIEW_SORT_MODE.NEWEST;
  const isRangeMode = filters?.ratingMode === 'range';

  const handleRatingModeChange = (value) => {
    if (value === 'range') {
      onChange({
        ratingMode: 'range',
      });
      return;
    }

    onChange({
      maxRating: 5,
      minRating: 0.5,
      ratingMode: value,
    });
  };

  return (
    <div className={cn(UI.bar, className)}>
      {showRatingFilter ? (
        <FilterPopover label={`Rating: ${ratingLabel}`} active={filters?.ratingMode !== 'any'}>
          <OptionSection
            options={RATING_MODE_OPTIONS}
            value={filters?.ratingMode}
            onChange={handleRatingModeChange}
          />
          {isRangeMode ? <RatingRangeEditor filters={filters} onChange={onChange} /> : null}
        </FilterPopover>
      ) : null}

      <FilterPopover label={`Diary year: ${yearLabel}`} active={filters?.year !== 'all'}>
        <OptionSection
          options={yearOptions}
          value={filters?.year}
          onChange={(value) => onChange({ year: value })}
        />
      </FilterPopover>

      <FilterPopover label={`${sortLabel}`} active={filters?.sort !== REVIEW_SORT_MODE.NEWEST}>
        <DefaultMenuItem
          active={isDefaultSort}
          label="Default sort: When reviewed, newest first"
          onClick={() => onChange({ sort: REVIEW_SORT_MODE.NEWEST })}
        />

        <OptionSection
          options={sortOptions}
          value={filters?.sort}
          onChange={(value) => onChange({ sort: value })}
        />
      </FilterPopover>

      {visibilityOptions.length > 0 ? (
        <FilterPopover label="Visibility" active={selectedEyeFlags.size > 0}>
          <VisibilityGroup
            options={visibilityOptions}
            selectedFlags={selectedEyeFlags}
            onToggle={(key) => {
              const nextFlags = new Set(selectedEyeFlags);

              if (nextFlags.has(key)) nextFlags.delete(key);
              else nextFlags.add(key);

              onChange({ eyeFlags: nextFlags });
            }}
          />
        </FilterPopover>
      ) : null}

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/filters/content-filter/search-movie-filter-bar.js
// ============================================================================

'use client';

import { cn } from '@/shared/utils';

import {
  FilterPopover,
  OptionSection,
  ResetButton,
  UI,
  resolveOptionLabel,
} from './content-filter-controls';

export function SearchMovieFilterBar({
  className = '',
  decadeOptions = [],
  filters,
  genreOptions = [],
  onChange,
  onReset,
  yearOptions = [],
}) {
  const decadeLabel = resolveOptionLabel(decadeOptions, filters?.decade, 'Any decade');
  const genreLabel = resolveOptionLabel(genreOptions, filters?.genre, 'Any genre');
  const yearLabel = resolveOptionLabel(yearOptions, filters?.year, 'Any year');

  return (
    <div className={cn(UI.bar, className)}>
      <FilterPopover label={`Genre: ${genreLabel}`} active={filters?.genre !== 'all'}>
        <OptionSection
          options={genreOptions}
          value={filters?.genre}
          onChange={(value) => onChange({ genre: value })}
        />
      </FilterPopover>

      <FilterPopover label={`Decade: ${decadeLabel}`} active={filters?.decade !== 'all'}>
        <OptionSection
          options={decadeOptions}
          value={filters?.decade}
          onChange={(value) => onChange({ decade: value })}
        />
      </FilterPopover>

      <FilterPopover label={`Release year: ${yearLabel}`} active={filters?.year !== 'all'}>
        <OptionSection
          options={yearOptions}
          value={filters?.year}
          onChange={(value) => onChange({ year: value })}
        />
      </FilterPopover>

      {typeof onReset === 'function' ? <ResetButton onClick={onReset} /> : null}
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/filters/filtering.js
// ============================================================================

export {
  buildCollectionBasePath,
  buildManagedQueryString,
  normalizePage,
  parsePageFromSearch,
} from '../../utils/filtering-query-utils';
export { getStarStepValues } from '../../utils/filtering-shared';
export {
  ACTIVITY_FILTER_QUERY_KEYS,
  applyActivityFilters,
  collectActivitySubjectOptions,
  getActivitySubjectOptionValues,
  hasActiveActivityFilters,
  parseActivityFilters,
  toActivityQueryValues,
} from './activity';
export {
  MEDIA_FILTER_QUERY_KEYS,
  MEDIA_SORT_GROUPS,
  applyMediaFilters,
  buildMediaKeySet,
  collectMediaGenreOptions,
  collectMediaServiceOptions,
  getAllMediaGenreOptions,
  getDecadeOptions,
  hasActiveMediaFilters,
  parseMediaFilters,
  resolveMediaSortOption,
  toMediaQueryValues,
} from './media';
export {
  REVIEW_FILTER_QUERY_KEYS,
  applyReviewFilters,
  collectReviewYears,
  hasActiveReviewFilters,
  parseReviewFilters,
  toReviewQueryValues,
} from './reviews';
export {
  LIST_FILTER_QUERY_KEYS,
  LIST_SORT_OPTIONS,
  hasActiveListFilters,
  parseListFilters,
  sortProfileLists,
  toListQueryValues,
} from './lists';


// ============================================================================
// FILE: domains/account/ui/filters/lists.js
// ============================================================================

import { normalizeString } from '../../utils/filtering-shared';

export const LIST_FILTER_QUERY_KEYS = Object.freeze(['lsort']);

export const LIST_SORT_OPTIONS = Object.freeze([
  Object.freeze({ label: 'Recently Updated', value: 'updated_desc' }),
  Object.freeze({ label: 'Recently Created', value: 'created_desc' }),
  Object.freeze({ label: 'Oldest Created', value: 'created_asc' }),
  Object.freeze({ label: 'Most Liked', value: 'likes_desc' }),
  Object.freeze({ label: 'Most Reviewed', value: 'reviews_desc' }),
  Object.freeze({ label: 'Most Items', value: 'items_desc' }),
  Object.freeze({ label: 'Title (A-Z)', value: 'title_asc' }),
  Object.freeze({ label: 'Title (Z-A)', value: 'title_desc' }),
]);

const LIST_SORT_VALUE_SET = new Set(LIST_SORT_OPTIONS.map((option) => option.value));

const DEFAULT_LIST_FILTERS = Object.freeze({
  sort: 'updated_desc',
});

function normalizeListSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return LIST_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_LIST_FILTERS.sort;
}

function resolveListSortFields(item = {}) {
  return {
    createdAt: new Date(item?.createdAt || 0).getTime(),
    itemsCount: Number(item?.itemsCount || 0),
    likesCount: Number(item?.likesCount || 0),
    reviewsCount: Number(item?.reviewsCount || 0),
    title: normalizeString(item?.title).toLocaleLowerCase(),
    updatedAt: new Date(item?.updatedAt || 0).getTime(),
  };
}

export function parseListFilters(searchParams) {
  return {
    sort: normalizeListSort(searchParams?.get?.('lsort')),
  };
}

export function toListQueryValues(filters = DEFAULT_LIST_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_LIST_FILTERS,
    ...(filters || {}),
  };

  if (normalizedFilters.sort === DEFAULT_LIST_FILTERS.sort) {
    return {};
  }

  return {
    lsort: normalizedFilters.sort,
  };
}

export function hasActiveListFilters(filters = DEFAULT_LIST_FILTERS) {
  return normalizeListSort(filters?.sort) !== DEFAULT_LIST_FILTERS.sort;
}

export function sortProfileLists(items = [], sort = DEFAULT_LIST_FILTERS.sort) {
  const sourceItems = Array.isArray(items) ? items : [];

  return [...sourceItems].sort((left, right) => {
    const leftFields = resolveListSortFields(left);
    const rightFields = resolveListSortFields(right);

    switch (sort) {
      case 'created_desc':
        return (
          rightFields.createdAt - leftFields.createdAt ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'created_asc':
        return (
          leftFields.createdAt - rightFields.createdAt ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'likes_desc':
        return (
          rightFields.likesCount - leftFields.likesCount ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'reviews_desc':
        return (
          rightFields.reviewsCount - leftFields.reviewsCount ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'items_desc':
        return (
          rightFields.itemsCount - leftFields.itemsCount ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'title_asc':
        return (
          leftFields.title.localeCompare(rightFields.title) ||
          rightFields.updatedAt - leftFields.updatedAt
        );
      case 'title_desc':
        return (
          rightFields.title.localeCompare(leftFields.title) ||
          rightFields.updatedAt - leftFields.updatedAt
        );
      case 'updated_desc':
      default:
        return (
          rightFields.updatedAt - leftFields.updatedAt ||
          rightFields.createdAt - leftFields.createdAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
    }
  });
}


// ============================================================================
// FILE: domains/account/ui/filters/media.js
// ============================================================================

import { buildMediaItemKey } from '@/domains/media/shared/media';

import {
  buildHash,
  isSameFilterState,
  normalizeFiniteNumber,
  normalizeString,
  normalizeToken,
  parseFlagSet,
  serializeFlagSet,
} from '../../utils/filtering-shared';

export const MEDIA_FILTER_QUERY_KEYS = Object.freeze([
  'mq',
  'mr',
  'mmin',
  'mmax',
  'mdec',
  'mgen',
  'msort',
  'meye',
]);

export const MEDIA_SORT_GROUPS = Object.freeze([
  Object.freeze({
    label: 'Release Date',
    options: Object.freeze([
      Object.freeze({ label: 'Newest release first', value: 'release_desc' }),
      Object.freeze({ label: 'Earliest release first', value: 'release_asc' }),
    ]),
  }),
  Object.freeze({
    label: 'When Added',
    options: Object.freeze([
      Object.freeze({ label: 'Recently added first', value: 'added_desc' }),
      Object.freeze({ label: 'Oldest added first', value: 'added_asc' }),
    ]),
  }),
  Object.freeze({
    label: 'Average Rating',
    options: Object.freeze([
      Object.freeze({ label: 'Highest TMDB rating first', value: 'average_desc' }),
      Object.freeze({ label: 'Lowest TMDB rating first', value: 'average_asc' }),
    ]),
  }),
  Object.freeze({
    label: 'Title',
    options: Object.freeze([
      Object.freeze({ label: 'Title A to Z', value: 'title_asc' }),
      Object.freeze({ label: 'Title Z to A', value: 'title_desc' }),
    ]),
  }),
  Object.freeze({
    label: 'Other',
    options: Object.freeze([
      Object.freeze({ label: 'Highest popularity first', value: 'popularity_desc' }),
      Object.freeze({ label: 'Shuffle order', value: 'shuffle' }),
    ]),
  }),
]);

const MEDIA_SORT_VALUE_SET = new Set([
  ...MEDIA_SORT_GROUPS.flatMap((group) => group.options.map((option) => option.value)),
  'list_order',
  'custom',
  'default',
]);

const BASE_GENRE_OPTIONS = Object.freeze([
  Object.freeze({ label: 'Action', value: 'action' }),
  Object.freeze({ label: 'Adventure', value: 'adventure' }),
  Object.freeze({ label: 'Animation', value: 'animation' }),
  Object.freeze({ label: 'Comedy', value: 'comedy' }),
  Object.freeze({ label: 'Crime', value: 'crime' }),
  Object.freeze({ label: 'Documentary', value: 'documentary' }),
  Object.freeze({ label: 'Drama', value: 'drama' }),
  Object.freeze({ label: 'Family', value: 'family' }),
  Object.freeze({ label: 'Fantasy', value: 'fantasy' }),
  Object.freeze({ label: 'History', value: 'history' }),
  Object.freeze({ label: 'Horror', value: 'horror' }),
  Object.freeze({ label: 'Music', value: 'music' }),
  Object.freeze({ label: 'Mystery', value: 'mystery' }),
  Object.freeze({ label: 'Romance', value: 'romance' }),
  Object.freeze({ label: 'Science Fiction', value: 'science_fiction' }),
  Object.freeze({ label: 'TV Movie', value: 'tv_movie' }),
  Object.freeze({ label: 'Thriller', value: 'thriller' }),
  Object.freeze({ label: 'War', value: 'war' }),
  Object.freeze({ label: 'Western', value: 'western' }),
]);

const TMDB_GENRE_ID_TO_VALUE = Object.freeze({
  12: 'adventure',
  14: 'fantasy',
  16: 'animation',
  18: 'drama',
  27: 'horror',
  28: 'action',
  35: 'comedy',
  36: 'history',
  37: 'western',
  53: 'thriller',
  80: 'crime',
  99: 'documentary',
  10402: 'music',
  10749: 'romance',
  10751: 'family',
  10752: 'war',
  10770: 'tv_movie',
  878: 'science_fiction',
  9648: 'mystery',
});

const GENRE_VALUE_TO_LABEL = Object.freeze(
  BASE_GENRE_OPTIONS.reduce((accumulator, option) => {
    accumulator[option.value] = option.label;
    return accumulator;
  }, {}),
);

const GENRE_LABEL_TO_VALUE = Object.freeze(
  Object.entries(GENRE_VALUE_TO_LABEL).reduce((accumulator, [value, label]) => {
    accumulator[normalizeToken(label)] = value;
    return accumulator;
  }, {}),
);

const DEFAULT_MEDIA_FILTERS = Object.freeze({
  decade: 'all',
  genre: 'all',
  maxRating: 5,
  minRating: 0.5,
  query: '',
  ratingMode: 'any',
  sort: 'release_desc',
});

function normalizeMediaSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return MEDIA_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_MEDIA_FILTERS.sort;
}

function toMediaKey(item = {}) {
  if (item?.mediaKey) {
    return String(item.mediaKey);
  }

  const entityType = normalizeString(
    item?.entityType || item?.media_type || item?.subject?.type || (item?.slug ? 'list' : ''),
  ).toLowerCase();
  const entityId = normalizeString(item?.entityId || item?.id || item?.subject?.id || item?.listId);

  if (!entityType || !entityId) {
    return entityId ? String(entityId) : '';
  }

  if (entityType === 'list') {
    return `list_${entityId}`;
  }

  return buildMediaItemKey(entityType, entityId);
}

function resolveMediaTitle(item = {}) {
  return item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled';
}

function resolveReleaseDate(item = {}) {
  return item?.release_date || item?.first_air_date || null;
}

function resolveReleaseYear(item = {}) {
  const rawValue = resolveReleaseDate(item);

  if (!rawValue) {
    return null;
  }

  const dateValue = new Date(rawValue).getTime();

  if (!Number.isFinite(dateValue)) {
    const numericYear = Number.parseInt(String(rawValue).slice(0, 4), 10);
    return Number.isFinite(numericYear) ? numericYear : null;
  }

  return new Date(dateValue).getUTCFullYear();
}

function resolveReleaseTime(item = {}) {
  const rawValue = resolveReleaseDate(item);

  if (!rawValue) {
    return 0;
  }

  const timeValue = new Date(rawValue).getTime();
  return Number.isFinite(timeValue) ? timeValue : 0;
}

function resolveAddedTime(item = {}) {
  const rawValue = item?.addedAt || item?.updatedAt || null;

  if (!rawValue) {
    return 0;
  }

  const timeValue = new Date(rawValue).getTime();
  return Number.isFinite(timeValue) ? timeValue : 0;
}

function resolveAverageRating(item = {}) {
  const raw = normalizeFiniteNumber(item?.vote_average, null);

  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  return raw;
}

function resolvePopularity(item = {}) {
  const popularity = normalizeFiniteNumber(item?.popularity, null);

  if (Number.isFinite(popularity)) {
    return popularity;
  }

  const voteCount = normalizeFiniteNumber(item?.vote_count, null);
  const rating = resolveAverageRating(item);

  if (!Number.isFinite(voteCount) && rating === null) {
    return 0;
  }

  return (Number.isFinite(voteCount) ? voteCount : 0) + (rating !== null ? rating * 50 : 0);
}

function resolveUserRating(item = {}) {
  const rating = normalizeFiniteNumber(item?.rating ?? item?.userRating, null);
  return Number.isFinite(rating) ? rating : null;
}

function resolveGenreValueFromRaw(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const asNumber = normalizeFiniteNumber(rawValue, null);

  if (Number.isFinite(asNumber) && TMDB_GENRE_ID_TO_VALUE[asNumber]) {
    return TMDB_GENRE_ID_TO_VALUE[asNumber];
  }

  const token = normalizeToken(rawValue);

  if (!token) {
    return null;
  }

  if (GENRE_VALUE_TO_LABEL[token]) {
    return token;
  }

  return GENRE_LABEL_TO_VALUE[token] || token;
}

function collectGenreValues(item = {}) {
  const values = new Set();
  const append = (entry) => {
    const normalized = resolveGenreValueFromRaw(entry);

    if (normalized) {
      values.add(normalized);
    }
  };

  [item?.genre_ids, item?.genreIds, item?.payload?.genre_ids, item?.payload?.genreIds].forEach(
    (source) => {
      if (Array.isArray(source)) {
        source.forEach((genreId) => append(genreId));
      }
    },
  );

  [
    item?.genres,
    item?.genreNames,
    item?.genre_names,
    item?.payload?.genres,
    item?.payload?.genreNames,
    item?.payload?.genre_names,
  ].forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((genre) => {
      if (genre && typeof genre === 'object') {
        append(genre.id);
        append(genre.name);
        return;
      }

      append(genre);
    });
  });

  return values;
}

function collectServiceValues(item = {}) {
  const values = new Set();
  const append = (entry) => {
    if (!entry) {
      return;
    }

    if (typeof entry === 'string') {
      const token = normalizeToken(entry);

      if (token) {
        values.add(token);
      }

      return;
    }

    if (typeof entry === 'number') {
      values.add(String(entry));
      return;
    }

    if (typeof entry === 'object') {
      const nameToken = normalizeToken(entry.provider_name || entry.name || entry.title);
      const idToken = normalizeString(entry.provider_id || entry.id);

      if (nameToken) {
        values.add(nameToken);
      }

      if (idToken) {
        values.add(idToken);
      }
    }
  };

  [
    item?.providerNames,
    item?.providerIds,
    item?.providers,
    item?.payload?.providerNames,
    item?.payload?.providerIds,
    item?.payload?.providers,
  ].forEach((source) => {
    if (Array.isArray(source)) {
      source.forEach((entry) => append(entry));
    }
  });

  const providerMap = item?.watchProviders || item?.payload?.watchProviders || null;

  if (providerMap && typeof providerMap === 'object') {
    Object.values(providerMap).forEach((regionProviders) => {
      if (!regionProviders || typeof regionProviders !== 'object') {
        return;
      }

      Object.values(regionProviders).forEach((providerList) => {
        if (Array.isArray(providerList)) {
          providerList.forEach((provider) => append(provider));
        }
      });
    });
  }

  return values;
}

function formatDiscoveredLabel(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

export function buildMediaKeySet(items = [], shouldInclude = () => true) {
  const set = new Set();
  (Array.isArray(items) ? items : []).filter(shouldInclude).forEach((item) => {
    const key = toMediaKey(item);
    if (key) set.add(key);
    const rawId = item?.id || item?.entityId || item?.listId;
    if (rawId) {
      const idStr = String(rawId);
      set.add(idStr);
      set.add(`list_${idStr}`);
      set.add(`list:${idStr}`);
      if (item?.ownerId || item?.user_id) {
        set.add(`list:${item.ownerId || item.user_id}:${idStr}`);
      }
    }
    if (item?.slug) {
      set.add(String(item.slug));
    }
  });
  return set;
}

export function parseMediaFilters(
  searchParams,
  { allowedEyeFlags = null, defaultSort = DEFAULT_MEDIA_FILTERS.sort } = {},
) {
  const query = normalizeString(searchParams?.get?.('mq'));
  const decade =
    normalizeString(searchParams?.get?.('mdec')).toLowerCase() || DEFAULT_MEDIA_FILTERS.decade;
  const genre = normalizeToken(searchParams?.get?.('mgen')) || DEFAULT_MEDIA_FILTERS.genre;
  const rawSort = searchParams?.get?.('msort');
  const sort = rawSort ? normalizeMediaSort(rawSort) : defaultSort;
  const parsedEyeFlags = parseFlagSet(searchParams?.get?.('meye'));
  const eyeFlags =
    Array.isArray(allowedEyeFlags) && allowedEyeFlags.length > 0
      ? new Set([...parsedEyeFlags].filter((flag) => allowedEyeFlags.includes(flag)))
      : parsedEyeFlags;

  return {
    decade,
    eyeFlags,
    genre,
    maxRating: DEFAULT_MEDIA_FILTERS.maxRating,
    minRating: DEFAULT_MEDIA_FILTERS.minRating,
    query,
    ratingMode: DEFAULT_MEDIA_FILTERS.ratingMode,
    sort,
  };
}

export function toMediaQueryValues(
  filters = DEFAULT_MEDIA_FILTERS,
  { defaultSort = DEFAULT_MEDIA_FILTERS.sort } = {},
) {
  const normalizedFilters = {
    ...DEFAULT_MEDIA_FILTERS,
    sort: defaultSort,
    ...(filters || {}),
  };
  const normalizedQuery = normalizeString(normalizedFilters.query);
  const nextValues = {};

  if (normalizedQuery) {
    nextValues.mq = normalizedQuery;
  }

  if (normalizedFilters.decade !== DEFAULT_MEDIA_FILTERS.decade) {
    nextValues.mdec = normalizedFilters.decade;
  }

  if (normalizedFilters.genre !== DEFAULT_MEDIA_FILTERS.genre) {
    nextValues.mgen = normalizedFilters.genre;
  }

  if (normalizedFilters.sort !== defaultSort) {
    nextValues.msort = normalizedFilters.sort;
  }

  const serializedFlags = serializeFlagSet(normalizedFilters.eyeFlags);

  if (serializedFlags) {
    nextValues.meye = serializedFlags;
  }

  return nextValues;
}

export function hasActiveMediaFilters(
  filters = DEFAULT_MEDIA_FILTERS,
  { defaultSort = DEFAULT_MEDIA_FILTERS.sort } = {},
) {
  const normalizedFilters = {
    ...DEFAULT_MEDIA_FILTERS,
    sort: defaultSort,
    ...(filters || {}),
    query: normalizeString(filters?.query),
  };

  const isSameSort = (filters?.sort || defaultSort) === defaultSort;
  const isSameDecade = (normalizedFilters.decade || 'all') === 'all';
  const isSameGenre = (normalizedFilters.genre || 'all') === 'all';
  const isSameQuery = !normalizedFilters.query;

  if (!isSameSort || !isSameDecade || !isSameGenre || !isSameQuery) {
    return true;
  }

  return normalizedFilters.eyeFlags instanceof Set && normalizedFilters.eyeFlags.size > 0;
}

export function applyMediaFilters(items = [], filters = DEFAULT_MEDIA_FILTERS, context = {}) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedFilters = {
    ...DEFAULT_MEDIA_FILTERS,
    ...(filters || {}),
  };
  const normalizedQuery = normalizeString(normalizedFilters.query).toLocaleLowerCase();
  const watchedKeys = context.watchedKeys instanceof Set ? context.watchedKeys : new Set();
  const likedKeys = context.likedKeys instanceof Set ? context.likedKeys : new Set();
  const reviewedKeys = context.reviewedKeys instanceof Set ? context.reviewedKeys : new Set();
  const watchlistKeys = context.watchlistKeys instanceof Set ? context.watchlistKeys : new Set();
  const hasGenreMetadata = sourceItems.some((item) => collectGenreValues(item).size > 0);

  const filteredItems = sourceItems.filter((item) => {
    const mediaKey = toMediaKey(item);
    const title = resolveMediaTitle(item).toLocaleLowerCase();

    if (normalizedQuery && !title.includes(normalizedQuery)) {
      return false;
    }

    if (normalizedFilters.decade !== 'all') {
      const decadeValue = Number.parseInt(normalizedFilters.decade, 10);
      const releaseYear = resolveReleaseYear(item);

      if (
        !Number.isFinite(decadeValue) ||
        !Number.isFinite(releaseYear) ||
        releaseYear < decadeValue ||
        releaseYear >= decadeValue + 10
      ) {
        return false;
      }
    }

    if (
      normalizedFilters.genre !== 'all' &&
      hasGenreMetadata &&
      !collectGenreValues(item).has(normalizedFilters.genre)
    ) {
      return false;
    }

    const eyeFlags = normalizedFilters.eyeFlags;

    if (eyeFlags.has('hide_watched') && watchedKeys.has(mediaKey)) return false;
    if (eyeFlags.has('hide_liked') && likedKeys.has(mediaKey)) return false;
    if (eyeFlags.has('hide_reviewed') && reviewedKeys.has(mediaKey)) return false;
    if (eyeFlags.has('hide_watchlist') && watchlistKeys.has(mediaKey)) return false;
    if (eyeFlags.has('hide_rewatched') && Number(item?.watchCount || 0) > 1) return false;
    if (eyeFlags.has('hide_rated') && resolveUserRating(item) !== null) return false;

    if (eyeFlags.has('hide_unreleased')) {
      const releaseDate = resolveReleaseDate(item);

      if (releaseDate) {
        const releaseTime = new Date(releaseDate).getTime();

        if (Number.isFinite(releaseTime) && releaseTime > Date.now()) {
          return false;
        }
      }
    }

    if (eyeFlags.has('hide_documentaries') && collectGenreValues(item).has('documentary')) {
      return false;
    }

    return true;
  });

  return sortMediaItems(filteredItems, normalizedFilters.sort);
}

function sortMediaItems(items = [], sort = DEFAULT_MEDIA_FILTERS.sort) {
  const decorated = items.map((item, index) => ({
    averageRating: resolveAverageRating(item),
    index,
    item,
    title: resolveMediaTitle(item).toLocaleLowerCase(),
  }));

  decorated.sort((left, right) => {
    switch (sort) {
      case 'list_order':
      case 'custom':
      case 'default': {
        return left.index - right.index;
      }
      case 'release_asc': {
        const diff = resolveReleaseTime(left.item) - resolveReleaseTime(right.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'added_desc': {
        const diff = resolveAddedTime(right.item) - resolveAddedTime(left.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'added_asc': {
        const diff = resolveAddedTime(left.item) - resolveAddedTime(right.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'average_desc': {
        const leftRating = left.averageRating === null ? -1 : left.averageRating;
        const rightRating = right.averageRating === null ? -1 : right.averageRating;
        const diff = rightRating - leftRating;
        if (diff !== 0) return diff;
        break;
      }
      case 'average_asc': {
        const leftRating = left.averageRating === null ? 10 : left.averageRating;
        const rightRating = right.averageRating === null ? 10 : right.averageRating;
        const diff = leftRating - rightRating;
        if (diff !== 0) return diff;
        break;
      }
      case 'title_asc': {
        const diff = left.title.localeCompare(right.title);
        if (diff !== 0) return diff;
        break;
      }
      case 'title_desc': {
        const diff = right.title.localeCompare(left.title);
        if (diff !== 0) return diff;
        break;
      }
      case 'popularity_desc': {
        const diff = resolvePopularity(right.item) - resolvePopularity(left.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'shuffle': {
        const leftHash = buildHash(toMediaKey(left.item) || String(left.index));
        const rightHash = buildHash(toMediaKey(right.item) || String(right.index));
        const diff = leftHash - rightHash;
        if (diff !== 0) return diff;
        break;
      }
      case 'release_desc':
      default: {
        const diff = resolveReleaseTime(right.item) - resolveReleaseTime(left.item);
        if (diff !== 0) return diff;
        break;
      }
    }

    if (left.title !== right.title) {
      return left.title.localeCompare(right.title);
    }

    return left.index - right.index;
  });

  return decorated.map((entry) => entry.item);
}

export function collectMediaGenreOptions(items = []) {
  const discovered = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    collectGenreValues(item).forEach((genreValue) => discovered.add(genreValue));
  });

  if (discovered.size === 0) {
    return [{ label: 'Any genre', value: 'all' }];
  }

  const options = [...discovered]
    .filter(Boolean)
    .map((value) => ({
      label: GENRE_VALUE_TO_LABEL[value] || formatDiscoveredLabel(value),
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [{ label: 'Any genre', value: 'all' }, ...options];
}

export function getAllMediaGenreOptions() {
  return [{ label: 'Any genre', value: 'all' }, ...BASE_GENRE_OPTIONS];
}

export function resolveMediaSortOption(value) {
  if (value === 'list_order' || value === 'custom' || value === 'default') {
    return {
      groupLabel: 'Sort',
      label: 'List order',
      value,
    };
  }

  for (const group of MEDIA_SORT_GROUPS) {
    const option = group.options.find((entry) => entry.value === value);

    if (option) {
      return {
        ...option,
        groupLabel: group.label,
      };
    }
  }

  return null;
}

export function collectMediaServiceOptions(items = []) {
  const labels = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    collectServiceValues(item).forEach((serviceValue) => {
      if (!serviceValue || labels.has(serviceValue)) {
        return;
      }

      labels.set(serviceValue, formatDiscoveredLabel(serviceValue));
    });
  });

  const options = [...labels.entries()]
    .map(([value, label]) => ({ label, value }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [{ label: 'Any service', value: 'all' }, ...options];
}

export function getDecadeOptions(minDecade = 1870) {
  const currentYear = new Date().getUTCFullYear();
  const currentDecade = currentYear - (currentYear % 10);
  const options = [];

  for (let decade = currentDecade; decade >= minDecade; decade -= 10) {
    options.push({
      label: `${decade}s`,
      value: String(decade),
    });
  }

  return [{ label: 'Any decade', value: 'all' }, ...options];
}


// ============================================================================
// FILE: domains/account/ui/filters/reviews.js
// ============================================================================

import { REVIEW_SORT_MODE, sortReviewsByMode } from '@/domains/reviews/shared/review-data';

import {
  isSameFilterState,
  matchesRange,
  normalizeFiniteNumber,
  normalizeRatingMode,
  normalizeStarValue,
  normalizeString,
  parseFlagSet,
  serializeFlagSet,
} from '../../utils/filtering-shared';

export const REVIEW_FILTER_QUERY_KEYS = Object.freeze([
  'rr',
  'rmin',
  'rmax',
  'ryear',
  'rsort',
  'reye',
]);

const REVIEW_SORT_VALUE_SET = new Set([
  REVIEW_SORT_MODE.NEWEST,
  REVIEW_SORT_MODE.OLDEST,
  REVIEW_SORT_MODE.RATING_DESC,
  REVIEW_SORT_MODE.RATING_ASC,
  REVIEW_SORT_MODE.LIKES_DESC,
  REVIEW_SORT_MODE.LIKES_ASC,
]);

const DEFAULT_REVIEW_FILTERS = Object.freeze({
  maxRating: 5,
  minRating: 0.5,
  ratingMode: 'any',
  sort: REVIEW_SORT_MODE.NEWEST,
  year: 'all',
});

function normalizeReviewSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return REVIEW_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_REVIEW_FILTERS.sort;
}

function hasContentText(review = {}) {
  return normalizeString(review?.content).length > 0;
}

export function parseReviewFilters(searchParams) {
  const ratingMode = normalizeRatingMode(
    searchParams?.get?.('rr'),
    DEFAULT_REVIEW_FILTERS.ratingMode,
  );
  const parsedMin = normalizeStarValue(
    searchParams?.get?.('rmin'),
    DEFAULT_REVIEW_FILTERS.minRating,
  );
  const parsedMax = normalizeStarValue(
    searchParams?.get?.('rmax'),
    DEFAULT_REVIEW_FILTERS.maxRating,
  );
  const minRating = Math.min(parsedMin, parsedMax);
  const maxRating = Math.max(parsedMin, parsedMax);
  const year =
    normalizeString(searchParams?.get?.('ryear')).toLowerCase() || DEFAULT_REVIEW_FILTERS.year;
  const sort = normalizeReviewSort(searchParams?.get?.('rsort'));
  const eyeFlags = parseFlagSet(searchParams?.get?.('reye'));

  return {
    eyeFlags,
    maxRating,
    minRating,
    ratingMode,
    sort,
    year,
  };
}

export function toReviewQueryValues(filters = DEFAULT_REVIEW_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_REVIEW_FILTERS,
    ...(filters || {}),
  };
  const nextValues = {};

  if (normalizedFilters.ratingMode !== DEFAULT_REVIEW_FILTERS.ratingMode) {
    nextValues.rr = normalizedFilters.ratingMode;
  }

  if (
    normalizedFilters.ratingMode === 'range' &&
    normalizedFilters.minRating !== DEFAULT_REVIEW_FILTERS.minRating
  ) {
    nextValues.rmin = String(normalizedFilters.minRating);
  }

  if (
    normalizedFilters.ratingMode === 'range' &&
    normalizedFilters.maxRating !== DEFAULT_REVIEW_FILTERS.maxRating
  ) {
    nextValues.rmax = String(normalizedFilters.maxRating);
  }

  if (normalizedFilters.year !== DEFAULT_REVIEW_FILTERS.year) {
    nextValues.ryear = normalizedFilters.year;
  }

  if (normalizedFilters.sort !== DEFAULT_REVIEW_FILTERS.sort) {
    nextValues.rsort = normalizedFilters.sort;
  }

  const serializedFlags = serializeFlagSet(normalizedFilters.eyeFlags);

  if (serializedFlags) {
    nextValues.reye = serializedFlags;
  }

  return nextValues;
}

export function hasActiveReviewFilters(filters = DEFAULT_REVIEW_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_REVIEW_FILTERS,
    ...(filters || {}),
  };

  if (
    !isSameFilterState(normalizedFilters, DEFAULT_REVIEW_FILTERS, ['ratingMode', 'sort', 'year'])
  ) {
    return true;
  }

  if (normalizedFilters.ratingMode === 'range') {
    if (normalizedFilters.minRating !== DEFAULT_REVIEW_FILTERS.minRating) {
      return true;
    }

    if (normalizedFilters.maxRating !== DEFAULT_REVIEW_FILTERS.maxRating) {
      return true;
    }
  }

  return normalizedFilters.eyeFlags instanceof Set && normalizedFilters.eyeFlags.size > 0;
}

export function applyReviewFilters(items = [], filters = DEFAULT_REVIEW_FILTERS) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedFilters = {
    ...DEFAULT_REVIEW_FILTERS,
    ...(filters || {}),
  };

  const filteredItems = sourceItems.filter((item) => {
    const ratingValue = normalizeFiniteNumber(item?.rating, null);

    if (normalizedFilters.ratingMode === 'none' && ratingValue !== null) {
      return false;
    }

    if (
      normalizedFilters.ratingMode === 'range' &&
      !matchesRange(ratingValue, normalizedFilters.minRating, normalizedFilters.maxRating)
    ) {
      return false;
    }

    if (normalizedFilters.year !== 'all') {
      const targetYear = Number.parseInt(normalizedFilters.year, 10);
      const itemTime = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
      const itemYear = Number.isFinite(itemTime) ? new Date(itemTime).getUTCFullYear() : null;

      if (!Number.isFinite(targetYear) || !Number.isFinite(itemYear) || itemYear !== targetYear) {
        return false;
      }
    }

    const eyeFlags = normalizedFilters.eyeFlags;
    const contentPresent = hasContentText(item);

    if (eyeFlags.has('hide_ratings_only') && !contentPresent) {
      return false;
    }

    if (eyeFlags.has('hide_text_reviews') && contentPresent) {
      return false;
    }

    return true;
  });

  return sortReviewsByMode(filteredItems, normalizedFilters.sort);
}

export function collectReviewYears(items = []) {
  const years = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const itemTime = new Date(item?.updatedAt || item?.createdAt || 0).getTime();

    if (Number.isFinite(itemTime)) {
      years.add(new Date(itemTime).getUTCFullYear());
    }
  });

  return [
    { label: 'Any year', value: 'all' },
    ...[...years]
      .sort((left, right) => right - left)
      .map((year) => ({
        label: String(year),
        value: String(year),
      })),
  ];
}


// ============================================================================
// FILE: domains/account/ui/index.js
// ============================================================================

export * from './sections/account-hero.js';
export * from './layouts/account-layout.js';
export * from './components/account-media-grid.js';
export * from './pages/account-route-page.js';
export * from './components/account-pagination.js';
export * from './sections/account-section-factory.js';
export * from '../hooks/account-section-state.js';
export * from './sections/account-section.js';
export * from './nav-actions/account-action.js';
export * from './nav-surfaces/account-bio-surface.js';
export * from '../hooks/account-registry-state.js';


// ============================================================================
// FILE: domains/account/ui/layouts/account-background-registry.js
// ============================================================================

'use client';

import { useMemo } from 'react';
import { useRegistry } from '@/modules/registry';
import { resolveVersionedImageUrl } from '@/shared/utils';

export default function AccountBackgroundRegistry({ bannerUrl = null }) {
  const heroBannerSrc = useMemo(
    () =>
      resolveVersionedImageUrl(String(bannerUrl || ''))
        .trim()
        .replace(/^(null|undefined)$/i, '') || null,
    [bannerUrl],
  );

  const backgroundConfig = useMemo(
    () =>
      heroBannerSrc &&
      {
        image: heroBannerSrc,
        leftGradient: 3,
        rightGradient: 3,
      }[heroBannerSrc],
  );

  useRegistry({ background: backgroundConfig });

  return null;
}


// ============================================================================
// FILE: domains/account/ui/layouts/account-grid-frame.js
// ============================================================================

'use client';

import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import { cn } from '@/shared/utils';

export default function AccountGridFrame({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        `pointer-events-none absolute inset-y-0 left-1/2 z-0 min-h-screen w-full -translate-x-1/2 ${ACCOUNT_ROUTE_SHELL_CLASS}`,
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-white/10 backdrop-blur-sm" />
      <div className="absolute inset-y-0 right-0 w-px bg-white/10 backdrop-blur-sm" />
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/layouts/account-layout.js
// ============================================================================

'use client';

import { GridShellCrosshairs } from '@/ui/layout/grid-crosshair';
import { createContext, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { cn } from '@/shared/utils';
import AccountHero from '../sections/account-hero';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import NotFoundTemplate from '@/ui/feedback/not-found-template';
import { AccountSkeleton, renderAccountSectionSkeleton } from '@/app/(account)/account/loading';
import AccountBackgroundRegistry from './account-background-registry';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import { useNavigationActions } from '@/modules/nav';
import { useRegistry } from '@/modules/registry';
import { getUserAvatarUrl } from '@/domains/account/utils';
import { createAccountBioSurfaceEntry } from '@/domains/account/ui/nav-surfaces/account-bio-surface';
import { AccountProfileShellProvider, useAccountProfileShell } from './account-profile-context';
import AccountGridFrame from './account-grid-frame';
// ─── Nav Transition Context ───────────────────────────────────────────────────

const AccountNavTransitionContext = createContext({
  pendingTab: null,
  startTabTransition: () => {},
});

export function AccountNavTransitionProvider({ children }) {
  const [pendingTab, setPendingTab] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPendingTab(null);
  }, [pathname]);

  const startTabTransition = (tabKey, href) => {
    setPendingTab(tabKey);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <AccountNavTransitionContext.Provider value={{ pendingTab, startTabTransition }}>
      {children}
    </AccountNavTransitionContext.Provider>
  );
}

export function useAccountNavTransition() {
  return useContext(AccountNavTransitionContext);
}

// ─── Reveal Wrappers ──────────────────────────────────────────────────────────

export function AccountHeroReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function AccountNavReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

const SECTION_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'likes', label: 'Likes' },
  { key: 'watched', label: 'Watched' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'lists', label: 'Lists' },
];

const DEFAULT_NOT_FOUND_DESCRIPTION =
  "We couldn't load this account. It may have been removed, or the link may be invalid.";

function getSectionHref(username, key) {
  return key === 'overview' ? `/account/${username}` : `/account/${username}/${key}`;
}

const SECTION_KEYS_SET = new Set([
  'overview',
  'activity',
  'likes',
  'watched',
  'watchlist',
  'reviews',
  'lists',
]);

function resolveAccountPageDescription(pathname = '') {
  const segments = String(pathname || '')
    .split('/')
    .filter(Boolean);
  const section = segments[2];

  if (segments[1] === 'edit') return 'Edit Account';
  if (!section) return 'Profile Overview';

  return (
    {
      activity: 'Activity Feed',
      likes: 'Likes',
      watched: 'Watched',
      watchlist: 'Watchlist',
      reviews: 'Reviews',
      lists: 'Lists',
    }[section] || 'Profile Overview'
  );
}

function AccountProfileShellNav({ profile }) {
  const pathname = usePathname();
  const accountTitle = String(profile?.displayName || profile?.username || 'Account').trim();

  useRegistry({
    nav: {
      path: '/account',
      title: accountTitle,
      icon: getUserAvatarUrl(profile),
      description: resolveAccountPageDescription(pathname),
      registry: {
        priority: 180,
        source: 'account-profile-shell',
      },
    },
  });

  return null;
}

// ─── Section Nav ──────────────────────────────────────────────────────────────

export function AccountSectionNav({ activeKey = 'overview', className = '', username = null }) {
  if (!username) return null;
  return (
    <div className={cn('relative w-full bg-transparent', className)}>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
        <GridShellCrosshairs />
      </div>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="grid h-14 w-full auto-cols-[6.75rem] grid-flow-col divide-x divide-white/10 overflow-x-auto [scrollbar-width:none] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-7 [&::-webkit-scrollbar]:hidden">
          {SECTION_ITEMS.map((item, index) => (
            <div key={index} className="h-14 p-2 sm:min-w-0">
              <NavViewItem
                key={item.key}
                item={item}
                index={index}
                isActive={item.key === activeKey}
                href={getSectionHref(username, item.key)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountSectionNavWrapper({
  activeSection = null,
  className = '',
  username = null,
}) {
  const segment = useSelectedLayoutSegment();
  const { pendingTab } = useAccountNavTransition();
  const resolvedActiveKey =
    pendingTab ||
    (segment && SECTION_KEYS_SET.has(segment) ? segment : activeSection || 'overview');
  return (
    <AccountSectionNav activeKey={resolvedActiveKey} className={className} username={username} />
  );
}

function NavViewItem({ item, isActive, href, index }) {
  const { startTabTransition } = useAccountNavTransition();

  const handleClick = (e) => {
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      startTabTransition(item.key, href);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'center relative h-full w-full shrink-0 px-2 text-[10px] tracking-wide whitespace-nowrap uppercase transition-all duration-300 ease-in-out last:border-none hover:scale-[1.015] active:scale-[0.985] sm:text-xs',
        isActive
          ? 'font-bold text-black'
          : 'font-semibold text-white/70 hover:bg-white/10 hover:text-white hover:backdrop-blur-md',
      )}
    >
      {isActive ? <span className="absolute inset-0 bg-white" /> : null}
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

// ─── Not Found & Page Shell ───────────────────────────────────────────────────

export function AccountNotFoundState({ description = DEFAULT_NOT_FOUND_DESCRIPTION }) {
  return <NotFoundTemplate description={description} />;
}

export function AccountPageShell(props) {
  const { isLoading, resolvedUserId, profile, registry, skeletonVariant = 'overview' } = props;
  const profileShell = useAccountProfileShell();

  if (profileShell) {
    return (
      <>
        {registry}
        {isLoading ? renderAccountSectionSkeleton(skeletonVariant) : props.children}
      </>
    );
  }

  if (isLoading) {
    const skeletonActiveTab = skeletonVariant === 'list-detail' ? 'lists' : skeletonVariant;
    return <AccountSkeleton activeTab={skeletonActiveTab} />;
  }
  if (!resolvedUserId || !profile) {
    return (
      <>
        {registry}
        <AccountNotFoundState />
      </>
    );
  }
  return (
    <>
      {registry}
      <ProfileLayout {...props} />
    </>
  );
}

// ─── Profile Layout ───────────────────────────────────────────────────────────

export default function ProfileLayout(props) {
  return (
    <AccountNavTransitionProvider>
      <ProfileLayoutInner {...props} />
    </AccountNavTransitionProvider>
  );
}

function AccountSectionScene({ children }) {
  return <div className="w-full">{children}</div>;
}

function ProfileLayoutInner({
  activeSection = 'overview',
  children,
  followerCount = 0,
  followingCount = 0,
  likesCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  profile = null,
  username = null,
  watchedCount = null,
  watchlistCount = 0,
}) {
  const { pendingTab } = useAccountNavTransition();
  const { openSurface } = useNavigationActions();
  const pathname = usePathname();
  const profileHandle = username || profile?.username || null;

  const handleReadMore = () => {
    openSurface(
      createAccountBioSurfaceEntry({
        description: profile?.description || '',
        followerCount,
        followingCount,
        profile,
        username: profileHandle || 'About',
      }),
    );
  };

  const mainContent = pendingTab ? renderAccountSectionSkeleton(pendingTab) : children;
  const profileShell = useMemo(
    () => ({
      followerCount,
      followingCount,
      likesCount,
      listsCount,
      profile,
      username: profileHandle,
      watchedCount,
      watchlistCount,
    }),
    [
      followerCount,
      followingCount,
      likesCount,
      listsCount,
      profile,
      profileHandle,
      watchedCount,
      watchlistCount,
    ],
  );

  return (
    <AccountProfileShellProvider value={profileShell}>
      <AccountProfileShellNav profile={profile} />
      <AccountBackgroundRegistry bannerUrl={profile?.bannerUrl} />
      <PageGradientShell className="overflow-hidden">
        <AccountGridFrame />
        <div
          className={`relative z-10 mx-auto flex w-full ${ACCOUNT_ROUTE_SHELL_CLASS} flex-col gap-6 pb-12 sm:gap-8`}
        >
          <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
            <AccountSectionNavWrapper activeSection={activeSection} username={profileHandle} />
          </AccountNavReveal>
          <div className="mt-28 flex w-full flex-col items-center gap-8 sm:mt-36 sm:gap-12 lg:mt-44 lg:gap-16">
            <AccountHeroReveal className="w-full">
              <AccountHero
                profile={profile}
                likesCount={likesCount}
                followerCount={followerCount}
                followingCount={followingCount}
                listsCount={listsCount}
                onOpenFollowList={onOpenFollowList}
                watchedCount={watchedCount}
                watchlistCount={watchlistCount}
                onReadMore={handleReadMore}
              />
            </AccountHeroReveal>

            <main className="w-full pt-4 pb-6 text-left sm:pt-6 sm:pb-8">
              <AccountSectionScene sceneKey={pendingTab ? `skeleton-${pendingTab}` : pathname}>
                {mainContent}
              </AccountSectionScene>
            </main>
          </div>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </AccountProfileShellProvider>
  );
}


// ============================================================================
// FILE: domains/account/ui/layouts/account-profile-context.js
// ============================================================================

'use client';

import { createContext, useContext } from 'react';

const AccountProfileShellContext = createContext(null);

export function AccountProfileShellProvider({ children, value = null }) {
  return (
    <AccountProfileShellContext.Provider value={value}>
      {children}
    </AccountProfileShellContext.Provider>
  );
}

export function useAccountProfileShell() {
  return useContext(AccountProfileShellContext);
}


// ============================================================================
// FILE: domains/account/ui/nav-actions/account-action.js
// ============================================================================

'use client';

import { useEffect } from 'react';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { usePathname, useSearchParams } from 'next/navigation';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/shared/constants';
import Icon from '@/ui/primitives/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/ui/primitives/navigation-action-styles';
import { useNavigationActions } from '@/modules/nav';
import {
  INFO_ACTION_TONE_CLASS,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from '@/shared/constants/index';

const PROFILE_FOLLOW_ACTIONS = Object.freeze({
  follow: {
    icon: 'solar:user-plus-bold',
    label: 'Follow',
    tone: 'muted',
  },
  follow_back: {
    icon: 'solar:user-plus-bold',
    label: 'Follow Back',
    tone: 'muted',
  },
  following: {
    icon: 'solar:user-minus-bold',
    label: 'Unfollow',
    tone: 'active',
  },
  requested: {
    icon: 'solar:clock-circle-bold',
    label: 'Requested',
    tone: 'info',
  },
});

function actionClass({ tone = 'muted', className } = {}) {
  return getNavActionClass({
    variant:
      tone === 'danger'
        ? DESTRUCTIVE_ACTION_TONE_CLASS
        : tone === 'success'
          ? SUCCESS_ACTION_TONE_CLASS
          : tone === 'info'
            ? INFO_ACTION_TONE_CLASS
            : tone === 'warning'
              ? WARNING_ACTION_TONE_CLASS
              : tone === 'active'
                ? NAV_ACTION_STYLES.active
                : NAV_ACTION_STYLES.muted,
    className,
  });
}

function getProfileFollowAction(state) {
  return PROFILE_FOLLOW_ACTIONS[state] || PROFILE_FOLLOW_ACTIONS.follow;
}

export default function AccountAction(props) {
  const {
    mode,
    activeEditTab,
    editTabs = [],
    activeTab,
    tabs = [],
    actionIcon,
    actionLabel,
    actionTone = 'muted',
    followState = 'follow',
    guestMode = 'sign-in',
    isOwner,
    isAuthenticated,
    isFollowLoading = false,
    inboxCount,
    canManageRequests = false,
    onFollow,
    onOpenInbox,
    onEditTabChange,
    onTabChange,
    onSignIn,
    showProfileFollowAction = false,
    isNotFound,
    onOpenMediaUpload,
    onCancel,
    onSave,
    isCancelDisabled = false,
    cancelLabel = 'Cancel',
    isUploadDisabled = false,
    isSaveDisabled = false,
    saveLabel = 'Save',
    isSaveLoading,
    showCancelAction = false,
    showSaveAction = false,
    showUploadAction = false,
    uploadLabel = 'Upload Media',

    isLiked,
    isLikeLoading,
    onDeleteList,
    onEditList,
    onAction,
    onToggleLike,
    onOpenReviewComposer,
    ownReview,
  } = props;
  const { setCompactLock } = useNavigationActions();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = getCurrentPathWithSearch(pathname, searchParams);
  const guestHref = buildAuthHref(
    guestMode === 'sign-up' ? AUTH_ROUTES.SIGN_UP : AUTH_ROUTES.SIGN_IN,
    {
      next: currentPath,
    },
  );
  const guestLabel = guestMode === 'sign-up' ? 'Sign Up' : 'Sign In';
  const guestIcon = guestMode === 'sign-up' ? 'solar:user-plus-bold' : 'solar:user-circle-bold';

  useEffect(() => {
    const shouldLockCompact = (mode === 'profile-edit' || mode === 'tab-switch') && showSaveAction;
    setCompactLock('account-action', shouldLockCompact);

    return () => {
      setCompactLock('account-action', false);
    };
  }, [mode, setCompactLock, showSaveAction]);

  if (mode === 'tab-switch') {
    if (!tabs.length) {
      return null;
    }

    const canShowFollowAction =
      !isOwner && showProfileFollowAction && typeof onFollow === 'function';
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;
    const canShowCancelAction = showCancelAction && typeof onCancel === 'function';

    return (
      <div className="mt-2.5 flex w-full flex-col gap-2">
        {showSaveAction || canShowCancelAction ? (
          <div className="flex w-full gap-2">
            {canShowCancelAction ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={isCancelDisabled}
                className={actionClass({
                  tone: 'muted',
                  className: 'flex-1 justify-center',
                })}
              >
                {cancelLabel}
              </button>
            ) : null}

            {showSaveAction ? (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaveLoading || isSaveDisabled}
                className={actionClass({
                  tone: isSaveDisabled ? 'muted' : 'success',
                  className: canShowCancelAction
                    ? 'flex-1 justify-center'
                    : 'w-full justify-center',
                })}
              >
                {isSaveLoading ? (
                  <span key="saving">Saving</span>
                ) : (
                  <span key="save" className="flex items-center gap-2">
                    <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
                    {saveLabel}
                  </span>
                )}
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className="grid w-full gap-2"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange?.(tab.key)}
                  aria-pressed={isActive}
                  className={actionClass({
                    tone: isActive ? 'active' : 'muted',
                    className: 'relative justify-center overflow-hidden',
                  })}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {canShowFollowAction && !showSaveAction ? (
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onFollow}
              className={actionClass({
                tone: followAction.tone,
                className: 'active:scale-95 transition-all duration-300 ease-in-out',
              })}
            >
              <span key={followAction.label} className="flex items-center gap-2">
                <Icon icon={followAction.icon} size={NAV_ACTION_STYLES.icon} />
                {followAction.label}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'profile-edit') {
    const canShowUploadAction = showUploadAction && typeof onOpenMediaUpload === 'function';
    const canShowCancelAction = showCancelAction && typeof onCancel === 'function';
    const shouldShowTabRow = !showSaveAction;
    const shouldShowBottomRow = canShowUploadAction || canShowCancelAction || showSaveAction;

    return (
      <div className="mt-2.5 flex w-full flex-col gap-2">
        {shouldShowTabRow ? (
          <div className="grid w-full grid-cols-2 gap-2">
            {editTabs.map((tab) => {
              const isActive = activeEditTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onEditTabChange?.(tab.key)}
                  aria-pressed={isActive}
                  className={actionClass({
                    tone: isActive ? 'active' : 'muted',
                    className: 'justify-center',
                  })}
                >
                  <Icon icon={tab.icon} size={NAV_ACTION_STYLES.icon} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {shouldShowBottomRow ? (
          <div className="flex w-full gap-2">
            {canShowUploadAction ? (
              <button
                type="button"
                onClick={onOpenMediaUpload}
                disabled={isUploadDisabled}
                className={actionClass({
                  tone: 'info',
                  className: showSaveAction ? 'flex-1' : '',
                })}
              >
                <Icon icon="solar:upload-bold" size={NAV_ACTION_STYLES.icon} />
                {uploadLabel}
              </button>
            ) : null}

            {canShowCancelAction ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={isCancelDisabled}
                className={actionClass({
                  tone: 'muted',
                  className: 'flex-1',
                })}
              >
                {cancelLabel}
              </button>
            ) : null}

            {showSaveAction ? (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaveLoading || isSaveDisabled}
                className={actionClass({
                  tone: isSaveDisabled ? 'muted' : 'success',
                  className: canShowUploadAction || canShowCancelAction ? 'flex-1' : '',
                })}
              >
                {isSaveLoading ? (
                  <span key="saving">Saving</span>
                ) : (
                  <span key="save" className="flex items-center gap-2">
                    <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
                    {saveLabel}
                  </span>
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'save') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaveLoading || isSaveDisabled}
          className={actionClass({ tone: !isSaveDisabled && 'success', className: '' })}
        >
          {isSaveLoading ? (
            <span key="saving">Saving</span>
          ) : (
            <span key="save" className="flex items-center gap-2">
              <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
              {saveLabel}
            </span>
          )}
        </button>
      </div>
    );
  }

  if (mode === 'single-action') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button type="button" onClick={onAction} className={actionClass({ tone: actionTone })}>
          {actionIcon ? <Icon icon={actionIcon} size={NAV_ACTION_STYLES.icon} /> : null}
          {actionLabel}
        </button>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button
          type="button"
          onClick={() => (window.location.href = '/')}
          className={actionClass()}
        >
          Back Home
        </button>
      </div>
    );
  }

  const canShowFollowAction = !isOwner && showProfileFollowAction && typeof onFollow === 'function';
  const canShowLikeListAction = !isOwner && typeof onToggleLike === 'function';
  const canShowCommentAction = !isOwner && typeof onOpenReviewComposer === 'function';

  if (canShowFollowAction || canShowLikeListAction || canShowCommentAction) {
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;

    return (
      <div className={NAV_ACTION_STYLES.row}>
        {canShowFollowAction ? (
          <button
            type="button"
            onClick={onFollow}
            className={actionClass({
              tone: followAction.tone,
              className: 'active:scale-95 transition-all duration-300 ease-in-out',
            })}
          >
            <span key={followAction.label} className="flex items-center gap-2">
              <Icon icon={followAction.icon} size={NAV_ACTION_STYLES.icon} />
              {followAction.label}
            </span>
          </button>
        ) : null}

        {canShowLikeListAction ? (
          <button
            type="button"
            onClick={onToggleLike}
            className={actionClass({
              tone: isLiked ? 'success' : 'muted',
              className: 'active:scale-95 transition-all duration-300 ease-in-out',
            })}
          >
            <span key={isLiked ? 'liked' : 'like'} className="flex items-center gap-2">
              <Icon
                icon={isLiked ? 'solar:heart-bold' : 'solar:heart-linear'}
                size={NAV_ACTION_STYLES.icon}
              />
              {isLiked ? 'Liked' : 'Like List'}
            </span>
          </button>
        ) : null}

        {canShowCommentAction ? (
          <button
            type="button"
            onClick={onOpenReviewComposer}
            className={actionClass({ tone: 'muted', className: '' })}
          >
            <Icon
              icon={ownReview ? 'solar:pen-bold' : 'solar:chat-round-bold'}
              size={NAV_ACTION_STYLES.icon}
            />
            {ownReview ? 'Edit Comment' : 'Add Comment'}
          </button>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button
          type="button"
          onClick={() => {
            if (guestMode === 'sign-in' && typeof onSignIn === 'function') {
              onSignIn();
              return;
            }

            window.location.assign(guestHref);
          }}
          className={actionClass()}
        >
          <Icon icon={guestIcon} size={NAV_ACTION_STYLES.icon} />
          {guestLabel}
        </button>
      </div>
    );
  }

  if (isOwner) {
    const showListActions = typeof onEditList === 'function' && typeof onDeleteList === 'function';
    const shouldShowInboxAction =
      canManageRequests && inboxCount > 0 && typeof onOpenInbox === 'function';

    if (!showListActions && !shouldShowInboxAction && !canShowCommentAction) {
      return null;
    }

    return (
      <div className={NAV_ACTION_STYLES.row}>
        {showListActions ? (
          <>
            <button type="button" onClick={() => onEditList?.()} className={actionClass()}>
              <Icon icon="solar:pen-bold" size={NAV_ACTION_STYLES.icon} />
              Edit List
            </button>
            <button
              type="button"
              onClick={() => onDeleteList?.()}
              className={actionClass({ tone: 'danger' })}
            >
              <Icon icon="solar:trash-bin-trash-bold" size={NAV_ACTION_STYLES.icon} />
              Delete List
            </button>
          </>
        ) : null}

        {canShowCommentAction ? (
          <button
            type="button"
            onClick={onOpenReviewComposer}
            className={actionClass({ tone: 'muted', className: '' })}
          >
            <Icon
              icon={ownReview ? 'solar:pen-bold' : 'solar:chat-round-bold'}
              size={NAV_ACTION_STYLES.icon}
            />
            {ownReview ? 'Edit Comment' : 'Add Comment'}
          </button>
        ) : null}

        {shouldShowInboxAction && (
          <button type="button" onClick={onOpenInbox} className={actionClass({ tone: 'info' })}>
            <Icon icon="solar:inbox-bold" size={NAV_ACTION_STYLES.icon} />
            Inbox {inboxCount}
          </button>
        )}
      </div>
    );
  }

  return null;
}


// ============================================================================
// FILE: domains/account/ui/nav-surfaces/account-bio-surface.js
// ============================================================================

'use client';

import { getUserAvatarUrl } from '@/domains/account/utils';

function formatFollowCount(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(value) || 0,
  );
}

export function createAccountBioSurfaceEntry(data = {}, config = {}) {
  const profile = data.profile || null;
  const username = data.username || profile?.username || 'About';
  const avatarUrl = getUserAvatarUrl(profile);
  const followSummary = `${formatFollowCount(data.followingCount)} Following · ${formatFollowCount(data.followerCount)} Followers`;

  return {
    component: AccountBioSurface,
    icon: avatarUrl,
    title: username,
    description: followSummary,
    props: {
      description: data.description || '',
      followerCount: data.followerCount || 0,
      followingCount: data.followingCount || 0,
      profile,
      username,
    },
    ...config,
  };
}

export default function AccountBioSurface({ description = '' }) {
  const normalizedDescription = String(description || '').trim();

  return (
    <div className="bg-white/5 max-h-[min(40dvh,18rem)] w-full overflow-y-auto px-4 py-2">
      {normalizedDescription ? (
        <div className="py-1">
          <p className="text-left text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-line text-white/70">
            {normalizedDescription}
          </p>
        </div>
      ) : null}
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/nav-surfaces/create-list-surface.js
// ============================================================================

'use client';

import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { INFO_ACTION_TONE_CLASS, TMDB_IMG } from '@/shared/constants';
import { useAuth } from '@/modules/auth';
import { getNavActionClass } from '@/ui/primitives/navigation-action-styles';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { useToast } from '@/modules/notification';
import { createUserListWithItems } from '@/domains/media/client/collections/lists';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
import { cn, formatYear } from '@/shared/utils';
import { SEARCH_LIMITS, SEARCH_STYLES, SEARCH_TYPES } from '@/domains/search/utils';
import SearchActionControls from '@/domains/search/ui/nav-actions/search-action/controls';
import { navActionClass } from '@/domains/search/ui/nav-actions/search-action/search-action-helpers';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import { Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

// --- HELPERS ---

function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();
  if (entityType !== 'movie' && entityType !== 'tv') return null;

  const entityId = String(item?.id ?? item?.entityId ?? '').trim();
  const title = String(item?.title || item?.original_title || '').trim();
  const name = String(item?.name || item?.original_name || '').trim();
  if (!entityId || (!title && !name)) return null;

  return {
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,
    entityId,
    entityType,
    genre_ids: Array.isArray(item?.genre_ids)
      ? item.genre_ids
      : Array.isArray(item?.genreIds)
        ? item.genreIds
        : [],
    id: entityId,
    media_type: entityType,
    name,
    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
    poster_path: item?.poster_path || item?.posterPath || null,
    first_air_date: item?.first_air_date || null,
    release_date: item?.release_date || null,
    title: title || name,
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
  };
}

const getDraftMediaKey = (item) =>
  `${item?.entityType || item?.media_type}-${item?.entityId || item?.id}`;
const getItemDisplayTitle = (item) => item?.title || item?.name || 'Untitled';
const getItemYear = (item) => formatYear(item?.release_date || item?.first_air_date);

const LIST_SEARCH_TAB_ITEMS = Object.freeze([
  { key: SEARCH_TYPES.ALL, label: 'All' },
  { key: SEARCH_TYPES.MOVIE, label: 'Movies' },
  { key: SEARCH_TYPES.TV, label: 'TV' },
]);

const SURFACE_LIST_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_FADE_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

const SURFACE_LIST_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_MICRO_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

// --- SUB-COMPONENTS ---

const SearchResultRow = memo(function SearchResultRow({ item, isAdded, onAdd, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <motion.button
      type="button"
      variants={SURFACE_LIST_ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      onClick={() => (isAdded ? onRemove?.(item) : onAdd?.(item))}
      aria-label={isAdded ? `Remove ${title} from list` : `Add ${title} to list`}
      className={cn(
        SEARCH_STYLES.resultItem,
        'group/result w-full gap-2 border text-left active:scale-[0.995]',
        isAdded
          ? 'border-info/20 bg-info/5 hover:border-error/20 hover:bg-error/5'
          : 'border-transparent',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className={SEARCH_STYLES.thumbnail}>
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-white/10"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="truncate leading-tight font-bold uppercase">{title}</span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                SEARCH_STYLES.metaBadge,
                'relative size-6 shrink-0 justify-center text-white/70',
                isAdded
                  ? 'group-hover/result:border-error/20 group-hover/result:bg-error/10 group-hover/result:text-error'
                  : 'group-hover/result:text-white',
              )}
            >
              {isAdded ? (
                <>
                  <Icon
                    icon="solar:check-circle-bold"
                    size={14}
                    className="transition-all duration-300 ease-in-out group-hover/result:opacity-0"
                  />
                  <Icon
                    icon="solar:trash-bin-trash-bold"
                    size={14}
                    className="absolute opacity-0 transition-all duration-300 ease-in-out group-hover/result:opacity-100"
                  />
                </>
              ) : (
                <Icon icon="solar:add-circle-bold" size={14} />
              )}
            </div>
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className={SEARCH_STYLES.metaBadge}>
                <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
});

const DraftItemRow = memo(function DraftItemRow({ item, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <motion.div
      variants={SURFACE_LIST_ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(SEARCH_STYLES.resultItem, 'w-full gap-2 border border-white/5')}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className={SEARCH_STYLES.thumbnail}>
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-white/10"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="truncate leading-tight font-bold uppercase">{title}</span>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={NAV_MICRO_TRANSITION}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className={cn(
                SEARCH_STYLES.metaBadge,
                'hover:border-error/20 hover:bg-error/10 hover:text-error size-6 shrink-0 cursor-pointer justify-center text-white/70 transition-all duration-300 ease-in-out',
              )}
              aria-label={`Remove ${title}`}
            >
              <Icon icon="solar:trash-bin-trash-bold" size={14} />
            </motion.button>
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className={SEARCH_STYLES.metaBadge}>
                <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function ListSearchTabs({ searchType, onSearchTypeChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={NAV_FADE_TRANSITION}
      className="overflow-hidden"
    >
      <div className={cn(SEARCH_STYLES.tabList, 'w-full')}>
        {LIST_SEARCH_TAB_ITEMS.map((item) => {
          const isActive = searchType === item.key;

          return (
            <motion.button
              key={item.key}
              type="button"
              className={cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.tabButton,
                  isActive,
                }),
                'flex-1',
              )}
              onClick={() => onSearchTypeChange?.(item.key)}
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={NAV_MICRO_TRANSITION}
            >
              {item.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// --- MAIN COMPONENT ---

export function createCreateListSurfaceEntry(data = {}, config = {}) {
  return {
    component: CreateListSurface,
    icon: 'solar:folder-open-bold',
    title: 'Create List',
    description: 'Add movies and TV shows to your new list',
    props: { data },
    ...config,
  };
}

export default function CreateListSurface({ close, data }) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftItems, setDraftItems] = useState(() => {
    const normalized = normalizeSearchResult(data?.media);
    return normalized ? [normalized] : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const [searchType, setSearchType] = useState(SEARCH_TYPES.ALL);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = new Set(draftItems.map((item) => getDraftMediaKey(item)));
  const canSubmit = Boolean(draftTitle.trim()) && draftItems.length > 0;
  const showSearchResults =
    searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);
  const filteredSearchResults = useMemo(
    () =>
      searchResults.filter(
        (item) => searchType === SEARCH_TYPES.ALL || item.media_type === searchType,
      ),
    [searchResults, searchType],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSearchResults.length / SEARCH_LIMITS.RESULTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageResults = useMemo(
    () =>
      filteredSearchResults.slice(
        safePage * SEARCH_LIMITS.RESULTS_PER_PAGE,
        safePage * SEARCH_LIMITS.RESULTS_PER_PAGE + SEARCH_LIMITS.RESULTS_PER_PAGE,
      ),
    [filteredSearchResults, safePage],
  );

  useEffect(() => {
    if (!data?.media) return;
    const normalized = normalizeSearchResult(data.media);
    if (!normalized) return;

    setDraftItems((current) => {
      const key = getDraftMediaKey(normalized);
      if (current.some((item) => getDraftMediaKey(item) === key)) return current;
      return [...current, normalized];
    });
  }, [data?.media]);

  useEffect(() => {
    if (deferredSearchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setCurrentPage(0);
      return;
    }

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const [movieRes, tvRes] = await Promise.all([
          TmdbService.searchContent(deferredSearchQuery, 'movie', 1),
          TmdbService.searchContent(deferredSearchQuery, 'tv', 1),
        ]);
        const results = [...(movieRes?.data?.results || []), ...(tvRes?.data?.results || [])]
          .map(normalizeSearchResult)
          .filter(Boolean);

        if (!ignore) {
          startSearchTransition(() => {
            setSearchResults(results);
            setCurrentPage(0);
          });
        }
      } catch {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }, 200);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredSearchQuery, startSearchTransition]);

  const handleAdd = useCallback((item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((curr) =>
      curr.some((x) => getDraftMediaKey(x) === key) ? curr : [...curr, item],
    );
  }, []);

  const handleRemove = useCallback((item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((curr) => curr.filter((x) => getDraftMediaKey(x) !== key));
  }, []);

  const handleSearchQueryChange = useCallback((nextQuery) => {
    setSearchQuery(nextQuery);
    setCurrentPage(0);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentPage(0);
    setSearchType(SEARCH_TYPES.ALL);
  }, []);

  const handleSearchTypeChange = useCallback((nextSearchType) => {
    setSearchType(nextSearchType);
    setCurrentPage(0);
  }, []);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (isSaving || !canSubmit) return;
    if (!auth.user?.id) {
      toast.error('You must be signed in to create a list');
      return;
    }

    setIsSaving(true);
    try {
      const nextList = await createUserListWithItems({
        description: draftDescription,
        items: draftItems,
        title: draftTitle,
        userId: auth.user.id,
      });

      close({ success: true, list: nextList });

      const ownerHandle = nextList?.ownerSnapshot?.username;
      if (ownerHandle && nextList?.slug) {
        router.push(`/account/${ownerHandle}/lists/${nextList.slug}`);
      }
    } catch (error) {
      toast.error(error?.message || 'The list could not be created');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="List title"
            id="list-title"
            value={draftTitle}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => setDraftTitle(e.target.value)}
            onFocus={() => setFocusedField('title')}
            placeholder="Name your list"
            autoFocus
            classNames={{
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
              wrapper: cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.input,
                  isActive: focusedField === 'title',
                }),
                'min-w-0 flex-1',
              ),
            }}
          />
          <Input
            aria-label="List description"
            id="list-description"
            value={draftDescription}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => setDraftDescription(e.target.value)}
            onFocus={() => setFocusedField('description')}
            placeholder="Description (optional)"
            classNames={{
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
              wrapper: cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.input,
                  isActive: focusedField === 'description',
                }),
                'min-w-0 flex-1',
              ),
            }}
          />
        </div>
        <SearchActionControls
          ariaLabel="Search movies or TV shows"
          hasNextPage={safePage < totalPages - 1}
          hasPrevPage={safePage > 0}
          loading={isSearching}
          onClear={handleClearSearch}
          onNextPage={() => setCurrentPage((page) => Math.min(page + 1, totalPages - 1))}
          onPrevPage={() => setCurrentPage((page) => Math.max(page - 1, 0))}
          onQueryChange={handleSearchQueryChange}
          onSearchTypeChange={handleSearchTypeChange}
          placeholder="Search movies or TV shows"
          query={searchQuery}
          searchType={searchType}
          showTabs={false}
        />
      </div>

      {showSearchResults || draftItems.length > 0 ? (
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="max-h-[min(48dvh,20rem)] overflow-y-auto overscroll-contain"
        >
          <AnimatePresence mode="wait" initial={false}>
            {showSearchResults ? (
              <motion.div
                key="search-results"
                variants={SURFACE_LIST_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col gap-2"
              >
                <div className="flex flex-col gap-2">
                  {pageResults.map((item) => (
                    <SearchResultRow
                      key={getDraftMediaKey(item)}
                      item={item}
                      isAdded={selectedKeys.has(getDraftMediaKey(item))}
                      onAdd={handleAdd}
                      onRemove={handleRemove}
                    />
                  ))}
                  {isSearching && searchResults.length === 0 && (
                    <div className="flex h-24 items-center justify-center text-sm font-medium text-white/50">
                      Searching titles...
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="draft-items"
                variants={SURFACE_LIST_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col gap-2"
              >
                {draftItems.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {draftItems.map((item) => (
                      <DraftItemRow
                        key={getDraftMediaKey(item)}
                        item={item}
                        onRemove={handleRemove}
                      />
                    ))}
                  </AnimatePresence>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {searchQuery.trim() ? (
          <ListSearchTabs searchType={searchType} onSearchTypeChange={handleSearchTypeChange} />
        ) : null}
      </AnimatePresence>

      <div className="flex w-full">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !canSubmit}
          className={getNavActionClass({
            variant: INFO_ACTION_TONE_CLASS,
            className: 'flex-1 disabled:cursor-not-allowed disabled:opacity-50',
          })}
        >
          <span>{isSaving ? 'Creating...' : 'Create List'}</span>
        </button>
      </div>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/nav-surfaces/list-editor-surface.js
// ============================================================================

'use client';

import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { INFO_ACTION_TONE_CLASS, TMDB_IMG } from '@/shared/constants';
import { useAuth } from '@/modules/auth';
import { getNavActionClass } from '@/ui/primitives/navigation-action-styles';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { useToast } from '@/modules/notification';
import {
  reorderUserListItems,
  toggleUserListItem,
  updateUserList,
} from '@/domains/media/client/collections/lists';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
import { cn, formatYear } from '@/shared/utils';
import { SEARCH_LIMITS, SEARCH_STYLES, SEARCH_TYPES } from '@/domains/search/utils';
import SearchActionControls from '@/domains/search/ui/nav-actions/search-action/controls';
import { navActionClass } from '@/domains/search/ui/nav-actions/search-action/search-action-helpers';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import { Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

// --- HELPERS ---

function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || item?.entity_type || '')
    .trim()
    .toLowerCase();
  if (entityType !== 'movie' && entityType !== 'tv') return null;

  const entityId = String(item?.id ?? item?.entityId ?? item?.entity_id ?? '').trim();
  const title = String(item?.title || item?.original_title || '').trim();
  const name = String(item?.name || item?.original_name || '').trim();
  if (!entityId || (!title && !name)) return null;

  return {
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,
    entityId,
    entityType,
    genre_ids: Array.isArray(item?.genre_ids)
      ? item.genre_ids
      : Array.isArray(item?.genreIds)
        ? item.genreIds
        : [],
    id: entityId,
    media_type: entityType,
    name,
    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
    poster_path: item?.poster_path || item?.posterPath || item?.coverUrl || null,
    first_air_date: item?.first_air_date || item?.firstAirDate || null,
    release_date: item?.release_date || item?.releaseDate || null,
    title: title || name,
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
  };
}

function normalizeListItem(item = {}) {
  if (!item) return null;
  const entityType =
    String(
      item?.entityType || item?.entity_type || item?.media_type || item?.mediaType || 'movie',
    )
      .trim()
      .toLowerCase() === 'tv'
      ? 'tv'
      : 'movie';
  const rawId = String(
    item?.entityId || item?.entity_id || item?.id || item?.mediaKey || item?.media_key || '',
  ).trim();
  const entityId = rawId.replace(/^(movie|tv)[-_]/, '');
  const title = String(
    item?.title || item?.name || item?.original_title || item?.original_name || '',
  ).trim();
  const name = String(item?.name || item?.original_name || title).trim();
  if (!entityId && !title) return null;

  return {
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,
    entityId: entityId || 'unknown',
    entityType,
    genre_ids: Array.isArray(item?.genre_ids)
      ? item.genre_ids
      : Array.isArray(item?.genreIds)
        ? item.genreIds
        : [],
    id: entityId || 'unknown',
    media_type: entityType,
    name,
    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
    poster_path: item?.poster_path || item?.posterPath || item?.coverUrl || null,
    first_air_date: item?.first_air_date || item?.firstAirDate || null,
    release_date: item?.release_date || item?.releaseDate || null,
    title: title || name || 'Untitled',
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
    mediaKey: `${entityType}_${entityId}`,
    position: Number.isFinite(Number(item?.position)) ? Number(item.position) : null,
  };
}

const getDraftMediaKey = (item) => {
  if (!item) return '';
  const type =
    String(item?.entityType || item?.entity_type || item?.media_type || 'movie')
      .trim()
      .toLowerCase() === 'tv'
      ? 'tv'
      : 'movie';
  const rawId = String(
    item?.entityId || item?.entity_id || item?.id || item?.mediaKey || item?.media_key || '',
  ).trim();
  const cleanId = rawId.replace(/^(movie|tv)[-_]/, '');
  return `${type}_${cleanId}`;
};

const getItemDisplayTitle = (item) => item?.title || item?.name || 'Untitled';
const getItemYear = (item) => formatYear(item?.release_date || item?.first_air_date);

const LIST_SEARCH_TAB_ITEMS = Object.freeze([
  { key: SEARCH_TYPES.ALL, label: 'All' },
  { key: SEARCH_TYPES.MOVIE, label: 'Movies' },
  { key: SEARCH_TYPES.TV, label: 'TV' },
]);

const SURFACE_LIST_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_FADE_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

const SURFACE_LIST_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_MICRO_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

// --- SUB-COMPONENTS ---

const SearchResultRow = memo(function SearchResultRow({ item, isAdded, onAdd, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <motion.button
      type="button"
      variants={SURFACE_LIST_ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      onClick={() => (isAdded ? onRemove?.(item) : onAdd?.(item))}
      aria-label={isAdded ? `Remove ${title} from list` : `Add ${title} to list`}
      className={cn(
        SEARCH_STYLES.resultItem,
        'group/result w-full gap-2 border text-left active:scale-[0.995]',
        isAdded
          ? 'border-info/20 bg-info/5 hover:border-error/20 hover:bg-error/5'
          : 'border-transparent',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className={SEARCH_STYLES.thumbnail}>
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-white/10"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="truncate leading-tight font-bold uppercase">{title}</span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                SEARCH_STYLES.metaBadge,
                'relative size-6 shrink-0 justify-center text-white/70',
                isAdded
                  ? 'group-hover/result:border-error/20 group-hover/result:bg-error/10 group-hover/result:text-error'
                  : 'group-hover/result:text-white',
              )}
            >
              {isAdded ? (
                <>
                  <Icon
                    icon="solar:check-circle-bold"
                    size={14}
                    className="transition-all duration-300 ease-in-out group-hover/result:opacity-0"
                  />
                  <Icon
                    icon="solar:trash-bin-trash-bold"
                    size={14}
                    className="absolute opacity-0 transition-all duration-300 ease-in-out group-hover/result:opacity-100"
                  />
                </>
              ) : (
                <Icon icon="solar:add-circle-bold" size={14} />
              )}
            </div>
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className={SEARCH_STYLES.metaBadge}>
                <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
});

const ListItemRow = memo(function ListItemRow({
  item,
  index,
  isFirst = false,
  isLast = false,
  onMoveUp,
  onMoveDown,
  onRemove,
}) {
  const title = getItemDisplayTitle(item);

  return (
    <motion.div
      variants={SURFACE_LIST_ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(SEARCH_STYLES.resultItem, 'w-full gap-2 border border-white/5')}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className={SEARCH_STYLES.thumbnail}>
          <AdaptiveImage
            mode="img"
            src={item?.poster_path ? `${TMDB_IMG}/w92${item.poster_path}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-white/10"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="truncate leading-tight font-bold uppercase">{title}</span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                SEARCH_STYLES.metaBadge,
                'size-6 shrink-0 justify-center text-white/50',
              )}
            >
              <span className="text-[11px] font-mono font-bold leading-none">{index + 1}</span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={NAV_MICRO_TRANSITION}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(index);
              }}
              disabled={isFirst}
              className={cn(
                SEARCH_STYLES.metaBadge,
                'size-6 shrink-0 cursor-pointer justify-center text-white/70 transition-all duration-300 ease-in-out hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20',
              )}
              aria-label={`Move ${title} up`}
            >
              <Icon icon="solar:arrow-up-linear" size={14} />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={NAV_MICRO_TRANSITION}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(index);
              }}
              disabled={isLast}
              className={cn(
                SEARCH_STYLES.metaBadge,
                'size-6 shrink-0 cursor-pointer justify-center text-white/70 transition-all duration-300 ease-in-out hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20',
              )}
              aria-label={`Move ${title} down`}
            >
              <Icon icon="solar:arrow-down-linear" size={14} />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={NAV_MICRO_TRANSITION}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className={cn(
                SEARCH_STYLES.metaBadge,
                'hover:border-error/20 hover:bg-error/10 hover:text-error size-6 shrink-0 cursor-pointer justify-center text-white/70 transition-all duration-300 ease-in-out',
              )}
              aria-label={`Remove ${title}`}
            >
              <Icon icon="solar:trash-bin-trash-bold" size={14} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function ListSearchTabs({ searchType, onSearchTypeChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={NAV_FADE_TRANSITION}
      className="overflow-hidden"
    >
      <div className={cn(SEARCH_STYLES.tabList, 'w-full')}>
        {LIST_SEARCH_TAB_ITEMS.map((item) => {
          const isActive = searchType === item.key;

          return (
            <motion.button
              key={item.key}
              type="button"
              className={cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.tabButton,
                  isActive,
                }),
                'flex-1',
              )}
              onClick={() => onSearchTypeChange?.(item.key)}
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={NAV_MICRO_TRANSITION}
            >
              {item.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// --- MAIN COMPONENT ---

export function createListEditorSurfaceEntry(data = {}, config = {}) {
  const targetList = data?.initialData || data?.list || {};
  const listTitle = targetList?.title || 'List';

  return {
    component: ListEditorSurface,
    icon: 'solar:pen-bold',
    title: 'Edit List',
    description: `Manage "${listTitle}" and its titles`,
    props: { data },
    ...config,
  };
}

export default function ListEditorSurface({ close, data, ...restProps }) {
  const auth = useAuth();
  const toast = useToast();

  const resolvedData = data || restProps || {};
  const targetList = resolvedData.initialData || resolvedData.list || {};
  const userId = resolvedData.userId || auth.user?.id;
  const isOwner = resolvedData.isOwner ?? true;

  const resolvedInitialItems = useMemo(() => {
    let raw = [];
    if (Array.isArray(resolvedData.initialItems)) raw = resolvedData.initialItems;
    else if (Array.isArray(targetList?.items)) raw = targetList.items;
    else if (Array.isArray(targetList?.previewItems)) raw = targetList.previewItems;
    return raw.map(normalizeListItem).filter(Boolean);
  }, [resolvedData.initialItems, targetList]);

  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState(targetList?.title || '');
  const [draftDescription, setDraftDescription] = useState(targetList?.description || '');
  const [draftItems, setDraftItems] = useState(resolvedInitialItems);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const [searchType, setSearchType] = useState(SEARCH_TYPES.ALL);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = useMemo(
    () => new Set(draftItems.map((item) => getDraftMediaKey(item))),
    [draftItems],
  );
  const canSubmit = Boolean(draftTitle.trim());
  const showSearchResults =
    searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);

  const filteredSearchResults = useMemo(
    () =>
      searchResults.filter(
        (item) => searchType === SEARCH_TYPES.ALL || item.media_type === searchType,
      ),
    [searchResults, searchType],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSearchResults.length / SEARCH_LIMITS.RESULTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageResults = useMemo(
    () =>
      filteredSearchResults.slice(
        safePage * SEARCH_LIMITS.RESULTS_PER_PAGE,
        safePage * SEARCH_LIMITS.RESULTS_PER_PAGE + SEARCH_LIMITS.RESULTS_PER_PAGE,
      ),
    [filteredSearchResults, safePage],
  );

  useEffect(() => {
    if (deferredSearchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setCurrentPage(0);
      return;
    }

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const [movieRes, tvRes] = await Promise.all([
          TmdbService.searchContent(deferredSearchQuery, 'movie', 1),
          TmdbService.searchContent(deferredSearchQuery, 'tv', 1),
        ]);
        const results = [...(movieRes?.data?.results || []), ...(tvRes?.data?.results || [])]
          .map(normalizeSearchResult)
          .filter(Boolean);

        if (!ignore) {
          startSearchTransition(() => {
            setSearchResults(results);
            setCurrentPage(0);
          });
        }
      } catch {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }, 200);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredSearchQuery, startSearchTransition]);

  const handleAdd = useCallback((item) => {
    const normalized = normalizeListItem(item);
    if (!normalized) return;
    const key = getDraftMediaKey(normalized);
    setDraftItems((curr) =>
      curr.some((x) => getDraftMediaKey(x) === key) ? curr : [...curr, normalized],
    );
  }, []);

  const handleRemove = useCallback((item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((curr) => curr.filter((x) => getDraftMediaKey(x) !== key));
  }, []);

  const handleMoveItem = useCallback((index, direction) => {
    setDraftItems((curr) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= curr.length) return curr;
      const next = [...curr];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((item, idx) => ({ ...item, position: idx + 1 }));
    });
  }, []);

  const handleSearchQueryChange = useCallback((nextQuery) => {
    setSearchQuery(nextQuery);
    setCurrentPage(0);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentPage(0);
    setSearchType(SEARCH_TYPES.ALL);
  }, []);

  const handleSearchTypeChange = useCallback((nextSearchType) => {
    setSearchType(nextSearchType);
    setCurrentPage(0);
  }, []);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!isOwner || isSaving || !canSubmit) return;
    const effectiveUserId = userId || auth.user?.id;
    if (!effectiveUserId) {
      toast.error('You must be signed in to edit a list');
      return;
    }
    if (!targetList?.id) {
      toast.error('List ID is missing');
      return;
    }

    setIsSaving(true);
    try {
      const updatedList = await updateUserList({
        description: draftDescription,
        title: draftTitle,
        listId: targetList.id,
        userId: effectiveUserId,
      });

      const initialKeys = new Set(resolvedInitialItems.map((item) => getDraftMediaKey(item)));
      const draftKeys = new Set(draftItems.map((item) => getDraftMediaKey(item)));

      const removedItems = resolvedInitialItems.filter(
        (item) => !draftKeys.has(getDraftMediaKey(item)),
      );
      const addedItems = draftItems.filter(
        (item) => !initialKeys.has(getDraftMediaKey(item)),
      );

      if (removedItems.length > 0) {
        await Promise.all(
          removedItems.map((item) =>
            toggleUserListItem({ listId: targetList.id, media: item, userId: effectiveUserId }),
          ),
        );
      }

      if (addedItems.length > 0) {
        await Promise.all(
          addedItems.map((item) =>
            toggleUserListItem({
              listId: targetList.id,
              media: {
                ...item,
                position:
                  draftItems.findIndex((d) => getDraftMediaKey(d) === getDraftMediaKey(item)) + 1,
              },
              userId: effectiveUserId,
            }),
          ),
        );
      }

      const orderedItems = draftItems.map((item, idx) => ({
        ...item,
        position: idx + 1,
      }));

      if (orderedItems.length > 0) {
        await reorderUserListItems({
          userId: effectiveUserId,
          listId: targetList.id,
          items: orderedItems,
        });
      }

      resolvedData?.onItemsChange?.(orderedItems);
      resolvedData?.onSuccess?.({
        ...targetList,
        ...updatedList,
        itemsCount: orderedItems.length,
        previewItems: orderedItems.slice(0, 5),
      });

      toast.success('List updated successfully.');
      close?.({ success: true, list: updatedList, items: orderedItems });
    } catch (error) {
      toast.error(error?.message || 'The list could not be updated');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="List title"
            id="list-title"
            value={draftTitle}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => setDraftTitle(e.target.value)}
            onFocus={() => setFocusedField('title')}
            placeholder="Name your list"
            autoFocus
            classNames={{
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
              wrapper: cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.input,
                  isActive: focusedField === 'title',
                }),
                'min-w-0 flex-1',
              ),
            }}
          />
          <Input
            aria-label="List description"
            id="list-description"
            value={draftDescription}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => setDraftDescription(e.target.value)}
            onFocus={() => setFocusedField('description')}
            placeholder="Description (optional)"
            classNames={{
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
              wrapper: cn(
                navActionClass({
                  cn,
                  button: SEARCH_STYLES.input,
                  isActive: focusedField === 'description',
                }),
                'min-w-0 flex-1',
              ),
            }}
          />
        </div>
        <SearchActionControls
          ariaLabel="Search movies or TV shows"
          hasNextPage={safePage < totalPages - 1}
          hasPrevPage={safePage > 0}
          loading={isSearching}
          onClear={handleClearSearch}
          onNextPage={() => setCurrentPage((page) => Math.min(page + 1, totalPages - 1))}
          onPrevPage={() => setCurrentPage((page) => Math.max(page - 1, 0))}
          onQueryChange={handleSearchQueryChange}
          onSearchTypeChange={handleSearchTypeChange}
          placeholder="Search movies or TV shows"
          query={searchQuery}
          searchType={searchType}
          showTabs={false}
        />
      </div>

      {showSearchResults || draftItems.length > 0 ? (
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="max-h-[min(48dvh,20rem)] overflow-y-auto overscroll-contain"
        >
          <AnimatePresence mode="wait" initial={false}>
            {showSearchResults ? (
              <motion.div
                key="search-results"
                variants={SURFACE_LIST_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col gap-2"
              >
                <div className="flex flex-col gap-2">
                  {pageResults.map((item) => (
                    <SearchResultRow
                      key={getDraftMediaKey(item)}
                      item={item}
                      isAdded={selectedKeys.has(getDraftMediaKey(item))}
                      onAdd={handleAdd}
                      onRemove={handleRemove}
                    />
                  ))}
                  {isSearching && searchResults.length === 0 && (
                    <div className="flex h-24 items-center justify-center text-sm font-medium text-white/50">
                      Searching titles...
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="draft-items"
                variants={SURFACE_LIST_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col gap-2"
              >
                {draftItems.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {draftItems.map((item, index) => (
                      <ListItemRow
                        key={getDraftMediaKey(item)}
                        index={index}
                        item={item}
                        isFirst={index === 0}
                        isLast={index === draftItems.length - 1}
                        onMoveUp={() => handleMoveItem(index, 'up')}
                        onMoveDown={() => handleMoveItem(index, 'down')}
                        onRemove={handleRemove}
                      />
                    ))}
                  </AnimatePresence>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center gap-2 border border-dashed border-white/10 bg-white/5 text-center">
          <Icon icon="solar:list-broken" size={24} className="text-white/50" />
          <p className="text-xs text-white/50">No titles in this list</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {searchQuery.trim() ? (
          <ListSearchTabs searchType={searchType} onSearchTypeChange={handleSearchTypeChange} />
        ) : null}
      </AnimatePresence>

      <div className="flex w-full">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || !canSubmit}
          className={getNavActionClass({
            variant: INFO_ACTION_TONE_CLASS,
            className: 'flex-1 disabled:cursor-not-allowed disabled:opacity-50',
          })}
        >
          <span>{isSaving ? 'Updating...' : 'Update List'}</span>
        </button>
      </div>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/nav-surfaces/list-picker-surface.js
// ============================================================================

'use client';

import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { INFO_ACTION_TONE_CLASS, TMDB_IMG } from '@/shared/constants';
import { useAuthSessionReady } from '@/modules/auth';
import { useNavigationActions } from '@/modules/nav';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { useToast } from '@/modules/notification';
import {
  getUserListMemberships,
  subscribeToUserLists,
  toggleUserListItem,
} from '@/domains/media/client/collections/lists';
import { cn } from '@/shared/utils';
import { createCreateListSurfaceEntry } from '@/domains/account/ui/nav-surfaces/create-list-surface';
import { getNavActionClass } from '@/ui/primitives/navigation-action-styles';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Icon from '@/ui/primitives/icon';

// --- CONSTANTS & HELPERS ---

const STACK_SKELETON_CLASSES = [
  'skeleton-block',
  'skeleton-block-soft',
  'skeleton-block-soft',
  'skeleton-block-soft',
];

const LIST_SURFACE_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_FADE_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

const LIST_SURFACE_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0, y: 8 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...NAV_MICRO_TRANSITION,
      delay: Math.min(Math.max(index, 0) * 0.04, 0.24),
    },
  }),
  exit: { opacity: 0, y: -4, transition: NAV_MICRO_TRANSITION },
});

function getPreviewImage(item) {
  return (
    getPreferredMoviePosterSrc(item, 'w342') ||
    item?.poster_path_full ||
    (item?.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null)
  );
}

function getChangedListIds(lists, initialMemberships, draftMemberships) {
  return lists
    .map((list) => list.id)
    .filter((id) => Boolean(initialMemberships[id]) !== Boolean(draftMemberships[id]));
}

function handleListWheel(event) {
  const listViewport = event.currentTarget;

  if (listViewport.scrollHeight <= listViewport.clientHeight) return;

  event.preventDefault();
  event.stopPropagation();

  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

// --- SUB-COMPONENTS ---

const ListPreviewStack = memo(function ListPreviewStack({ list }) {
  usePosterPreferenceVersion();
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  if (previewItems.length === 0) {
    return (
      <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] border border-dashed border-white/10 bg-black text-white/50">
        <Icon icon="solar:list-bold" size={20} />
      </div>
    );
  }

  return (
    <div className="relative h-[68px] w-[82px] shrink-0">
      {previewItems.map((item, index) => {
        const imageSrc = getPreviewImage(item);
        return (
          <div
            key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
            className="border-primary absolute bottom-0 overflow-hidden border bg-black"
            style={{
              width: '46px',
              height: `${68 - index * 6}px`,
              left: `${index * 12}px`,
              zIndex: previewItems.length - index,
            }}
          >
            {imageSrc ? (
              <AdaptiveImage
                mode="img"
                src={imageSrc}
                alt={item.title || item.name || 'Poster'}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full "
              />
            ) : (
              <div className="center h-full w-full bg-white/5 text-white/50">
                <Icon icon="solar:gallery-wide-bold" size={16} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

const ListRow = memo(function ListRow({ list, isSelected, onToggle, index }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      variants={LIST_SURFACE_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: NAV_TAP_SCALE }}
      className={cn(
        'group flex w-full items-center gap-2 border p-3 text-left transition-all duration-300 ease-in-out',
        isSelected
          ? 'border-white/10 bg-white/5'
          : 'border-white/5 hover:border-white/10 hover:bg-white/5',
      )}
    >
      <ListPreviewStack list={list} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{list.title}</p>
        {list.description && (
          <p className="line-clamp-2 text-sm leading-snug text-white/70">{list.description}</p>
        )}
      </div>

      <span
        className={cn(
          'flex size-[22px] shrink-0 items-center justify-center border',
          isSelected
            ? 'border-info bg-info text-primary'
            : 'border-white/5 text-white/50 group-hover:border-white/50 group-hover:text-white/70',
        )}
      >
        <Icon icon="material-symbols:check-rounded" size={16} />
      </span>
    </motion.button>
  );
});

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="flex h-24 items-center gap-2 border border-white/5 p-3"
        >
          <div className="relative h-[68px] w-[82px] shrink-0">
            {[0, 1, 2, 3].map((stackIndex) => (
              <div
                key={`stack-${index}-${stackIndex}`}
                className={cn(
                  'absolute bottom-0 overflow-hidden border border-white/5',
                  STACK_SKELETON_CLASSES[stackIndex] || 'skeleton-block-soft',
                )}
                style={{
                  position: 'absolute',
                  width: '46px',
                  height: `${68 - stackIndex * 6}px`,
                  left: `${stackIndex * 12}px`,
                  zIndex: 4 - stackIndex,
                }}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="skeleton-block h-4 w-2/5" />
            <div className="skeleton-block-soft h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- MAIN COMPONENT ---

export function createListPickerSurfaceEntry(data = {}, config = {}) {
  return {
    component: ListPickerSurface,
    icon: 'solar:folder-open-bold',
    title: 'Your Lists',
    description: 'Choose lists for this title',
    props: { data },
    ...config,
  };
}

export default function ListPickerSurface({ close, data }) {
  const { openSurface } = useNavigationActions();
  const toast = useToast();
  const userId = data?.userId ?? null;
  const media = data?.media ?? null;
  const isAuthSessionReady = useAuthSessionReady(userId);

  const [lists, setLists] = useState([]);
  const [initialMemberships, setInitialMemberships] = useState({});
  const [draftMemberships, setDraftMemberships] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  const pendingListIds = getChangedListIds(lists, initialMemberships, draftMemberships);
  const hasPendingChanges = pendingListIds.length > 0;

  useEffect(() => {
    if (!userId || !isAuthSessionReady) {
      setLists([]);
      setIsLoading(!isAuthSessionReady && Boolean(userId));
      return;
    }

    setIsLoading(true);
    return subscribeToUserLists(
      userId,
      (nextLists) => {
        setLists(Array.isArray(nextLists) ? nextLists : []);
        setIsLoading(false);
      },
      {
        onError: (error) => {
          setLists([]);
          setIsLoading(false);
          toast.error(error?.message || 'Lists are temporarily unavailable');
        },
      },
    );
  }, [userId, isAuthSessionReady, toast]);

  useEffect(() => {
    let cancelled = false;
    async function loadMemberships() {
      if (!userId || !isAuthSessionReady || !media || lists.length === 0) {
        setInitialMemberships({});
        setDraftMemberships({});
        return;
      }
      try {
        const memberships = await getUserListMemberships({
          userId,
          media,
          listIds: lists.map((l) => l.id),
        });
        if (!cancelled) {
          setInitialMemberships(memberships);
          setDraftMemberships(memberships);
        }
      } catch (error) {
        if (!cancelled) toast.error(error?.message || 'List memberships could not be loaded');
      }
    }
    loadMemberships();
    return () => {
      cancelled = true;
    };
  }, [userId, isAuthSessionReady, media, lists, toast]);

  const handleOpenCreator = () => {
    openSurface(createCreateListSurfaceEntry({ media }));
  };
  const handleToggleDraft = (listId) =>
    setDraftMemberships((prev) => ({ ...prev, [listId]: !prev[listId] }));

  const handleApplyChanges = async () => {
    if (isApplying || !userId || !media || !hasPendingChanges) return;
    setIsApplying(true);

    const nextMemberships = { ...initialMemberships };
    const successfulListIds = [];
    const failedListTitles = [];

    for (const listId of pendingListIds) {
      const targetState = Boolean(draftMemberships[listId]);
      const targetList = lists.find((l) => l.id === listId);
      try {
        let result = await toggleUserListItem({ listId, media, userId });
        let resolvedState = Boolean(result?.isInList);

        if (resolvedState !== targetState) {
          result = await toggleUserListItem({ listId, media, userId });
          resolvedState = Boolean(result?.isInList);
        }

        if (resolvedState !== targetState) {
          failedListTitles.push(targetList?.title || 'Untitled list');
          continue;
        }

        nextMemberships[listId] = resolvedState;
        successfulListIds.push(listId);
      } catch {
        failedListTitles.push(targetList?.title || 'Untitled list');
      }
    }

    setInitialMemberships(nextMemberships);
    setDraftMemberships((prev) => {
      const next = { ...prev };
      successfulListIds.forEach((id) => {
        next[id] = nextMemberships[id];
      });
      return next;
    });
    setIsApplying(false);

    if (failedListTitles.length > 0) {
      if (successfulListIds.length > 0) {
        toast.warning(
          `${successfulListIds.length} changes applied, ${failedListTitles.length} failed.`,
        );
      } else {
        toast.error('Changes could not be applied. Please try again.');
      }
      return;
    }

    toast.success('Lists updated successfully.');
    close({
      memberships: nextMemberships,
      selectedListIds: Object.keys(nextMemberships).filter((id) => Boolean(nextMemberships[id])),
    });
  };

  return (
    <div className="flex max-h-[min(72dvh,40rem)] w-full flex-col gap-2 overflow-hidden">
      <motion.div
        variants={LIST_SURFACE_VARIANTS}
        initial="hidden"
        animate="visible"
        className={cn(
          'min-h-0 overflow-y-auto overscroll-y-contain',
          (isLoading || lists.length > 4) && 'h-[400px] shrink-0',
        )}
        onWheel={handleListWheel}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : lists.length === 0 ? (
          <div className="center min-h-52 flex-col gap-2 text-center">
            <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">
              No lists yet
            </p>
            <p className="text-sm text-white/70">Create your first list with the button above.</p>
          </div>
        ) : (
          <motion.div
            variants={LIST_SURFACE_VARIANTS}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2 overflow-visible"
          >
            {lists.map((list, index) => (
              <ListRow
                key={list.id}
                index={index}
                list={list}
                isSelected={Boolean(draftMemberships[list.id])}
                onToggle={() => handleToggleDraft(list.id)}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={handleOpenCreator}
          disabled={isApplying}
          className={getNavActionClass({ className: 'w-full' })}
        >
          <span>Create List</span>
        </button>
        <button
          type="button"
          onClick={handleApplyChanges}
          disabled={isApplying || !hasPendingChanges}
          className={getNavActionClass({
            variant: INFO_ACTION_TONE_CLASS,
            className: 'w-full disabled:cursor-not-allowed disabled:opacity-50',
          })}
        >
          {isApplying ? 'Applying' : 'Apply changes'}
        </button>
      </div>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/pages/account-route-page.js
// ============================================================================

export function createAccountRoutePage(Client, loadRouteData, options = null) {
  return async function Page(props = {}) {
    const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
    const resolvedParams = params || null;
    const resolvedSearchParams = searchParams || null;

    if (typeof options?.beforeLoad === 'function') {
      await options.beforeLoad(resolvedParams, resolvedSearchParams);
    }

    const routeData = await loadRouteData(
      resolvedParams?.username,
      typeof options === 'function'
        ? await options(resolvedSearchParams, resolvedParams)
        : options?.resolveOptions
          ? await options.resolveOptions(resolvedSearchParams, resolvedParams)
          : undefined,
    );

    return <Client routeData={routeData} />;
  };
}


// ============================================================================
// FILE: domains/account/ui/sections/account-hero.js
// ============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, resolveVersionedImageUrl } from '@/shared/utils';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/utils';
import Link from 'next/link';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import { useModal } from '@/modules/modal';
import { useAuth } from '@/modules/auth';
function formatHeroCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function createHeroCollectionMetaItem(count, singular, plural = `${singular}s`, options = {}) {
  const safeCount = Number(count) || 0;
  return {
    ...options,
    label: safeCount === 1 ? singular : plural,
    value: formatHeroCount(safeCount),
  };
}

function HeroInlineMetric({
  item,
  className = '',
  labelClassName = '',
  valueClassName = '',
  index = 0,
}) {
  const content = (
    <>
      <span className={valueClassName}>{item.value}</span>
      <span className={labelClassName}>{item.label}</span>
    </>
  );
  const wrapperClassName = cn(className, (item.href || typeof item.onClick === 'function') && '');
  if (item.href) {
    return (
      <Link href={item.href} className={wrapperClassName}>
        {content}
      </Link>
    );
  }
  if (typeof item.onClick === 'function') {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={cn('cursor-pointer border-0 bg-transparent p-0 text-left', wrapperClassName)}
      >
        {content}
      </button>
    );
  }
  return <span className={wrapperClassName}>{content}</span>;
}

function HeroBioPreview({ description, onReadMore }) {
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const shouldShowReadMore = isOverflowing && typeof onReadMore === 'function';

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement || !description) {
      setIsOverflowing(false);
      return;
    }
    const updateOverflowState = () => {
      setIsOverflowing(textElement.scrollHeight > textElement.clientHeight + 1);
    };
    updateOverflowState();
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateOverflowState).catch(() => {});
    }
    if (typeof ResizeObserver !== 'function') {
      return;
    }
    const observer = new ResizeObserver(updateOverflowState);
    observer.observe(textElement);
    return () => observer.disconnect();
  }, [description]);

  if (!description) {
    return null;
  }

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col items-center gap-2 text-center">
      <p
        ref={textRef}
        className="line-clamp-3 w-full max-w-full min-w-0 text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-line text-white/70 sm:text-base sm:leading-7"
      >
        {description}
      </p>

      {shouldShowReadMore ? (
        <button
          className="mt-1 cursor-pointer text-[11px] font-semibold tracking-widest text-white/70 uppercase transition-all duration-300 ease-in-out hover:scale-[1.02] hover:text-white active:scale-[0.97]"
          type="button"
          onClick={onReadMore}
        >
          Read More
        </button>
      ) : null}
    </div>
  );
}

export default function AccountHero({
  likesCount = 0,
  followerCount = 0,
  followingCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  onReadMore,
  profile = null,
  watchedCount = null,
  watchlistCount = 0,
}) {
  const auth = useAuth();
  const { openModal } = useModal();
  const heroDisplayName = String(profile?.displayName || '').trim() || 'Account';
  const resolvedWatchedCount =
    watchedCount !== null && watchedCount !== undefined && Number.isFinite(Number(watchedCount))
      ? Number(watchedCount)
      : Number(profile?.watchedCount || 0);

  const handleFollowListClick = (type) => {
    if (typeof onOpenFollowList === 'function') {
      onOpenFollowList(type);
      return;
    }
    const targetUserId = profile?.id;
    if (!targetUserId) return;
    openModal(
      'ACCOUNT_SOCIAL_MODAL',
      { desktop: 'center', mobile: 'bottom' },
      {
        data: {
          canManageRequests: Boolean(auth.user?.id === targetUserId && profile?.isPrivate),
          userId: targetUserId,
          tab: type,
        },
      },
    );
  };

  const heroCountItems = [
    createHeroCollectionMetaItem(watchlistCount, 'Watchlist', 'Watchlist', {
      href: profile?.username ? `/account/${profile.username}/watchlist` : null,
    }),
    createHeroCollectionMetaItem(resolvedWatchedCount, 'Watched', 'Watched', {
      href: profile?.username ? `/account/${profile.username}/watched` : null,
    }),
    createHeroCollectionMetaItem(listsCount, 'List', 'Lists', {
      href: profile?.username ? `/account/${profile.username}/lists` : null,
    }),
    createHeroCollectionMetaItem(likesCount, 'Like', 'Likes', {
      href: profile?.username ? `/account/${profile.username}/likes` : null,
    }),
  ].filter(Boolean);

  const heroStats = [
    {
      label: 'Following',
      onClick: () => handleFollowListClick('following'),
      value: followingCount,
    },
    {
      label: 'Followers',
      onClick: () => handleFollowListClick('followers'),
      value: followerCount,
    },
  ];

  const allHeroMetrics = [...heroCountItems, ...heroStats].map((item) => ({
    ...item,
    value: formatHeroCount(item.value),
  }));

  const heroAvatarSrc = getUserAvatarUrl(profile);
  const heroAvatarFallbackSrc = getUserAvatarFallbackUrl(profile);

  return (
    <section className="relative flex w-full flex-col items-center gap-5 py-2 text-center sm:gap-7 sm:py-4 lg:gap-8">
      {/* Avatar & Title Row */}
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <div className="group relative h-12 w-12 shrink-0 overflow-hidden bg-black/40 backdrop-blur-md sm:h-16 sm:w-16 lg:h-20 lg:w-20">
          <AdaptiveImage
            mode="img"
            className="h-full w-full object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
            src={heroAvatarSrc}
            alt={heroDisplayName}
            decoding="async"
            onError={(event) => applyAvatarFallback(event, heroAvatarFallbackSrc)}
            wrapperClassName="h-full w-full "
          />
        </div>

        <h1 className="font-zuume max-w-full text-left text-5xl leading-none font-bold [overflow-wrap:anywhere] text-white uppercase sm:text-7xl lg:text-8xl">
          {heroDisplayName}
        </h1>
      </div>

      {/* Plain Text Stats Under Title */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-2 text-sm sm:text-base">
        {allHeroMetrics.map((item, index) => (
          <HeroInlineMetric
            key={`${item.label}-${item.value}-${index}`}
            item={item}
            index={index}
            className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-white/80 hover:text-white"
            valueClassName="font-semibold text-white leading-none tracking-tight"
            labelClassName="text-white/70 leading-none"
          />
        ))}
      </div>

      {/* Biography */}
      {profile?.description ? (
        <div className="mx-auto w-full max-w-[72ch] min-w-0 px-4">
          <HeroBioPreview description={profile.description} onReadMore={onReadMore} />
        </div>
      ) : null}
    </section>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/account-section-factory.js
// ============================================================================

'use client';

import { useState } from 'react';

import { useRegistry } from '@/modules/registry';
import { useAuth } from '@/modules/auth';
import SearchAction from '@/domains/search/ui/nav-actions/search-action';
import { useAccountProfileShell } from '@/domains/account/ui/layouts/account-profile-context';
import { buildAccountRegistryState } from '../../hooks/account-registry-state';
import {
  AccountSectionStateProvider,
  useAccountSectionEngine,
  useAccountSectionState,
} from '../../hooks/account-section-state';

const EMPTY_SECTION_CLIENT_STATE = Object.freeze({});

function useEmptySectionClientState() {
  return EMPTY_SECTION_CLIENT_STATE;
}

export function createAccountSectionRegistry({
  displayName = 'AccountSectionRegistry',
  navDescription = null,
  navRegistrySource,
  resolveOverrides = null,
}) {
  function AccountSectionRegistry(props) {
    const sectionState = useAccountSectionState();
    const profileShell = useAccountProfileShell();
    const [isSearching, setIsSearching] = useState(false);
    const stableSectionState = profileShell
      ? {
          ...sectionState,
          profile: sectionState.profile || profileShell.profile,
          username: sectionState.username || profileShell.username,
        }
      : sectionState;
    const resolvedOverrides = resolveOverrides ? resolveOverrides(stableSectionState, props) : null;

    useRegistry(
      buildAccountRegistryState(stableSectionState, {
        isPageLoading: props.isPageLoading ?? stableSectionState.isPageLoading,
        navDescription:
          typeof navDescription === 'function'
            ? navDescription(stableSectionState, props)
            : (navDescription ?? stableSectionState.navDescription),
        navRegistrySource,
        ...(resolvedOverrides || {}),
        extraNavActions: [
          ...(Array.isArray(resolvedOverrides?.extraNavActions)
            ? resolvedOverrides.extraNavActions
            : []),
          {
            key: 'search-overlay',
            tooltip: 'Search',
            icon: isSearching ? 'material-symbols:close-rounded' : 'solar:magnifer-linear',
            order: 30,
            onClick: (event) => {
              event.stopPropagation();
              setIsSearching((value) => !value);
            },
          },
        ],
        navActionOverride: isSearching ? (
          <SearchAction />
        ) : (
          (resolvedOverrides?.navActionOverride ?? null)
        ),
        showToolbarFollowActionWithOverride: isSearching
          ? false
          : resolvedOverrides?.showToolbarFollowActionWithOverride,
      }),
    );

    return null;
  }

  AccountSectionRegistry.displayName = displayName;
  return AccountSectionRegistry;
}

export function createAccountSectionView({
  activeSection,
  displayName = 'AccountSectionView',
  Registry,
  renderContent,
  resolveRegistryProps = null,
  skeletonVariant = 'overview',
}) {
  function AccountSectionView(props) {
    const sectionState = useAccountSectionState();
    const registryProps = resolveRegistryProps
      ? resolveRegistryProps(sectionState, props)
      : undefined;

    return (
      <>
        <Registry {...registryProps} />
        {renderContent(sectionState, props)}
      </>
    );
  }

  AccountSectionView.displayName = displayName;
  return AccountSectionView;
}

export function createAccountSectionClient({
  activeTab,
  displayName = 'AccountSectionClient',
  View,
  useSectionClientState = null,
}) {
  function AccountSectionClient({ routeData = null }) {
    const auth = useAuth();
    const useResolvedSectionClientState = useSectionClientState ?? useEmptySectionClientState;
    const sectionEngine = useAccountSectionEngine({
      activeTab,
      auth,
      routeData,
    });
    const sectionClientState = useResolvedSectionClientState({
      auth,
      routeData: sectionEngine.routeData,
      sectionProviderValue: sectionEngine.sectionProviderValue,
      sectionState: sectionEngine.sectionState,
    });
    const { providerValue = sectionEngine.sectionProviderValue, ...viewProps } =
      sectionClientState || EMPTY_SECTION_CLIENT_STATE;

    return (
      <AccountSectionStateProvider value={providerValue}>
        <View {...viewProps} />
      </AccountSectionStateProvider>
    );
  }

  AccountSectionClient.displayName = displayName;
  return AccountSectionClient;
}


// ============================================================================
// FILE: domains/account/ui/sections/account-section.js
// ============================================================================

'use client';

import { GridShellCrosshairs } from '@/ui/layout/grid-crosshair';
import Link from 'next/link';
import { normalizeFeedbackContent, cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';
import { ACCOUNT_SECTION_SHELL_CLASS } from '@/shared/constants';
import {
  PosterCardsSkeletonRow,
  ListCardsSkeletonGrid,
  ActivityItemsSkeletonList,
  ReviewCardsSkeletonList,
} from '@/domains/account/ui/skeletons/account-section-skeletons';

export const ACCOUNT_SECTION_HORIZONTAL_PADDING_CLASS = 'px-4';
export const ACCOUNT_SECTION_HEADER_PADDING_CLASS = `min-h-14 ${ACCOUNT_SECTION_HORIZONTAL_PADDING_CLASS}`;
export const ACCOUNT_SECTION_CONTENT_PADDING_CLASS = 'p-6';
export const ACCOUNT_SECTION_TOOLBAR_PADDING_CLASS = `${ACCOUNT_SECTION_HORIZONTAL_PADDING_CLASS} min-h-14 flex items-center`;
export const ACCOUNT_SECTION_PAGINATION_CLASS = 'mt-6 flex justify-center';
const ACCOUNT_SECTION_BORDER_CLASS = 'border-white/10';

export const ACCOUNT_EMPTY_SECTION_CLASS =
  'center min-h-24 w-full  border border-white/5 p-6 text-center text-xs sm:text-sm font-semibold tracking-wider text-white/50 uppercase';

export function AccountInlineSectionState({ children, className = '' }) {
  return (
    <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>
      {normalizeFeedbackContent(children)}
    </div>
  );
}

export function AccountInlineSectionLoading({ variant = 'poster', wideGrid = true }) {
  if (variant === 'list') {
    return <ListCardsSkeletonGrid count={6} />;
  }
  if (variant === 'activity') {
    return <ActivityItemsSkeletonList count={6} />;
  }
  if (variant === 'review') {
    return <ReviewCardsSkeletonList count={6} />;
  }
  return <PosterCardsSkeletonRow count={6} wideGrid={wideGrid} />;
}

export function AccountSectionHeading({
  action = null,
  className = '',
  icon,
  isInitialSection = true,
  showDivider = true,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  const titleClassName = 'min-w-0 text-xs font-semibold tracking-widest uppercase text-white/70';
  const summaryClassName = 'text-xs font-semibold tracking-widest text-white/50 uppercase';
  const TitleWrapper = titleHref ? Link : 'h2';
  return (
    <div className={cn('relative flex w-full flex-col', className)}>
      <div
        className={cn(
          'flex w-full items-center justify-between gap-4',
          ACCOUNT_SECTION_HEADER_PADDING_CLASS,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon && <Icon icon={icon} size={24} className="text-white/70" />}
          <TitleWrapper href={titleHref} className={titleClassName}>
            {title}
          </TitleWrapper>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right">
          {summaryLabel &&
            (titleHref ? (
              <Link href={titleHref} className={summaryClassName}>
                {summaryLabel}
              </Link>
            ) : (
              <p className={summaryClassName}>{summaryLabel}</p>
            ))}
          {action}
          {showSeeMore && titleHref && (
            <Link href={titleHref} className={summaryClassName}>
              See more
            </Link>
          )}
        </div>
      </div>
      {showDivider && (
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
      )}
    </div>
  );
}

export function AccountSectionBand({ children, className = '', isInitialSection = true }) {
  return (
    <div className={cn('relative w-full', className)}>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
        <GridShellCrosshairs />
      </div>
      {children}
    </div>
  );
}

export function AccountSectionState({ message, isInitialSection = true }) {
  return (
    <section className="relative bg-transparent">
      <div className={cn(ACCOUNT_SECTION_SHELL_CLASS, 'relative')}>
        <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
        <div className={ACCOUNT_SECTION_CONTENT_PADDING_CLASS}>
          <div className={ACCOUNT_EMPTY_SECTION_CLASS}>{normalizeFeedbackContent(message)}</div>
        </div>
      </div>
    </section>
  );
}

export default function AccountSectionLayout({
  action = null,
  children,
  className = '',
  contentClassName = '',
  icon,
  isInitialSection = true,
  revealDelay = 0,
  showHeader = true,
  showDivider = true,
  showSeeMore = false,
  showTopRule = true,
  summaryLabel = null,
  title,
  contentPaddingClassName = ACCOUNT_SECTION_CONTENT_PADDING_CLASS,
  titleHref = null,
  toolbar = null,
  toolbarPaddingClassName = ACCOUNT_SECTION_TOOLBAR_PADDING_CLASS,
  toolbarClassName = '',
}) {
  return (
    <section className="relative bg-transparent">
      <div className={cn(ACCOUNT_SECTION_SHELL_CLASS, 'relative', className)}>
        {showTopRule && (
          <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
            <GridShellCrosshairs />
          </div>
        )}
        {showHeader ? (
          <AccountSectionHeading
            action={action}
            icon={icon}
            isInitialSection={isInitialSection}
            showDivider={showDivider}
            showSeeMore={showSeeMore}
            summaryLabel={summaryLabel}
            title={title}
            titleHref={titleHref}
          />
        ) : (
          title && <h2 className="sr-only">{title}</h2>
        )}

        {toolbar ? (
          <AccountSectionBand
            isInitialSection={isInitialSection}
            className={cn(toolbarPaddingClassName, toolbarClassName)}
          >
            <div className="w-full">{toolbar}</div>
          </AccountSectionBand>
        ) : null}

        <div className={cn(contentPaddingClassName, contentClassName)}>{children}</div>
      </div>
    </section>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/collections/likes-collection.js
// ============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LIST_FILTER_QUERY_KEYS,
  MEDIA_FILTER_QUERY_KEYS,
  applyMediaFilters,
  buildCollectionBasePath,
  buildManagedQueryString,
  buildMediaKeySet,
  collectMediaGenreOptions,
  getDecadeOptions,
  hasActiveListFilters,
  hasActiveMediaFilters,
  parseListFilters,
  parseMediaFilters,
  parsePageFromSearch,
  sortProfileLists,
  toListQueryValues,
  toMediaQueryValues,
} from '@/domains/account/ui/filters/filtering';
import AccountPaginatedListGrid from '@/domains/account/ui/components/lists/list-grid';
import { getMediaTitle as getAccountMediaTitle } from '@/domains/account/utils';
import {
  AccountListSortBar,
  AccountMediaFilterBar,
} from '@/domains/account/ui/filters/content-filter-primitives';
import { AccountInlineSectionState } from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout, {
  AccountSectionState,
} from '@/domains/account/ui/sections/account-section';
import AccountMediaGridPage, {
  ProfileMediaActions,
} from '@/domains/account/ui/components/account-media-grid';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import AccountReviewsFeed from '../feeds/reviews';
import { Reorder } from 'framer-motion';
import MediaCard from '@/domains/media/ui/components/media-card';
import { toAccountMediaCard, getCanonicalMediaKey } from '@/domains/account/utils/media-card';
const LIKES_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'hide_unreleased',
    label: 'Hide unreleased titles',
  }),
  Object.freeze({
    key: 'hide_documentaries',
    label: 'Hide documentaries',
  }),
]);
const LIKES_ALLOWED_EYE_FLAGS = LIKES_VISIBILITY_OPTIONS.map((o) => o.key);
const parseLikesMediaFilters = (search) =>
  parseMediaFilters(search, {
    allowedEyeFlags: LIKES_ALLOWED_EYE_FLAGS,
  });
const getDefaultFilters = () => ({
  media: parseLikesMediaFilters(new URLSearchParams()),
  listSort: parseListFilters(new URLSearchParams()).sort,
});
export default function AccountLikesFeed({
  activeSegment,
  auth,
  canShowLikesGrid,
  favoriteShowcase,
  handleLike,
  handleRequestRemoveLike,
  handleToggleShowcase,
  hasMoreReviews = false,
  isLikedListsLoading,
  isLikesLoading = false,
  isOwner,
  isReviewsLoading,
  isReviewsLoadingMore = false,
  isShowcaseSaving,
  likedLists,
  likedListsError,
  loadReviews = null,
  likes,
  onReorderShowcase,
  onRemoveShowcaseItem,
  persistShowcase,
  reviews,
  reviewsTotalCount,
  reviewsError,
  showcaseMap,
  watchedItems,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);

  const [viewState, setViewState] = useState({
    media: parseLikesMediaFilters(new URLSearchParams(searchString)),
    listSort: parseListFilters(new URLSearchParams(searchString)).sort,
    page: parsePageFromSearch(new URLSearchParams(searchString)),
  });
  useEffect(() => {
    setViewState({
      media: parseLikesMediaFilters(new URLSearchParams(searchString)),
      listSort: parseListFilters(new URLSearchParams(searchString)).sort,
      page: parsePageFromSearch(new URLSearchParams(searchString)),
    });
  }, [searchString]);

  const updateView = (updates) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: MEDIA_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toMediaQueryValues(viewState.media),
    });
    qs = buildManagedQueryString(new URLSearchParams(qs), {
      managedKeys: LIST_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toListQueryValues({
        sort: viewState.listSort,
      }),
    });
    const params = new URLSearchParams(qs);
    if (viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');
    const newUrl = params.toString()
      ? `${collectionRootPath}?${params.toString()}`
      : collectionRootPath;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [viewState, collectionRootPath]);

  const decadeOptions = getDecadeOptions();
  const genreOptions = useMemo(() => collectMediaGenreOptions(likes), [likes]);
  const likedKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const filteredLikes = useMemo(
    () =>
      applyMediaFilters(likes, viewState.media, {
        likedKeys,
      }),
    [likedKeys, likes, viewState.media],
  );
  const sortedLikedLists = useMemo(
    () => sortProfileLists(likedLists, viewState.listSort),
    [likedLists, viewState.listSort],
  );
  const hasMediaFilters = hasActiveMediaFilters(viewState.media);
  const hasListFilters = hasActiveListFilters({
    sort: viewState.listSort,
  });
  if (!canShowLikesGrid) return <AccountSectionState message="This profile is private." />;
  const hasLikes = Array.isArray(likes) && likes.length > 0;
  return (
    <>
      {isOwner && activeSegment === 'titles' && (hasLikes || isLikesLoading) && (
        <FavoriteShowcaseManager
          items={favoriteShowcase}
          isOwner={isOwner}
          onRemoveItem={onRemoveShowcaseItem || handleToggleShowcase}
          onReorder={onReorderShowcase || persistShowcase}
          userId={auth?.user?.id}
        />
      )}

      {activeSegment === 'titles' && (
        <AccountMediaGridPage
          currentPage={viewState.page}
          emptyMessage="No liked titles yet"
          icon="solar:heart-bold"
          isLoading={isLikesLoading}
          items={filteredLikes}
          onPageChange={(page) =>
            updateView({
              page,
            })
          }
          pageBasePath={collectionRootPath}
          showHeader={false}
          renderOverlay={(item) =>
            isOwner ? (
              <ProfileMediaActions
                extraActions={[
                  {
                    disabled:
                      !showcaseMap.has(getCanonicalMediaKey(item)) && favoriteShowcase.length >= 5,
                    icon: showcaseMap.has(getCanonicalMediaKey(item))
                      ? 'solar:star-bold'
                      : 'solar:star-linear',
                    label: showcaseMap.has(getCanonicalMediaKey(item))
                      ? 'Remove from favorites showcase'
                      : 'Add to favorites showcase',
                    onClick: handleToggleShowcase,
                  },
                ]}
                item={item}
                onRemoveItem={handleRequestRemoveLike}
                removeLabel={`Remove ${item.title || item.name} from likes`}
                currentUserId={auth.user?.id}
              />
            ) : null
          }
          toolbar={
            likes.length > 0 || hasMediaFilters ? (
              <AccountMediaFilterBar
                filters={viewState.media}
                decadeOptions={decadeOptions}
                genreOptions={genreOptions}
                visibilityOptions={LIKES_VISIBILITY_OPTIONS}
                onChange={(media) =>
                  updateView({
                    media: {
                      ...viewState.media,
                      ...media,
                    },
                    page: 1,
                  })
                }
                onReset={
                  hasMediaFilters
                    ? () =>
                        updateView({
                          media: getDefaultFilters().media,
                          page: 1,
                        })
                    : null
                }
              />
            ) : null
          }
          title="Titles"
        />
      )}

      {activeSegment === 'reviews' && (
        <AccountReviewsFeed
          currentUserId={auth.user?.id}
          emptyMessage="No liked reviews yet"
          icon="solar:chat-round-bold"
          hasMore={hasMoreReviews}
          isLoading={isReviewsLoading}
          isLoadingMore={isReviewsLoadingMore}
          items={reviews}
          loadError={reviewsError}
          onLike={handleLike}
          onLoadMore={hasMoreReviews ? () => loadReviews?.({ append: true }) : null}
          showOwnActions={false}
          showHeader={false}
          summaryLabel={
            Number.isFinite(Number(reviewsTotalCount))
              ? `${Number(reviewsTotalCount)} Reviews`
              : null
          }
          title="Reviews"
          watchedItems={watchedItems}
        />
      )}

      {activeSegment !== 'titles' && activeSegment !== 'reviews' && (
        <AccountPaginatedListGrid
          currentPage={viewState.page}
          emptyMessage="No liked lists yet"
          icon="solar:list-broken"
          isLoading={isLikedListsLoading}
          lists={sortedLikedLists}
          loadError={likedListsError}
          onPageChange={(page) =>
            updateView({
              page,
            })
          }
          pageBasePath={collectionRootPath}
          showHeader={false}
          title="Lists"
          toolbar={
            sortedLikedLists.length > 0 ? (
              <AccountListSortBar
                sort={viewState.listSort}
                onChange={(sort) =>
                  updateView({
                    listSort: sort,
                    page: 1,
                  })
                }
                onReset={
                  hasListFilters
                    ? () =>
                        updateView({
                          listSort: getDefaultFilters().listSort,
                          page: 1,
                        })
                    : null
                }
              />
            ) : null
          }
        />
      )}
    </>
  );
}

function ShowcaseCardItem({ isOwner, item, onRemoveItem, userId }) {
  const isDraggingRef = useRef(false);
  const canonicalKey = getCanonicalMediaKey(item);
  const card = toAccountMediaCard(item);
  if (!card) return null;

  return (
    <Reorder.Item
      as="div"
      key={canonicalKey}
      value={item}
      className="relative flex h-full min-w-0 cursor-grab flex-col select-none active:cursor-grabbing"
      whileDrag={{
        scale: 1.05,
        zIndex: 40,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      }}
      transition={{ duration: 0.2 }}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      onClickCapture={(event) => {
        if (isDraggingRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <MediaCard
        className="pointer-events-auto w-full"
        href={card.href}
        imageAlt={card.imageAlt}
        imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
        imageSrc={card.imageSrc}
        tooltipText={card.tooltipText}
        topOverlay={
          isOwner ? (
            <ProfileMediaActions
              item={item}
              onRemoveItem={onRemoveItem}
              removeLabel={`Remove ${item?.title || item?.name || 'item'} from favorites`}
              currentUserId={userId}
            />
          ) : null
        }
      />
    </Reorder.Item>
  );
}

function FavoriteShowcaseManager({
  items = [],
  isOwner = false,
  onRemoveItem,
  onReorder,
  userId = null,
}) {
  const showcaseItems = items.slice(0, 5);

  return (
    <AccountSectionLayout
      icon="solar:star-bold"
      summaryLabel={`${items.length}/5 selected`}
      title="Favorites Showcase"
    >
      {showcaseItems.length === 0 ? (
        <AccountInlineSectionState>No showcase titles selected yet</AccountInlineSectionState>
      ) : (
        <Reorder.Group
          as="div"
          axis="x"
          values={items}
          onReorder={onReorder}
          className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5"
        >
          {showcaseItems.map((item) => {
            const canonicalKey = getCanonicalMediaKey(item);
            return (
              <ShowcaseCardItem
                key={canonicalKey}
                isOwner={isOwner}
                item={item}
                onRemoveItem={onRemoveItem}
                userId={userId}
              />
            );
          })}
        </Reorder.Group>
      )}
    </AccountSectionLayout>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/collections/media-collection-feed.js
// ============================================================================

'use client';

import { useMemo } from 'react';

import {
  applyMediaFilters,
  buildMediaKeySet,
  collectMediaGenreOptions,
  getDecadeOptions,
  hasActiveMediaFilters,
  parseMediaFilters,
} from '@/domains/account/ui/filters/filtering';
import { useAccountMediaFeedState } from '@/domains/account/hooks/media-feed-state';
import { AccountMediaFilterBar } from '@/domains/account/ui/filters/content-filter-primitives';
import AccountMediaGridPage, {
  ProfileMediaActions,
} from '@/domains/account/ui/components/account-media-grid';
import { AccountSectionState } from '@/domains/account/ui/sections/account-section';

export default function MediaCollectionFeed({
  auth,
  canShowGrid,
  emptyMessage,
  icon,
  isLoading = false,
  isOwner,
  items = [],
  loadError,
  onRemoveItem,
  removeLabelFn,
  title,
  visibilityOptions = [],
  filterKeysType = 'watchedKeys',
}) {
  const allowedFlags = useMemo(() => visibilityOptions.map((o) => o.key), [visibilityOptions]);
  const { collectionRootPath, updateView, viewState } = useAccountMediaFeedState({
    allowedEyeFlags: allowedFlags,
  });

  const hasFilters = hasActiveMediaFilters(viewState.media);
  const filteredItems = useMemo(
    () =>
      applyMediaFilters(items, viewState.media, {
        [filterKeysType]: buildMediaKeySet(items),
      }),
    [viewState.media, items, filterKeysType],
  );
  const genreOptions = useMemo(() => collectMediaGenreOptions(items), [items]);

  if (!canShowGrid) return <AccountSectionState message="This profile is private." />;
  if (loadError) return <AccountSectionState message={loadError} />;

  return (
    <AccountMediaGridPage
      currentPage={viewState.page}
      emptyMessage={emptyMessage}
      icon={icon}
      isLoading={isLoading}
      items={filteredItems}
      onPageChange={(page) => updateView({ page })}
      pageBasePath={collectionRootPath}
      showHeader={false}
      renderOverlay={(item) =>
        isOwner ? (
          <ProfileMediaActions
            item={item}
            onRemoveItem={onRemoveItem}
            removeLabel={removeLabelFn(item)}
            currentUserId={auth.user?.id}
          />
        ) : null
      }
      toolbar={
        items.length > 0 || hasFilters ? (
          <AccountMediaFilterBar
            filters={viewState.media}
            decadeOptions={getDecadeOptions()}
            genreOptions={genreOptions}
            visibilityOptions={visibilityOptions}
            onChange={(media) => updateView({ media: { ...viewState.media, ...media }, page: 1 })}
            onReset={
              hasFilters
                ? () =>
                    updateView({
                      media: parseMediaFilters(new URLSearchParams(), {
                        allowedEyeFlags: allowedFlags,
                      }),
                      page: 1,
                    })
                : null
            }
          />
        ) : null
      }
      title={title}
    />
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/collections/watched-collection.js
// ============================================================================

'use client';

import MediaCollectionFeed from './media-collection-feed';

const VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_rewatched', label: 'Hide rewatched titles' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

export default function AccountWatchedFeed({
  auth,
  canShowWatchedGrid,
  isLoading = false,
  isOwner,
  loadError,
  watchedItems,
  onRemoveItem,
}) {
  return (
    <MediaCollectionFeed
      auth={auth}
      canShowGrid={canShowWatchedGrid}
      emptyMessage="No watched titles yet"
      icon="solar:eye-bold"
      isLoading={isLoading}
      isOwner={isOwner}
      items={watchedItems}
      loadError={loadError}
      onRemoveItem={onRemoveItem}
      removeLabelFn={(item) => `Remove ${item.title || item.name} from watched`}
      title="Watched"
      visibilityOptions={VISIBILITY_OPTIONS}
      filterKeysType="watchedKeys"
    />
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/collections/watchlist-collection.js
// ============================================================================

'use client';

import MediaCollectionFeed from './media-collection-feed';

const VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

export default function AccountWatchlistFeed({
  auth,
  canShowWatchlistGrid,
  isLoading = false,
  isOwner,
  loadError,
  watchlist,
  onRemoveItem,
}) {
  return (
    <MediaCollectionFeed
      auth={auth}
      canShowGrid={canShowWatchlistGrid}
      emptyMessage="No watchlist titles yet"
      icon="solar:bookmark-bold"
      isLoading={isLoading}
      isOwner={isOwner}
      items={watchlist}
      loadError={loadError}
      onRemoveItem={onRemoveItem}
      removeLabelFn={(item) => `Remove ${item.title || item.name} from watchlist`}
      title="Watchlist"
      visibilityOptions={VISIBILITY_OPTIONS}
      filterKeysType="watchlistKeys"
    />
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/edit/account-edit-primitives.js
// ============================================================================

'use client';

import { GridShellCrosshairs } from '@/ui/layout/grid-crosshair';
import { AccountSectionHeading } from '@/domains/account/ui/sections/account-section';
import { ACCOUNT_SECTION_SHELL_CLASS, DESTRUCTIVE_ACTION_TONE_CLASS } from '@/shared/constants';
import { cn } from '@/core/shared/utils';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Icon from '@/ui/primitives/icon';

export const INPUT_BASE_CLASSES =
  'h-11 w-full border border-white/5 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/50 transition-all duration-300 ease-in-out focus:bg-white/10';

export const TEXTAREA_BASE_CLASSES = `${INPUT_BASE_CLASSES} min-h-[150px] resize-y py-3`;

const BUTTON_BASE_CLASSES =
  ' border border-white/5 bg-primary px-3 py-2 text-white transition-all duration-300 ease-in-out cursor-pointer hover:bg-white/10 disabled:opacity-50';

const BUTTON_FRAME_CLASSES =
  'inline-flex h-10 items-center justify-center gap-2 px-4 text-[11px] font-bold tracking-widest uppercase disabled:cursor-not-allowed ';

export function ActionButton({ children, className, tone = 'default', icon = null, ...props }) {
  return (
    <button
      className={cn(
        BUTTON_FRAME_CLASSES,
        tone === 'danger' ? DESTRUCTIVE_ACTION_TONE_CLASS : BUTTON_BASE_CLASSES,
        className,
      )}
      {...props}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      {children}
    </button>
  );
}
export function StatusState({ title, description }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl border border-white/15 bg-black p-6 text-center">
        <p className="text-[11px] font-semibold tracking-widest uppercase">Account Editor</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
      </div>
    </div>
  );
}
export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  summaryLabel,
}) {
  return (
    <section className="relative bg-transparent">
      <div className={cn(ACCOUNT_SECTION_SHELL_CLASS, 'relative flex flex-col', className)}>
        <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
        <AccountSectionHeading title={title} summaryLabel={summaryLabel} />
        <div className="p-6">
          {description ? <p className="text-sm leading-6 text-white/70">{description}</p> : null}
          <div className={cn('flex flex-col gap-4', contentClassName)}>{children}</div>
        </div>
      </div>
    </section>
  );
}
export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs leading-5 text-white/70">{hint}</span> : null}
    </label>
  );
}
export function MediaField({
  fieldLabel,
  value,
  placeholder = 'https://',
  preview,
  previewAlt,
  previewClassName,
  isUploading,
  isDisabled,
  onChange,
  onClear,
  onOpenUpload,
}) {
  const shouldDisableActions = isDisabled || isUploading;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_172px] lg:items-start">
      <div className="space-y-3">
        <Field label={fieldLabel}>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className={INPUT_BASE_CLASSES}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            type="button"
            onClick={onOpenUpload}
            disabled={shouldDisableActions}
            icon={isUploading ? 'solar:refresh-bold' : 'solar:upload-bold'}
          >
            {isUploading ? 'Uploading' : 'Upload Media'}
          </ActionButton>

          <ActionButton type="button" onClick={onClear} disabled={!value || shouldDisableActions}>
            Clear
          </ActionButton>
        </div>
      </div>

      <div>
        <div className={cn('overflow-hidden border border-white/10 bg-white/5', previewClassName)}>
          {preview ? (
            <AdaptiveImage
              mode="img"
              src={preview}
              alt={previewAlt}
              decoding="async"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/70">
              <Icon icon="solar:gallery-bold" size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/edit/account-edit-view.js
// ============================================================================

'use client';

import { useNavHeight, useNavigationActions } from '@/modules/nav';
import { ACCOUNT_ROUTE_SHELL_CLASS, PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { AccountEditRegistry as Registry } from '@/app/(account)/registry';
import {
  AccountHeroReveal,
  AccountNavReveal,
  AccountSectionNav,
} from '@/domains/account/ui/layouts/account-layout';
import AccountGridFrame from '@/domains/account/ui/layouts/account-grid-frame';
import AccountHero from '@/domains/account/ui/sections/account-hero';
import { createAccountBioSurfaceEntry } from '@/domains/account/ui/nav-surfaces/account-bio-surface';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import { Spinner } from '@/ui/feedback/spinner';
import { StatusState } from './account-edit-primitives';
import { AccountGeneralSettingsForm } from './account-general-settings-form';
import { AccountSecuritySettings } from './account-security-settings';

export function AccountEditView(props) {
  const { navHeight } = useNavHeight();
  const { openSurface } = useNavigationActions();
  const {
    currentAuthEmail,
    auth,
    isLoading,
    profile,
    activeTab,
    isSaving,
    form,
    emailFlow,
    passwordFlow,
    deleteFlow,
    deleteConfirmation,
    heroProfile,
    likesCount,
    followerCount,
    followingCount,
    listsCount,
    watchedCount,
    watchlistCount,
    avatarPreview,
    bannerPreview,
    heroDisplayName,
    isGeneralAccountDirty,
    isAnyMediaUploading,
    mediaUploadFileName,
    mediaUploadState,
    canUsePasswordSecurity,
    isPasswordLinked,
    linkedOAuthProviders,
    formRef,
    handleChange,
    handleClearMedia,
    handleOpenMediaUpload,
    handleCancel,
    handleSignIn,
    handleSave,
    setActiveTab,
    handleAccountSubmit,
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleUnlinkProvider,
    handleSetPassword,
    setEmailFlow,
    setPasswordFlow,
    setDeleteFlow,
    unlinkingProvider,
  } = props;
  const resolvedNavHeight = Math.max(0, Math.round(navHeight || 0));
  const editRegistry = (
    <Registry
      activeTab={activeTab}
      authIsAuthenticated={auth?.isAuthenticated}
      avatarPreview={avatarPreview}
      deleteConfirmation={deleteConfirmation}
      handleCancel={handleCancel}
      handleSignIn={handleSignIn}
      handleSave={handleSave}
      isGeneralAccountDirty={isGeneralAccountDirty}
      isLoading={!auth?.isReady || isLoading}
      isMediaUploading={isAnyMediaUploading}
      mediaUploadFileName={mediaUploadFileName}
      isSaving={isSaving}
      setActiveTab={setActiveTab}
    />
  );
  if (!auth.isReady || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <Spinner size={32} />
      </div>
    );
  }
  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <Spinner size={32} />
      </div>
    );
  }
  if (!profile) {
    return (
      <>
        {editRegistry}
        <PageGradientShell>
          <main
            className="relative min-h-screen overflow-hidden"
            style={{
              paddingBottom: `calc(${resolvedNavHeight}px + 1rem)`,
            }}
          >
            <div
              className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 p-4`}
            >
              <StatusState
                title="Account data unavailable"
                description="We could not load your editable profile data right now."
              />
            </div>
          </main>
        </PageGradientShell>
      </>
    );
  }
  const handleReadMore = () => {
    openSurface(
      createAccountBioSurfaceEntry({
        description: heroProfile?.description || '',
        followerCount,
        followingCount,
        profile: heroProfile,
        username: heroProfile?.username || profile?.username || 'About',
      }),
    );
  };

  return (
    <>
      {editRegistry}
      <PageGradientShell className="overflow-hidden">
        <AccountGridFrame />
        <div
          className={`relative z-10 mx-auto flex w-full ${ACCOUNT_ROUTE_SHELL_CLASS} flex-col gap-6 pb-12 sm:gap-8`}
          style={{
            paddingBottom: `calc(${resolvedNavHeight}px + 1rem)`,
          }}
        >
          <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
            <AccountSectionNav
              activeKey="overview"
              username={profile?.username || heroProfile?.username || null}
            />
          </AccountNavReveal>

          <div className="mt-28 flex w-full flex-col items-center gap-8 sm:mt-36 sm:gap-12 lg:mt-44 lg:gap-16">
            <AccountHeroReveal className="w-full">
              <AccountHero
                profile={heroProfile}
                likesCount={likesCount}
                followerCount={followerCount}
                followingCount={followingCount}
                listsCount={listsCount}
                watchedCount={watchedCount}
                watchlistCount={watchlistCount}
                onReadMore={handleReadMore}
              />
            </AccountHeroReveal>

            <main className="w-full pt-4 pb-6 text-left sm:pt-6 sm:pb-8">
              {activeTab === 'general' ? (
                <AccountGeneralSettingsForm
                  avatarPreview={avatarPreview}
                  bannerPreview={bannerPreview}
                  form={form}
                  formRef={formRef}
                  handleAccountSubmit={handleAccountSubmit}
                  handleChange={handleChange}
                  handleClearMedia={handleClearMedia}
                  handleOpenMediaUpload={handleOpenMediaUpload}
                  heroDisplayName={heroDisplayName}
                  isAnyMediaUploading={isAnyMediaUploading}
                  isSaving={isSaving}
                  mediaUploadState={mediaUploadState}
                />
              ) : (
                <AccountSecuritySettings
                  canUsePasswordSecurity={canUsePasswordSecurity}
                  currentAuthEmail={currentAuthEmail}
                  deleteFlow={deleteFlow}
                  emailFlow={emailFlow}
                  handleCompleteEmailChange={handleCompleteEmailChange}
                  handleCompletePasswordChange={handleCompletePasswordChange}
                  handleDeleteAccount={handleDeleteAccount}
                  handleUnlinkProvider={handleUnlinkProvider}
                  handleSetPassword={handleSetPassword}
                  isPasswordLinked={isPasswordLinked}
                  linkedOAuthProviders={linkedOAuthProviders}
                  passwordFlow={passwordFlow}
                  setDeleteFlow={setDeleteFlow}
                  setEmailFlow={setEmailFlow}
                  setPasswordFlow={setPasswordFlow}
                  unlinkingProvider={unlinkingProvider}
                />
              )}
            </main>
          </div>
        </div>
      </PageGradientShell>
    </>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/edit/account-general-settings-form.js
// ============================================================================

'use client';

import { cn } from '@/core/shared/utils';
import {
  Field,
  INPUT_BASE_CLASSES,
  MediaField,
  SectionCard,
  TEXTAREA_BASE_CLASSES,
} from './account-edit-primitives';

export function AccountGeneralSettingsForm({
  form,
  formRef,
  handleAccountSubmit,
  handleChange,
  handleClearMedia,
  handleOpenMediaUpload,
  avatarPreview,
  bannerPreview,
  heroDisplayName,
  isAnyMediaUploading,
  isSaving,
  mediaUploadState,
}) {
  return (
    <form ref={formRef} onSubmit={handleAccountSubmit} className="flex flex-col">
      <SectionCard title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display Name">
            <input
              value={form.displayName}
              onChange={(event) => handleChange('displayName', event.target.value)}
              placeholder="Your name"
              className={INPUT_BASE_CLASSES}
            />
          </Field>

          <Field label="Username">
            <input
              value={form.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="username"
              spellCheck={false}
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        </div>

        <Field label="Bio">
          <textarea
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Write something about yourself"
            rows={6}
            className={TEXTAREA_BASE_CLASSES}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Avatar & Logo">
        <MediaField
          fieldLabel="Avatar URL"
          value={form.avatarUrl}
          preview={avatarPreview}
          previewAlt={`${heroDisplayName} avatar preview`}
          previewClassName="aspect-square"
          isUploading={Boolean(mediaUploadState?.avatar)}
          isDisabled={isSaving || isAnyMediaUploading}
          onChange={(value) => handleChange('avatarUrl', value)}
          onClear={() => handleClearMedia('avatar')}
          onOpenUpload={() => handleOpenMediaUpload('avatar')}
        />

        <div className="h-px w-full bg-white/10" />

        <MediaField
          fieldLabel="Logo URL"
          value={form.bannerUrl}
          preview={bannerPreview}
          previewAlt={`${heroDisplayName} logo preview`}
          previewClassName="aspect-[16/7]"
          isUploading={Boolean(mediaUploadState?.banner)}
          isDisabled={isSaving || isAnyMediaUploading}
          onChange={(value) => handleChange('bannerUrl', value)}
          onClear={() => handleClearMedia('logo')}
          onOpenUpload={() => handleOpenMediaUpload('banner')}
        />
      </SectionCard>

      <SectionCard title="Privacy">
        <button
          type="button"
          onClick={() => handleChange('isPrivate', !form.isPrivate)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
              {form.isPrivate ? 'Private profile' : 'Public profile'}
            </span>
            <span className="text-xs leading-5 text-white/70">
              {form.isPrivate
                ? 'Only approved followers can inspect your collections.'
                : 'Anyone can inspect your collections and profile activity.'}
            </span>
          </div>

          <span className="flex h-6 w-11 border border-white/15 bg-black p-px" aria-hidden="true">
            <span
              className={cn(
                'h-full w-5 bg-white',
                form.isPrivate ? 'bg-info translate-x-5' : 'translate-x-0',
              )}
            />
          </span>
        </button>
      </SectionCard>
    </form>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/edit/account-security-settings.js
// ============================================================================

'use client';

import { ActionButton, Field, INPUT_BASE_CLASSES, SectionCard } from './account-edit-primitives';
import { getOAuthProviderIcon, getOAuthProviderLabel } from '@/domains/auth/utils';
import Icon from '@/ui/primitives/icon';

export function AccountSecuritySettings({
  canUsePasswordSecurity,
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  handleCompleteEmailChange,
  handleCompletePasswordChange,
  handleDeleteAccount,
  handleUnlinkProvider,
  handleSetPassword,
  isPasswordLinked,
  linkedOAuthProviders = [],
  passwordFlow,
  setDeleteFlow,
  setEmailFlow,
  setPasswordFlow,
  unlinkingProvider,
}) {
  return (
    <div className="flex flex-col">
      {!canUsePasswordSecurity ? (
        <SectionCard title="Enable Password Sign-In">
          <div className="bg-white/5 p-3 text-sm leading-6 text-white/50">
            Email/password sign-in is not linked yet. Complete the set password flow below to
            continue.
          </div>
        </SectionCard>
      ) : null}

      {canUsePasswordSecurity ? (
        <SectionCard
          title="Change Email"
          summaryLabel={
            currentAuthEmail && (
              <span className="text-[10px] font-medium tracking-normal text-white/50 lowercase">
                {currentAuthEmail}
              </span>
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Current Password">
              <input
                type="password"
                value={emailFlow.currentPassword}
                onChange={(event) =>
                  setEmailFlow((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
                className={INPUT_BASE_CLASSES}
              />
            </Field>

            <Field label="New Email">
              <input
                type="email"
                value={emailFlow.newEmail}
                onChange={(event) =>
                  setEmailFlow((prev) => ({
                    ...prev,
                    newEmail: event.target.value,
                  }))
                }
                className={INPUT_BASE_CLASSES}
              />
            </Field>
          </div>

          <ActionButton
            type="button"
            onClick={handleCompleteEmailChange}
            disabled={emailFlow.isSubmitting}
            className="w-full sm:w-fit"
          >
            {emailFlow.isSubmitting ? 'Verifying' : 'Verify and Update'}
          </ActionButton>
        </SectionCard>
      ) : null}

      <SectionCard title={isPasswordLinked ? 'Change Password' : 'Set Password'}>
        {isPasswordLinked ? (
          <Field label="Current Password">
            <input
              type="password"
              value={passwordFlow.currentPassword}
              onChange={(event) =>
                setPasswordFlow((prev) => ({
                  ...prev,
                  currentPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="New Password">
            <input
              type="password"
              value={passwordFlow.newPassword}
              onChange={(event) =>
                setPasswordFlow((prev) => ({
                  ...prev,
                  newPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>

          <Field label="Confirm Password">
            <input
              type="password"
              value={passwordFlow.confirmPassword}
              onChange={(event) =>
                setPasswordFlow((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        </div>

        <ActionButton
          type="button"
          onClick={isPasswordLinked ? handleCompletePasswordChange : handleSetPassword}
          disabled={passwordFlow.isSubmitting}
          className="w-full sm:w-fit"
        >
          {passwordFlow.isSubmitting
            ? isPasswordLinked
              ? 'Verifying'
              : 'Setting'
            : isPasswordLinked
              ? 'Verify and Update'
              : 'Verify and Set Password'}
        </ActionButton>
      </SectionCard>

      {linkedOAuthProviders.length ? (
        <SectionCard title="Connected providers" contentClassName="gap-3">
          <div className="flex flex-col gap-3">
            {linkedOAuthProviders.map((provider) => {
              const label = getOAuthProviderLabel(provider);
              const icon = getOAuthProviderIcon(provider);
              const isDisconnecting = unlinkingProvider === provider;

              return (
                <div key={provider} className="flex flex-wrap items-center gap-3 bg-white/5 p-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="center size-10 shrink-0 text-white/80">
                      {icon ? <Icon icon={icon} size={20} aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 text-sm font-medium text-white">{label}</span>
                  </div>
                  <ActionButton
                    type="button"
                    tone="danger"
                    disabled={Boolean(unlinkingProvider)}
                    onClick={() => handleUnlinkProvider(provider)}
                    className="w-full sm:ml-auto sm:w-auto"
                  >
                    {isDisconnecting ? 'Disconnecting' : `Disconnect ${label}`}
                  </ActionButton>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Delete Account">
        <Field label="Type DELETE to Confirm">
          <input
            value={deleteFlow.confirmText}
            onChange={(event) =>
              setDeleteFlow((prev) => ({
                ...prev,
                confirmText: event.target.value,
              }))
            }
            placeholder="DELETE"
            className={INPUT_BASE_CLASSES}
          />
        </Field>

        {isPasswordLinked ? (
          <Field label="Current Password">
            <input
              type="password"
              value={deleteFlow.currentPassword}
              onChange={(event) =>
                setDeleteFlow((prev) => ({
                  ...prev,
                  currentPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        ) : null}

        <ActionButton
          type="button"
          tone="danger"
          onClick={handleDeleteAccount}
          disabled={deleteFlow.isSubmitting}
          className="w-full"
        >
          {deleteFlow.isSubmitting ? 'Deleting' : 'Delete Account'}
        </ActionButton>
      </SectionCard>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/feeds/activity.js
// ============================================================================

'use client';

import Link from 'next/link';
import { normalizeFeedbackText } from '@/shared/utils';
import {
  collectActivitySubjectOptions,
  hasActiveActivityFilters,
} from '@/domains/account/ui/filters/filtering';
import { AccountActivityFilterBar } from '@/domains/account/ui/filters/content-filter-primitives';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import ReviewCard from '@/domains/reviews/ui/components/review-card';
import RatingStars from '@/domains/reviews/ui/components/rating-stars';
import AccountSectionLayout, {
  AccountInlineSectionState,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import {
  ActivityItemsSkeletonList,
  FilterBarSkeleton,
} from '@/domains/account/ui/skeletons/account-section-skeletons';
const ACTIVITY_ITEMS_PER_PAGE = 36;

function formatActivityTime(value) {
  if (!value) return null;
  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return null;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  return diffHours < 24 ? `${diffHours}h` : `${Math.floor(diffHours / 24)}d`;
}

export default function AccountActivityFeed({
  currentPage = 1,
  emptyMessage = 'No activity yet',
  filters = {
    sort: 'newest',
    subject: 'all',
  },
  icon = 'solar:bolt-bold',
  isInitialSection = false,
  isLoading = false,
  items = [],
  loadError = null,
  onFiltersChange,
  onPageChange,
  revealDelay = 0,
  showHeader = true,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Recent Activity',
  titleHref = null,
  totalCount = null,
}) {
  const visibleItems = Array.isArray(items) ? items : [];
  const listedActivityCount = Number.isFinite(Number(totalCount))
    ? Math.max(0, Math.floor(Number(totalCount)))
    : visibleItems.length;
  const hasFilters = hasActiveActivityFilters(filters);
  const totalPages = Math.max(1, Math.ceil(listedActivityCount / ACTIVITY_ITEMS_PER_PAGE));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const resolvedSummaryLabel = hasFilters
    ? `${Math.min(listedActivityCount, (activePage - 1) * ACTIVITY_ITEMS_PER_PAGE + visibleItems.length)} of ${listedActivityCount} shown`
    : (summaryLabel ?? `${listedActivityCount} Events`);
  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      revealDelay={revealDelay}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
      toolbar={
        onFiltersChange && isLoading && visibleItems.length === 0 ? (
          <FilterBarSkeleton />
        ) : onFiltersChange && (listedActivityCount > 0 || hasFilters) ? (
          <AccountActivityFilterBar
            filters={filters}
            subjectOptions={collectActivitySubjectOptions()}
            onChange={(updates) =>
              onFiltersChange({
                ...filters,
                ...updates,
              })
            }
            onReset={
              hasFilters
                ? () =>
                    onFiltersChange({
                      sort: 'newest',
                      subject: 'all',
                    })
                : null
            }
          />
        ) : null
      }
    >
      {isLoading && visibleItems.length === 0 ? (
        <ActivityItemsSkeletonList count={6} />
      ) : loadError ? (
        <AccountInlineSectionState>{normalizeFeedbackText(loadError)}</AccountInlineSectionState>
      ) : listedActivityCount === 0 ? (
        <AccountInlineSectionState>
          {hasFilters ? 'No activity matches the current filters' : emptyMessage}
        </AccountInlineSectionState>
      ) : (
        <ActivityList baseDelay={0} isInitialSection={isInitialSection} items={visibleItems} />
      )}

      {listedActivityCount > ACTIVITY_ITEMS_PER_PAGE && onPageChange && (
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
          <AccountPagination
            className="w-full"
            currentPage={activePage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
        </div>
      )}
    </AccountSectionLayout>
  );
}

const ACTIVITY_ROW_CLASS = 'border-b border-white/5 py-5 first:pt-0 last:border-b-0 last:pb-0';
const ACTIVITY_LINE_CLASS = 'min-w-0 text-[1.02rem] leading-[1.1]';

function ActivityList({ baseDelay, isInitialSection = false, items }) {
  return (
    <div className="w-full">
      {items.map((item, index) => (
        <ActivityRow
          key={item?.dedupeKey || item?.id || `activity-${index}`}
          baseDelay={baseDelay}
          index={index}
          isInitialSection={isInitialSection}
          item={item}
        />
      ))}
    </div>
  );
}

function ActivityRow({ baseDelay, index = 0, isInitialSection = false, item }) {
  const createdLabel = formatActivityTime(item?.occurredAt || item?.updatedAt || item?.createdAt);

  const hasReview = item?.renderKind === 'text_with_review' && item?.reviewCard;

  return (
    <div className={ACTIVITY_ROW_CLASS}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className={ACTIVITY_LINE_CLASS}>
          {(item?.line?.parts || []).map((part, partIndex) => (
            <LinePart key={partIndex} part={part} />
          ))}
        </div>
        {createdLabel && (
          <div className="shrink-0 text-sm leading-[1.1] font-medium">{createdLabel}</div>
        )}
      </div>

      {hasReview ? (
        <ReviewCard
          className="mt-3 border-b-0"
          displayVariant="activity"
          removeBottomPadding
          removeTopPadding
          review={item.reviewCard}
        />
      ) : null}
    </div>
  );
}

function LinePart({ part }) {
  if (part?.kind === 'rating' && Number.isFinite(Number(part?.rating)))
    return <RatingStars className="translate-y-[-1px]" rating={Number(part.rating)} />;
  if (!part?.text) return null;
  const className = part.kind === 'actor' || part.kind === 'account' ? 'font-semibold' : '';
  if (part.href)
    return (
      <Link href={part.href} className={className}>
        {part.text}
      </Link>
    );
  if (part.kind === 'actor') return <span className="font-semibold">{part.text}</span>;
  return <span>{part.text}</span>;
}


// ============================================================================
// FILE: domains/account/ui/sections/feeds/reviews.js
// ============================================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  REVIEW_FILTER_QUERY_KEYS,
  applyReviewFilters,
  buildCollectionBasePath,
  buildMediaKeySet,
  buildManagedQueryString,
  collectReviewYears,
  hasActiveReviewFilters,
  parsePageFromSearch,
  parseReviewFilters,
  toReviewQueryValues,
} from '@/domains/account/ui/filters/filtering';
import { AccountReviewFilterBar } from '@/domains/account/ui/filters/content-filter-primitives';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import {
  ACCOUNT_EMPTY_SECTION_CLASS,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import { Button } from '@/ui/primitives';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { FilterBarSkeleton } from '@/domains/account/ui/skeletons/account-section-skeletons';
const REVIEW_ITEMS_PER_PAGE = 36;

export default function AccountReviewsFeed({
  baseDelay = 0,
  currentUserId = null,
  emptyMessage = 'No reviews yet',
  enablePagination = false,
  hasMore = false,
  icon = 'solar:chat-round-bold',
  isInitialSection = true,
  isLoading = false,
  isLoadingMore = false,
  items = [],
  loadError = null,
  likedLists = [],
  likes = [],
  onDeleteRequest = null,
  onEdit = null,
  onLike,
  onLoadMore = null,
  paginationPageSize = REVIEW_ITEMS_PER_PAGE,
  showHeader = true,
  showOwnActions = false,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
  userProfile = null,
  watchedItems = [],
}) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);
  const listedReviewCount = Array.isArray(items) ? items.length : 0;

  const [viewState, setViewState] = useState({
    filters: parseReviewFilters(new URLSearchParams(searchString)),
    page: parsePageFromSearch(new URLSearchParams(searchString)),
  });
  useEffect(() => {
    setViewState({
      filters: parseReviewFilters(new URLSearchParams(searchString)),
      page: parsePageFromSearch(new URLSearchParams(searchString)),
    });
  }, [searchString]);
  const updateView = (updates) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: REVIEW_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toReviewQueryValues(viewState.filters),
    });
    const params = new URLSearchParams(qs);
    if (enablePagination && viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');
    const newUrl = params.toString()
      ? `${collectionRootPath}?${params.toString()}`
      : collectionRootPath;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [viewState, collectionRootPath, enablePagination]);

  const filteredReviews = useMemo(
    () => applyReviewFilters(items, viewState.filters),
    [items, viewState.filters],
  );
  const safePageSize = Math.max(
    1,
    Number.parseInt(String(paginationPageSize), 10) || REVIEW_ITEMS_PER_PAGE,
  );
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / safePageSize));
  const resolvedPage = enablePagination ? Math.min(viewState.page, totalPages) : 1;
  const pageStart = enablePagination ? (resolvedPage - 1) * safePageSize : 0;
  const visibleReviews = enablePagination
    ? filteredReviews.slice(pageStart, pageStart + safePageSize)
    : filteredReviews;
  const hasFilters = hasActiveReviewFilters(viewState.filters);
  const resolvedSummaryLabel = hasFilters
    ? `${filteredReviews.length} of ${listedReviewCount} shown`
    : (summaryLabel ?? `${listedReviewCount} Reviews`);
  const likedMediaKeys = useMemo(() => {
    const set = buildMediaKeySet(likes);
    const listSet = buildMediaKeySet(likedLists);
    listSet.forEach((key) => set.add(key));
    return set;
  }, [likes, likedLists]);
  const watchedMediaKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(
    () => buildMediaKeySet(watchedItems, (item) => Number(item?.watchCount || 0) > 1),
    [watchedItems],
  );
  const yearOptions = useMemo(() => collectReviewYears(items), [items]);
  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
      toolbar={
        isLoading && listedReviewCount === 0 ? (
          <FilterBarSkeleton />
        ) : listedReviewCount > 0 || hasFilters ? (
          <AccountReviewFilterBar
            filters={viewState.filters}
            yearOptions={yearOptions}
            onChange={(filters) =>
              updateView({
                filters: {
                  ...viewState.filters,
                  ...filters,
                },
                page: 1,
              })
            }
            onReset={
              hasFilters
                ? () =>
                    updateView({
                      filters: parseReviewFilters(new URLSearchParams()),
                      page: 1,
                    })
                : null
            }
          />
        ) : null
      }
    >
      {filteredReviews.length === 0 && !isLoading && !loadError ? (
        <div className={ACCOUNT_EMPTY_SECTION_CLASS}>
          {hasFilters ? 'No reviews match the current filters' : emptyMessage}
        </div>
      ) : filteredReviews.length === 0 && !isLoading && loadError ? (
        <div className={ACCOUNT_EMPTY_SECTION_CLASS}>{loadError}</div>
      ) : (
        <ReviewList
          currentUserId={currentUserId}
          displayVariant="account"
          isInitialSection={isInitialSection}
          isLoading={isLoading && listedReviewCount === 0}
          loadError={listedReviewCount === 0 ? loadError : null}
          onDeleteRequest={onDeleteRequest || (() => {})}
          onEdit={onEdit || (() => {})}
          onLike={onLike}
          likedMediaKeys={likedMediaKeys}
          rewatchMediaKeys={rewatchMediaKeys}
          showOwnActions={showOwnActions}
          showSubject={true}
          sortedReviews={visibleReviews}
          userProfile={userProfile}
          watchedMediaKeys={watchedMediaKeys}
          accountMotion
        />
      )}

      {!enablePagination && hasMore && onLoadMore && (
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="border border-white/10 bg-black/50 px-6 py-3 text-xs font-semibold tracking-widest text-white/70 uppercase"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </div>
      )}

      {enablePagination && filteredReviews.length > 0 && (
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
          <AccountPagination
            className="w-full"
            currentPage={resolvedPage}
            onPageChange={(page) =>
              updateView({
                page,
              })
            }
            totalPages={totalPages}
          />
        </div>
      )}
    </AccountSectionLayout>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/lists/list-detail-comments.js
// ============================================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import {
  AccountInlineSectionState,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import { ReviewCardsSkeletonList } from '@/domains/account/ui/skeletons/account-section-skeletons';
import { REVIEW_ITEMS_PER_PAGE } from './list-detail-config';

export default function ListDetailCommentsSection({
  auth,
  filteredReviews = [],
  isLoading = false,
  list,
  onDeleteRequest,
  onEditReview,
  onLikeReview,
  reviews = [],
  userProfile,
}) {
  const [currentReviewPage, setCurrentReviewPage] = useState(1);

  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEW_ITEMS_PER_PAGE));
  const safeCurrentReviewPage = Math.min(currentReviewPage, totalReviewPages);
  const reviewPageStart = (safeCurrentReviewPage - 1) * REVIEW_ITEMS_PER_PAGE;
  const visibleReviews = useMemo(
    () => filteredReviews.slice(reviewPageStart, reviewPageStart + REVIEW_ITEMS_PER_PAGE),
    [filteredReviews, reviewPageStart],
  );
  useEffect(() => {
    setCurrentReviewPage(1);
  }, [filteredReviews, list?.id]);
  return (
    <CommentsView
      auth={auth}
      filteredReviews={filteredReviews}
      isLoading={isLoading}
      list={list}
      onDeleteRequest={onDeleteRequest}
      onEditReview={onEditReview}
      onLikeReview={onLikeReview}
      reviews={reviews}
      userProfile={userProfile}
      safeCurrentReviewPage={safeCurrentReviewPage}
      totalReviewPages={totalReviewPages}
      visibleReviews={visibleReviews}
      setCurrentReviewPage={setCurrentReviewPage}
    />
  );
}

function CommentsView({
  auth,
  filteredReviews,
  isLoading = false,
  list,
  onDeleteRequest,
  onEditReview,
  onLikeReview,
  reviews,
  userProfile,
  safeCurrentReviewPage,
  totalReviewPages,
  visibleReviews,
  setCurrentReviewPage,
}) {
  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-col gap-4 p-6">
        {isLoading && visibleReviews.length === 0 ? (
          <ReviewCardsSkeletonList count={3} />
        ) : visibleReviews.length === 0 ? (
          <AccountInlineSectionState>
            {reviews.length > 0 ? 'No comments match the current filters.' : 'No comments yet'}
          </AccountInlineSectionState>
        ) : (
          <ReviewList
            currentUserId={auth.user?.id || null}
            displayVariant="list-detail"
            isLoading={false}
            loadError={null}
            onDeleteRequest={onDeleteRequest}
            onEdit={onEditReview}
            onLike={onLikeReview}
            showSubject={false}
            sortedReviews={visibleReviews}
            userProfile={userProfile}
            accountMotion
          />
        )}

        {totalReviewPages > 1 && (
          <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
            <AccountPagination
              className="w-full"
              currentPage={safeCurrentReviewPage}
              totalPages={totalReviewPages}
              onPageChange={setCurrentReviewPage}
              prevAriaLabel="Go to previous review page"
              nextAriaLabel="Go to next review page"
            />
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/lists/list-detail-config.js
// ============================================================================

import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import { REVIEW_SORT_MODE } from '@/domains/reviews/shared/review-data';

export const LIST_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} flex flex-col gap-6`;

export const REVIEW_ITEMS_PER_PAGE = 36;

export const LIST_COMMENT_SORT_OPTIONS = Object.freeze([
  { value: REVIEW_SORT_MODE.NEWEST, label: 'Newest to oldest' },
  { value: REVIEW_SORT_MODE.OLDEST, label: 'Oldest to newest' },
  { value: REVIEW_SORT_MODE.LIKES_DESC, label: 'Most liked to least liked' },
  { value: REVIEW_SORT_MODE.LIKES_ASC, label: 'Least liked to most liked' },
]);

export const LIST_COMMENT_SORT_SET = new Set(
  LIST_COMMENT_SORT_OPTIONS.map((option) => option.value),
);

export const LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_watched', label: 'Hide watched titles' }),
  Object.freeze({ key: 'hide_liked', label: 'Hide liked titles' }),
  Object.freeze({ key: 'hide_watchlist', label: 'Hide titles in watchlist' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

export const LIST_DETAIL_ALLOWED_EYE_FLAGS = LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS.map(
  (option) => option.key,
);


// ============================================================================
// FILE: domains/account/ui/sections/lists/list-detail.js
// ============================================================================

'use client';

import { useState } from 'react';

import { AccountPageShell } from '@/domains/account/ui/layouts/account-layout';
import AccountMediaGridPage, {
  ProfileMediaActions,
} from '@/domains/account/ui/components/account-media-grid';
import {
  AccountMediaFilterBar,
  AccountReviewFilterBar,
} from '@/domains/account/ui/filters/content-filter-primitives';
import ReviewAuthFallback from '@/domains/reviews/ui/components/review-auth-fallback';
import AccountSectionLayout, {
  AccountSectionState,
} from '@/domains/account/ui/sections/account-section';
import ListDetailCommentsSection from './list-detail-comments';
import {
  LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS,
  LIST_COMMENT_SORT_OPTIONS,
  LIST_SECTION_SHELL_CLASS,
} from './list-detail-config';
import { useListDetailFilterState } from './use-list-detail-filters';

export default function AccountListDetailFeed({ model = {}, RegistryComponent = null }) {
  const {
    auth,
    canShowList,
    followerCount,
    followingCount,
    followState,
    handleDeleteList,
    handleDeleteRequest,
    handleEditReview,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleLikeReview,
    handleOpenFollowList,
    handleOpenReviewComposer,
    handleRemoveListItem,
    handleSignInRequest,
    handleToggleLike,
    isFollowLoading,
    isLiked,
    isLikeLoading,
    isListLoading,
    isListItemsLoading,
    isOwner,
    isPageLoading,
    isResolvingProfile,
    isReviewsLoading,
    itemRemoveConfirmation,
    likeCount,
    list,
    listDeleteConfirmation,
    listCount,
    listItems = [],
    likes = [],
    ownReview,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    reviews = [],
    unfollowConfirmation,
    username,
    userProfile,
    watchedItems = [],
    watchlistCount = 0,
    watchlistItems = [],
  } = model;

  const {
    decadeOptions,
    filteredListItems,
    filteredReviews,
    genreOptions,
    hasMediaFilters,
    hasReviewFilters,
    mediaFilters,
    resetMediaFilters,
    resetReviewFilters,
    reviewFilters,
    reviewYearOptions,
    updateMediaFilters,
    updateReviewFilters,
  } = useListDetailFilterState({
    likedItems: likes,
    listItems,
    reviews,
    watchedItems,
    watchlistItems,
  });
  const [mediaPage, setMediaPage] = useState(1);

  const hasListItems = listItems.length > 0;

  const pageRegistry = RegistryComponent ? (
    <RegistryComponent
      auth={auth}
      followState={followState}
      handleDeleteList={handleDeleteList}
      handleEditList={handleEditList}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      handleToggleLike={handleToggleLike}
      handleOpenReviewComposer={handleOpenReviewComposer}
      ownReview={ownReview}
      isFollowLoading={isFollowLoading}
      isLiked={isLiked}
      isLikeLoading={isLikeLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      list={list}
      listItemsCount={listItems.length}
      listDeleteConfirmation={listDeleteConfirmation}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
    />
  ) : null;

  return (
    <AccountPageShell
      activeSection="lists"
      followerCount={followerCount}
      followState={followState}
      isLoading={isPageLoading || isListLoading || (isResolvingProfile && !list)}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      profile={profile}
      registry={pageRegistry}
      resolvedUserId={resolvedUserId}
      skeletonVariant="list-detail"
      username={username}
      watchedCount={profile?.watchedCount || 0}
      watchlistCount={watchlistCount}
    >
      {!canShowList ? (
        <AccountSectionState message="This profile is private." />
      ) : !list ? (
        <AccountSectionState message="This list could not be found." />
      ) : (
        <>
          <AccountMediaGridPage
            currentPage={mediaPage}
            emptyMessage={
              hasMediaFilters && hasListItems ? 'No titles match the current filters.' : undefined
            }
            icon="solar:clapperboard-bold"
            isLoading={isListItemsLoading}
            items={filteredListItems}
            onPageChange={setMediaPage}
            showHeader={false}
            title={list?.title || 'List'}
            renderOverlay={(item) =>
              isOwner ? (
                <ProfileMediaActions
                  item={item}
                  onRemoveItem={handleRemoveListItem}
                  removeLabel={`Remove ${item?.title || item?.name || 'item'} from this list`}
                  currentUserId={auth.user?.id}
                />
              ) : null
            }
            toolbar={
              hasListItems && (
                <AccountMediaFilterBar
                  defaultSort="list_order"
                  defaultSortLabel="Default sort: List order"
                  filters={mediaFilters}
                  decadeOptions={decadeOptions}
                  genreOptions={genreOptions}
                  visibilityOptions={LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS}
                  onChange={updateMediaFilters}
                  onReset={hasMediaFilters ? resetMediaFilters : null}
                />
              )
            }
          />

          <AccountSectionLayout
            contentPaddingClassName="p-0"
            icon="solar:chat-round-line-bold"
            isInitialSection={false}
            revealDelay={0.1}
            summaryLabel={`${reviews.length} ${reviews.length === 1 ? 'Comment' : 'Comments'}`}
            title="Comments"
            toolbarPaddingClassName="p-0"
            toolbar={
              !auth?.user || reviews.length > 0 ? (
                <>
                  {!auth?.user && (
                    <ReviewAuthFallback
                      mode="comment"
                      onSignIn={handleSignInRequest}
                      title={list.title}
                      variant="account-section"
                    />
                  )}
                  {reviews.length > 0 ? (
                    <div className="flex min-h-14 items-center px-4">
                      <AccountReviewFilterBar
                        filters={reviewFilters}
                        showRatingFilter={false}
                        sortOptions={LIST_COMMENT_SORT_OPTIONS}
                        visibilityOptions={[]}
                        yearOptions={reviewYearOptions}
                        onChange={updateReviewFilters}
                        onReset={hasReviewFilters ? resetReviewFilters : null}
                      />
                    </div>
                  ) : null}
                </>
              ) : null
            }
          >
            <ListDetailCommentsSection
              auth={auth}
              filteredReviews={filteredReviews}
              isLoading={isReviewsLoading}
              list={list}
              onDeleteRequest={handleDeleteRequest}
              onEditReview={handleEditReview}
              onLikeReview={handleLikeReview}
              reviews={reviews}
              userProfile={userProfile}
            />
          </AccountSectionLayout>
        </>
      )}
    </AccountPageShell>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/lists/lists-collection.js
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LIST_FILTER_QUERY_KEYS,
  buildCollectionBasePath,
  buildManagedQueryString,
  hasActiveListFilters,
  parseListFilters,
  parsePageFromSearch,
  sortProfileLists,
  toListQueryValues,
} from '@/domains/account/ui/filters/filtering';
import { AccountListSortBar } from '@/domains/account/ui/filters/content-filter-primitives';
import AccountPaginatedListGrid from '@/domains/account/ui/components/lists/list-grid';
import { AccountSectionState } from '@/domains/account/ui/sections/account-section';
import Icon from '@/ui/primitives/icon';
const LISTS_PAGE_ITEMS_PER_PAGE = 18;
export default function AccountListsFeed({
  canShowLists,
  isLoading = false,
  isOwner,
  lists,
  username,
  onDeleteList,
  onEditList,
}) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);
  const [viewState, setViewState] = useState({
    sort: parseListFilters(new URLSearchParams(searchString)).sort,
    page: parsePageFromSearch(new URLSearchParams(searchString)),
  });
  useEffect(() => {
    setViewState({
      sort: parseListFilters(new URLSearchParams(searchString)).sort,
      page: parsePageFromSearch(new URLSearchParams(searchString)),
    });
  }, [searchString]);
  const updateView = (updates) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: LIST_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toListQueryValues({
        sort: viewState.sort,
      }),
    });
    const params = new URLSearchParams(qs);
    if (viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');
    const newUrl = params.toString()
      ? `${collectionRootPath}?${params.toString()}`
      : collectionRootPath;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [viewState, collectionRootPath]);
  if (!canShowLists) return <AccountSectionState message="This profile is private." />;
  const hasFilters = hasActiveListFilters({
    sort: viewState.sort,
  });
  return (
    <AccountPaginatedListGrid
      currentPage={viewState.page}
      emptyMessage="No lists yet"
      icon="solar:list-broken"
      isLoading={isLoading}
      itemsPerPage={LISTS_PAGE_ITEMS_PER_PAGE}
      lists={sortProfileLists(lists, viewState.sort)}
      onPageChange={(page) =>
        updateView({
          page,
        })
      }
      ownerUsername={username}
      pageBasePath={collectionRootPath}
      showHeader={false}
      renderActions={(list) =>
        isOwner ? (
          <ListCardOwnerActions list={list} onDelete={onDeleteList} onEdit={onEditList} />
        ) : null
      }
      title="Lists"
      toolbar={
        lists.length > 0 ? (
          <AccountListSortBar
            sort={viewState.sort}
            onChange={(sort) =>
              updateView({
                sort,
                page: 1,
              })
            }
            onReset={
              hasFilters
                ? () =>
                    updateView({
                      sort: parseListFilters(new URLSearchParams()).sort,
                      page: 1,
                    })
                : null
            }
          />
        ) : null
      }
    />
  );
}

function ListCardOwnerActions({ list, onDelete, onEdit }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Edit ${list.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit(list);
        }}
        className="center size-8 cursor-pointer border border-white/5 text-white/70 transition-all duration-300 ease-in-out hover:bg-white/5 hover:text-white"
      >
        <Icon icon="solar:pen-bold" size={13} />
      </button>
      <button
        type="button"
        aria-label={`Delete ${list.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(list);
        }}
        className="center hover:text-error size-8 cursor-pointer border border-white/5 text-white/70 transition-all duration-300 ease-in-out hover:bg-white/5"
      >
        <Icon icon="solar:trash-bin-trash-bold" size={13} />
      </button>
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/lists/use-list-detail-filters.js
// ============================================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  MEDIA_FILTER_QUERY_KEYS,
  REVIEW_FILTER_QUERY_KEYS,
  applyMediaFilters,
  applyReviewFilters,
  buildManagedQueryString,
  buildMediaKeySet,
  collectMediaGenreOptions,
  collectReviewYears,
  getDecadeOptions,
  hasActiveMediaFilters,
  hasActiveReviewFilters,
  parseMediaFilters,
  parseReviewFilters,
  toMediaQueryValues,
  toReviewQueryValues,
} from '@/domains/account/ui/filters/filtering';

import { LIST_COMMENT_SORT_SET, LIST_DETAIL_ALLOWED_EYE_FLAGS } from './list-detail-config';

function parseListDetailMediaFilters(search) {
  return parseMediaFilters(search, {
    allowedEyeFlags: LIST_DETAIL_ALLOWED_EYE_FLAGS,
    defaultSort: 'list_order',
  });
}

function sanitizeListCommentFilters(filters = {}) {
  return {
    ...filters,
    eyeFlags: new Set(),
    maxRating: 5,
    minRating: 0.5,
    ratingMode: 'any',
    sort: LIST_COMMENT_SORT_SET.has(filters?.sort) ? filters.sort : 'newest',
  };
}

export function useListDetailFilterState({
  likedItems = [],
  listItems = [],
  reviews = [],
  watchedItems = [],
  watchlistItems = [],
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString?.() || '';
  const collectionRootPath = useMemo(() => String(pathname || ''), [pathname]);
  const initialMediaFilters = useMemo(
    () => parseListDetailMediaFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const initialReviewFilters = useMemo(
    () => sanitizeListCommentFilters(parseReviewFilters(new URLSearchParams(searchParamsKey))),
    [searchParamsKey],
  );
  const [mediaFilters, setMediaFilters] = useState(initialMediaFilters);
  const [reviewFilters, setReviewFilters] = useState(initialReviewFilters);

  const decadeOptions = useMemo(() => getDecadeOptions(), []);
  const genreOptions = useMemo(() => collectMediaGenreOptions(listItems), [listItems]);
  const reviewYearOptions = useMemo(() => collectReviewYears(reviews), [reviews]);
  const watchedKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const likedKeys = useMemo(() => buildMediaKeySet(likedItems), [likedItems]);
  const watchlistKeys = useMemo(() => buildMediaKeySet(watchlistItems), [watchlistItems]);
  const filteredListItems = useMemo(
    () =>
      applyMediaFilters(listItems, mediaFilters, {
        likedKeys,
        watchedKeys,
        watchlistKeys,
      }),
    [likedKeys, listItems, mediaFilters, watchedKeys, watchlistKeys],
  );
  const filteredReviews = useMemo(
    () => applyReviewFilters(reviews, reviewFilters),
    [reviewFilters, reviews],
  );
  const hasMediaFilters = hasActiveMediaFilters(mediaFilters, { defaultSort: 'list_order' });
  const hasReviewFilters = hasActiveReviewFilters(reviewFilters);

  useEffect(() => {
    setMediaFilters(initialMediaFilters);
    setReviewFilters(initialReviewFilters);
  }, [initialMediaFilters, initialReviewFilters]);

  const updateUrl = useCallback(
    ({ nextMediaFilters = mediaFilters, nextReviewFilters = reviewFilters } = {}) => {
      if (typeof window === 'undefined') {
        return;
      }

      let params = new URLSearchParams(window.location.search);
      const mediaQueryString = buildManagedQueryString(params, {
        managedKeys: MEDIA_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toMediaQueryValues(nextMediaFilters, { defaultSort: 'list_order' }),
      });
      params = new URLSearchParams(mediaQueryString);

      const reviewQueryString = buildManagedQueryString(params, {
        managedKeys: REVIEW_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toReviewQueryValues(nextReviewFilters),
      });

      window.history.replaceState(
        {},
        '',
        reviewQueryString ? `${collectionRootPath}?${reviewQueryString}` : collectionRootPath,
      );
    },
    [collectionRootPath, mediaFilters, reviewFilters],
  );

  const updateMediaFilters = useCallback(
    (updates = {}) => {
      const nextFilters = {
        ...mediaFilters,
        ...updates,
      };
      setMediaFilters(nextFilters);
      updateUrl({
        nextMediaFilters: nextFilters,
        nextReviewFilters: reviewFilters,
      });
    },
    [mediaFilters, reviewFilters, updateUrl],
  );

  const resetMediaFilters = useCallback(() => {
    const defaultFilters = parseListDetailMediaFilters(new URLSearchParams());

    setMediaFilters(defaultFilters);
    updateUrl({
      nextMediaFilters: defaultFilters,
      nextReviewFilters: reviewFilters,
    });
  }, [reviewFilters, updateUrl]);

  const updateReviewFilters = useCallback(
    (updates = {}) => {
      const nextFilters = sanitizeListCommentFilters({
        ...reviewFilters,
        ...updates,
      });
      setReviewFilters(nextFilters);
      updateUrl({
        nextMediaFilters: mediaFilters,
        nextReviewFilters: nextFilters,
      });
    },
    [mediaFilters, reviewFilters, updateUrl],
  );

  const resetReviewFilters = useCallback(() => {
    const defaultFilters = sanitizeListCommentFilters(parseReviewFilters(new URLSearchParams()));

    setReviewFilters(defaultFilters);
    updateUrl({
      nextMediaFilters: mediaFilters,
      nextReviewFilters: defaultFilters,
    });
  }, [mediaFilters, updateUrl]);

  return {
    decadeOptions,
    filteredListItems,
    filteredReviews,
    genreOptions,
    hasMediaFilters,
    hasReviewFilters,
    mediaFilters,
    resetMediaFilters,
    resetReviewFilters,
    reviewFilters,
    reviewYearOptions,
    updateMediaFilters,
    updateReviewFilters,
  };
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/account-overview-client.js
// ============================================================================

'use client';

import { FullscreenState } from '@/ui/feedback/fullscreen-state';
import {
  AccountSectionStateProvider,
  useAccountSectionState,
} from '@/domains/account/hooks/account-section-state';
import { useAccountOverviewState } from '@/domains/account/hooks/account-overview-state';
import AccountOverviewFeed from './overview-feed';

function MissingCurrentAccountState({ RegistryComponent = null }) {
  return (
    <>
      {RegistryComponent ? <RegistryComponent /> : null}
      <FullscreenState contentClassName="px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-black text-white uppercase">Session Ended</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Your account profile could not be initialized. Refresh the page and try again.
          </p>
        </div>
      </FullscreenState>
    </>
  );
}

function AccountOverviewContent({ overviewData, RegistryComponent }) {
  const sectionState = useAccountSectionState();
  const model = {
    ...sectionState,
    ...overviewData,
    profileHandle:
      sectionState.profileHandle ?? sectionState.profile?.username ?? sectionState.username ?? null,
  };

  return <AccountOverviewFeed overviewData={model} RegistryComponent={RegistryComponent} />;
}

export default function AccountOverviewClient({ RegistryComponent = null, routeData = null }) {
  const { isCurrentAccountMissing, overviewData, providerValue } =
    useAccountOverviewState(routeData);

  if (isCurrentAccountMissing) {
    return <MissingCurrentAccountState RegistryComponent={RegistryComponent} />;
  }

  return (
    <AccountSectionStateProvider value={providerValue}>
      <AccountOverviewContent overviewData={overviewData} RegistryComponent={RegistryComponent} />
    </AccountSectionStateProvider>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/activity.js
// ============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useSeededFeedState } from '@/domains/account/hooks';
import { isPermissionDeniedError, logDataError } from '@/domains/account/utils';
import { fetchAccountActivityFeed } from '@/domains/account/client/account-api.client';
import AccountActivityFeed from '@/domains/account/ui/sections/feeds/activity';

function hasMatchingInitialFeed(initialFeed = null, resolvedUserId = null) {
  return Boolean(initialFeed?.userId && resolvedUserId && initialFeed.userId === resolvedUserId);
}

export default function AccountActivityOverview({
  canViewPrivateContent = false,
  emptyMessage = 'No activity yet',
  icon = 'solar:bolt-bold',
  initialFeed = null,
  isInitialSection = false,
  isOwner = false,
  isPrivateProfile = false,
  isViewerReady = false,
  limit = 5,
  revealDelay = 0,
  resolvedUserId = null,
  summaryLabel = '',
  title = 'Recent Activity',
  titleHref = null,
}) {
  const requestRef = useRef(0);
  const feedState = useSeededFeedState(initialFeed);
  const {
    applyFeedResult,
    feedError,
    hasMore,
    isFeedLoading,
    items,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    syncFeed,
    totalCount,
  } = feedState;

  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.floor(Number(limit)))
    : 5;

  const effectiveResolvedUserId = resolvedUserId || initialFeed?.userId || null;

  const hasInitialFeed = useMemo(
    () => hasMatchingInitialFeed(initialFeed, effectiveResolvedUserId),
    [initialFeed, effectiveResolvedUserId],
  );
  const hasUsableSeededFeed = useMemo(
    () => hasInitialFeed && Array.isArray(initialFeed?.items) && initialFeed.items.length > 0,
    [hasInitialFeed, initialFeed],
  );
  const [hasRequestedFeed, setHasRequestedFeed] = useState(hasUsableSeededFeed);

  useEffect(() => {
    if (!hasInitialFeed) {
      return;
    }

    syncFeed(initialFeed);
  }, [hasInitialFeed, initialFeed, syncFeed]);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!effectiveResolvedUserId) {
      setHasRequestedFeed(true);
      return;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setHasRequestedFeed(true);
      resetFeed();
      return;
    }

    if (hasUsableSeededFeed) {
      setHasRequestedFeed(true);
      setIsFeedLoading(false);
      return;
    }

    let ignore = false;

    async function loadFeed() {
      setHasRequestedFeed(true);
      setIsFeedLoading(true);
      setFeedError(null);

      try {
        const result = await fetchAccountActivityFeed({
          pageSize: normalizedLimit,
          scope: 'user',
          sort: 'newest',
          subject: 'all',
          userId: effectiveResolvedUserId,
        });

        if (ignore || requestRef.current !== requestId) {
          return;
        }

        applyFeedResult(result, { append: false });
      } catch (error) {
        if (ignore || requestRef.current !== requestId) {
          return;
        }

        resetFeed();

        if (!isPermissionDeniedError(error)) {
          logDataError('[AccountOverview] Activity feed could not be loaded:', error);
          setFeedError('Activity could not be loaded right now.');
        }
      } finally {
        if (!ignore && requestRef.current === requestId) {
          setIsFeedLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      ignore = true;
    };
  }, [
    applyFeedResult,
    canViewPrivateContent,
    effectiveResolvedUserId,
    hasUsableSeededFeed,
    isOwner,
    isPrivateProfile,
    normalizedLimit,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
  ]);

  const visibleItems = useMemo(
    () => (Array.isArray(items) ? items.slice(0, normalizedLimit) : []),
    [items, normalizedLimit],
  );
  const resolvedTotalCount = Number.isFinite(Number(totalCount))
    ? Math.max(visibleItems.length, Number(totalCount))
    : visibleItems.length;
  const isInitialFeedLoading =
    Boolean(effectiveResolvedUserId) && !hasUsableSeededFeed && !hasRequestedFeed;

  return (
    <AccountActivityFeed
      emptyMessage={emptyMessage}
      icon={icon}
      isInitialSection={isInitialSection}
      isLoading={isFeedLoading || isInitialFeedLoading}
      items={visibleItems}
      loadError={feedError}
      revealDelay={revealDelay}
      showSeeMore={Boolean(titleHref) && (hasMore || resolvedTotalCount > normalizedLimit)}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref}
      totalCount={resolvedTotalCount}
    />
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/favorites.js
// ============================================================================

'use client';

import AccountMediaOverviewSection from './media-overview-section';

export default function AccountFavoritesOverview({
  baseDelay,
  cardLimit = 5,
  emptyMessage = 'No favorites showcase yet',
  icon = 'solar:star-bold',
  isInitialSection = true,
  isLoading = false,
  isOwner = false,
  items = [],
  onRemoveItem,
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Favorites Showcase',
  titleHref = null,
  wideGrid = false,
}) {
  return (
    <AccountMediaOverviewSection
      baseDelay={baseDelay}
      cardLimit={cardLimit}
      emptyMessage={emptyMessage}
      icon={icon}
      isInitialSection={isInitialSection}
      isLoading={isLoading}
      items={items}
      renderOverlay={renderOverlay}
      revealDelay={revealDelay}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref}
      wideGrid={wideGrid}
      imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
    />
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/lists.js
// ============================================================================

'use client';

import AccountListCard from '@/domains/account/ui/components/lists/list-card';
import Icon from '@/ui/primitives/icon';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
const OVERVIEW_LIST_LIMIT = 6;
export default function AccountListsOverview({
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  isLoading = false,
  items = [],
  isOwner = false,
  onDeleteList = null,
  onEditList = null,
  ownerUsername = null,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Lists',
  titleHref = null,
  username,
}) {
  const visibleLists = Array.isArray(items) ? items.slice(0, OVERVIEW_LIST_LIMIT) : [];
  const resolvedOwnerUsername = ownerUsername || username || null;
  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref || (username ? `/account/${username}/lists` : null)}
    >
      {isLoading && visibleLists.length === 0 ? (
        <AccountInlineSectionLoading variant="list" />
      ) : visibleLists.length > 0 ? (
        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {visibleLists.map((list, index) => {
            return (
              <AccountListCard
                key={`${list?.ownerId || list?.ownerSnapshot?.id || resolvedOwnerUsername || 'owner'}-${list?.id || list?.slug || index}`}
                list={list}
                ownerUsername={resolvedOwnerUsername}
                renderActions={
                  isOwner &&
                  (typeof onDeleteList === 'function' || typeof onEditList === 'function')
                    ? (targetList) => (
                        <div className="flex items-center gap-1.5">
                          {typeof onEditList === 'function' ? (
                            <button
                              type="button"
                              aria-label={`Edit ${targetList.title}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onEditList(targetList);
                              }}
                              className="center size-8 cursor-pointer border border-white/5 text-white/70 transition-all duration-300 ease-in-out hover:bg-white/5 hover:text-white"
                            >
                              <Icon icon="solar:pen-bold" size={13} />
                            </button>
                          ) : null}
                          {typeof onDeleteList === 'function' ? (
                            <button
                              type="button"
                              aria-label={`Delete ${targetList.title}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onDeleteList(targetList);
                              }}
                              className="center hover:text-error size-8 cursor-pointer border border-white/5 text-white/70 transition-all duration-300 ease-in-out hover:bg-white/5"
                            >
                              <Icon icon="solar:trash-bin-trash-bold" size={13} />
                            </button>
                          ) : null}
                        </div>
                      )
                    : null
                }
              />
            );
          })}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/media-overview-section.js
// ============================================================================

'use client';

import { useMemo } from 'react';
import MediaCard from '@/domains/media/ui/components/media-card';
import { usePosterPreferenceVersion } from '@/domains/media/utils/poster-overrides';
import { toAccountMediaCard } from '@/domains/account/utils/media-card';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';

export default function AccountMediaOverviewSection({
  baseDelay,
  cardLimit = 6,
  emptyMessage,
  icon,
  isInitialSection = false,
  isLoading = false,
  items = [],
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
  wideGrid = false,
  imageSizes = '(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw',
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const cards = useMemo(
    () => items.map(toAccountMediaCard).filter(Boolean),
    [items, posterPreferenceVersion],
  );

  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      revealDelay={revealDelay}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {isLoading && cards.length === 0 ? (
        <AccountInlineSectionLoading />
      ) : cards.length > 0 ? (
        <div
          className={`grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 ${
            wideGrid ? 'lg:grid-cols-6' : ''
          }`}
        >
          {cards.slice(0, cardLimit).map((card, index) => {
            return (
              <div key={`${card.id}-${index}`} className="flex h-full min-w-0 flex-col">
                <MediaCard
                  className="w-full md:w-full lg:w-full"
                  href={card.href}
                  imageAlt={card.imageAlt}
                  imageSizes={imageSizes}
                  imageSrc={card.imageSrc}
                  tooltipText={card.tooltipText}
                  topOverlay={
                    typeof renderOverlay === 'function' ? renderOverlay(card.item, card) : null
                  }
                />
              </div>
            );
          })}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/overview-feed.js
// ============================================================================

'use client';

import { useCallback } from 'react';
import AccountActivityOverview from '@/domains/account/ui/sections/overview/activity';
import AccountFavoritesOverview from '@/domains/account/ui/sections/overview/favorites';
import AccountListsOverview from '@/domains/account/ui/sections/overview/lists';
import AccountReviewsOverview from '@/domains/account/ui/sections/overview/reviews';
import AccountWatchedOverview from '@/domains/account/ui/sections/overview/watched';
import AccountWatchlistOverview from '@/domains/account/ui/sections/overview/watchlist';
import { AccountPageShell } from '@/domains/account/ui/layouts/account-layout';
import { ProfileMediaActions } from '@/domains/account/ui/components/account-media-grid';
import { AccountSectionState } from '@/domains/account/ui/sections/account-section';

const LIMITS = { activity: 6, media: 6, favorites: 5, lists: 6 };

export default function AccountOverviewFeed({ overviewData = {}, RegistryComponent = null }) {
  const {
    auth = { isAuthenticated: false, isReady: false, user: null },
    authoredReviews = [],
    authoredReviewsError,
    authoredReviewsLoading,
    canViewPrivateContent = false,
    canViewProfileCollections = false,
    favoriteShowcase = [],
    followerCount = 0,
    followingCount = 0,
    followState,
    handleDeleteReview,
    handleEditReview,
    handleFollow,
    handleLikeReview,
    handleOpenFollowList,
    handleDeleteList,
    handleEditList,
    handleRequestRemoveLike,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
    hasMoreAuthoredReviews,
    initialActivityFeed = null,
    isFollowLoading = false,
    isListsLoading = false,
    isOwner = false,
    isPageLoading = false,
    isPrivateProfile = false,
    isLikesLoading = false,
    isViewerReady = false,
    isWatchedLoading = false,
    isWatchlistLoading = false,
    likeCount = 0,
    likedLists = [],
    likes = [],
    listCount = 0,
    lists = [],
    profile,
    profileHandle,
    resolvedUserId,
    username,
    watched = [],
    watchedCount = 0,
    watchlist = [],
    watchlistCount = 0,
  } = overviewData;

  const currentUserId = auth.user?.id || null;
  const buildHref = (suffix) => (profileHandle ? `/account/${profileHandle}${suffix}` : null);

  const hasFavorites = Array.isArray(favoriteShowcase) && favoriteShowcase.length > 0;
  const hasLikes = likeCount > 0 || (Array.isArray(likes) && likes.length > 0);
  const hasWatched = watchedCount > 0 || (Array.isArray(watched) && watched.length > 0);
  const hasWatchlist = watchlistCount > 0 || (Array.isArray(watchlist) && watchlist.length > 0);
  const hasLists = listCount > 0 || (Array.isArray(lists) && lists.length > 0);
  const initialActivityItems = Array.isArray(initialActivityFeed?.items)
    ? initialActivityFeed.items
    : [];
  const hasActivity =
    initialActivityItems.length > 0 || Number(initialActivityFeed?.totalCount || 0) > 0;
  const shouldRenderActivity = hasActivity || Boolean(resolvedUserId && canViewProfileCollections);
  const hasReviews = Array.isArray(authoredReviews) && authoredReviews.length > 0;

  const isOverviewEmpty =
    !isLikesLoading &&
    !isWatchedLoading &&
    !isWatchlistLoading &&
    !isListsLoading &&
    !authoredReviewsLoading &&
    !hasFavorites &&
    !hasLikes &&
    !hasWatched &&
    !hasWatchlist &&
    !hasLists &&
    !shouldRenderActivity &&
    !hasReviews;

  let sectionCounter = 0;

  const getSectionProps = () => {
    const index = sectionCounter++;
    return {
      isInitialSection: index === 0,
      baseDelay: index === 0 ? 0.06 : undefined,
      revealDelay: index,
    };
  };

  const renderFavoriteOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveLike}
          removeLabel={`Remove ${item.title || item.name} from favorites`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveLike, currentUserId],
  );

  const renderWatchlistOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveWatchlistItem}
          removeLabel={`Remove ${item.title || item.name} from watchlist`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveWatchlistItem, currentUserId],
  );

  const renderWatchedOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveWatchedItem}
          removeLabel={`Remove ${item.title || item.name} from watched`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveWatchedItem, currentUserId],
  );

  const renderLikesOverlay = useCallback(
    (item) =>
      isOwner ? (
        <ProfileMediaActions
          item={item}
          onRemoveItem={handleRequestRemoveLike}
          removeLabel={`Remove ${item.title || item.name} from likes`}
          currentUserId={currentUserId}
        />
      ) : null,
    [isOwner, handleRequestRemoveLike, currentUserId],
  );

  return (
    <AccountPageShell
      activeSection="overview"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isPageLoading || (!username && auth.isReady && !auth.isAuthenticated)}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      profile={profile}
      registry={RegistryComponent ? <RegistryComponent /> : null}
      resolvedUserId={resolvedUserId}
      skeletonVariant="overview"
      username={profileHandle}
      watchedCount={watchedCount}
      watchlistCount={watchlistCount}
    >
      <div className="w-full">
        {!canViewProfileCollections ? (
          <AccountSectionState message="This profile is private." />
        ) : isOverviewEmpty ? (
          <AccountSectionState message="This account has no activity or content yet." />
        ) : (
          <>
            {hasFavorites && (
              <AccountFavoritesOverview
                key="section-favorites"
                {...getSectionProps()}
                icon="solar:star-bold"
                isOwner={isOwner}
                items={favoriteShowcase.slice(0, LIMITS.favorites)}
                title="Favorites"
                titleHref={buildHref('/likes')}
                renderOverlay={renderFavoriteOverlay}
              />
            )}

            {(hasWatchlist || isWatchlistLoading) && (
              <AccountWatchlistOverview
                key="section-watchlist"
                {...getSectionProps()}
                icon="solar:bookmark-bold"
                isLoading={isWatchlistLoading}
                isOwner={isOwner}
                items={watchlist.slice(0, LIMITS.media)}
                onRemoveItem={handleRequestRemoveWatchlistItem}
                showSeeMore={watchlistCount > LIMITS.media}
                title="Watchlist"
                titleHref={buildHref('/watchlist')}
                renderOverlay={renderWatchlistOverlay}
              />
            )}

            {(hasWatched || isWatchedLoading) && (
              <AccountWatchedOverview
                key="section-watched"
                {...getSectionProps()}
                emptyMessage="No watched titles yet"
                icon="solar:eye-bold"
                isLoading={isWatchedLoading}
                items={watched.slice(0, LIMITS.media)}
                showSeeMore={watchedCount > LIMITS.media}
                title="Watched"
                titleHref={buildHref('/watched')}
                renderOverlay={renderWatchedOverlay}
              />
            )}

            {(hasLikes || isLikesLoading) && (
              <AccountFavoritesOverview
                key="section-likes"
                {...getSectionProps()}
                cardLimit={LIMITS.media}
                emptyMessage="No liked titles yet"
                icon="solar:heart-bold"
                isLoading={isLikesLoading}
                isOwner={isOwner}
                items={likes.slice(0, LIMITS.media)}
                showSeeMore={likeCount > LIMITS.media}
                title="Likes"
                titleHref={buildHref('/likes')}
                wideGrid
                renderOverlay={renderLikesOverlay}
              />
            )}

            {(hasLists || isListsLoading) && (
              <AccountListsOverview
                key="section-lists"
                {...getSectionProps()}
                icon="solar:list-broken"
                isLoading={isListsLoading}
                items={lists.slice(0, LIMITS.lists)}
                isOwner={isOwner}
                onDeleteList={handleDeleteList}
                onEditList={handleEditList}
                ownerUsername={profileHandle}
                showSeeMore={listCount > LIMITS.lists}
                title="Lists"
                titleHref={buildHref('/lists')}
              />
            )}

            {shouldRenderActivity && (
              <AccountActivityOverview
                key="section-activity"
                {...getSectionProps()}
                canViewPrivateContent={canViewPrivateContent}
                icon="solar:bolt-bold"
                initialFeed={initialActivityFeed}
                isOwner={isOwner}
                isPrivateProfile={isPrivateProfile}
                isViewerReady={isViewerReady}
                limit={LIMITS.activity}
                resolvedUserId={resolvedUserId}
                summaryLabel=""
                title="Recent Activity"
                titleHref={buildHref('/activity')}
              />
            )}

            {(hasReviews || authoredReviewsLoading) && (
              <AccountReviewsOverview
                key="section-reviews"
                {...getSectionProps()}
                currentUserId={currentUserId}
                icon="solar:chat-round-bold"
                isLoading={authoredReviewsLoading}
                items={authoredReviews}
                likedLists={likedLists}
                likes={likes}
                loadError={authoredReviewsError}
                onDeleteRequest={handleDeleteReview}
                onEdit={handleEditReview}
                onLike={handleLikeReview}
                showOwnActions={isOwner}
                showSeeMore={hasMoreAuthoredReviews}
                summaryLabel=""
                title="Recent Reviews"
                titleHref={buildHref('/reviews')}
              />
            )}
          </>
        )}
      </div>
    </AccountPageShell>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/reviews.js
// ============================================================================

'use client';

import { useMemo } from 'react';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import { Button } from '@/ui/primitives';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { buildMediaKeySet } from '@/domains/account/ui/filters/filtering';
const noop = () => {};

export default function AccountReviewsOverview({
  currentUserId = null,
  emptyMessage = 'No reviews yet',
  hasMore = false,
  icon = 'solar:chat-round-bold',
  isInitialSection = false,
  isLoading = false,
  isLoadingMore = false,
  items = [],
  loadError = null,
  likedLists = [],
  likes = [],
  onDeleteRequest = null,
  onEdit = null,
  onLike,
  onLoadMore = null,
  showOwnActions = false,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
  userProfile = null,
  watchedItems = [],
}) {
  const listedReviewCount = Array.isArray(items) ? items.length : 0;
  const resolvedSummaryLabel =
    summaryLabel === null ? `${listedReviewCount} Reviews` : summaryLabel;
  const likedMediaKeys = useMemo(() => {
    const set = buildMediaKeySet(likes);
    const listSet = buildMediaKeySet(likedLists);
    listSet.forEach((key) => set.add(key));
    return set;
  }, [likes, likedLists]);
  const watchedMediaKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(
    () => buildMediaKeySet(watchedItems, (item) => Number(item?.watchCount || 0) > 1),
    [watchedItems],
  );
  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {isLoading && listedReviewCount === 0 ? (
        <AccountInlineSectionLoading variant="review" />
      ) : listedReviewCount === 0 && loadError ? (
        <AccountInlineSectionState>{loadError}</AccountInlineSectionState>
      ) : listedReviewCount === 0 ? (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      ) : (
        <ReviewList
          currentUserId={currentUserId}
          displayVariant="account"
          isInitialSection={isInitialSection}
          isLoading={false}
          loadError={null}
          onDeleteRequest={onDeleteRequest || noop}
          onEdit={onEdit || noop}
          onLike={onLike}
          likedMediaKeys={likedMediaKeys}
          rewatchMediaKeys={rewatchMediaKeys}
          showOwnActions={showOwnActions}
          showSubject={true}
          sortedReviews={items}
          userProfile={userProfile}
          watchedMediaKeys={watchedMediaKeys}
          accountMotion
        />
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="border border-white/10 bg-black/50 px-6 py-3 text-xs font-semibold tracking-widest text-white/70 uppercase"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/watched.js
// ============================================================================

'use client';

import AccountMediaOverviewSection from './media-overview-section';

export default function AccountWatchedOverview({
  baseDelay,
  emptyMessage = 'No watched titles yet',
  icon = 'solar:eye-bold',
  isInitialSection = false,
  isLoading = false,
  items = [],
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Watched',
  titleHref = null,
  username,
}) {
  return (
    <AccountMediaOverviewSection
      baseDelay={baseDelay}
      cardLimit={6}
      emptyMessage={emptyMessage}
      icon={icon}
      isInitialSection={isInitialSection}
      isLoading={isLoading}
      items={items}
      renderOverlay={renderOverlay}
      revealDelay={revealDelay}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref || (username ? `/account/${username}/watched` : null)}
      wideGrid={true}
      imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
    />
  );
}


// ============================================================================
// FILE: domains/account/ui/sections/overview/watchlist.js
// ============================================================================

'use client';

import { useState } from 'react';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import AccountMediaOverviewSection from './media-overview-section';

export default function AccountWatchlistOverview({
  baseDelay,
  emptyMessage = 'Watchlist empty',
  icon = 'solar:bookmark-bold',
  isInitialSection = false,
  isLoading = false,
  isOwner = false,
  items = [],
  onRemoveItem,
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Watchlist',
  titleHref = null,
  username,
}) {
  const [pendingItemId, setPendingItemId] = useState(null);

  const handleRenderOverlay = (item, card) => {
    if (typeof renderOverlay === 'function') {
      return renderOverlay(item);
    }

    if (isOwner && typeof onRemoveItem === 'function') {
      return (
        <div className="absolute inset-x-0 top-0 flex justify-end p-2">
          <Button
            variant="destructive-icon"
            className="text-error hover:border-error hover:bg-error border border-white/15 bg-black hover:text-black"
            aria-label={`Remove ${card.imageAlt} from ${title.toLowerCase()}`}
            disabled={pendingItemId === card.id}
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (pendingItemId === card.id) {
                return;
              }
              setPendingItemId(card.id);
              try {
                await onRemoveItem(item);
              } finally {
                setPendingItemId((currentId) => (currentId === card.id ? null : currentId));
              }
            }}
          >
            <Icon icon="solar:trash-bin-trash-bold" size={16} />
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <AccountMediaOverviewSection
      baseDelay={baseDelay}
      cardLimit={6}
      emptyMessage={emptyMessage}
      icon={icon}
      isInitialSection={isInitialSection}
      isLoading={isLoading}
      items={items}
      renderOverlay={handleRenderOverlay}
      revealDelay={revealDelay}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref || (username ? `/account/${username}/watchlist` : null)}
      wideGrid={true}
      imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
    />
  );
}


// ============================================================================
// FILE: domains/account/ui/skeletons/account-section-skeletons.js
// ============================================================================

'use client';

import { GridShellCrosshairs } from '@/ui/layout/grid-crosshair';
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/shared/constants';

const S = 'skeleton-block';
const SOFT = 'skeleton-block-soft';

const HEADER_PADDING_CLASS = 'min-h-14 px-4';
const CONTENT_PADDING_CLASS = 'p-6';
const TOOLBAR_PADDING_CLASS = 'min-h-14 px-4 flex items-center';

/** The loading state uses the same full-width bands and rules as AccountSectionLayout. */
function SectionSkeleton({
  titleWidth = 'w-32',
  summary = true,
  showHeader = true,
  children,
  contentClassName = '',
  isInitialSection = true,
  showTopRule = true,
  toolbar = null,
}) {
  return (
    <section className="relative bg-transparent">
      <div className={`${ACCOUNT_SECTION_SHELL_CLASS} relative`}>
        {showTopRule ? (
          <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
            <GridShellCrosshairs />
          </div>
        ) : null}
        {showHeader ? (
          <div className={`relative flex w-full flex-col`}>
            <div
              className={`flex w-full items-center justify-between gap-4 ${HEADER_PADDING_CLASS}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className={`size-5 shrink-0 ${S}`} />
                <div className={`h-3 ${titleWidth} ${S}`} />
              </div>
              {summary ? <div className={`h-3 w-16 shrink-0 ${SOFT}`} /> : null}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
              <GridShellCrosshairs />
            </div>
          </div>
        ) : null}
        {toolbar ? (
          <div className={`relative ${TOOLBAR_PADDING_CLASS}`}>
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
              <GridShellCrosshairs />
            </div>
            {toolbar}
          </div>
        ) : null}
        <div className={`${CONTENT_PADDING_CLASS} ${contentClassName}`}>{children}</div>
      </div>
    </section>
  );
}

export function SectionHeadingSkeleton({ titleWidth = 'w-32' }) {
  return (
    <div className="relative flex w-full flex-col">
      <div className={`${HEADER_PADDING_CLASS} flex w-full items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-center gap-2">
          <div className={`size-5 shrink-0 ${S}`} />
          <div className={`h-3 ${titleWidth} ${S}`} />
        </div>
        <div className={`h-3 w-16 ${SOFT}`} />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
        <GridShellCrosshairs />
      </div>
    </div>
  );
}

export function PosterCardsSkeletonRow({ count = 6, wideGrid = true }) {
  return (
    <div
      className={`grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 ${wideGrid ? 'lg:grid-cols-6' : ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`aspect-[2/3] w-full ${S}`}
          style={{ animationDelay: `${i * 45}ms` }}
        />
      ))}
    </div>
  );
}

export function MediaCardsSkeletonGrid({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`aspect-[2/3] w-full ${S}`}
          style={{ animationDelay: `${i * 45}ms` }}
        />
      ))}
    </div>
  );
}

const ACTIVITY_LINE_WIDTHS = ['w-3/4', 'w-2/3', 'w-4/5', 'w-1/2', 'w-3/5', 'w-2/5'];

export function ActivityItemsSkeletonList({ count = 6 }) {
  return (
    <div className="w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-white/10 py-5 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="min-w-0 space-y-2 pt-0.5">
            <div className={`h-4 ${ACTIVITY_LINE_WIDTHS[i % ACTIVITY_LINE_WIDTHS.length]} ${S}`} />
            {i % 3 === 0 ? <div className={`h-3 w-2/5 ${SOFT}`} /> : null}
          </div>
          <div className={`mt-0.5 h-3.5 w-7 shrink-0 ${SOFT}`} />
        </div>
      ))}
    </div>
  );
}

function SingleListCardSkeleton({ delay = 0 }) {
  const previewPosters = [0, 1, 2, 3, 4].map((index) => {
    const distanceFromCenter = Math.abs(index - 2);
    const normalizedPosition = (index / 4) * 2 - 1;

    return {
      opacity: distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.64 : 0.36,
      scale: distanceFromCenter === 0 ? 1.05 : distanceFromCenter === 1 ? 0.95 : 0.88,
      x: -76 + index * 38,
      y: 6 + (-16 * (1 - distanceFromCenter / 2) || 0),
      zIndex: 10 - distanceFromCenter,
      rotate: normalizedPosition * 10,
    };
  });

  return (
    <article className="relative w-full" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative h-[232px] w-full border border-white/10 bg-black/40">
        <div className="absolute inset-0">
          {previewPosters.map((poster, index) => (
            <div
              key={index}
              className="absolute top-0 left-1/2 h-[156px] w-[98px] overflow-hidden border border-white/10 bg-white/5"
              style={{
                opacity: poster.opacity,
                transform: `translateX(calc(-50% + ${poster.x}px)) translateY(${poster.y}px) rotate(${poster.rotate}deg) scale(${poster.scale})`,
                zIndex: poster.zIndex,
                animationDelay: `${delay + index * 45}ms`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden border border-white/10 bg-black">
        <div className="px-4 py-4">
          <div className={`h-5 w-2/3 ${S}`} />
          <div className={`mt-2 h-3.5 w-full ${SOFT}`} />
          <div className={`mt-1.5 h-3.5 w-4/5 ${SOFT}`} />
        </div>
        <div className="flex h-11 items-center justify-between border-t border-white/10 px-3">
          <div className={`h-3 w-24 ${SOFT}`} />
          <div className={`h-3 w-20 ${SOFT}`} />
        </div>
      </div>
    </article>
  );
}

export function ListCardsSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SingleListCardSkeleton key={i} delay={i * 60} />
      ))}
    </div>
  );
}

const REVIEW_TITLE_WIDTHS = ['w-48', 'w-36', 'w-52', 'w-40'];

export function ReviewCardsSkeletonList({ count = 4 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-white/10 py-3.5 first:pt-0 last:border-b-0 last:pb-0 sm:py-4 sm:first:pt-0 sm:last:pb-0"
        >
          <div className={`h-24 w-16 shrink-0 sm:h-28 sm:w-[72px] ${S}`} />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className={`h-4 ${REVIEW_TITLE_WIDTHS[i % REVIEW_TITLE_WIDTHS.length]} ${S}`} />
              <div className={`h-6 w-14 shrink-0 ${S}`} />
            </div>
            <div className={`h-3.5 w-full ${SOFT}`} />
            <div className={`h-3.5 w-3/4 ${SOFT}`} />
            <div className={`mt-1 h-3 w-20 ${SOFT}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountMediaGridSkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <MediaCardsSkeletonGrid />
    </SectionSkeleton>
  );
}

export function AccountActivitySkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <ActivityItemsSkeletonList count={8} />
    </SectionSkeleton>
  );
}

export function AccountReviewsSkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <ReviewCardsSkeletonList count={6} />
    </SectionSkeleton>
  );
}

export function AccountListsSkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <ListCardsSkeletonGrid count={6} />
    </SectionSkeleton>
  );
}

export function AccountListDetailSkeleton() {
  return (
    <div className="w-full">
      <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
        <MediaCardsSkeletonGrid />
      </SectionSkeleton>

      <SectionSkeleton titleWidth="w-24" toolbar={<FilterBarSkeleton />}>
        <ReviewCardsSkeletonList count={3} />
      </SectionSkeleton>
    </div>
  );
}

export function AccountOverviewSkeleton() {
  return (
    <div className="w-full">
      <SectionSkeleton summary={false} titleWidth="w-24" isInitialSection>
        <PosterCardsSkeletonRow count={5} wideGrid={false} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-28" isInitialSection={false}>
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-24" isInitialSection={false}>
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-14" isInitialSection={false}>
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-16" isInitialSection={false}>
        <ListCardsSkeletonGrid count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-28" isInitialSection={false}>
        <ActivityItemsSkeletonList count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-28" isInitialSection={false}>
        <ReviewCardsSkeletonList count={6} />
      </SectionSkeleton>
    </div>
  );
}

function AccountEditSectionSkeleton({ children, titleWidth = 'w-20' }) {
  return (
    <section className="relative bg-transparent">
      <div className={`${ACCOUNT_SECTION_SHELL_CLASS} relative flex flex-col`}>
        <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
        <div className="relative flex min-h-14 w-full items-center px-4">
          <div className={`h-3 ${titleWidth} ${S}`} />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
            <GridShellCrosshairs />
          </div>
        </div>
        <div className="flex flex-col gap-4 p-6">{children}</div>
      </div>
    </section>
  );
}

function AccountEditFieldSkeleton({ className = '', multiline = false, labelWidth = 'w-20' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className={`h-2.5 ${labelWidth} ${SOFT}`} />
      <div
        className={`${multiline ? 'h-[150px]' : 'h-11'} w-full border border-white/5 bg-white/5 ${S}`}
      />
    </div>
  );
}

function AccountEditMediaFieldSkeleton({ previewClassName }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_172px] lg:items-start">
      <div className="space-y-3">
        <AccountEditFieldSkeleton labelWidth="w-16" />
        <div className="flex gap-2">
          <div className={`h-10 w-36 ${S}`} />
          <div className={`h-10 w-16 ${SOFT}`} />
        </div>
      </div>
      <div
        className={`${previewClassName} w-full overflow-hidden border border-white/10 bg-white/5 ${S}`}
      />
    </div>
  );
}

export function AccountEditSkeleton() {
  return (
    <div className="flex flex-col">
      <AccountEditSectionSkeleton titleWidth="w-14">
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountEditFieldSkeleton labelWidth="w-20" />
          <AccountEditFieldSkeleton labelWidth="w-16" />
        </div>
        <AccountEditFieldSkeleton multiline labelWidth="w-10" />
      </AccountEditSectionSkeleton>

      <AccountEditSectionSkeleton titleWidth="w-28">
        <AccountEditMediaFieldSkeleton previewClassName="aspect-square" />
        <div className="h-px w-full bg-white/10" />
        <AccountEditMediaFieldSkeleton previewClassName="aspect-[16/7]" />
      </AccountEditSectionSkeleton>

      <AccountEditSectionSkeleton titleWidth="w-16">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className={`h-2.5 w-20 ${SOFT}`} />
            <div className={`h-3 w-64 max-w-full ${SOFT}`} />
          </div>
          <div className={`h-6 w-11 shrink-0 ${S}`} />
        </div>
      </AccountEditSectionSkeleton>
    </div>
  );
}

export function FilterBarSkeleton({ count = 4 }) {
  const widths = ['w-28', 'w-24', 'w-36', 'w-20'];
  return (
    <div className="flex w-full items-center justify-between gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-1 items-center justify-center gap-1.5">
          <div
            className={`h-2.5 ${widths[index % widths.length]} ${SOFT}`}
            style={{ animationDelay: `${index * 60}ms` }}
          />
          <div
            className={`h-2 w-2.5 shrink-0 ${SOFT}`}
            style={{ animationDelay: `${index * 60 + 30}ms` }}
          />
        </div>
      ))}
    </div>
  );
}


// ============================================================================
// FILE: domains/account/ui/skeletons/account-skeleton-layout.js
// ============================================================================

'use client';

import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import AccountGridFrame from '../layouts/account-grid-frame';
import { GridShellCrosshairs } from '@/ui/layout/grid-crosshair';

const SECTION_ITEMS = ['Overview', 'Activity', 'Likes', 'Watched', 'Watchlist', 'Reviews', 'Lists'];

export function AccountSectionNavSkeleton({ activeTab = 'overview' }) {
  return (
    <div className="relative w-full bg-transparent">
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
        <GridShellCrosshairs />
      </div>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="grid h-14 w-full auto-cols-[6.75rem] grid-flow-col divide-x divide-white/10 overflow-x-auto [scrollbar-width:none] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-7 [&::-webkit-scrollbar]:hidden">
          {SECTION_ITEMS.map((label) => {
            const isSelected = label.toLowerCase() === activeTab.toLowerCase();
            return (
              <div key={label} className="h-14 p-2 sm:min-w-0">
                <div className={`center h-full w-full px-2 ${isSelected ? 'bg-white' : ''}`}>
                  <div
                    className={`h-2.5 w-12 ${isSelected ? 'bg-black/70' : 'skeleton-block-soft'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AccountHeroSkeleton() {
  return (
    <section className="relative flex min-h-[280px] w-full flex-col items-center gap-5 py-2 text-center sm:gap-7 sm:py-4 lg:gap-8">
      {/* Avatar & Title Row (Matches AccountHero 1-to-1) */}
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <div className="skeleton-block relative h-12 w-12 shrink-0 bg-black/40 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
        <div className="skeleton-block h-10 w-40 sm:h-12 sm:w-44 lg:h-14 lg:w-48" />
      </div>

      {/* Stats Row Under Title (Matches AccountHero 6 items 1-to-1) */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 text-sm sm:text-base">
        {['w-16', 'w-14', 'w-12', 'w-12', 'w-14', 'w-14'].map((width, index) => (
          <div key={index} className={`skeleton-block-soft h-4 ${width}`} />
        ))}
      </div>

      {/* Biography Lines (Matches AccountHero 1-to-1) */}
      <div className="mx-auto flex w-full max-w-[72ch] flex-col items-center gap-2 px-4">
        <div className="skeleton-block-soft h-4 w-full max-w-[50ch] sm:h-5" />
        <div className="skeleton-block-soft h-4 w-[88%] max-w-[44ch] sm:h-5" />
        <div className="skeleton-block-soft h-4 w-2/3 max-w-[32ch] sm:h-5" />
        <div className="skeleton-block-soft mt-1 h-3 w-16" />
      </div>
    </section>
  );
}

export function AccountSkeletonLayout({ activeTab = 'overview', children }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <AccountGridFrame />
      <div
        className={`relative z-10 mx-auto flex w-full ${ACCOUNT_ROUTE_SHELL_CLASS} flex-col gap-6 pb-12 sm:gap-8`}
      >
        <div className="absolute inset-x-0 top-0 z-20">
          <AccountSectionNavSkeleton activeTab={activeTab} />
        </div>

        <div className="mt-28 flex w-full flex-col items-center gap-8 sm:mt-36 sm:gap-12 lg:mt-44 lg:gap-16">
          <AccountHeroSkeleton />

          <main className="w-full pt-4 pb-6 text-left sm:pt-6 sm:pb-8">{children}</main>
        </div>
      </div>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}


// ============================================================================
// FILE: domains/account/utils/avatar.js
// ============================================================================

import { isValidUrl, resolveVersionedImageUrl } from '@/shared/utils';

const DEFAULT_USER_AVATAR = '/images/default-avatar.svg';

function resolveAvatarSource(user) {
  if (typeof user === 'string') {
    return user;
  }

  return user?.displayName || user?.name || user?.username || user?.email || user?.id || '';
}

function normalizeAvatarUrl(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  const lowered = normalized.toLowerCase();

  if (
    lowered === 'null' ||
    lowered === 'undefined' ||
    lowered === 'http://' ||
    lowered === 'https://'
  ) {
    return '';
  }

  if (normalized.startsWith('/') || normalized.startsWith('data:image/')) {
    return normalized;
  }

  return isValidUrl(normalized) ? resolveVersionedImageUrl(normalized) : '';
}

function resolveAvatarUrlCandidate(user = {}) {
  if (typeof user === 'string') {
    return normalizeAvatarUrl(user);
  }

  const candidates = [user?.avatarUrl, user?.avatar_url];

  for (const candidate of candidates) {
    const normalized = normalizeAvatarUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function getAvatarInitial(user, fallback = 'A') {
  const source = String(resolveAvatarSource(user) || '')
    .trim()
    .replace(/^@+/, '');

  if (!source) {
    return fallback;
  }

  const firstCharacter = source.includes('@') ? source.split('@')[0]?.[0] : source[0];

  return String(firstCharacter || fallback).toUpperCase();
}

function createInitialAvatarDataUrl(letter = 'A') {
  const normalizedLetter = String(letter || 'A')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const svg = `
 <svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
 <rect width="256" height="256" fill="#F5F5F4"/>
 <text
 x="50%"
 y="50%"
 text-anchor="middle"
 dominant-baseline="central"
 fill="#111111"
 font-family="ui-sans-serif, system-ui, sans-serif"
 font-size="104"
 font-weight="600"
 >
 ${normalizedLetter}
 </text>
 </svg>
 `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarFallbackUrl(user = {}, fallbackUrl = DEFAULT_USER_AVATAR) {
  const fallbackInitial = getAvatarInitial(user);

  if (fallbackInitial) {
    return createInitialAvatarDataUrl(fallbackInitial);
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl);
  return normalizedFallback || DEFAULT_USER_AVATAR;
}

export function getUserAvatarUrl(user = {}) {
  const rawAvatarUrl = resolveAvatarUrlCandidate(user);

  if (rawAvatarUrl) {
    return rawAvatarUrl;
  }

  return getUserAvatarFallbackUrl(user);
}

export function getAvatarFallback(user = {}) {
  return getUserAvatarUrl(user);
}

export function applyAvatarFallback(event, fallbackUrl = DEFAULT_USER_AVATAR) {
  const target = event?.currentTarget;

  if (!target || typeof target !== 'object') {
    return;
  }

  if (target.dataset?.avatarFallbackApplied === 'true') {
    return;
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl) || DEFAULT_USER_AVATAR;

  if (target.dataset) {
    target.dataset.avatarFallbackApplied = 'true';
  }

  target.src = normalizedFallback;
}


// ============================================================================
// FILE: domains/account/utils/constants.js
// ============================================================================

// ============================================================
// Account Constants & Select Queries
// ============================================================

export const ACCOUNT_SECTION_KEYS = Object.freeze([
  'activity',
  'likes',
  'watched',
  'watchlist',
  'reviews',
  'lists',
]);

export const RESERVED_ACCOUNT_SEGMENTS = new Set([...ACCOUNT_SECTION_KEYS, 'edit']);

export const DEFAULT_MEDIA_BUCKET = 'profile-media';
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_BYTES_BY_TARGET = Object.freeze({
  avatar: 3 * 1024 * 1024,
  banner: MAX_UPLOAD_BYTES,
});

export const ACCOUNT_MEDIA_UPLOAD_CONFIG = Object.freeze({
  avatar: Object.freeze({
    buttonLabel: 'Select Avatar',
    description: 'Pick an image to use as your profile avatar (max 3MB)',
    hint: 'PNG, JPG, WEBP, AVIF or GIF up to 3MB',
    target: 'avatar',
    title: 'Upload Avatar',
  }),
  banner: Object.freeze({
    buttonLabel: 'Select Banner',
    description: 'Pick an image to display at the top of your profile (max 8MB)',
    hint: 'PNG, JPG, WEBP, AVIF or GIF up to 8MB',
    target: 'banner',
    title: 'Upload Banner',
  }),
});

export const MIME_EXTENSION_MAP = Object.freeze({
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
export const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_MAP));
export const AVIF_BRANDS = new Set(['avif', 'avis']);

export const MEDIA_COLLECTION_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const LIST_COLLECTION_SELECT = [
  'created_at',
  'description',
  'id',
  'likes_count',
  'payload',
  'poster_path',
  'reviews_count',
  'slug',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const LIST_ITEM_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'position',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const WATCHED_SELECT = [
  'backdrop_path',
  'created_at',
  'entity_id',
  'entity_type',
  'last_watched_at',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
  'watch_count',
].join(',');

export const ACTIVITY_SELECT = [
  'created_at',
  'dedupe_key',
  'event_type',
  'id',
  'payload',
  'updated_at',
  'user_id',
].join(',');

export const ACTIVITY_SUBJECT_FILTERS = new Set(['all', 'list', 'movie', 'tv']);
export const ACTIVITY_SORT_MODES = new Set(['newest', 'oldest']);
export const FOLLOW_STATUS_ACCEPTED = 'accepted';

export const ACCOUNT_READ_FUNCTION = 'account-read';
export const ACCOUNT_WRITE_FUNCTION = 'account-write';

export const EMPTY_EDITABLE_ACCOUNT_COUNTS = Object.freeze({
  followers: 0,
  following: 0,
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
});

export const ACCOUNT_PROFILE_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'email',
  'favorite_showcase',
  'id',
  'is_private',
  'last_activity_at',
  'updated_at',
  'username',
  'username_lower',
].join(',');

export const COUNTER_SELECT = [
  'follower_count',
  'following_count',
  'likes_count',
  'lists_count',
  'watched_count',
  'watchlist_count',
].join(',');

export const PROFILE_COUNTERS_TIMEOUT_MS = 1200;
export const FOLLOW_COUNTS_TIMEOUT_MS = 1200;

export const OVERVIEW_ACTIVITY_LIMIT = 36;
export const OVERVIEW_LIKES_LIMIT = 12;
export const OVERVIEW_LISTS_LIMIT = 6;
export const OVERVIEW_REVIEW_LIMIT = 6;
export const OVERVIEW_WATCHED_LIMIT = 12;
export const OVERVIEW_WATCHLIST_LIMIT = 12;
export const ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS = 2400;
export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_ROUTE_FEED = Object.freeze({
  hasMore: false,
  items: EMPTY_ARRAY,
  nextCursor: null,
});


// ============================================================================
// FILE: domains/account/utils/feedback.js
// ============================================================================

import { EVENT_TYPES, globalEvents } from '@/shared/constants/events';
import { isPermissionDeniedError } from './validation.js';

const DEFAULT_ACCOUNT_FEEDBACK_PRIORITY = 112;
const DEFAULT_ACCOUNT_FEEDBACK_THEME_TYPE = 'LOGIN';

export const ACCOUNT_FEEDBACK_CONFIG = Object.freeze({
  'account-delete': Object.freeze({
    description: 'Deleting account and removing active access',
    icon: 'solar:danger-triangle-bold',
    statusType: 'ACCOUNT_DELETE',
    successDescription: 'Account deleted successfully',
    successTitle: 'Account Deleted',
    title: 'Deleting Account',
  }),
  'account-update': Object.freeze({
    description: 'Saving profile changes',
    icon: 'solar:user-circle-bold',
    statusType: 'ACCOUNT_UPDATE',
    successDescription: 'Profile changes saved',
    successTitle: 'Account Updated',
    title: 'Updating Account',
  }),
  'email-change': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:letter-bold',
    statusType: 'EMAIL_CHANGE',
    successDescription: 'Please sign in again with your new email',
    successTitle: 'Email Updated',
    title: 'Updating Email',
  }),
  'email-update': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:letter-bold',
    statusType: 'EMAIL_CHANGE',
    successDescription: 'Please sign in again with your new email',
    successTitle: 'Email Updated',
    title: 'Updating Email',
  }),
  'google-link': Object.freeze({
    description: 'Preparing secure provider connection',
    icon: 'flat-color-icons:google',
    statusType: 'GOOGLE_LINK',
    successDescription: 'Google sign-in is now linked to this account',
    successTitle: 'Google Linked',
    title: 'Linking Google',
  }),
  'password-change': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'PASSWORD_CHANGE',
    successDescription: 'Please sign in again with your new password',
    successTitle: 'Password Updated',
    title: 'Updating Password',
  }),
  'password-set': Object.freeze({
    description: 'Adding password sign-in to your account',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'PASSWORD_SET',
    successDescription: 'Please sign in again with your new password',
    successTitle: 'Password Added',
    title: 'Setting Password',
  }),
  'password-update': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'PASSWORD_CHANGE',
    successDescription: 'Please sign in again with your new password',
    successTitle: 'Password Updated',
    title: 'Updating Password',
  }),
});

function resolveAccountFeedbackConfig(flow) {
  return (
    ACCOUNT_FEEDBACK_CONFIG[
      String(flow || '')
        .trim()
        .toLowerCase()
    ] || {}
  );
}

export function notifyAccountLoadError(toast, error, fallbackMessage) {
  if (!toast || isPermissionDeniedError(error) || process.env.NODE_ENV === 'production') {
    return;
  }
  toast.error(error?.message || fallbackMessage);
}

export function emitAccountFeedback(flow, phase, overrides = {}) {
  const config = resolveAccountFeedbackConfig(flow);

  globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
    flow,
    phase,
    statusType:
      overrides.statusType ||
      config.statusType ||
      String(flow || 'ACCOUNT_FEEDBACK')
        .trim()
        .toUpperCase(),
    title:
      overrides.title ||
      (phase === 'success'
        ? config.successTitle || config.title || 'Account'
        : config.title || 'Account'),
    description:
      overrides.description ??
      (phase === 'success'
        ? config.successDescription || config.description || ''
        : config.description || ''),
    icon: overrides.icon || config.icon || 'solar:user-circle-bold',
    themeType: overrides.themeType || config.themeType || DEFAULT_ACCOUNT_FEEDBACK_THEME_TYPE,
    priority: overrides.priority ?? config.priority ?? DEFAULT_ACCOUNT_FEEDBACK_PRIORITY,
    ...(overrides.duration != null ? { duration: overrides.duration } : {}),
    ...(overrides.isOverlay != null ? { isOverlay: overrides.isOverlay } : {}),
  });
}

export function clearAccountFeedback(flow) {
  emitAccountFeedback(flow, 'clear');
}


// ============================================================================
// FILE: domains/account/utils/filtering-query-utils.js
// ============================================================================

export function normalizePage(value, fallback = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function parsePageFromSearch(searchParams, fallback = 1) {
  return normalizePage(searchParams?.get?.('page') || fallback, fallback);
}

export function buildManagedQueryString(
  searchParams,
  { managedKeys = [], values = {}, resetPage = true } = {},
) {
  const params = new URLSearchParams(searchParams?.toString?.() || '');

  managedKeys.forEach((key) => {
    params.delete(key);
  });

  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  if (resetPage) {
    params.delete('page');
  }

  return params.toString();
}

export function buildCollectionBasePath(pathname = '', searchParams = null) {
  const normalizedPathname = String(pathname || '').replace(/\/page\/\d+$/i, '') || pathname;
  const params = new URLSearchParams(searchParams?.toString?.() || '');
  params.delete('page');

  const queryString = params.toString();

  if (!queryString) {
    return normalizedPathname;
  }

  return `${normalizedPathname}?${queryString}`;
}


// ============================================================================
// FILE: domains/account/utils/filtering-shared.js
// ============================================================================

const RATING_MODE_SET = new Set(['any', 'none', 'range']);
const STAR_STEP_VALUES = Object.freeze([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);

export function normalizeString(value) {
  return String(value || '').trim();
}

export function normalizeToken(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function normalizeFiniteNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRatingMode(value, fallback = 'any') {
  const normalized = normalizeString(value).toLowerCase();
  return RATING_MODE_SET.has(normalized) ? normalized : fallback;
}

export function normalizeStarValue(value, fallback = 0.5) {
  const parsed = normalizeFiniteNumber(value, fallback);
  const clamped = clamp(parsed, 0.5, 5);
  return Math.round(clamped * 2) / 2;
}

export function parseFlagSet(value) {
  if (!value) {
    return new Set();
  }

  return new Set(
    String(value)
      .split(',')
      .map((item) => normalizeToken(item))
      .filter(Boolean),
  );
}

export function serializeFlagSet(flagSet) {
  if (!(flagSet instanceof Set) || flagSet.size === 0) {
    return '';
  }

  return [...flagSet].sort().join(',');
}

export function matchesRange(value, min, max) {
  if (value === null || value === undefined) {
    return false;
  }

  return value >= min && value <= max;
}

export function isSameFilterState(left, right, keys = []) {
  return keys.every((key) => left[key] === right[key]);
}

export function buildHash(value) {
  const normalized = normalizeString(value);
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getStarStepValues() {
  return STAR_STEP_VALUES;
}


// ============================================================================
// FILE: domains/account/utils/formatting.js
// ============================================================================

import { FOLLOW_STATUSES } from '@/domains/social/utils';

export function getMediaTitle(item = {}) {
  return item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled';
}

export function removeAccountCollectionItem(items = [], itemToRemove) {
  const removedId = String(itemToRemove?.entityId || itemToRemove?.id || '').trim();
  const removedType = String(itemToRemove?.media_type || itemToRemove?.entityType || '')
    .trim()
    .toLowerCase();

  return items.filter((item) => {
    if (itemToRemove?.mediaKey && item?.mediaKey) {
      return item.mediaKey !== itemToRemove.mediaKey;
    }
    return (
      String(item?.entityId || item?.id || '').trim() !== removedId ||
      String(item?.media_type || item?.entityType || '')
        .trim()
        .toLowerCase() !== removedType
    );
  });
}

export function formatPaginationSummaryLabel({
  emptyLabel = '0 items',
  pageSize,
  startIndex,
  totalCount,
}) {
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return emptyLabel;
  }
  const safeStart = Math.max(0, Number(startIndex) || 0);
  const safeSize = Math.max(1, Number(pageSize) || 1);
  const visibleFrom = safeStart + 1;
  const visibleTo = Math.min(safeStart + safeSize, totalCount);

  return `${visibleFrom}-${visibleTo} of ${totalCount}`;
}

export function buildAccountCollectionPageHref(basePath, pageNumber) {
  if (!basePath) return '';
  const [pathname, search = ''] = basePath.split('?');
  const params = new URLSearchParams(search);

  if (pageNumber <= 1) {
    params.delete('page');
  } else {
    params.set('page', String(pageNumber));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getFollowState(followRelationship) {
  if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) return 'following';
  if (followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING) return 'requested';
  if (followRelationship.showFollowBack) return 'follow_back';
  return 'follow';
}


// ============================================================================
// FILE: domains/account/utils/index.js
// ============================================================================

export * from './constants.js';
export * from './validation.js';
export * from './avatar.js';
export * from './formatting.js';
export * from './feedback.js';
export * from './security.js';
export * from './supabase.js';
export * from './uuid.js';


// ============================================================================
// FILE: domains/account/utils/media-card.js
// ============================================================================

import { TMDB_IMG } from '@/shared/constants';
import { getPreferredMoviePosterSrc } from '@/domains/media/utils/poster-overrides';

export function toAccountMediaCard(item = {}) {
  const mediaType = item.media_type || item.entityType;
  const detailId = item.entityId || item.id;
  if (!detailId || (mediaType !== 'movie' && mediaType !== 'tv')) return null;

  const title = item.title || item.original_title || item.name || item.original_name || 'Untitled';
  const year = item.release_date?.slice?.(0, 4) || item.first_air_date?.slice?.(0, 4) || null;
  const preferredPoster = mediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  const imageSrc =
    preferredPoster ||
    item.poster_path_full ||
    (item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null);

  return {
    href: `/${mediaType}/${detailId}`,
    id: item.mediaKey || `${mediaType}-${detailId}`,
    imageAlt: title,
    imageSrc,
    item,
    tooltipText: year ? `${title} (${year})` : title,
  };
}

export function getCanonicalMediaKey(item = {}) {
  if (!item) return '';
  const rawType = item?.entityType || item?.media_type || item?.type || '';
  const rawId = String(item?.entityId ?? item?.id ?? '').trim();

  if (item?.mediaKey) {
    const key = String(item.mediaKey).trim();
    if (key.includes('-')) return key.replace('-', '_');
    return key;
  }

  let entityId = rawId;
  let resolvedType = rawType;

  if (rawId.includes('-') || rawId.includes('_')) {
    const parts = rawId.split(/[-_]/);
    if (parts.length >= 2) {
      if (!resolvedType) resolvedType = parts[0];
      entityId = parts[parts.length - 1];
    }
  }

  const normalizedType =
    String(resolvedType).trim().toLowerCase() === 'tv' ||
    String(resolvedType).trim().toLowerCase() === 'show'
      ? 'tv'
      : 'movie';

  return `${normalizedType}_${entityId}`;
}

export function createListItemPayload(media) {
  let entityId = Number(media.entityId);
  let rawType = media.entityType || media.media_type || media.type || '';

  if (!Number.isFinite(entityId) || entityId <= 0) {
    const rawId = String(media.id || media.mediaKey || media.media_key || '').trim();
    if (rawId.includes('-') || rawId.includes('_')) {
      const parts = rawId.split(/[-_]/);
      if (parts.length >= 2) {
        if (!rawType) rawType = parts[0];
        const parsed = Number(parts[parts.length - 1]);
        if (Number.isFinite(parsed) && parsed > 0) {
          entityId = parsed;
        }
      }
    } else {
      const parsed = Number(rawId);
      if (Number.isFinite(parsed) && parsed > 0) {
        entityId = parsed;
      }
    }
  }

  const entityType =
    String(rawType).trim().toLowerCase() === 'tv' || String(rawType).trim().toLowerCase() === 'show'
      ? 'tv'
      : 'movie';

  return {
    entityId: Number.isFinite(entityId) && entityId > 0 ? entityId : Number(media.id || 0),
    entityType,
    title: media.title || media.name || '',
    posterPath: media.poster_path || media.posterPath || null,
    backdropPath: media.backdrop_path || media.backdropPath || null,
    release_date: media.release_date || null,
    first_air_date: media.first_air_date || null,
    genreNames: media.genreNames || media.genre_names || [],
    genre_ids: media.genre_ids || media.genreIds || [],
    genres: media.genres || [],
    name: media.name || media.title || '',
    popularity: media.popularity || null,
    providerIds: [],
    providerNames: [],
    providers: [],
    runtime: media.runtime || null,
    vote_average: media.vote_average || null,
    vote_count: media.vote_count || null,
  };
}


// ============================================================================
// FILE: domains/account/utils/security.js
// ============================================================================

import { requestApiJson } from '@/infrastructure/http/api-request-service';

export const AUTH_PURPOSE = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_SET: 'password-set',
  PASSWORD_UPDATE: 'password-change',
});

export const INITIAL_PASSWORD_FLOW = Object.freeze({
  confirmPassword: '',
  currentPassword: '',
  isSubmitting: false,
  newPassword: '',
});

export const INITIAL_EMAIL_FLOW = Object.freeze({
  currentPassword: '',
  isSubmitting: false,
  newEmail: '',
});

export const INITIAL_DELETE_FLOW = Object.freeze({
  confirmText: '',
  currentPassword: '',
  isSubmitting: false,
});

export function validatePassword(password) {
  const value = String(password || '');
  if (!value) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function resolveSecurityErrorMessage(error, fallbackMessage = 'Security operation failed') {
  if (!error) return fallbackMessage;
  const message = String(error?.message || '').trim();
  if (!message) return fallbackMessage;

  const lower = message.toLowerCase();
  if (
    lower.includes('invalid-credential') ||
    lower.includes('wrong-password') ||
    lower.includes('invalid password')
  ) {
    return 'Current password is incorrect';
  }
  if (lower.includes('email-already-in-use') || lower.includes('email exists')) {
    return 'This email address is already in use by another account';
  }
  if (lower.includes('requires-recent-login')) {
    return 'Please sign in again before making security changes';
  }
  return message;
}

export async function completePasswordChangeRequest({ newPassword }) {
  return requestApiJson('/api/auth/account', {
    body: { action: 'change-password', newPassword },
    method: 'POST',
  });
}

export async function completePasswordSetRequest({ newPassword }) {
  return requestApiJson('/api/auth/account', {
    body: { action: 'set-password', newPassword },
    method: 'POST',
  });
}

export async function completeEmailChangeRequest({ newEmail }) {
  return requestApiJson('/api/auth/account', {
    body: { action: 'change-email', newEmail },
    method: 'POST',
  });
}

export async function deleteAccountRequest() {
  return requestApiJson('/api/auth/account', {
    body: { action: 'delete' },
    method: 'POST',
  });
}


// ============================================================================
// FILE: domains/account/utils/supabase.js
// ============================================================================

export function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();
    if (
      message.includes('fetch failed') ||
      message.includes('socket') ||
      message.includes('connection')
    ) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }
    throw new Error(error.message || fallbackMessage);
  }
  return result;
}


// ============================================================================
// FILE: domains/account/utils/uuid.js
// ============================================================================

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  );
}


// ============================================================================
// FILE: domains/account/utils/validation.js
// ============================================================================

import { normalizeValue } from '@/shared/utils';
import { RESERVED_ACCOUNT_SEGMENTS } from './constants';

// ============================================================
// Username & Account Field Validation Helpers
// ============================================================

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '')
      .trim()
      .toLowerCase(),
  );
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

const TURKISH_USERNAME_MAP = Object.freeze({
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
});

export function sanitizeUsername(value) {
  const normalized = normalizeValue(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => TURKISH_USERNAME_MAP[char] || char);

  return normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function validateUsername(value) {
  const username = sanitizeUsername(value);

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`,
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Username can only contain lowercase letters, numbers, and hyphens');
  }

  if (isReservedAccountSegment(username)) {
    throw new Error('This username is reserved');
  }

  return username;
}

export function normalizeAccountDisplayNameSearchValue(value) {
  return normalizeValue(value).toLocaleLowerCase();
}

export function sanitizeAccountSearchTerm(value) {
  return normalizeValue(value)
    .replace(/[(),.%]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .trim();
}

export function normalizeProviderIds(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeOptionalText(value) {
  return String(value || '').trim();
}

export function normalizeProviderDescriptors(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((provider) => ({
      email: normalizeEmail(provider?.email),
      id: String(provider?.id || '')
        .trim()
        .toLowerCase(),
      uid: String(provider?.uid || '').trim() || null,
    }))
    .filter((provider) => provider.id);
}

// ============================================================
// Data Error Utilities
// ============================================================

function getDataErrorCode(error) {
  return typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '';
}

export function isPermissionDeniedError(error) {
  const errorCode = getDataErrorCode(error);

  if (errorCode === 'permission-denied') {
    return true;
  }

  const message = typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '';

  return (
    message.includes('missing or insufficient permissions') || message.includes('permission denied')
  );
}

export function logDataError(message, error, options = {}) {
  const { suppressPermissionDenied = true } = options;

  if (suppressPermissionDenied && isPermissionDeniedError(error)) {
    return false;
  }

  console.error(message, error);
  return true;
}


