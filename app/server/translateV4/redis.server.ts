import Redis from "ioredis";

/**
 * TsFrontend 专用 Redis 客户端，与 Spark worker 连同一个 Azure Cache 实例。
 *
 * 环境变量统一带 `_V4` 后缀，与 TSF 既有配置隔离：
 *   REDIS_URL_V4                 （优先；形如 rediss://:password@host:port/0）
 *   REDIS_HOSTNAME_V4 + REDIS_PASSWORD_V4 [+ REDIS_PORT_V4 + REDIS_TLS_V4]
 */
let singleton: Redis | undefined;

export function getTranslateV4RedisClient(): Redis {
  if (singleton) return singleton;

  const url = process.env.REDIS_URL_V4?.trim();
  if (url) {
    singleton = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 10_000,
    });
    return singleton;
  }

  const host = process.env.REDIS_HOSTNAME_V4?.trim();
  const password = process.env.REDIS_PASSWORD_V4?.trim();

  if (!host || !password) {
    throw new Error(
      "Redis(V4) 未配置：请设置 REDIS_URL_V4，或 REDIS_HOSTNAME_V4 与 REDIS_PASSWORD_V4",
    );
  }

  const port = Number(process.env.REDIS_PORT_V4?.trim() || "6380");
  const useTls = process.env.REDIS_TLS_V4 !== "false";

  singleton = new Redis({
    host,
    port,
    password,
    tls: useTls ? {} : undefined,
    maxRetriesPerRequest: 2,
    connectTimeout: 10_000,
  });
  return singleton;
}

/** worker 各阶段的 hint 队列 key。 */
export const V4_HINT_KEYS = {
  init: "translate:v4:hint:init",
  translate: "translate:v4:hint:translate",
  writeback: "translate:v4:hint:writeback",
  verify: "translate:v4:hint:verify",
} as const;

/** worker 实时写入的进度 hash key。 */
export function v4ProgressKey(taskId: string): string {
  return `translate:v4:progress:${taskId}`;
}

/** 运行时控制键：worker 在阶段中途读取后优雅暂停/取消。 */
export function v4ControlKey(taskId: string): string {
  return `translate:v4:control:${taskId}`;
}

export async function setV4Control(
  taskId: string,
  action: "pause" | "cancel",
): Promise<void> {
  try {
    await getTranslateV4RedisClient().set(v4ControlKey(taskId), action, "EX", 24 * 3600);
  } catch {
    // 尽力而为；即便失败，阶段结束后仍会依据 Cosmos 状态停止
  }
}

export async function clearV4Control(taskId: string): Promise<void> {
  try {
    await getTranslateV4RedisClient().del(v4ControlKey(taskId));
  } catch {
    // non-fatal
  }
}
