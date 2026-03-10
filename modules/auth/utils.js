'use client'

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function uniqueStrings(items) {
  return Array.from(
    new Set(
      items
        .filter((item) => typeof item === 'string' || typeof item === 'number')
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  )
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function toIsoDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function normalizeUser(rawUser = {}, fallback = {}) {
  const source = {
    ...toObject(fallback),
    ...toObject(rawUser),
  }

  const roles = uniqueStrings(source.roles || source.role)
  const permissions = uniqueStrings(source.permissions)
  const capabilities = uniqueStrings([
    ...toArray(source.capabilities),
    ...permissions,
  ])

  return {
    avatarUrl:
      source.avatarUrl ||
      source.avatar ||
      source.image ||
      source.picture ||
      null,
    metadata: toObject(source.metadata),
    email: source.email || null,
    name: source.name || source.fullName || source.username || null,
    permissions,
    capabilities,
    roles,
    id: source.id || source.userId || source.sub || null,
  }
}

export function normalizeSession(input) {
  if (!input) return null

  const directSession = toObject(input.session)
  const source =
    Object.keys(directSession).length > 0 ? directSession : toObject(input)
  const sourceUser = toObject(input.user)
  const fallbackUser = toObject(source.user)
  const user = normalizeUser(sourceUser, fallbackUser)

  const permissions = uniqueStrings([
    ...user.permissions,
    ...toArray(source.permissions),
  ])
  const capabilities = uniqueStrings([
    ...user.capabilities,
    ...toArray(source.capabilities),
    ...permissions,
  ])
  const roles = uniqueStrings([...user.roles, ...toArray(source.roles)])

  return {
    accessToken:
      source.accessToken ||
      source.token ||
      input.accessToken ||
      input.token ||
      null,
    expiresAt: toIsoDate(
      source.expiresAt || source.expiresAtMs || input.expiresAt
    ),
    metadata: toObject(source.metadata),
    provider: source.provider || input.provider || null,
    refreshToken: source.refreshToken || input.refreshToken || null,
    user: {
      ...user,
      permissions,
      capabilities,
      roles,
    },
  }
}

export function mergeUserIntoSession(session, userPatch) {
  const normalizedSession = normalizeSession(session)
  if (!normalizedSession) return null

  const mergedUser = normalizeUser(userPatch, normalizedSession.user)

  return normalizeSession({
    ...normalizedSession,
    user: {
      ...normalizedSession.user,
      ...mergedUser,
      permissions: uniqueStrings([
        ...normalizedSession.user.permissions,
        ...mergedUser.permissions,
      ]),
      capabilities: uniqueStrings([
        ...normalizedSession.user.capabilities,
        ...mergedUser.capabilities,
      ]),
      roles: uniqueStrings([
        ...normalizedSession.user.roles,
        ...mergedUser.roles,
      ]),
    },
  })
}

export function getAccessToken(session) {
  return normalizeSession(session)?.accessToken || null
}

export function isSessionExpired(session, leewayMs = 0) {
  const normalizedSession = normalizeSession(session)
  if (!normalizedSession?.expiresAt) return false

  const expiresAt = new Date(normalizedSession.expiresAt).getTime()
  if (Number.isNaN(expiresAt)) return false

  return expiresAt <= Date.now() + leewayMs
}

export function hasRole(session, role) {
  const normalizedSession = normalizeSession(session)
  if (!normalizedSession?.user || !role) return false

  return normalizedSession.user.roles.includes(String(role))
}

export function hasAnyRole(session, roles = []) {
  const normalizedRoles = toArray(roles)
  if (normalizedRoles.length === 0) return true

  return normalizedRoles.some((role) => hasRole(session, role))
}

export function hasCapability(session, capability) {
  const normalizedSession = normalizeSession(session)
  if (!normalizedSession?.user || !capability) return false

  return normalizedSession.user.capabilities.includes(String(capability))
}

export function hasAnyCapability(session, capabilities = []) {
  const normalizedCapabilities = toArray(capabilities)
  if (normalizedCapabilities.length === 0) return true

  return normalizedCapabilities.some((capability) =>
    hasCapability(session, capability)
  )
}

export function hasAllCapabilities(session, capabilities = []) {
  const normalizedCapabilities = toArray(capabilities)
  if (normalizedCapabilities.length === 0) return true

  return normalizedCapabilities.every((capability) =>
    hasCapability(session, capability)
  )
}

export function canAccess(
  session,
  {
    capabilities = [],
    permissions = [],
    requireAuth = true,
    requireAll = true,
    roles = [],
  } = {}
) {
  const normalizedSession = normalizeSession(session)
  const requiredCapabilities = [
    ...toArray(capabilities),
    ...toArray(permissions),
  ]

  if (requireAuth && !normalizedSession) {
    return false
  }

  if (!normalizedSession) {
    return true
  }

  const roleCheck =
    toArray(roles).length === 0 ? true : hasAnyRole(normalizedSession, roles)

  const capabilityCheck =
    requiredCapabilities.length === 0
      ? true
      : requireAll
        ? hasAllCapabilities(normalizedSession, requiredCapabilities)
        : hasAnyCapability(normalizedSession, requiredCapabilities)

  return roleCheck && capabilityCheck
}
