import { normalizeValue } from './normalize.ts';

export function jsonResponse(status: number, payload: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export function errorResponse(status: number, message: string, code?: string) {
  return jsonResponse(status, {
    error: normalizeValue(message) || 'Request failed',
    ...(code ? { code } : {}),
  });
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  const payload = await request.json().catch(() => ({}));
  return payload as T;
}

export function assertMethod(request: Request, allowed: string[]) {
  const method = normalizeValue(request.method).toUpperCase();
  const normalizedAllowed = allowed.map((value) => normalizeValue(value).toUpperCase());

  if (normalizedAllowed.includes(method)) {
    return;
  }

  const error = new Error(`Method ${method || 'UNKNOWN'} not allowed`);
  (error as Error & { status?: number }).status = 405;
  throw error;
}

export function mapErrorToStatus(error: unknown, fallback = 500): number {
  const explicitStatus = Number((error as { status?: number })?.status);

  if (Number.isFinite(explicitStatus) && explicitStatus > 0) {
    return explicitStatus;
  }

  const message = normalizeValue((error as Error)?.message).toLowerCase();

  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return 401;
  }

  if (
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('already') ||
    message.includes('not found')
  ) {
    return 400;
  }

  return fallback;
}
