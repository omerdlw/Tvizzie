'use client';

import { AuthRouteRegistry } from '@/features/auth/page-shell';

export default function Registry({ authIsReady, isResetMode, action }) {
  return (
    <AuthRouteRegistry
      authIsReady={authIsReady}
      title="Sign In"
      description={isResetMode ? 'Reset your password' : 'Access your account'}
      icon="solar:user-circle-bold"
      action={action}
    />
  );
}
