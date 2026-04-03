export function normalizeTimestamp(value) {
  if (!value) return null

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString()
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString()
}

export function cleanString(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}
