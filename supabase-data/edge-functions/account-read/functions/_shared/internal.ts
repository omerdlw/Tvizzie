import { normalizeValue } from "./normalize.ts"

const INTERNAL_TOKEN = normalizeValue(Deno.env.get("INFRA_INTERNAL_TOKEN"))

export function assertInternalAccess(request: Request) {
  if (!INTERNAL_TOKEN) {
    throw new Error("INFRA_INTERNAL_TOKEN is not configured")
  }

  const token = normalizeValue(request.headers.get("x-infra-internal-token"))

  if (!token || token !== INTERNAL_TOKEN) {
    const error = new Error("Unauthorized")
    ;(error as Error & { status?: number }).status = 401
    throw error
  }
}
