import {
  countTranslationJobsCreatedBetween,
  type TranslationJobWindowStats,
} from "./cosmosV4.js";

const LOG = "[renderErrDigest]";

/** Render workspace owner（whoeven's Workspace）。可用 RENDER_OWNER_ID 覆盖。 */
const DEFAULT_RENDER_OWNER_ID = "tea-csovfmhu0jms738qrra0";

/** 仅 prod：TSF Web + TSF Worker。 */
const PROD_RENDER_SERVICES = [
  {
    id: "srv-csp2931u0jms738sfmc0",
    label: "TSF Web PROD",
    dashboardPath: "web",
  },
  {
    id: "srv-d8sqas4vikkc73f5nbog",
    label: "TSF Worker PROD",
    dashboardPath: "worker",
  },
] as const;

const DEFAULT_INTERVAL_MS = 60 * 60_000;
const DEFAULT_LOOKBACK_MS = 60 * 60_000;
const DEFAULT_INITIAL_DELAY_MS = 3 * 60_000;
const MAX_PAGES = 10;
const PAGE_LIMIT = 100;
const TOP_ERRORS = 8;
const MESSAGE_PREVIEW_LEN = 160;

/** 已知噪音，不计入汇总。 */
const IGNORE_MESSAGE_PATTERNS: RegExp[] = [/AbortError/i];

type RenderLogEntry = {
  id?: string;
  message?: string;
  timestamp?: string;
  labels?: Array<{ name: string; value: string }>;
};

type RenderLogsResponse = {
  hasMore?: boolean;
  logs?: RenderLogEntry[];
  nextStartTime?: string;
  nextEndTime?: string;
};

type ErrorBucket = {
  count: number;
  sample: string;
  sampleAt: string;
};

export function getRenderErrorDigestIntervalMs(): number {
  const n = Number(process.env.RENDER_ERROR_DIGEST_INTERVAL_MS);
  return n > 0 ? n : DEFAULT_INTERVAL_MS;
}

export function getRenderErrorDigestLookbackMs(): number {
  const n = Number(process.env.RENDER_ERROR_DIGEST_LOOKBACK_MS);
  return n > 0 ? n : DEFAULT_LOOKBACK_MS;
}

export function getRenderErrorDigestInitialDelayMs(): number {
  const n = Number(process.env.RENDER_ERROR_DIGEST_INITIAL_DELAY_MS);
  return n >= 0 ? n : DEFAULT_INITIAL_DELAY_MS;
}

export function isRenderErrorDigestEnabled(): boolean {
  const raw = process.env.RENDER_ERROR_DIGEST_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") {
    return false;
  }
  return Boolean(
    process.env.RENDER_API_KEY?.trim() &&
      process.env.FEISHU_WEBHOOK_URL_RENDER_DIGEST?.trim(),
  );
}

function resolveRenderOwnerId(): string {
  return process.env.RENDER_OWNER_ID?.trim() || DEFAULT_RENDER_OWNER_ID;
}

function resolveServiceLabel(resourceId: string): string {
  const hit = PROD_RENDER_SERVICES.find((s) => s.id === resourceId);
  return hit?.label ?? resourceId;
}

function labelValue(
  entry: RenderLogEntry,
  name: string,
): string | undefined {
  return entry.labels?.find((l) => l.name === name)?.value;
}

function normalizeErrorMessage(message: string): string {
  return message
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "<ts>")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "<uuid>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MESSAGE_PREVIEW_LEN);
}

function shouldIgnoreMessage(message: string): boolean {
  return IGNORE_MESSAGE_PATTERNS.some((re) => re.test(message));
}

function formatDigestTimeRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${fmt.format(start)} ~ ${fmt.format(end)} (CST)`;
}

function buildLogsUrl(params: Record<string, string | string[]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else {
      search.set(key, value);
    }
  }
  return `https://api.render.com/v1/logs?${search.toString()}`;
}

async function fetchRenderErrorLogs(
  apiKey: string,
  ownerId: string,
  resourceIds: string[],
  startTime: string,
  endTime: string,
): Promise<RenderLogEntry[]> {
  const collected: RenderLogEntry[] = [];
  let cursorStart = startTime;
  let cursorEnd = endTime;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = buildLogsUrl({
      ownerId,
      resource: resourceIds,
      startTime: cursorStart,
      endTime: cursorEnd,
      level: "error",
      type: "app",
      direction: "backward",
      limit: String(PAGE_LIMIT),
    });

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 400);
      throw new Error(`Render logs ${res.status}: ${body}`);
    }

    const body = (await res.json()) as RenderLogsResponse;
    const batch = body.logs ?? [];
    collected.push(...batch);

    if (!body.hasMore || batch.length === 0) break;
    if (!body.nextStartTime || !body.nextEndTime) break;
    cursorStart = body.nextStartTime;
    cursorEnd = body.nextEndTime;
  }

  return collected;
}

