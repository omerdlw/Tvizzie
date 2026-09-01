'use client';

// Public Account API. Internal ownership lives in focused domain files.
export { createAccountAdapter, createAccountClient } from './adapter';
export {
  AccountProvider,
  useAccount,
  useAccountActions,
  useAccountClient,
  useAccountConfig,
  useAccountState,
  useCurrentAccount,
} from './provider';
export { useAccountProfile, useResolvedAccountUser } from './profile';
