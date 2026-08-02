export const dynamic = 'force-dynamic';

import { Suspense } from 'react';

import Client from '@/app/(auth)/sign-up/client';

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  );
}
