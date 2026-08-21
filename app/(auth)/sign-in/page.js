export const dynamic = 'force-dynamic';

import { Suspense } from 'react';

import SignInView from '@/domains/auth/ui/pages/sign-in';

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInView />
    </Suspense>
  );
}
