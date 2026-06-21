import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Flex,
  InputNumber,
  Progress,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { listV4JobSummaries } from "~/server/translateV4/progress.server";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { getShopQuota, type ShopQuota } from "~/server/translateV4/quota.server";
import {
  TRANSLATION_V4_MODULES,
  TS_FRONTEND_TASK_SOURCE,
  canPauseV4Job,
  type StageName,
  type StageTiming,
  type TranslationV4Status,
} from "~/server/translateV4/types";
import { SupportChatWidget } from "./SupportChatWidget";
import {
  createTranslateV4Tasks,
  formatCreateTasksMessage,
} from "~/lib/createTranslateV4Tasks";

const { Title, Text } = Typography;

/** 模块中文展示名（仅用于本页 UI，与服务端解耦）。 */
const MODULE_LABELS: Record<string, string> = {
  PRODUCT: "商品",
  PRODUCT_OPTION: "商品选项",
  PRODUCT_OPTION_VALUE: "商品选项值",
  COLLECTION: "商品系列",
  ONLINE_STORE_THEME_APP_EMBED: "主题 App 嵌入",
  ONLINE_STORE_THEME_JSON_TEMPLATE: "主题模板",
  ONLINE_STORE_THEME_SECTION_GROUP: "主题区块组",
  ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS: "主题设置",
  MENU: "导航菜单",
  LINK: "链接",
  DELIVERY_METHOD_DEFINITION: "配送方式",
  FILTER: "筛选器",
  METAFIELD: "元字段",
  METAOBJECT: "元对象",
  PAYMENT_GATEWAY: "支付网关",
  SELLING_PLAN: "销售计划",
  SELLING_PLAN_GROUP: "销售计划组",
  SHOP: "店铺信息",
  ARTICLE: "博客文章",
  BLOG: "博客",
  PAGE: "页面",
};

const DEFAULT_MODULES = ["PRODUCT", "COLLECTION", "PAGE", "ARTICLE"];

// 额度扣费系数：实际 token × 此系数 = 消耗的积分（与 worker QUOTA_TOKEN_MULTIPLIER 对齐）。
const QUOTA_TOKEN_MULTIPLIER = 1.5;

