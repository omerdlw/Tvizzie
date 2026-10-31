import { report } from "@omerdlw/base-framework/utils";
import { TMDB_IMAGE_BASE_URL } from "@/infrastructure/tmdb/constants";

const TMDB_IMAGES = new URL(TMDB_IMAGE_BASE_URL);

function isTmdbImageUrl(url: URL): boolean {
  return (
    url.protocol === TMDB_IMAGES.protocol &&
    url.host === TMDB_IMAGES.host &&
    !url.username &&
    !url.password &&
    url.pathname.startsWith(`${TMDB_IMAGES.pathname}/`)
  );
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    return new Response("URL not allowed", { status: 400 });
  }

  if (!isTmdbImageUrl(target)) {
    return new Response("URL not allowed", { status: 400 });
  }

  try {
    let currentUrl = target;
    let upstreamResponse: Response;
    let redirectCount = 0;

    while (true) {
      upstreamResponse = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (upstreamResponse.status < 300 || upstreamResponse.status >= 400) {
        break;
      }

      const location = upstreamResponse.headers.get("location");
      if (!location || redirectCount >= 5) {
        return new Response("Failed to fetch upstream image", {
          status: 400,
        });
      }

      const redirectUrl = new URL(location, currentUrl);
      if (!isTmdbImageUrl(redirectUrl)) {
        return new Response("URL not allowed", { status: 400 });
      }

      await upstreamResponse.body?.cancel();
      currentUrl = redirectUrl;
      redirectCount++;
    }

    if (!upstreamResponse.ok) {
      return new Response("Failed to fetch upstream image", {
        status: upstreamResponse.status,
      });
    }

    const contentType = upstreamResponse.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response("Upstream response is not an image", { status: 415 });
    }

    return new Response(upstreamResponse.body, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    report("Ambient proxy", error);
    return new Response("Image unavailable", {
      status: 500,
    });
  }
}
