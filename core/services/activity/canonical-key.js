export function normalizeActivityKeyPart(value) {
  return String(value || '').trim();
}

export function buildActivitySubjectRef({ subjectId, subjectType }) {
  const normalizedSubjectType = normalizeActivityKeyPart(subjectType).toLowerCase();
  const normalizedSubjectId = normalizeActivityKeyPart(subjectId);

  if (!normalizedSubjectType || !normalizedSubjectId) {
    return '';
  }

  return `${normalizedSubjectType}:${normalizedSubjectId}`;
}

export function buildCanonicalActivityDedupeKey({ actorUserId, slotType, primaryRef, secondaryRef = '-' }) {
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