// 对齐 DeepSeek 文档：deepseek-chat/reasoner 将于 2026/07/24 弃用，
// 分别对应 deepseek-v4-flash(非思考) 与 deepseek-v4-pro(思考)。
const AI_MODEL_OPTIONS = [
  { value: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { value: "deepseek-v4-pro", label: "deepseek-v4-pro" },
];

type ShopLocaleOption = {
  value: string;
  label: string;
  primary: boolean;
  published: boolean;
};

const SHOP_LOCALES_QUERY = `#graphql
  query TranslateV4ShopLocales {
    shopLocales {
      locale
      name
      primary
      published
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  let locales: ShopLocaleOption[] = [];
  let primaryLocale = "zh-CN";
  try {
    const res = await admin.graphql(SHOP_LOCALES_QUERY);
    const payload = (await res.json()) as {
      data?: {
        shopLocales?: Array<{
          locale: string;
          name: string;
          primary: boolean;
          published: boolean;
        }> | null;
      };
    };
    const rows = payload.data?.shopLocales ?? [];
    locales = rows.map((r) => ({
      value: r.locale,
      label: `${r.name} (${r.locale})`,
      primary: r.primary,
      published: r.published,
    }));
    primaryLocale = rows.find((r) => r.primary)?.locale ?? primaryLocale;
  } catch (err) {
    console.error("[translateV4] load shopLocales failed:", err);
  }

  const [jobs, quota] = await Promise.all([
    listV4JobSummaries(session.shop, { taskSource: TS_FRONTEND_TASK_SOURCE }),
    getShopQuota(session.shop),
  ]);

  return json({ shop: session.shop, locales, primaryLocale, jobs, quota });
};

const STATUS_COLOR: Partial<Record<TranslationV4Status, string>> = {
  COMPLETED: "success",
  FAILED: "error",
  CANCELLED: "default",
  PAUSED: "warning",
  TRANSLATING: "processing",
  INITIALIZING: "processing",
  WRITING_BACK: "processing",
  VERIFYING: "processing",
};

function stageOf(
  status: TranslationV4Status,
  errorStage?: string | null,
): 0 | 1 | 2 | 3 | 4 {
  if (status === "PAUSED" || status === "FAILED") {
    switch (errorStage) {
      case "WRITEBACK":
        return 2;
      case "VERIFY":
        return 3;
      case "TRANSLATE":
      default:
        return 1;
    }
  }
  if (["INIT_QUEUED", "INITIALIZING"].includes(status)) return 0;
  if (status === "INIT_DONE") return 1;
  if (["TRANSLATE_QUEUED", "TRANSLATING"].includes(status)) return 1;
  if (status === "TRANSLATE_DONE") return 2;
  if (["WRITEBACK_QUEUED", "WRITING_BACK"].includes(status)) return 2;
  if (["VERIFY_QUEUED", "VERIFYING"].includes(status)) return 3;
  if (status === "COMPLETED") return 4;
  return 0;
}

type StageMetrics = TranslationJobProgressSummary["metrics"];

function ratioPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

/** 各阶段进度条百分比：始终按 metrics 实际 done/total，与 activeStage 无关。 */
function stageBarPercent(
  idx: number,
  m: StageMetrics,
  jobStatus: TranslationV4Status,
): number {
  if (jobStatus === "COMPLETED") return 100;
  switch (idx) {
    case 0:
      return ratioPercent(m.initDone, m.initTotal);
    case 1:
      return m.translateUnitTotal > 0
        ? ratioPercent(m.translateUnitDone, m.translateUnitTotal)
        : ratioPercent(m.translateDone, m.translateTotal);
    case 2:
      return ratioPercent(m.writebackDone, m.writebackTotal);
    case 3:
      return ratioPercent(m.verifyDone, m.verifyTotal);
    default:
      return 0;
  }
}

/** 某阶段是否已按 metrics 完成（可显示 ✓ 与绿色条）。 */
function isStageBarComplete(
  idx: number,
  m: StageMetrics,
  jobStatus: TranslationV4Status,
): boolean {
  if (jobStatus === "COMPLETED") return true;
  switch (idx) {
    case 0:
      return m.initTotal > 0 && m.initDone >= m.initTotal;
    case 1:
      return m.translateTotal > 0 && m.translateDone >= m.translateTotal;
    case 2:
      return m.writebackTotal > 0 && m.writebackDone >= m.writebackTotal;
    case 3:
      return m.verifyTotal > 0 && m.verifyDone >= m.verifyTotal;
    default:
      return false;
  }
}

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}分${rs}秒` : `${m}分`;
  const h = Math.floor(m / 60);
  return `${h}时${m % 60}分`;
}

