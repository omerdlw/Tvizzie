import { UserError } from "@omerdlw/base-framework/utils";

export function assertSameOrigin(request: Request): void {
  try {
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");

    if (originHeader) {
      const headerOrigin = new URL(originHeader).origin;
      if (headerOrigin === requestOrigin) return;
    } else if (fetchSite === "same-origin") {
      return;
    }
  } catch {}

  throw new UserError("Cross-site request rejected", 403);
}
