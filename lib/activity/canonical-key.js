export function normalizeActivityKeyPart(value) {
  return String(value || '').trim()
}

export function buildCanonicalActivityDedupeKey({
  actorUserId,
  subjectId,
  subjectType,
}) {
  const normalizedActorUserId = normalizeActivityKeyPart(actorUserId)
  const normalizedSubjectType = normalizeActivityKeyPart(subjectType).toLowerCase()
  const normalizedSubjectId = normalizeActivityKeyPart(subjectId)

  if (!normalizedActorUserId || !normalizedSubjectType || !normalizedSubjectId) {
    return ''
  }

  return `subject:${normalizedActorUserId}:${normalizedSubjectType}:${normalizedSubjectId}`
}
