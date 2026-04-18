'use client';

import AuthRouteRegistry from '@/features/auth/route-registry';

export default function Registry({ authIsReady, isResetMode }) {
  return (
    <AuthRouteRegistry
      authIsReady={authIsReady}
      title="Sign In"
      description={isResetMode ? 'Reset your password' : 'Access your account'}
      icon="solar:user-circle-bold"
    />
  );
}
