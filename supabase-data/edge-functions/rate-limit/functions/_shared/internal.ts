import { normalizeTrim } from "./normalize.ts"

export function requireEnv(name: string): string {
  const value = normalizeTrim(Deno.env.get(name))

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0

  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }

  return mismatch === 0
}

type InternalAccessOptions = {
  headerName?: string
  tokenEnvName?: string
}

export function assertInternalAccess(
  request: Request,
  options: InternalAccessOptions = {}
): void {
  const headerName = normalizeTrim(options.headerName) || "x-infra-internal-token"
  const tokenEnvName = normalizeTrim(options.tokenEnvName) || "INFRA_INTERNAL_TOKEN"

  const expectedToken = requireEnv(tokenEnvName)
  const receivedToken = normalizeTrim(request.headers.get(headerName))

  if (!receivedToken || !timingSafeEqual(receivedToken, expectedToken)) {
    const error = new Error("Unauthorized") as Error & { status?: number }
    error.status = 401
    throw error
  }
}

export function resolveErrorStatus(error: unknown, fallback = 500): number {
  const status = Number((error as { status?: number })?.status)

  if (Number.isFinite(status) && status >= 100) {
    return status
  }

  return fallback
}
