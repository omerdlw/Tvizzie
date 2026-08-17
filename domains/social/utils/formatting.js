import { normalizeValue as normalizeActivityKeyPart } from '@/domains/shell/shared/utils';

export { normalizeActivityKeyPart };

export function buildActivitySubjectRef({ subjectId, subjectType }) {
  const normalizedSubjectType = normalizeActivityKeyPart(subjectType).toLowerCase();
  const normalizedSubjectId = normalizeActivityKeyPart(subjectId);

  if (!normalizedSubjectType || !normalizedSubjectId) {
    return '';
  }

  return `${normalizedSubjectType}:${normalizedSubjectId}`;
}

export function buildCanonicalActivityDedupeKey({
  actorUserId,
  slotType,
  primaryRef,
  secondaryRef = '-',
}) {
  const normalizedActorUserId = normalizeActivityKeyPart(actorUserId);
  const normalizedSlotType = normalizeActivityKeyPart(slotType).toUpperCase();
  const normalizedPrimaryRef = normalizeActivityKeyPart(primaryRef);
  const normalizedSecondaryRef = normalizeActivityKeyPart(secondaryRef) || '-';

  if (!normalizedActorUserId || !normalizedSlotType || !normalizedPrimaryRef) {
    return '';
  }

  return `slot:${normalizedActorUserId}:${normalizedSlotType}:${normalizedPrimaryRef}:${normalizedSecondaryRef}`;
}

export function buildActivityDedupeLikePattern({ slotType, primaryRef = '%', secondaryRef = '%' }) {
  const normalizedSlotType = normalizeActivityKeyPart(slotType).toUpperCase() || '%';
  const normalizedPrimaryRef = normalizeActivityKeyPart(primaryRef) || '%';
  const normalizedSecondaryRef = normalizeActivityKeyPart(secondaryRef) || '%';

  return `slot:%:${normalizedSlotType}:${normalizedPrimaryRef}:${normalizedSecondaryRef}`;
}

export function createEmptyRelationshipState() {
  return {
    followedBy: false,
    following: false,
    id: null,
    status: 'none',
  };
}

export function normalizeLiveFollowPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  return {
    followerId: normalizeActivityKeyPart(payload.followerId || payload.follower_id),
    followingId: normalizeActivityKeyPart(payload.followingId || payload.following_id),
    status: normalizeActivityKeyPart(payload.status).toLowerCase(),
  };
}
