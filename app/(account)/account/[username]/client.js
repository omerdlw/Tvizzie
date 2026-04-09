'use client';

import AccountClient from '../client';
import Registry from './registry';

export default function Client({
  ...props
}) {
  return <AccountClient {...props} RegistryComponent={Registry} />;
}
