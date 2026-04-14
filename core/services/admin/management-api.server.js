import 'server-only';

import { ADMIN_CONFIG } from './config.server';

const MANAGEMENT_API_BASE_URL = 'https://api.supabase.com';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function buildManagementConfig() {
  const projectRef = normalizeValue(ADMIN_CONFIG.projectRef);
  const managementToken = normalizeValue(ADMIN_CONFIG.managementToken);
  const isAvailable = Boolean(projectRef && managementToken);
  const missingEnvKeys = [];

  if (!projectRef) {
    missingEnvKeys.push('SUPABASE_PROJECT_REF');
  }

  if (!managementToken) {
    missingEnvKeys.push('SUPABASE_MANAGEMENT_TOKEN');
  }

  return {
    isAvailable,
    managementToken,
    missingEnvKeys,
    projectRef,
  };
}

async function fetchJson(url, managementToken) {
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${managementToken}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      normalizeValue(payload?.message) ||
        normalizeValue(payload?.error) ||
        `Management API request failed (${response.status})`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function fetchFromCandidatePaths(paths = []) {
  const config = buildManagementConfig();

  if (!config.isAvailable) {
    const missing = config.missingEnvKeys.filter(Boolean);

    return {
      available: false,
      error: {
        code: 'MANAGEMENT_UNAVAILABLE',
        message: missing.length > 0 ? `Missing env keys: ${missing.join(', ')}` : 'Management API is not available',
      },
      path: null,
      payload: null,
    };
  }

  let lastError = null;

  for (const path of paths) {
    const normalizedPath = normalizeValue(path);

    if (!normalizedPath) {
      continue;
    }

    const url = `${MANAGEMENT_API_BASE_URL}${normalizedPath}`;

    try {
      const payload = await fetchJson(url, config.managementToken);

      return {
        available: true,
        error: null,
        path: normalizedPath,
        payload,
      };
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);

      if (status !== 404 && status !== 405) {
        break;
      }
    }
  }

  return {
    available: false,
    error: {
      code: 'MANAGEMENT_FETCH_FAILED',
      message: normalizeValue(lastError?.message) || 'Management API request failed',
    },
    path: null,
    payload: null,
  };
}

function normalizeFunctionListPayload(payload = null) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.functions)) {
    return payload.functions;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function normalizeAdvisorListPayload(payload = null) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.result?.lints)) {
    return payload.result.lints;
  }

  if (Array.isArray(payload?.lints)) {
    return payload.lints;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function normalizeEdgeLogPayload(payload = null) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.result?.result)) {
    return payload.result.result;
  }

  if (Array.isArray(payload?.result)) {
    return payload.result;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export async function fetchManagementFunctions() {
  const config = buildManagementConfig();

  const response = await fetchFromCandidatePaths([
    `/v1/projects/${config.projectRef}/functions`,
    `/v1/projects/${config.projectRef}/edge-functions`,
  ]);

  return {
    available: response.available,
    error: response.error,
    items: normalizeFunctionListPayload(response.payload),
    path: response.path,
  };
}

export async function fetchManagementAdvisors(type = 'security') {
  const normalizedType = normalizeLowerValue(type) || 'security';
  const config = buildManagementConfig();

  const response = await fetchFromCandidatePaths([
    `/v1/projects/${config.projectRef}/advisors?type=${normalizedType}`,
    `/v1/projects/${config.projectRef}/database/advisors?type=${normalizedType}`,
  ]);

  return {
    available: response.available,
    error: response.error,
    items: normalizeAdvisorListPayload(response.payload),
    path: response.path,
  };
}

export async function fetchManagementEdgeFunctionLogs(limit = 120) {
  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(20, Math.min(500, Number(limit))) : 120;
  const config = buildManagementConfig();

  const response = await fetchFromCandidatePaths([
    `/v1/projects/${config.projectRef}/logs/edge-function?limit=${normalizedLimit}`,
    `/v1/projects/${config.projectRef}/logs?service=edge-function&limit=${normalizedLimit}`,
  ]);

  return {
    available: response.available,
    error: response.error,
    items: normalizeEdgeLogPayload(response.payload),
    path: response.path,
  };
}
