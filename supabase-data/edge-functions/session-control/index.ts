import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { errorResponse, jsonResponse } from "../_shared/http.js"
import { assertInternalAccess, resolveErrorStatus } from "../_shared/internal.js"
import { normalizeTrim } from "../_shared/normalize.js"
import { createAdminClient } from "../_shared/supabase.js"

type SessionControlRequest = {
  currentSessionJti?: string | null
  reason?: string | null
  revokeBefore?: string | null
  userId?: string
}

const PRIMARY_RPC_NAME = "auth_set_revocation_state"

function resolveRevokeBeforeIso(input: unknown): string {
  const raw = normalizeTrim(input)

  if (!raw) {
    return new Date().toISOString()
  }

  const timestamp = Date.parse(raw)

  if (!Number.isFinite(timestamp)) {
    const error = new Error("revokeBefore must be a valid ISO datetime") as Error & {
      status?: number
    }

    error.status = 400
    throw error
  }

  return new Date(timestamp).toISOString()
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed")
  }

  try {
    assertInternalAccess(request)

    const payload = (await request.json().catch(() => ({}))) as SessionControlRequest
    const userId = normalizeTrim(payload?.userId)

    if (!userId) {
      return errorResponse(400, "userId is required")
    }

    const currentSessionJti = normalizeTrim(payload?.currentSessionJti) || null
    const reason = normalizeTrim(payload?.reason) || null
    const revokeBefore = resolveRevokeBeforeIso(payload?.revokeBefore)

    const admin = createAdminClient()

    const rpcPayload = {
      p_user_id: userId,
      p_revoke_before: revokeBefore,
      p_exempt_session_jti: currentSessionJti,
      p_reason: reason,
    }

    const rpcResult = await admin.rpc(PRIMARY_RPC_NAME, rpcPayload)

    if (rpcResult.error) {
      throw new Error(
        normalizeTrim(rpcResult.error.message) ||
          "Session revocation state could not be updated"
      )
    }

    return jsonResponse(200, {
      ok: true,
      revokeBefore,
      revokedAll: !currentSessionJti,
      userId,
    })
  } catch (error) {
    return errorResponse(
      resolveErrorStatus(error),
      String((error as Error)?.message || "Session control function failed")
    )
  }
})
