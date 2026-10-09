import "server-only";

import { Redis } from "@upstash/redis";
import {
  getUpstashRedisConfig,
  requireUpstashRedisConfig,
  type UpstashRedisConfig,
} from "@/infrastructure/env";

let redisClient: Redis | null = null;

function createRedisClient(config?: UpstashRedisConfig): Redis {
  const resolvedConfig = config || requireUpstashRedisConfig();
  return new Redis({
    token: resolvedConfig.token,
    url: resolvedConfig.url,
  });
}

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const config = getUpstashRedisConfig();
  if (!config) return null;

  redisClient = createRedisClient(config);
  return redisClient;
}
