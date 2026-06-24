/**
 * Translation V4 任务类型定义（TsFrontend 独立实现）。
 *
 * 该文件刻意与 TSF 既有翻译代码完全解耦：所有 v4 相关逻辑都收敛在
 * `app/server/translateV4/` 与 `app/routes/api.translate-v4.*`、
 * `app/routes/app.translate-v4/` 下，未来可整体删除而不影响旧链路。
 *
 * 数据结构与 Spark 仓库 `Spark/worker` 读取的 job 文档保持一致，
 * 这样 TsFrontend 写入同一个 Cosmos 容器后，Spark worker 流水线可直接消费。
 */

export const TRANSLATION_V4_MODULES = [
  "PRODUCT",
  "PRODUCT_OPTION",
  "PRODUCT_OPTION_VALUE",
  "COLLECTION",
  "ONLINE_STORE_THEME_APP_EMBED",
  "ONLINE_STORE_THEME_JSON_TEMPLATE",
  "ONLINE_STORE_THEME_SECTION_GROUP",
  "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
  "MENU",
  "LINK",
  "DELIVERY_METHOD_DEFINITION",
  "FILTER",
  "METAFIELD",
  "METAOBJECT",
  "PAYMENT_GATEWAY",
  "SELLING_PLAN",
  "SELLING_PLAN_GROUP",
  "SHOP",
  "ARTICLE",
  "BLOG",
  "PAGE",
] as const;

export type TranslationV4Module = (typeof TRANSLATION_V4_MODULES)[number];

/** 任务来源标识：TsFrontend 创建的任务统一打此标记，便于 worker / 运营区分。 */
export const TS_FRONTEND_TASK_SOURCE = "TsFrontend";

/** 每类资源不设上限（worker init 全量枚举）。 */
export const V4_LIMIT_UNLIMITED = Number.MAX_SAFE_INTEGER;

export type TranslationV4Status =
  | "CREATED"
  | "INIT_QUEUED"
  | "INITIALIZING"
  | "INIT_DONE"
  | "TRANSLATE_QUEUED"
  | "TRANSLATING"
  | "TRANSLATE_DONE"
  | "WRITEBACK_QUEUED"
  | "WRITING_BACK"
  | "VERIFY_QUEUED"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "PAUSED"
  | "CANCELLED";

export type TranslationV4Metrics = {
  initTotal: number;
  initDone: number;
  translateTotal: number;
  translateDone: number;
  translateFailed: number;
  translateFallback: number;
  translateUnitTotal: number;
  translateUnitDone: number;
  writebackTotal: number;
  writebackDone: number;
  writebackFailed: number;
  verifyTotal: number;
  verifyDone: number;
  verifyFailed: number;
  usedTokens: number;
  translateStartedAt?: string | null;
  currentModule?: string | null;
};

export type StageName = "INIT" | "TRANSLATE" | "WRITEBACK" | "VERIFY";

export type StageTiming = { startedAt: string; endedAt: string | null };

export type StageTimings = Partial<Record<StageName, StageTiming>>;

export const EMPTY_V4_METRICS: TranslationV4Metrics = {
  initTotal: 0,
  initDone: 0,
  translateTotal: 0,
  translateDone: 0,
  translateFailed: 0,
  translateFallback: 0,
  translateUnitTotal: 0,
  translateUnitDone: 0,
  writebackTotal: 0,
  writebackDone: 0,
  writebackFailed: 0,
  verifyTotal: 0,
  verifyDone: 0,
  verifyFailed: 0,
  usedTokens: 0,
};

export type TranslationV4Job = {
  id: string;
  shopName: string;
  shopifyAccessToken: string;
  source: string;
  target: string;
  modules: TranslationV4Module[];
  aiModel: string;
  aiModelUsed: string | null;
  aiProvider: string | null;
  engineUsage: Record<string, { units: number; chars: number }> | null;
  /** 每类资源上限；新任务固定为 {@link V4_LIMIT_UNLIMITED}。 */
  limitPerType: number;
  isCover: boolean;
  isHandle: boolean;
  /** 任务来源标识（TsFrontend）。worker 据此区分入口。 */
  taskSource?: string | null;
  status: TranslationV4Status;
  claimedBy: string | null;
  claimedAt: string | null;
  lastHeartbeat: string | null;
  blobPrefix: string;
  metrics: TranslationV4Metrics;
  stageTimings?: StageTimings | null;
  errorMessage: string | null;
  errorStage: string | null;
  /** 暂停/取消时先写回已翻译内容；写回完成后据此收尾（pause→PAUSED、cancel→CANCELLED）。 */
  pauseAfterWriteback?: "pause" | "cancel" | null;
  estimationRecordedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** 处于活跃（worker 正在/即将处理）的状态。 */
export const ACTIVE_V4_STATUSES: TranslationV4Status[] = [
  "INIT_QUEUED",
  "INITIALIZING",
  "INIT_DONE",
  "TRANSLATE_QUEUED",
  "TRANSLATING",
  "TRANSLATE_DONE",
  "WRITEBACK_QUEUED",
  "WRITING_BACK",
  "VERIFY_QUEUED",
  "VERIFYING",
];

export const TERMINAL_V4_STATUSES: TranslationV4Status[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

/** 仅翻译排队/执行中允许用户暂停（init / writeback / verify 不可暂停）。 */
export function canPauseV4Job(status: TranslationV4Status): boolean {
  switch (status) {
    case "TRANSLATE_QUEUED":
    case "TRANSLATING":
      return true;
    case "CREATED":
    case "INIT_QUEUED":
    case "INITIALIZING":
    case "INIT_DONE":
    case "TRANSLATE_DONE":
    case "WRITEBACK_QUEUED":
    case "WRITING_BACK":
    case "VERIFY_QUEUED":
    case "VERIFYING":
    case "COMPLETED":
    case "FAILED":
    case "PAUSED":
    case "CANCELLED":
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
