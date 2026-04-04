const BASE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

export function jsonResponse(status: number, payload: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...BASE_HEADERS,
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  status: number,
  message: string,
  extraPayload: Record<string, unknown> = {},
  extraHeaders: Record<string, string> = {}
): Response {
  return jsonResponse(
    status,
    {
      error: message,
      ...extraPayload,
    },
    extraHeaders
  );
}
