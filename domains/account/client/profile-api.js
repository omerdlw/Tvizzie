'use client';

import { requestApiJson } from '@/infrastructure/http/client';
import { toAccountClientProfile } from '@/domains/account/client/profile-contract';

export function fromAccountProfileDocument(profile = {}) {
  return toAccountClientProfile(profile);
}

async function requestAccountDocument(path, options, request) {
  const payload = await request(path, options);
  const profile = fromAccountProfileDocument(payload?.profile);

  if (!profile.id) throw new Error('Account command returned an invalid profile');

  return {
    ...payload,
    profile,
  };
}

export async function fetchCurrentAccountProfile({ request = requestApiJson } = {}) {
  return requestAccountDocument('/api/account/me', { method: 'GET' }, request);
}

export async function fetchAccountProfileByHandle(handle, { request = requestApiJson } = {}) {
  return requestAccountDocument(
    `/api/account/profiles/${encodeURIComponent(handle)}`,
    { method: 'GET' },
    request,
  );
}

export async function searchAccountProfiles(
  { limitCount, searchTerm } = {},
  { request = requestApiJson } = {},
) {
  const payload = await request('/api/account/profiles', {
    method: 'GET',
    query: { limit: limitCount, q: searchTerm },
  });

  return {
    ...payload,
    items: Array.isArray(payload?.items)
      ? payload.items.map(fromAccountProfileDocument).filter((profile) => profile.id)
      : [],
  };
}

export async function saveAccountProfile(patch, { request = requestApiJson } = {}) {
  return requestAccountDocument(
    '/api/account/me/profile',
    {
      body: patch,
      method: 'PATCH',
    },
    request,
  );
}

export async function ensureAccountProfile(
  { displayName, username } = {},
  { request = requestApiJson } = {},
) {
  return requestAccountDocument(
    '/api/account/me',
    {
      body: { displayName, username },
      method: 'POST',
    },
    request,
  );
}

export async function syncAccountProfileEmail({ request = requestApiJson } = {}) {
  return requestAccountDocument('/api/account/me/email', { method: 'POST' }, request);
}
