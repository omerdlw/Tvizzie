'use client';

import AccountClient from '../client';
import Registry from './registry';

export default function Client({
  username,
  initialActivityFeed = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  initialReviewFeed = null,
}) {
  return (
    <AccountClient
      username={username}
      initialActivityFeed={initialActivityFeed}
      initialCollections={initialCollections}
      initialProfile={initialProfile}
      initialResolvedUserId={initialResolvedUserId}
      initialResolveError={initialResolveError}
      initialReviewFeed={initialReviewFeed}
      RegistryComponent={Registry}
    />
  );
}
