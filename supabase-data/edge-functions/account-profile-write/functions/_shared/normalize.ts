export function normalizeValue(value: unknown): string {
  return String(value ?? "").trim()
}

export function normalizeLower(value: unknown): string {
  return normalizeValue(value).toLowerCase()
}

export function normalizeEmail(value: unknown): string {
  return normalizeLower(value)
}

export function cleanString(value: unknown): string {
  return normalizeValue(value)
}

export function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value
  }

  const normalized = normalizeLower(value)

  if (!normalized) {
    return fallback
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false
  }

  return fallback
}

export function normalizeInteger(
  value: unknown,
  {
    fallback,
    min,
    max,
  }: {
    fallback: number
    min?: number
    max?: number
  }
): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  let resolved = Math.floor(parsed)

  if (Number.isFinite(min)) {
    resolved = Math.max(resolved, Number(min))
  }

  if (Number.isFinite(max)) {
    resolved = Math.min(resolved, Number(max))
  }

  return resolved
}

export function isValidHttpUrl(value: unknown): boolean {
  const normalized = normalizeValue(value)

  if (!normalized) {
    return false
  }

  try {
    const parsed = new URL(normalized)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}
