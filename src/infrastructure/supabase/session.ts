export const SESSION_CHECKED_HEADER = "x-guffin-session-checked";

export function isHttpsRequest(headers: Headers, protocol?: string): boolean {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded || protocol?.replace(/:$/, "")) === "https";
}
