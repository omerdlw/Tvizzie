'use client';

import { AuthRouteRegistry } from '@/features/auth/page-shell';

export default function Registry({ authIsReady }) {
  return (
    <AuthRouteRegistry
      authIsReady={authIsReady}
      title="Sign Up"
      description="Create your account"
      icon="solar:user-plus-bold"
    />
  );
}