function stageElapsedMs(t?: StageTiming): number | null {
  if (!t?.startedAt) return null;
  const end = t.endedAt ? new Date(t.endedAt).getTime() : Date.now();
  const ms = end - new Date(t.startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const STAGE_DEFS: { name: string; key: StageName }[] = [
  { name: "初始化", key: "INIT" },
  { name: "翻译", key: "TRANSLATE" },
  { name: "写回", key: "WRITEBACK" },
  { name: "校验", key: "VERIFY" },
];

// 初始化阶段总数未知（worker 仍在翻页枚举 Shopify 资源），无法算百分比 → 用不确定型
// 滑动条 + 持续递增的「已发现 N 项」+ 动画省略号，传达「正在扫描、一直在动」。
const INIT_SCAN_CSS = `
@keyframes v4-indet { 0% { left: -42%; } 100% { left: 100%; } }
@keyframes v4-dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75%,100% { content: "..."; } }
.v4-indet-track { position: relative; height: 6px; border-radius: 3px; background: #f0f0f0; overflow: hidden; }
.v4-indet-fill { position: absolute; top: 0; height: 100%; width: 42%; border-radius: 3px;
  background: linear-gradient(90deg, rgba(22,119,255,0.15), #1677ff, rgba(22,119,255,0.15));
  animation: v4-indet 1.1s ease-in-out infinite; }
.v4-dots::after { content: ""; animation: v4-dots 1.2s steps(1) infinite; }
`;

function InitScanIndicator({
  initDone,
  moduleLabel,
}: {
  initDone: number;
  moduleLabel: string | null;
}) {
  return (
    <>
      <style>{INIT_SCAN_CSS}</style>
      <div className="v4-indet-track" style={{ flex: 1 }}>
        <div className="v4-indet-fill" />
      </div>
      <Text
        type="secondary"
        style={{ fontSize: 12, minWidth: 170, textAlign: "right", flexShrink: 0 }}
      >
        已发现 {initDone.toLocaleString()} 项
        {moduleLabel ? ` · ${moduleLabel}` : ""}
        <span className="v4-dots" />
      </Text>
    </>
  );
}

function JobCard({
  job,
  onAction,
  translateSlotBusy,
}: {
  job: TranslationJobProgressSummary;
  onAction: (
    taskId: string,
    action: "pause" | "resume" | "cancel",
  ) => Promise<boolean>;
  translateSlotBusy: boolean;
}) {
  const displayStatusLabel =
    job.status === "TRANSLATE_QUEUED" && translateSlotBusy
      ? "排队等待翻译"
      : job.statusLabel;
  const activeStage = stageOf(job.status, job.errorStage);
  const isPaused = job.status === "PAUSED";
  const m = job.metrics;
  const timings = job.stageTimings ?? {};

  // 本地「刚点击」态：点击到 worker 落定前给按钮即时 loading + 禁用，避免误以为没反应。
  const [pending, setPending] = useState<null | "pause" | "resume" | "cancel">(
    null,
  );
  // worker 已把动作落定（进入停止/写回过渡 或 离开 PAUSED）→ 清掉本地 pending。
  useEffect(() => {
    if (!pending) return;
    const stopSettled =
      job.isStopping ||
      (job.status !== "TRANSLATING" && job.status !== "TRANSLATE_QUEUED");
    const resumeSettled = job.status !== "PAUSED" && job.status !== "FAILED";
    if ((pending === "pause" || pending === "cancel") && stopSettled) setPending(null);
    if (pending === "resume" && resumeSettled) setPending(null);
  }, [pending, job.status, job.isStopping]);

  const runAction = (action: "pause" | "resume" | "cancel") => {
    setPending(action);
    void (async () => {
      const ok = await onAction(job.taskId, action);
      if (!ok) setPending(null);
    })();
  };
  const busy = pending !== null;

  // 可恢复（暂停/失败）→ 继续；翻译阶段且未在停止中 → 暂停；非终态且未在停止中 → 取消。
  const canResume = job.status === "PAUSED" || job.status === "FAILED";
  const canPause = canPauseV4Job(job.status) && !job.isStopping;
  const canCancel =
    job.status !== "COMPLETED" &&
    job.status !== "CANCELLED" &&
    !job.isStopping;

  // 每阶段的计数明细（资源 done/total，翻译额外含节点）
  const stageDetail = (idx: number): string => {
    if (idx === 0) return `${m.initDone}/${m.initTotal}`;
    if (idx === 1) {
      const res = `资源 ${m.translateDone}/${m.translateTotal}`;
      return m.translateUnitTotal > 0
        ? `${res} · 节点 ${m.translateUnitDone}/${m.translateUnitTotal}`
        : res;
    }
    if (idx === 2) return `${m.writebackDone}/${m.writebackTotal}`;
    return `${m.verifyDone}/${m.verifyTotal}`;
  };

  const totalItems = m.translateTotal || m.initTotal || 0;
  const hideDuration = job.status === "PAUSED" || job.status === "CANCELLED";
  const overallMs = hideDuration
    ? null
    : stageElapsedMs({
        startedAt: job.createdAt,
        endedAt: job.isTerminal ? job.updatedAt : null,
      });

  return (
    <Card size="small" style={{ marginBottom: 12 }}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Space size={10} wrap>
          <Text strong>
            {job.source} → {job.target}
          </Text>
          <Tag color={STATUS_COLOR[job.status] ?? "default"}>
            {displayStatusLabel}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {job.modules.map((mod) => MODULE_LABELS[mod] ?? mod).join(" · ")}
          </Text>
        </Space>
        <Space size={8} align="center">
          {canResume ? (
            <Button
              size="small"
              type="primary"
              loading={pending === "resume"}
              disabled={busy}
              onClick={() => runAction("resume")}
            >
              继续
            </Button>
          ) : null}
          {canPause ? (
            <Button
              size="small"
              loading={pending === "pause"}
              disabled={busy}
              onClick={() => runAction("pause")}
            >
              暂停
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              size="small"
              danger
              loading={pending === "cancel"}
              disabled={busy}
              onClick={() => runAction("cancel")}
            >
              取消
            </Button>
          ) : null}
          <Text type="secondary" style={{ fontSize: 12 }}>
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                opacity: 0.45,
                marginRight: 8,
              }}
              title={job.taskId}
            >
              #{job.taskId.slice(0, 8)}
            </span>
            创建于 {fmtTime(job.createdAt)}
            {job.status === "COMPLETED" ? ` · 完成于 ${fmtTime(job.updatedAt)}` : ""}
          </Text>
        </Space>
      </Flex>

      <div style={{ marginTop: 12 }}>
        {STAGE_DEFS.map(({ name, key }, idx) => {
          const complete = isStageBarComplete(idx, m, job.status);
          const percent = complete ? 100 : stageBarPercent(idx, m, job.status);
          const current =
            idx === activeStage && !job.isTerminal && !isPaused && !job.isStopping;
          const pausedHere = isPaused && idx === activeStage;
          const stoppingHere = job.isStopping && idx === activeStage;
          const ms = hideDuration ? null : stageElapsedMs(timings[key]);
          // 初始化进行中且总数未知（worker 仍在枚举）→ 不确定型动画 + 已发现计数。
          const initScanning = idx === 0 && current && m.initTotal <= 0;
          return (
            <Flex key={key} align="center" gap={10} style={{ marginBottom: 6 }}>
              <Text
                style={{ width: 44, fontSize: 12, flexShrink: 0 }}
                type={
                  complete
                    ? "success"
                    : pausedHere || stoppingHere
                      ? "warning"
                      : current
                        ? undefined
                        : "secondary"
                }
              >
                {name}
              </Text>
              {initScanning ? (
                <InitScanIndicator
                  initDone={m.initDone}
                  moduleLabel={
                    m.currentModule
                      ? MODULE_LABELS[m.currentModule] ?? m.currentModule
                      : null
                  }
                />
              ) : (
                <>
                  <Progress
                    style={{ flex: 1, margin: 0 }}
                    percent={percent}
                    showInfo={false}
                    size="small"
                    status={
                      job.status === "FAILED" && (current || pausedHere)
                        ? "exception"
                        : complete
                          ? "success"
                          : pausedHere || stoppingHere
                            ? "normal"
                            : percent > 0
                              ? "active"
                              : "normal"
                    }
                    strokeColor={
                      complete
                        ? "#1d9e75"
                        : pausedHere || stoppingHere
                          ? "#faad14"
                          : undefined
                    }
                  />
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, minWidth: 170, textAlign: "right", flexShrink: 0 }}
                  >
                    {stageDetail(idx)}
                    {complete ? " ✓" : ""}
                    {ms != null ? ` · 耗时 ${formatElapsed(ms)}` : ""}
                  </Text>
                </>
              )}
            </Flex>
          );
        })}
      </div>

      <Space size={16} wrap style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          共处理 {totalItems.toLocaleString()} 条数据
        </Text>
        {overallMs != null ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            任务耗时 {formatElapsed(overallMs)}
          </Text>
        ) : null}
        {job.usedTokens > 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            消耗 {Math.round(job.usedTokens * QUOTA_TOKEN_MULTIPLIER).toLocaleString()} 积分
          </Text>
        ) : null}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {job.aiModel}
        </Text>
      </Space>

      {job.errorMessage && !job.isStopping && job.statusLabel !== job.errorMessage ? (
        <div style={{ marginTop: 6 }}>
          <Text type="danger" style={{ fontSize: 12 }}>
            {job.errorStage ? `[${job.errorStage}] ` : ""}
            {job.errorMessage}
          </Text>
        </div>
      ) : null}
    </Card>
  );
}

