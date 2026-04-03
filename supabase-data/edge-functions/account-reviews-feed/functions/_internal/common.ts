import { createClient } from "npm:@supabase/supabase-js@2"

let adminClient: ReturnType<typeof createClient> | null = null

export function normalizeTrim(value: unknown): string {
  return String(value ?? "").trim()
}

export function normalizeLower(value: unknown): string {
  return normalizeTrim(value).toLowerCase()
}

export function normalizeTimestamp(value: unknown): string | null {
  const raw = normalizeTrim(value)

  if (!raw) {
    return null
  }

  const timestamp = Date.parse(raw)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  return new Date(timestamp).toISOString()
}

export function parseBoolean(value: unknown, fallback = false): boolean {
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

export function parseNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return parsed
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function resolveLimitCount(value: unknown, fallback = 0, max = 100): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(Math.max(1, Math.floor(parsed)), max)
}

export function jsonResponse(
  status: number,
  payload: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      ...headers,
    },
  })
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse(status, {
    error: normalizeTrim(message) || "Unexpected error",
  })
}

export function mapErrorToStatus(error: unknown): number {
  const status = Number((error as { status?: number })?.status)

  if (Number.isFinite(status) && status >= 400 && status <= 599) {
    return status
  }

  const message = normalizeLower((error as { message?: string })?.message)

  if (message.includes("unauthorized")) {
    return 401
  }

  if (message.includes("forbidden") || message.includes("private")) {
    return 403
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("unsupported")
  ) {
    return 400
  }

  return 500
}

export function assertMethod(request: Request, allowedMethods: string[]): void {
  const method = normalizeUpper(request.method)
  const allowed = new Set(allowedMethods.map((item) => normalizeUpper(item)))

  if (!allowed.has(method)) {
    const error = new Error("Method not allowed") as Error & { status?: number }
    error.status = 405
    throw error
  }
}

function normalizeUpper(value: unknown): string {
  return normalizeTrim(value).toUpperCase()
}

export function assertInternalAccess(request: Request): void {
  const internalToken = normalizeTrim(Deno.env.get("INFRA_INTERNAL_TOKEN"))

  if (!internalToken) {
    throw new Error("INFRA_INTERNAL_TOKEN is not configured")
  }

  const headerToken = normalizeTrim(request.headers.get("x-infra-internal-token"))

  if (!headerToken || headerToken !== internalToken) {
    const error = new Error("Unauthorized") as Error & { status?: number }
    error.status = 401
    throw error
  }
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json().catch(() => ({}))) as T
}

export function createAdminClient() {
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = normalizeTrim(Deno.env.get("SUPABASE_URL"))
  const serviceRoleKey = normalizeTrim(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment is not configured")
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

export function assertResult(result: { error: { message?: string } | null }, fallbackMessage: string): void {
  if (!result?.error) {
    return
  }

  throw new Error(result.error.message || fallbackMessage)
}

export function buildMediaItemKey(entityType: unknown, entityId: unknown): string | null {
  const normalizedEntityType = normalizeLower(entityType)
  const normalizedEntityId = normalizeTrim(entityId)

  if (!normalizedEntityType || !normalizedEntityId) {
    return null
  }

  return `${normalizedEntityType}_${normalizedEntityId}`
}

export function normalizeMediaType(value: unknown): string {
  return normalizeLower(value)
}

export function isMovieMediaType(value: unknown): boolean {
  return normalizeMediaType(value) === "movie"
}

export function isListSubjectType(value: unknown): boolean {
  return normalizeMediaType(value) === "list"
}

export function isTvReference(value: unknown): boolean {
  const normalized = normalizeTrim(value)

  if (!normalized) {
    return false
  }

  return normalized.startsWith("/tv/") || normalized.includes("tv_")
}

export function isSupportedContentSubjectType(value: unknown): boolean {
  const normalized = normalizeMediaType(value)

  if (!normalized) {
    return false
  }

  return normalized === "movie" || normalized === "list" || normalized === "user"
}

export async function withQueryTimeout<T>(
  promise: Promise<T>,
  {
    timeoutMs = 4000,
    fallbackValue,
  }: {
    timeoutMs?: number
    fallbackValue: T
  }
): Promise<T & { timedOut?: boolean }> {
  const timeoutPromise = new Promise<T & { timedOut?: boolean }>((resolve) => {
    setTimeout(() => {
      resolve({
        ...(fallbackValue as Record<string, unknown>),
        timedOut: true,
      } as T & { timedOut?: boolean })
    }, timeoutMs)
  })

  return (await Promise.race([promise as Promise<T & { timedOut?: boolean }>, timeoutPromise])) as T & {
    timedOut?: boolean
  }
}
