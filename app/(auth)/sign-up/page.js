import { Suspense } from 'react';

import Client from '@/domains/auth/ui/sign-up-client';

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  );
}
