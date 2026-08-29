import 'server-only';

import { ensureAccountProfile, updateAccountProfile } from '@/domains/account/server/profile';
import { validateUsername } from '@/domains/account/utils/validation';

import { createAccountCoreError, isAccountCoreError } from './errors';
import { getAccountProfileVersion, toAccountProfileDocument } from './profile-document';

const PROVISION_FIELDS = new Set(['displayName', 'username']);

function requireViewer(viewer) {
  const id = String(viewer?.id || '').trim();
  if (!id) {
    throw createAccountCoreError('AUTHENTICATION_REQUIRED', 'Authentication is required', {
      status: 401,
    });
  }

  const email = String(viewer?.email || '').trim();
  if (!email) {
    throw createAccountCoreError('ACCOUNT_EMAIL_REQUIRED', 'An authenticated email is required', {
      status: 409,
    });
  }

  return { email, id };
}

function toAccountResult(profile) {
  const document = toAccountProfileDocument(profile);
  if (!document.id) {
    throw createAccountCoreError('ACCOUNT_NOT_FOUND', 'Account profile was not found', {
      status: 404,
    });
  }

  return {
    profile: document,
    version: getAccountProfileVersion(document),
  };
}

function normalizeProvisionError(error) {
  if (isAccountCoreError(error)) return error;

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('username') && message.includes('taken')) {
    return createAccountCoreError('PROFILE_HANDLE_TAKEN', 'Profile handle is already in use', {
      status: 409,
    });
  }
  if (message.includes('username')) {
    return createAccountCoreError('PROFILE_HANDLE_INVALID', 'Profile handle is invalid', {
      status: 400,
    });
  }

  return error;
}

export function normalizeAccountProvision(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createAccountCoreError(
      'ACCOUNT_PROVISION_INVALID',
      'Account provision must be an object',
      {
        status: 400,
      },
    );
  }

  for (const key of Object.keys(input)) {
    if (!PROVISION_FIELDS.has(key)) {
      throw createAccountCoreError(
        'ACCOUNT_PROVISION_FIELD_UNSUPPORTED',
        `${key} cannot be set while provisioning an account`,
        { status: 400 },
      );
    }
  }

  const provision = {};
  if (Object.hasOwn(input, 'displayName') && input.displayName !== undefined) {
    if (input.displayName !== null && typeof input.displayName !== 'string') {
      throw createAccountCoreError(
        'ACCOUNT_PROVISION_INVALID',
        'displayName must be a string or null',
        { status: 400 },
      );
    }
    provision.displayName = input.displayName;
  }
  if (Object.hasOwn(input, 'username') && input.username !== null && input.username !== undefined) {
    if (typeof input.username !== 'string' || !input.username.trim()) {
      throw createAccountCoreError('PROFILE_HANDLE_INVALID', 'Profile handle is invalid', {
        status: 400,
      });
    }
    provision.username = validateUsername(input.username);
  }

  return provision;
}

export function createAccountLifecycle({ ensureProfile, updateProfile }) {
  if (typeof ensureProfile !== 'function' || typeof updateProfile !== 'function') {
    throw new Error('Account lifecycle requires provision and profile update implementations');
  }

  return Object.freeze({
    async provisionCurrentAccount({ input = {}, viewer } = {}) {
      const accountViewer = requireViewer(viewer);
      const provision = normalizeAccountProvision(input);

      try {
        const profile = await ensureProfile({
          ...provision,
          email: accountViewer.email,
          userId: accountViewer.id,
        });
        return toAccountResult(profile);
      } catch (error) {
        throw normalizeProvisionError(error);
      }
    },

    async syncCurrentAccountEmail({ viewer } = {}) {
      const accountViewer = requireViewer(viewer);

      try {
        const profile = await updateProfile({
          email: accountViewer.email,
          input: {},
          userId: accountViewer.id,
        });
        return toAccountResult(profile);
      } catch (error) {
        throw normalizeProvisionError(error);
      }
    },
  });
}

export const accountLifecycle = createAccountLifecycle({
  ensureProfile: ensureAccountProfile,
  updateProfile: updateAccountProfile,
});
