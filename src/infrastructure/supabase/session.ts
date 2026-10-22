// The proxy checks every signed-in request's session against auth_sessions and
// passes the id it found live downstream under this header, so server code does
// not ask again. The proxy drops any copy a client sends.
export const SESSION_CHECKED_HEADER = "x-tvizzie-session-checked";

// Auth cookies are Secure wherever the site is served over https. Plain http is
// only ever a local server, where a Secure cookie would not be stored.
export function isHttpsRequest(headers: Headers, protocol?: string): boolean {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded || protocol?.replace(/:$/, "")) === "https";
}
