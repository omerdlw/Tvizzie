import { createHash } from 'crypto'

import {
  AUTH_COOKIE_PATH,
  isSecureCookieEnvironment,
} from '@/lib/auth/servers/session/session.server'

const DEVICE_ID_COOKIE_NAME = 'tvz_device_id'
const DEVICE_ID_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000
const DEVICE_ID_MAX_AGE_SECONDS = DEVICE_ID_MAX_AGE_MS / 1000

function normalizeValue(value) {
  return String(value || '').trim()
}

function hashValue(value) {
  const normalized = normalizeValue(value)

  if (!normalized) {
    return null
  }

  return createHash('sha256').update(normalized).digest('hex')
}

function getHeader(request, name) {
  return normalizeValue(request.headers.get(name))
}

function getIpAddress(request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for')

  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]
    return normalizeValue(firstIp)
  }

  return (
    getHeader(request, 'x-real-ip') ||
    getHeader(request, 'cf-connecting-ip') ||
    'unknown'
  )
}

function getCookieValue(request, cookieName) {
  const cookieHeader = getHeader(request, 'cookie')

  if (!cookieHeader) {
    return ''
  }

  const items = cookieHeader.split(';')
  const prefix = `${cookieName}=`

  for (const item of items) {
    const normalizedItem = normalizeValue(item)
    if (normalizedItem.startsWith(prefix)) {
      return decodeURIComponent(normalizedItem.slice(prefix.length))
    }
  }

  return ''
}

function resolveDeviceId(request, ipAddress) {
  const explicitDeviceId =
    getHeader(request, 'x-device-id') ||
    getHeader(request, 'x-tvz-device-id') ||
    getCookieValue(request, DEVICE_ID_COOKIE_NAME)

  if (explicitDeviceId) {
    return explicitDeviceId
  }

  const userAgent = getHeader(request, 'user-agent') || 'unknown'
  const acceptLanguage = getHeader(request, 'accept-language') || 'unknown'
  const clientHints = getHeader(request, 'sec-ch-ua') || 'unknown'
  const fingerprintSeed = `${ipAddress}|${userAgent}|${acceptLanguage}|${clientHints}`

  return `fp_${createHash('sha256').update(fingerprintSeed).digest('hex').slice(0, 32)}`
}

export function getRequestContext(request) {
  const ipAddress = getIpAddress(request)
  const deviceId = resolveDeviceId(request, ipAddress)
  const userAgent = getHeader(request, 'user-agent') || null

  return {
    deviceHash: hashValue(deviceId),
    deviceId,
    ipAddress,
    ipHash: hashValue(ipAddress),
    userAgent,
    userAgentHash: hashValue(userAgent),
  }
}

export function setDeviceIdCookie(response, deviceId) {
  const normalizedDeviceId = normalizeValue(deviceId)

  if (!normalizedDeviceId) {
    return
  }

  response.cookies.set(DEVICE_ID_COOKIE_NAME, normalizedDeviceId, {
    httpOnly: true,
    maxAge: DEVICE_ID_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  })
}
