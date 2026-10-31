import "server-only";

import { Redis } from "@upstash/redis";
import { getUpstashRedisConfig } from "@/infrastructure/env";

let client: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (client) return client;
  const config = getUpstashRedisConfig();
  if (!config) return null;
  client = new Redis(config);
  return client;
}
