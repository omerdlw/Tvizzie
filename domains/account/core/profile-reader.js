import 'server-only';

import {
  getAccountProfileByUserId,
  getAccountProfileByUsername,
} from '@/domains/account/server/profile';
import { validateUsername } from '@/domains/account/utils/validation';

import { createAccountCoreError } from './errors';
import { getAccountProfileVersion, toAccountProfileDocument } from './profile-document';

function normalizeHandle(handle) {
  try {
    return validateUsername(handle);
  } catch {
    throw createAccountCoreError('PROFILE_HANDLE_INVALID', 'Profile handle is invalid', {
      status: 400,
    });
  }
}

function normalizeViewerId(viewerId) {
  return String(viewerId || '').trim() || null;
}

function toProfileResult(profile) {
  const document = toAccountProfileDocument(profile);
  return {
    profile: document,
    version: getAccountProfileVersion(document),
  };
}

export function createAccountProfileReader({ getByUserId, getByUsername }) {
  if (typeof getByUserId !== 'function' || typeof getByUsername !== 'function') {
    throw new Error('Account profile reader requires user-id and handle readers');
  }

  return Object.freeze({
    async readCurrentProfile({ viewerId } = {}) {
      const normalizedViewerId = normalizeViewerId(viewerId);
      if (!normalizedViewerId) {
        throw createAccountCoreError('AUTHENTICATION_REQUIRED', 'Authentication is required', {
          status: 401,
        });
      }

      const profile = await getByUserId(normalizedViewerId, {
        bypassCache: false,
        viewerId: normalizedViewerId,
      });
      if (!profile) {
        throw createAccountCoreError('ACCOUNT_NOT_FOUND', 'Account profile was not found', {
          status: 404,
        });
      }

      return toProfileResult(profile);
    },

    async readProfileByHandle({ handle, viewerId = null } = {}) {
      const normalizedHandle = normalizeHandle(handle);
      let profile;
      try {
        profile = await getByUsername(normalizedHandle, {
          viewerId: normalizeViewerId(viewerId),
        });
      } catch (error) {
        if (error?.status === 403) {
          throw createAccountCoreError('PROFILE_PRIVATE', 'This profile is private', {
            status: 403,
          });
        }
        throw error;
      }

      if (!profile) {
        throw createAccountCoreError('PROFILE_NOT_FOUND', 'Profile was not found', { status: 404 });
      }

      return toProfileResult(profile);
    },
  });
}

export const accountProfileReader = createAccountProfileReader({
  getByUserId: getAccountProfileByUserId,
  getByUsername: getAccountProfileByUsername,
});
