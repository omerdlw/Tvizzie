import { Suspense } from 'react';

import SearchClient from './client';

export const metadata = {
  title: 'Search',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SearchClient />
    </Suspense>
  );
}
