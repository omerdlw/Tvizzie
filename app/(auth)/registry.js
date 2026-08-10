'use client';

import { AuthRouteRegistry } from '@/domains/auth/ui';

export default function AuthRegistry({ action = null, authIsReady, description, icon, title }) {
  return (
    <AuthRouteRegistry
      action={action}
      authIsReady={authIsReady}
      description={description}
      icon={icon}
      title={title}
    />
  );
}
