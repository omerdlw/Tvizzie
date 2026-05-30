import { isRecoverableRolloutError, resolveWriteRolloutDecision } from './write-rollout.config.server.js';

async function runShadowValidation({ edgeValidate, legacyResult, logger, requestId, decision }) {
  const executeShadow = edgeValidate;

  if (typeof executeShadow !== 'function') {
    return null;
  }

  try {
    const shadowResult = await executeShadow({
      mode: 'shadow',
      requestId,
    });

    if (typeof logger === 'function') {
      logger({
        decision,
        kind: 'shadow-success',
        requestId,
        shadowResult,
      });
    }

    return {
      legacyResult,
      shadowResult,
    };
  } catch (error) {
    if (typeof logger === 'function') {
      logger({
        decision,
        error: String(error?.message || 'Shadow validation failed'),
        kind: 'shadow-failure',
        requestId,
      });
    }

    return {
      legacyResult,
      shadowError: String(error?.message || 'Shadow validation failed'),
    };
  }
}

export async function executeWriteRollout({
  domain,
  endpoint,
  userId,
  requestId,
  legacyWrite,
  edgeWrite,
  edgeValidate,
  logger = null,
  fallbackOnRecoverableEdgeError = true,
} = {}) {
  if (typeof legacyWrite !== 'function' && typeof edgeWrite !== 'function') {
    throw new Error('At least one write executor must be defined');
  }

  const decision = resolveWriteRolloutDecision({
    domain,
    endpoint,
    userId,
  });

  if (decision.mode === 'legacy' || !edgeWrite) {
    const result = await legacyWrite({
      mode: 'legacy',
      requestId,
    });

    return {
      decision,
      result,
      source: 'legacy',
    };
  }

  if (decision.shouldRunEdgeAuthoritative) {
    try {
      const result = await edgeWrite({
        mode: 'edge',
        requestId,
      });

      return {
        decision,
        result,
        source: 'edge',
      };
    } catch (error) {
      const canFallback =
        fallbackOnRecoverableEdgeError && typeof legacyWrite === 'function' && isRecoverableRolloutError(error);

      if (!canFallback) {
        throw error;
      }

      if (typeof logger === 'function') {
        logger({
          decision,
          error: String(error?.message || 'Edge write failed'),
          kind: 'edge-fallback-to-legacy',
          requestId,
        });
      }

      const legacyResult = await legacyWrite({
        mode: 'legacy-fallback',
        requestId,
      });

      return {
        decision,
        result: legacyResult,
        source: 'legacy-fallback',
      };
    }
  }

  const legacyResult = await legacyWrite({
    mode: 'legacy',
    requestId,
  });

  if (decision.shouldRunShadow) {
    queueMicrotask(() => {
      runShadowValidation({
        decision,
        edgeValidate,
        legacyResult,
        logger,
        requestId,
      }).catch(() => {});
    });
  }

  return {
    decision,
    result: legacyResult,
    source: 'legacy',
  };
}
