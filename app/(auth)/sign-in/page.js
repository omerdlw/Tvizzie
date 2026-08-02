export const dynamic = 'force-dynamic';

import { Suspense } from 'react';

import Client from '@/app/(auth)/sign-in/client';

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  );
}
