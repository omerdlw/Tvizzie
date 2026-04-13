import 'server-only';

export const ADMIN_HEALTH_STATUS = Object.freeze({
  DEGRADED: 'degraded',
  ERROR: 'error',
  HEALTHY: 'healthy',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeWidget(widget = {}) {
  return {
    description: normalizeValue(widget.description) || '',
    href: normalizeValue(widget.href) || null,
    id: normalizeValue(widget.id) || 'widget',
    source: normalizeValue(widget.source) || null,
    status: normalizeValue(widget.status) || ADMIN_HEALTH_STATUS.HEALTHY,
    title: normalizeValue(widget.title) || 'Widget',
    value: widget.value ?? null,
  };
}

function normalizeError(error = {}) {
  return {
    code: normalizeValue(error.code) || 'ADMIN_SOURCE_ERROR',
    message: normalizeValue(error.message) || 'Unknown admin data source error',
    source: normalizeValue(error.source) || 'admin',
  };
}

function dedupeErrors(errors = []) {
  const seen = new Set();

  return errors.filter((error) => {
    const key = `${error.source}::${error.code}::${error.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function resolveStatus({ errors = [], partial = false, widgets = [] } = {}) {
  if (errors.length > 0 && widgets.length === 0) {
    return ADMIN_HEALTH_STATUS.ERROR;
  }

  if (partial || errors.length > 0) {
    return ADMIN_HEALTH_STATUS.DEGRADED;
  }

  return ADMIN_HEALTH_STATUS.HEALTHY;
}

export function createAdminPayload({ data = {}, errors = [], partial = false, status = null, widgets = [] } = {}) {
  const normalizedWidgets = widgets.map((widget) => normalizeWidget(widget));
  const normalizedErrors = dedupeErrors(errors.map((error) => normalizeError(error)));
  const resolvedStatus =
    normalizeValue(status) || resolveStatus({ errors: normalizedErrors, partial, widgets: normalizedWidgets });
  const resolvedPartial = partial || resolvedStatus === ADMIN_HEALTH_STATUS.DEGRADED;

  return {
    data,
    errors: normalizedErrors,
    generatedAt: new Date().toISOString(),
    ok: resolvedStatus !== ADMIN_HEALTH_STATUS.ERROR,
    partial: resolvedPartial,
    status: resolvedStatus,
    widgets: normalizedWidgets,
  };
}

export function createAdminErrorEnvelope({
  code = 'ADMIN_INTERNAL_ERROR',
  message = 'Admin request failed',
  partial = false,
  source = 'admin',
} = {}) {
  return {
    code: normalizeValue(code) || 'ADMIN_INTERNAL_ERROR',
    generatedAt: new Date().toISOString(),
    message: normalizeValue(message) || 'Admin request failed',
    partial: Boolean(partial),
    source: normalizeValue(source) || 'admin',
  };
}
