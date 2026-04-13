import { Suspense } from 'react';

import SearchPage from '@/features/navigation/actions/search-action/search-page';

export const metadata = {
  title: 'Search',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}