export default function AppTranslateV4() {
  const { shop, locales, primaryLocale, jobs: initialJobs, quota: initialQuota } =
    useLoaderData<typeof loader>();

  const [jobs, setJobs] = useState<TranslationJobProgressSummary[]>(initialJobs);
  const [quota, setQuota] = useState<ShopQuota | null>(initialQuota);
  const [source, setSource] = useState<string>(primaryLocale || "zh-CN");
  const [targets, setTargets] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>(DEFAULT_MODULES);
  const [aiModel, setAiModel] = useState<string>("deepseek-v4-flash");
  const [limitPerType, setLimitPerType] = useState<number>(20);
  const [isCover, setIsCover] = useState(false);
  const [isHandle, setIsHandle] = useState(false);
  const [creating, setCreating] = useState(false);

  const localeOptions = useMemo(
    () =>
      locales.length
        ? locales
        : [{ value: "zh-CN", label: "中文 (zh-CN)", primary: true, published: true }],
    [locales],
  );
  const targetOptions = useMemo(
    () => localeOptions.filter((l) => l.value !== source),
    [localeOptions, source],
  );

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/tasks?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();
      if (data?.ok) setJobs(data.jobs as TranslationJobProgressSummary[]);
    } catch (err) {
      console.error("[translateV4] refresh list failed:", err);
    }
  }, [shop]);

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/quota?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();
      if (data?.ok) setQuota(data.quota as ShopQuota | null);
    } catch (err) {
      console.error("[translateV4] refresh quota failed:", err);
    }
  }, [shop]);

  const handleAction = useCallback(
    async (taskId: string, actionType: "pause" | "resume" | "cancel") => {
      try {
        const res = await fetch("/api/translate-v4/task-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, shopName: shop, action: actionType }),
        });
        const data = await res.json();
        if (data?.ok) {
          // pending=true：worker 还要先把已翻译的写回，过程态用「正在…」表述。
          const label =
            actionType === "resume"
              ? "正在继续…"
              : actionType === "pause"
                ? data.pending
                  ? "正在暂停…"
                  : "已暂停"
                : data.pending
                  ? "正在取消…"
                  : "已取消";
          message.success(label);
          await Promise.all([refreshList(), refreshQuota()]);
          return true;
        }
        message.error(data?.error || "操作失败");
        return false;
      } catch (err) {
        console.error("[translateV4] task action failed:", err);
        message.error("操作失败，请稍后重试");
        return false;
      }
    },
    [shop, refreshList, refreshQuota],
  );

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const result = await createTranslateV4Tasks({
        source,
        targets,
        modules,
        aiModel,
        limitPerType,
        isCover,
        isHandle,
        targetOptions,
      });

      if (result.validationError) {
        message.warning(result.validationError);
        return;
      }

      const summary = formatCreateTasksMessage(result);
      if (result.created.length > 0) {
        message.success(summary);
        await Promise.all([refreshList(), refreshQuota()]);
      } else {
        message.error(summary);
      }

      if (result.failed.length > 0 && result.created.length > 0) {
        message.warning(
          result.failed.map((f) => `${f.target}: ${f.error}`).join("；"),
          6,
        );
      }
    } catch (err) {
      console.error("[translateV4] create failed:", err);
      message.error("创建失败，请稍后重试");
    } finally {
      setCreating(false);
    }
  }, [
    source,
    targets,
    modules,
    aiModel,
    limitPerType,
    isCover,
    isHandle,
    targetOptions,
    refreshList,
    refreshQuota,
  ]);

  // 轮询活跃任务的实时进度（逐条 task-progress 合并 Cosmos + Redis）
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  useEffect(() => {
    const timer = setInterval(async () => {
      const active = jobsRef.current.filter((j) => !j.isTerminal);
      if (!active.length) return;
      const updated = await Promise.all(
        active.map(async (j) => {
          try {
            const res = await fetch(
              `/api/translate-v4/task-progress?taskId=${encodeURIComponent(
                j.taskId,
              )}&shopName=${encodeURIComponent(shop)}`,
            );
            const data = await res.json();
            return data?.ok
              ? (data.summary as TranslationJobProgressSummary)
              : null;
          } catch {
            return null;
          }
        }),
      );
      setJobs((prev) =>
        prev.map((j) => updated.find((u) => u && u.taskId === j.taskId) ?? j),
      );
      // 有活跃任务时顺带刷新余额，让额度随 worker 扣减实时下降。
      void refreshQuota();
    }, 3000);
    return () => clearInterval(timer);
  }, [shop, refreshQuota]);

  const quotaPercent =
    quota && quota.maxToken > 0
      ? Math.min(100, Math.round((quota.usedToken / quota.maxToken) * 100))
      : 0;

  const translateSlotBusy = useMemo(
    () => jobs.some((j) => j.status === "TRANSLATING" || j.isStopping),
    [jobs],
  );
  const translateQueue = useMemo(
    () => jobs.filter((j) => !j.isTerminal && j.status === "TRANSLATE_QUEUED"),
    [jobs],
  );

  return (
    <Page>
      <TitleBar title="智能翻译 (v4)" />

      {translateQueue.length > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            translateSlotBusy
              ? `正在翻译一种语言，另有 ${translateQueue.length} 个语言任务排队等待（初始化可并行，翻译串行执行）。`
              : `${translateQueue.length} 个语言任务等待开始翻译。`
          }
        />
      ) : null}

      {quota ? (
        <Card style={{ marginBottom: 16 }}>
          <Flex justify="space-between" align="center" wrap gap={16}>
            <Space size={28} wrap>
              <span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  总额度
                </Text>
                <br />
                <Text strong>{quota.maxToken.toLocaleString()}</Text>
              </span>
              <span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已用积分
                </Text>
                <br />
                <Text strong>{quota.usedToken.toLocaleString()}</Text>
              </span>
              <span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  剩余积分
                </Text>
                <br />
                <Text strong type={quota.remaining < 0 ? "danger" : undefined}>
                  {quota.remaining.toLocaleString()}
                </Text>
              </span>
            </Space>
            <div style={{ minWidth: 240, flex: "0 1 320px" }}>
              <Progress
                percent={quotaPercent}
                status={quota.remaining < 0 ? "exception" : "normal"}
                size="small"
              />
              {quota.remaining < 0 ? (
                <Text type="danger" style={{ fontSize: 12 }}>
                  额度已用尽，充值后可在任务列表点「继续」
                </Text>
              ) : null}
            </div>
          </Flex>
        </Card>
      ) : null}

      <Card style={{ marginBottom: 16 }}>
        <Flex justify="space-between" align="center">
          <Title level={5} style={{ margin: 0 }}>
            创建翻译任务
          </Title>
        </Flex>
        <Divider style={{ margin: "12px 0" }} />

        <Flex gap={16} wrap>
          <div style={{ minWidth: 180 }}>
            <Text type="secondary">源语言</Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={source}
              options={localeOptions}
              onChange={(v) => {
                setSource(v);
                setTargets((prev) => prev.filter((t) => t !== v));
              }}
            />
          </div>
          <div style={{ minWidth: 280, flex: "1 1 280px" }}>
            <Text type="secondary">目标语言（可多选）</Text>
            <Select
              mode="multiple"
              allowClear
              style={{ width: "100%", marginTop: 4 }}
              placeholder="选择一种或多种目标语言"
              value={targets}
              options={targetOptions}
              maxTagCount="responsive"
              onChange={(values) => setTargets(values)}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Text type="secondary">AI 模型</Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={aiModel}
              options={AI_MODEL_OPTIONS}
              onChange={setAiModel}
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <Text type="secondary">每类上限（0=全部）</Text>
            <InputNumber
              style={{ width: "100%", marginTop: 4 }}
              min={0}
              value={limitPerType}
              onChange={(v) => setLimitPerType(Number(v ?? 0))}
            />
          </div>
        </Flex>

        <div style={{ marginTop: 16 }}>
          <Text type="secondary">翻译模块</Text>
          <div style={{ marginTop: 6 }}>
            <Checkbox.Group
              value={modules}
              onChange={(v) => setModules(v as string[])}
              options={TRANSLATION_V4_MODULES.map((m) => ({
                label: MODULE_LABELS[m] ?? m,
                value: m,
              }))}
            />
          </div>
        </div>

        <Flex
          justify="space-between"
          align="center"
          wrap
          gap={12}
          style={{ marginTop: 16 }}
        >
          <Space size={20} wrap>
            <Space size={6}>
              <Switch checked={isCover} onChange={setIsCover} size="small" />
              <Text>覆盖已有译文</Text>
            </Space>
            <Space size={6}>
              <Switch checked={isHandle} onChange={setIsHandle} size="small" />
              <Text>翻译 handle</Text>
            </Space>
          </Space>
          <Button type="primary" loading={creating} onClick={handleCreate}>
            {targets.length > 1 ? `创建 ${targets.length} 个任务` : "创建任务"}
          </Button>
        </Flex>
      </Card>

      <Card>
        <Flex justify="space-between" align="center">
          <Title level={5} style={{ margin: 0 }}>
            翻译任务
          </Title>
          <Button size="small" onClick={refreshList}>
            刷新
          </Button>
        </Flex>
        <Divider style={{ margin: "12px 0" }} />
        {jobs.length === 0 ? (
          <Text type="secondary">暂无任务，创建一个开始翻译吧。</Text>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.taskId}
              job={job}
              onAction={handleAction}
              translateSlotBusy={translateSlotBusy}
            />
          ))
        )}
      </Card>

      <SupportChatWidget />
    </Page>
  );
}
