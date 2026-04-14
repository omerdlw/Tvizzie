import { createAdminClient } from '@/core/clients/supabase/admin';

const ACCOUNT_LIFECYCLE_TABLE = process.env.ACCOUNT_LIFECYCLE_TABLE || 'account_lifecycle';

export const ACCOUNT_LIFECYCLE_STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
  PENDING_CHANGE: 'PENDING_CHANGE',
  PENDING_DELETE: 'PENDING_DELETE',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeState(value) {
  const normalized = normalizeValue(value).toUpperCase();

  if (!normalized) {
    return ACCOUNT_LIFECYCLE_STATES.ACTIVE;
  }

  return normalized;
}

function normalizeOptionalText(value) {
  const normalized = normalizeValue(value);

  return normalized || null;
}

function isLifecycleUnavailableError(error) {
  const message = normalizeValue(error?.message).toLowerCase();

  return (
    message.includes('account_lifecycle') ||
    message.includes('ensure_account_lifecycle') ||
    message.includes('begin_account_delete') ||
    message.includes('complete_account_delete') ||
    message.includes('abort_account_delete') ||
    message.includes('does not exist')
  );
}

function buildLifecycleRow(row = null) {
  return {
    deletedAt: row?.deleted_at || null,
    pendingOperationKey: normalizeOptionalText(row?.pending_operation_key),
    state: normalizeState(row?.state),
    stateReason: normalizeOptionalText(row?.state_reason),
    userId: normalizeOptionalText(row?.user_id),
  };
}

function resolveDisallowedStateMessage(state) {
  if (state === ACCOUNT_LIFECYCLE_STATES.DELETED) {
    return 'Account has already been deleted';
  }

  if (state === ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE) {
    return 'Account is pending deletion';
  }

  return 'Account is not active';
}

async function callLifecycleRpc(rpcName, payload = {}) {
  const admin = createAdminClient();
  const result = await admin.rpc(rpcName, payload);

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function readOrCreateLifecycleRow(userId) {
  const admin = createAdminClient();
  const normalizedUserId = normalizeValue(userId);

  const selectResult = await admin
    .from(ACCOUNT_LIFECYCLE_TABLE)
    .select('user_id,state,state_reason,pending_operation_key,deleted_at')
    .eq('user_id', normalizedUserId)
    .maybeSingle();

  if (selectResult.error) {
    throw selectResult.error;
  }

  if (selectResult.data) {
    return buildLifecycleRow(selectResult.data);
  }

  const insertResult = await admin
    .from(ACCOUNT_LIFECYCLE_TABLE)
    .insert({
      state: ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      state_reason: 'bootstrap',
      user_id: normalizedUserId,
    })
    .select('user_id,state,state_reason,pending_operation_key,deleted_at')
    .maybeSingle();

  if (insertResult.error) {
    const message = normalizeValue(insertResult.error.message).toLowerCase();

    if (message.includes('duplicate') || message.includes('unique constraint')) {
      const retrySelect = await admin
        .from(ACCOUNT_LIFECYCLE_TABLE)
        .select('user_id,state,state_reason,pending_operation_key,deleted_at')
        .eq('user_id', normalizedUserId)
        .maybeSingle();

      if (retrySelect.error) {
        throw retrySelect.error;
      }

      return buildLifecycleRow(retrySelect.data);
    }

    throw insertResult.error;
  }

  return buildLifecycleRow(insertResult.data);
}

export async function ensureAccountLifecycle(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  try {
    const rpcData = await callLifecycleRpc('ensure_account_lifecycle', {
      p_user_id: normalizedUserId,
    });

    return buildLifecycleRow(rpcData);
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account lifecycle could not be initialized');
    }

    try {
      return await readOrCreateLifecycleRow(normalizedUserId);
    } catch (fallbackError) {
      if (!isLifecycleUnavailableError(fallbackError)) {
        throw new Error(fallbackError?.message || 'Account lifecycle could not be initialized');
      }

      return {
        deletedAt: null,
        pendingOperationKey: null,
        state: ACCOUNT_LIFECYCLE_STATES.ACTIVE,
        stateReason: 'lifecycle_unavailable',
        userId: normalizedUserId,
      };
    }
  }
}

export async function assertAccountLifecycleAllowed({
  allowedStates = [ACCOUNT_LIFECYCLE_STATES.ACTIVE],
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  const lifecycle = await ensureAccountLifecycle(normalizedUserId);
  const normalizedAllowedStates = new Set(
    (Array.isArray(allowedStates) ? allowedStates : [allowedStates]).map((state) => normalizeState(state))
  );

  if (!normalizedAllowedStates.has(lifecycle.state)) {
    throw new Error(resolveDisallowedStateMessage(lifecycle.state));
  }

  return lifecycle;
}

function normalizeDeleteTransitionResult(payload = null) {
  const record = Array.isArray(payload) ? payload[0] : payload;

  return {
    accepted: Boolean(record?.accepted),
    reason: normalizeOptionalText(record?.reason) || 'unknown',
    state: normalizeState(record?.state),
  };
}

export async function beginAccountDeleteLifecycle({
  idempotencyKey = null,
  requestId = null,
  sessionJti = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  try {
    const rpcData = await callLifecycleRpc('begin_account_delete', {
      p_operation_key: normalizeOptionalText(idempotencyKey),
      p_request_id: normalizeOptionalText(requestId),
      p_session_jti: normalizeOptionalText(sessionJti),
      p_user_id: normalizedUserId,
    });

    return normalizeDeleteTransitionResult(rpcData);
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be started');
    }

    return {
      accepted: true,
      reason: 'lifecycle_unavailable',
      state: ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE,
    };
  }
}

export async function completeAccountDeleteLifecycle({
  metadata = null,
  requestId = null,
  sessionJti = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  try {
    await callLifecycleRpc('complete_account_delete', {
      p_metadata: metadata && typeof metadata === 'object' ? metadata : {},
      p_request_id: normalizeOptionalText(requestId),
      p_session_jti: normalizeOptionalText(sessionJti),
      p_user_id: normalizedUserId,
    });
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be completed');
    }
  }
}

export async function abortAccountDeleteLifecycle({
  metadata = null,
  reason = 'delete_failed',
  requestId = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  try {
    await callLifecycleRpc('abort_account_delete', {
      p_metadata: metadata && typeof metadata === 'object' ? metadata : {},
      p_reason: normalizeOptionalText(reason) || 'delete_failed',
      p_request_id: normalizeOptionalText(requestId),
      p_user_id: normalizedUserId,
    });
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be rolled back');
    }
  }
}
