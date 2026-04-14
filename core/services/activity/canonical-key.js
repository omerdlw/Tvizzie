export function normalizeActivityKeyPart(value) {
  return String(value || '').trim();
}

export function buildCanonicalActivityDedupeKey({ actorUserId, eventType, subjectId, subjectType }) {
  const normalizedActorUserId = normalizeActivityKeyPart(actorUserId);
  const normalizedEventType = normalizeActivityKeyPart(eventType).toUpperCase();
  const normalizedSubjectType = normalizeActivityKeyPart(subjectType).toLowerCase();
  const normalizedSubjectId = normalizeActivityKeyPart(subjectId);

  if (!normalizedActorUserId || !normalizedEventType || !normalizedSubjectType || !normalizedSubjectId) {
    return '';
  }

  return `subject:${normalizedActorUserId}:${normalizedEventType}:${normalizedSubjectType}:${normalizedSubjectId}`;
}
