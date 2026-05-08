import Client from './client';

import { getHomeRouteData } from './data';

export default async function Page() {
  return <Client data={await getHomeRouteData()} />;
}

export const revalidate = 600;
