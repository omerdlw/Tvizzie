import { NextResponse } from 'next/server'

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export const runtime = 'nodejs'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const FETCH_TIMEOUT_MS = 7000
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254',
  'metadata',
  'metadata.google.internal',
])

const ALLOWED_HOSTS = (process.env.IMAGE_PROXY_ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean)

class ProxyValidationError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function isAllowedHost(hostname) {
  if (ALLOWED_HOSTS.length === 0) return true

  return ALLOWED_HOSTS.some((allowedHost) => {
    return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
  })
}

function isPrivateIPv4(address) {
  const parts = address.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)
  ) {
    return false
  }

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
  )
}

function isPrivateIPv6(address) {
  const normalized = address.toLowerCase()

  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:169.254.') ||
    normalized.startsWith('::ffff:172.16.') ||
    normalized.startsWith('::ffff:172.17.') ||
    normalized.startsWith('::ffff:172.18.') ||
    normalized.startsWith('::ffff:172.19.') ||
    normalized.startsWith('::ffff:172.2') ||
    normalized.startsWith('::ffff:172.30.') ||
    normalized.startsWith('::ffff:172.31.') ||
    normalized.startsWith('::ffff:192.168.')
  )
}

function isPrivateAddress(address) {
  const normalizedAddress = address.toLowerCase()
  const mappedIPv4 = normalizedAddress.startsWith('::ffff:')
    ? normalizedAddress.replace('::ffff:', '')
    : normalizedAddress

  const version = isIP(mappedIPv4)
  if (version === 4) return isPrivateIPv4(mappedIPv4)
  if (version === 6) return isPrivateIPv6(mappedIPv4)
  return false
}

async function assertSafeTarget(targetUrl) {
  const hostname = targetUrl.hostname.toLowerCase()

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new ProxyValidationError('Target host is not allowed', 403)
  }

  if (!isAllowedHost(hostname)) {
    throw new ProxyValidationError('Host is not in the allowlist', 403)
  }

  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new ProxyValidationError(
      'Private network addresses are not allowed',
      403
    )
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true })

    if (!records.length) {
      throw new ProxyValidationError('Could not resolve host', 403)
    }

    const hasPrivateAddress = records.some(({ address }) =>
      isPrivateAddress(address)
    )
    if (hasPrivateAddress) {
      throw new ProxyValidationError(
        'Private network addresses are not allowed',
        403
      )
    }
  } catch (error) {
    if (error instanceof ProxyValidationError) {
      throw error
    }
    throw new ProxyValidationError('Could not resolve host', 403)
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url')

  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  let targetUrl
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!ALLOWED_PROTOCOLS.has(targetUrl.protocol)) {
    return NextResponse.json(
      { error: 'Only HTTP/HTTPS URLs are allowed' },
      { status: 400 }
    )
  }

  try {
    await assertSafeTarget(targetUrl)

    const response = await fetch(targetUrl.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'error',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image content is allowed' },
        { status: 415 }
      )
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_IMAGE_SIZE_BYTES
    ) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    return new NextResponse(buffer, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Type': contentType,
      },
    })
  } catch (error) {
    if (error instanceof ProxyValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Upstream request timed out' },
        { status: 504 }
      )
    }

    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
