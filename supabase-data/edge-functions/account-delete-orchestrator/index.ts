import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { assertMethod, errorResponse, jsonResponse, mapErrorToStatus, readJsonBody } from "../_shared/http.ts"
import { assertInternalAccess } from "../_shared/internal.ts"
import { normalizeBoolean, normalizeValue } from "../_shared/normalize.ts"
import { createAdminClient } from "../_shared/supabase.ts"

type DeleteRequest = {
  deleteAuthUser?: boolean
  userId?: string
}

function isMissingRelationError(error: unknown) {
  const message = normalizeValue((error as { message?: string })?.message).toLowerCase()

  return message.includes("relation") && message.includes("does not exist")
}

async function executeDeleteStep(
  stepName: string,
  operation: () => Promise<{ error: { message?: string } | null }>,
  { optional = false }: { optional?: boolean } = {}
) {
  const result = await operation()

  if (!result.error) {
    return {
      step: stepName,
      success: true,
      skipped: false,
    }
  }

  if (optional && isMissingRelationError(result.error)) {
    return {
      step: stepName,
      success: true,
      skipped: true,
    }
  }

  throw new Error(result.error.message || `${stepName} failed`)
}

async function purgeAccountData(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const steps = [] as Array<{ step: string; skipped: boolean; success: boolean }>

  steps.push(
    await executeDeleteStep("review_likes", () =>
      admin
        .from("review_likes")
        .delete()
        .eq("user_id", userId)
    )
  )

  steps.push(
    await executeDeleteStep("list_likes", () =>
      admin
        .from("list_likes")
        .delete()
        .eq("user_id", userId)
    )
  )

  steps.push(
    await executeDeleteStep("likes", () =>
      admin
        .from("likes")
        .delete()
        .eq("user_id", userId),
      { optional: true }
    )
  )

  steps.push(
    await executeDeleteStep("watchlist", () =>
      admin
        .from("watchlist")
        .delete()
        .eq("user_id", userId),
      { optional: true }
    )
  )

  steps.push(
    await executeDeleteStep("watched", () =>
      admin
        .from("watched")
        .delete()
        .eq("user_id", userId),
      { optional: true }
    )
  )

  steps.push(
    await executeDeleteStep("media_reviews", () =>
      admin
        .from("media_reviews")
        .delete()
        .eq("user_id", userId),
      { optional: true }
    )
  )

  steps.push(
    await executeDeleteStep("list_reviews", () =>
      admin
        .from("list_reviews")
        .delete()
        .eq("user_id", userId),
      { optional: true }
    )
  )

  steps.push(
    await executeDeleteStep("lists", () =>
      admin
        .from("lists")
        .delete()
        .eq("user_id", userId),
      { optional: true }
    )
  )

  steps.push(
    await executeDeleteStep("follows", () =>
      admin
        .from("follows")
        .delete()
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    )
  )

  steps.push(
    await executeDeleteStep("activity", () =>
      admin
        .from("activity")
        .delete()
        .eq("user_id", userId),
      { optional: true }
    )
  )

  steps.push(
    await executeDeleteStep("notifications", () =>
      admin
        .from("notifications")
        .delete()
        .eq("user_id", userId)
    )
  )

  steps.push(
    await executeDeleteStep("usernames", () =>
      admin
        .from("usernames")
        .delete()
        .eq("user_id", userId)
    )
  )

  steps.push(
    await executeDeleteStep("profiles", () =>
      admin
        .from("profiles")
        .delete()
        .eq("id", userId)
    )
  )

  return steps
}

async function deleteAuthUser(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const result = await admin.auth.admin.deleteUser(userId)

  if (result.error) {
    throw new Error(result.error.message || "Auth user could not be deleted")
  }

  return true
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ["POST"])
    assertInternalAccess(request)

    const payload = await readJsonBody<DeleteRequest>(request)
    const userId = normalizeValue(payload.userId)
    const shouldDeleteAuthUser = normalizeBoolean(payload.deleteAuthUser, false)

    if (!userId) {
      throw new Error("userId is required")
    }

    const admin = createAdminClient()
    const steps = await purgeAccountData(admin, userId)

    if (shouldDeleteAuthUser) {
      await deleteAuthUser(admin, userId)
      steps.push({
        step: "auth.users",
        skipped: false,
        success: true,
      })
    }

    return jsonResponse(200, {
      ok: true,
      userId,
      steps,
    })
  } catch (error) {
    const status = mapErrorToStatus(error)
    const message = normalizeValue((error as Error)?.message) || "account-delete-orchestrator failed"

    if (status === 405) {
      return errorResponse(405, "Method not allowed")
    }

    return errorResponse(status, message)
  }
})
