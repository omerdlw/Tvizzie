import { Suspense } from 'react';

import Client from './client';

export const metadata = {
  title: 'Search',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  );
}
