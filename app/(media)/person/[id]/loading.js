'use client';

import { Skeleton } from '@/features/person/skeletons';
import Registry from './registry';

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <Skeleton />
    </>
  );
}
