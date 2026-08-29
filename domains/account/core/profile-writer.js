import 'server-only';

import { updateAccountProfile } from '@/domains/account/server/profile';
import { validateUsername } from '@/domains/account/utils/validation';

import { createAccountCoreError, isAccountCoreError } from './errors';
import { getAccountProfileVersion, toAccountProfileDocument } from './profile-document';

const PROFILE_PATCH_FIELDS = new Set([
  'avatarUrl',
  'bannerUrl',
  'description',
  'displayName',
  'favoriteShowcase',
  'isPrivate',
  'username',
]);

function requireObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createAccountCoreError('PROFILE_PATCH_INVALID', 'Profile update must be an object', {
      status: 400,
    });
  }
  return value;
}

function requireStringOrNull(value, field) {
  if (value !== null && typeof value !== 'string') {
    throw createAccountCoreError('PROFILE_PATCH_INVALID', `${field} must be a string or null`, {
      status: 400,
    });
  }
}

function requireHttpUrlOrNull(value, field) {
  requireStringOrNull(value, field);
  if (!value) return;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      throw new Error('Unsupported protocol');
  } catch {
    throw createAccountCoreError('PROFILE_MEDIA_URL_INVALID', `${field} must be an HTTP URL`, {
      status: 400,
    });
  }
}

function normalizeUpdateError(error) {
  if (isAccountCoreError(error)) return error;

  const message = String(error?.message || '');
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes('username') && normalizedMessage.includes('taken')) {
    return createAccountCoreError('PROFILE_HANDLE_TAKEN', 'Profile handle is already in use', {
      status: 409,
    });
  }
  if (normalizedMessage.includes('username') || normalizedMessage.includes('favorite showcase')) {
    return createAccountCoreError('PROFILE_PATCH_INVALID', 'Profile update is invalid', {
      status: 400,
    });
  }

  return error;
}

export function normalizeProfilePatch(input) {
  const payload = requireObject(input);
  const patch = {};
  const keys = Object.keys(payload);

  if (keys.length === 0) {
    throw createAccountCoreError('PROFILE_PATCH_EMPTY', 'Profile update cannot be empty', {
      status: 400,
    });
  }

  for (const key of keys) {
    if (!PROFILE_PATCH_FIELDS.has(key)) {
      throw createAccountCoreError(
        'PROFILE_PATCH_FIELD_UNSUPPORTED',
        `${key} cannot be updated here`,
        {
          status: 400,
        },
      );
    }
  }

  if (Object.hasOwn(payload, 'username')) {
    if (typeof payload.username !== 'string' || !payload.username.trim()) {
      throw createAccountCoreError('PROFILE_HANDLE_INVALID', 'Profile handle is invalid', {
        status: 400,
      });
    }
    patch.username = validateUsername(payload.username);
  }
  if (Object.hasOwn(payload, 'displayName')) {
    requireStringOrNull(payload.displayName, 'displayName');
    patch.displayName = payload.displayName;
  }
  if (Object.hasOwn(payload, 'description')) {
    requireStringOrNull(payload.description, 'description');
    patch.description = payload.description;
  }
  if (Object.hasOwn(payload, 'avatarUrl')) {
    requireHttpUrlOrNull(payload.avatarUrl, 'avatarUrl');
    patch.avatarUrl = payload.avatarUrl;
  }
  if (Object.hasOwn(payload, 'bannerUrl')) {
    requireHttpUrlOrNull(payload.bannerUrl, 'bannerUrl');
    patch.bannerUrl = payload.bannerUrl;
  }
  if (Object.hasOwn(payload, 'isPrivate')) {
    if (typeof payload.isPrivate !== 'boolean') {
      throw createAccountCoreError('PROFILE_PATCH_INVALID', 'isPrivate must be a boolean', {
        status: 400,
      });
    }
    patch.isPrivate = payload.isPrivate;
  }
  if (Object.hasOwn(payload, 'favoriteShowcase')) {
    if (!Array.isArray(payload.favoriteShowcase) || payload.favoriteShowcase.length > 5) {
      throw createAccountCoreError(
        'PROFILE_SHOWCASE_INVALID',
        'Favorite showcase must contain at most 5 titles',
        { status: 400 },
      );
    }
    patch.favoriteShowcase = payload.favoriteShowcase;
  }

  return patch;
}

export function createAccountProfileWriter({ updateProfile }) {
  if (typeof updateProfile !== 'function') {
    throw new Error('Account profile writer requires an update implementation');
  }

  return Object.freeze({
    async updateCurrentProfile({ input, viewer } = {}) {
      const viewerId = String(viewer?.id || '').trim();
      if (!viewerId) {
        throw createAccountCoreError('AUTHENTICATION_REQUIRED', 'Authentication is required', {
          status: 401,
        });
      }

      const patch = normalizeProfilePatch(input);
      try {
        const profile = await updateProfile({
          email: viewer?.email || undefined,
          input: patch,
          userId: viewerId,
        });
        const document = toAccountProfileDocument(profile);
        return {
          profile: document,
          version: getAccountProfileVersion(document),
        };
      } catch (error) {
        throw normalizeUpdateError(error);
      }
    },
  });
}

export const accountProfileWriter = createAccountProfileWriter({
  updateProfile: updateAccountProfile,
});
