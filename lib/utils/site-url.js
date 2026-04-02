const DEFAULT_SITE_URL = 'https://tvizzie.vercel.app'

function normalizeCandidateUrl(value) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return ''
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/+$/, '')
  }

  return `https://${normalized}`.replace(/\/+$/, '')
}

function isValidUrl(value) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function getSiteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeCandidateUrl(candidate)
    if (normalized && isValidUrl(normalized)) {
      return normalized
    }
  }

  return DEFAULT_SITE_URL
}
