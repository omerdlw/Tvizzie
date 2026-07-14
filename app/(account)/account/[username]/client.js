'use client';

import AccountClient from '../client';
import Registry from './registry';

export default function Client({ routeData = null }) {
  return <AccountClient routeData={routeData} RegistryComponent={Registry} />;
}
