export const dynamic = 'force-dynamic';

import { Suspense } from 'react';

import SignUpView from '@/domains/auth/ui/pages/sign-up';

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpView />
    </Suspense>
  );
}
