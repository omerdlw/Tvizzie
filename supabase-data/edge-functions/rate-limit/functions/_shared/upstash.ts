import { normalizeTrim } from "./normalize.ts"

export type UpstashPart = string | number | boolean

function getUpstashConfig() {
  const url = normalizeTrim(Deno.env.get("UPSTASH_REDIS_REST_URL"))
  const token = normalizeTrim(Deno.env.get("UPSTASH_REDIS_REST_TOKEN"))

  return {
    token,
    url,
  }
}

export function isUpstashConfigured(): boolean {
  const { token, url } = getUpstashConfig()
  return Boolean(url && token)
}

export async function callUpstash(command: UpstashPart[]): Promise<unknown> {
  const { token, url } = getUpstashConfig()

  if (!url || !token) {
    throw new Error("Upstash Redis is not configured")
  }

  const encodedCommand = command
    .map((part) => encodeURIComponent(String(part)))
    .join("/")

  const response = await fetch(`${url}/${encodedCommand}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || "Upstash request failed")
  }

  return payload?.result
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", data)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
