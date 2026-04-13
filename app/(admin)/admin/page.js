import { notFound } from 'next/navigation';

import Client from './client';
import { assertAdminAccessFromCookies } from '@/core/services/admin/access.server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  try {
    const guard = await assertAdminAccessFromCookies({
      source: 'admin-page',
    });

    return <Client guard={guard} />;
  } catch (error) {
    const status = Number(error?.status || 0);

    if (status === 401 || status === 403) {
      notFound();
    }

    throw error;
  }
}
