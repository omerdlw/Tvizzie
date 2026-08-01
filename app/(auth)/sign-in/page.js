import { Suspense } from 'react';

import Client from '@/domains/auth/ui/sign-in-client';

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  );
}
