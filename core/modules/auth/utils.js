'use client'

import { resolveAuthCapabilities, resolvePrimaryProvider } from '@/core/auth/capabilities'

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function uniqueStrings(items) {
  return Array.from(
    new Set(
      toArray(items)
        .filter((item) => typeof item === 'string' || typeof item === 'number')
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  )
}

function toIsoDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function normalizeUser(rawUser = {}, fallbackUser = {}) {
  const source = {
    ...(isPlainObject(fallbackUser) ? fallbackUser : {}),
    ...(isPlainObject(rawUser) ? rawUser : {}),
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
    capabilities,
    permissions,
    metadata: isPlainObject(source.metadata) ? source.metadata : {},
    roles,
    email: source.email || null,
    name: source.name || source.fullName || source.username || null,
    id: source.id || source.userId || source.sub || null,
  }
}

function normalizeCapabilityState(value = {}, email = null, providerIds = []) {
  const fallbackState = resolveAuthCapabilities({
    providerIds,
    email,
  })

  if (!isPlainObject(value)) {
    return fallbackState
  }

  return {
    ...fallbackState,
    ...value,
  }
}

export function normalizeSession(input) {
  if (!input) {
    return null
  }

  if (input.requiresRedirect || input.requiresVerification) {
    return input
  }

  const directSession = isPlainObject(input.session) ? input.session : null
  const source = directSession || (isPlainObject(input) ? input : {})
  const user = normalizeUser(input.user, source.user)
  const metadata = isPlainObject(source.metadata) ? source.metadata : {}
  const providerIds = uniqueStrings(metadata.providerIds || [])
  const capabilityState = normalizeCapabilityState(
    source.capabilities || metadata.authCapabilities,
    user.email || source.email || null,
    providerIds
  )

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
    capabilities: capabilityState,
    expiresAt: toIsoDate(
      source.expiresAt || source.expiresAtMs || input.expiresAt
    ),
    provider:
      source.provider ||
      input.provider ||
      capabilityState.primaryProvider ||
      resolvePrimaryProvider(providerIds),
    metadata: {
      ...metadata,
      authCapabilities: capabilityState,
    },
    user: {
      ...user,
      capabilities,
      metadata: {
        ...metadata,
        authCapabilities: capabilityState,
      },
      permissions,
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

export function getAccessToken() {
  return null
}

export function isSessionExpired(session, leewayMs = 0) {
  const normalizedSession = normalizeSession(session)

  if (!normalizedSession?.expiresAt) {
    return false
  }

  const expiresAt = new Date(normalizedSession.expiresAt).getTime()

  if (Number.isNaN(expiresAt)) {
    return false
  }

  return expiresAt <= Date.now() + leewayMs
}

export function hasRole(session, role) {
  const normalizedSession = normalizeSession(session)

  if (!normalizedSession?.user || !role) {
    return false
  }

  return normalizedSession.user.roles.includes(String(role))
}

export function hasAnyRole(session, roles = []) {
  const normalizedRoles = toArray(roles)

  if (normalizedRoles.length === 0) {
    return true
  }

  return normalizedRoles.some((role) => hasRole(session, role))
}

export function hasCapability(session, capability) {
  const normalizedSession = normalizeSession(session)

  if (!normalizedSession?.user || !capability) {
    return false
  }

  return normalizedSession.user.capabilities.includes(String(capability))
}

export function hasAnyCapability(session, capabilities = []) {
  const normalizedCapabilities = toArray(capabilities)

  if (normalizedCapabilities.length === 0) {
    return true
  }

  return normalizedCapabilities.some((capability) =>
    hasCapability(session, capability)
  )
}

export function hasAllCapabilities(session, capabilities = []) {
  const normalizedCapabilities = toArray(capabilities)

  if (normalizedCapabilities.length === 0) {
    return true
  }

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

  const passesRoles =
    toArray(roles).length === 0 ? true : hasAnyRole(normalizedSession, roles)

  const passesCapabilities =
    requiredCapabilities.length === 0
      ? true
      : requireAll
        ? hasAllCapabilities(normalizedSession, requiredCapabilities)
        : hasAnyCapability(normalizedSession, requiredCapabilities)

  return passesRoles && passesCapabilities
}