function aggregateErrors(logs: RenderLogEntry[]): Map<string, ErrorBucket> {
  const buckets = new Map<string, ErrorBucket>();

  for (const entry of logs) {
    const message = entry.message?.trim();
    if (!message || shouldIgnoreMessage(message)) continue;

    const resourceId = labelValue(entry, "resource") ?? "unknown";
    const serviceLabel = resolveServiceLabel(resourceId);
    const key = `${serviceLabel}::${normalizeErrorMessage(message)}`;
    const timestamp = entry.timestamp ?? new Date().toISOString();
    const existing = buckets.get(key);
    if (existing) {
      existing.count++;
      continue;
    }
    buckets.set(key, {
      count: 1,
      sample: message.slice(0, MESSAGE_PREVIEW_LEN),
      sampleAt: timestamp,
    });
  }

  return buckets;
}

function buildFeishuReport(
  start: Date,
  end: Date,
  buckets: Map<string, ErrorBucket>,
  rawTotal: number,
  jobStats: TranslationJobWindowStats | null,
): string {
  const total = [...buckets.values()].reduce((sum, b) => sum + b.count, 0);
  const lines = [
    "【Render PROD 错误汇总】",
    `窗口：${formatDigestTimeRange(start, end)}`,
    `error 日志 ${rawTotal} 条，去重后 ${total} 条`,
    "",
    "翻译任务（按创建时间）：",
    ...(jobStats
      ? [
          `- 自动翻译：成功 ${jobStats.auto.completed} / 进行中 ${jobStats.auto.active} / 失败 ${jobStats.auto.failed} / 总数 ${jobStats.auto.total}`,
          `- 手动翻译：成功 ${jobStats.manual.completed} / 进行中 ${jobStats.manual.active} / 失败 ${jobStats.manual.failed} / 总数 ${jobStats.manual.total}`,
        ]
      : ["- Cosmos 统计暂不可用"]),
    "",
  ];

  const ranked = [...buckets.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );

  if (ranked.length === 0) {
    lines.push("（本窗口无 error 日志）");
    return lines.join("\n");
  }

  let shown = 0;
  for (const [key, bucket] of ranked) {
    if (shown >= TOP_ERRORS) break;
    const serviceLabel = key.split("::")[0] ?? "unknown";
    lines.push(`${shown + 1}. [${serviceLabel}] ×${bucket.count}`);
    lines.push(`   ${bucket.sample}`);
    shown++;
  }

  if (ranked.length > TOP_ERRORS) {
    lines.push("");
    lines.push(`… 另有 ${ranked.length - TOP_ERRORS} 类错误未展开`);
  }

  lines.push("");
  lines.push("Dashboard:");
  for (const svc of PROD_RENDER_SERVICES) {
    lines.push(
      `- ${svc.label}: https://dashboard.render.com/${svc.dashboardPath}/${svc.id}`,
    );
  }

  return lines.join("\n").slice(0, 3900);
}

async function sendFeishuDigest(message: string): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL_RENDER_DIGEST?.trim();
  if (!webhookUrl) {
    console.info(`${LOG} skipped reason=no_webhook`);
    return;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text: message },
    }),
  });

  const text = await res.text();
  let body: { code?: number; msg?: string };
  try {
    body = JSON.parse(text) as { code?: number; msg?: string };
  } catch {
    body = { msg: text.slice(0, 200) };
  }

  if (!res.ok || (body.code !== undefined && body.code !== 0)) {
    throw new Error(
      `Feishu webhook failed http=${res.status} body=${JSON.stringify(body).slice(0, 200)}`,
    );
  }
}

/** 拉取 prod Render app error 日志和翻译任务统计，汇总后发送飞书。 */
export async function runRenderErrorDigest(): Promise<void> {
  if (!isRenderErrorDigestEnabled()) {
    return;
  }

  const apiKey = process.env.RENDER_API_KEY?.trim();
  if (!apiKey) {
    console.info(`${LOG} skipped reason=no_render_api_key`);
    return;
  }

  const lookbackMs = getRenderErrorDigestLookbackMs();
  const end = new Date();
  const start = new Date(end.getTime() - lookbackMs);
  const ownerId = resolveRenderOwnerId();
  const resourceIds = PROD_RENDER_SERVICES.map((s) => s.id);

  console.info(
    `${LOG} start owner=${ownerId} window=${start.toISOString()}..${end.toISOString()}`,
  );

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const [logs, jobStats] = await Promise.all([
    fetchRenderErrorLogs(
      apiKey,
      ownerId,
      [...resourceIds],
      startIso,
      endIso,
    ),
    countTranslationJobsCreatedBetween(startIso, endIso).catch((err) => {
      console.warn(`${LOG} translation job stats unavailable`, err);
      return null;
    }),
  ]);

  const buckets = aggregateErrors(logs);
  const errorCount = [...buckets.values()].reduce((sum, b) => sum + b.count, 0);

  const report = buildFeishuReport(start, end, buckets, logs.length, jobStats);
  await sendFeishuDigest(report);
  console.info(
    `${LOG} sent feishu errors=${errorCount} raw=${logs.length}` +
      (jobStats
        ? ` auto=✅${jobStats.auto.completed}🔄${jobStats.auto.active}❌${jobStats.auto.failed}/${jobStats.auto.total} manual=✅${jobStats.manual.completed}🔄${jobStats.manual.active}❌${jobStats.manual.failed}/${jobStats.manual.total}`
        : " jobStats=unavailable"),
  );
}
