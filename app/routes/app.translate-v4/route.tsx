import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
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
  type StageName,
  type StageTiming,
  type TranslationV4Status,
} from "~/server/translateV4/types";
import { SupportChatWidget } from "./SupportChatWidget";

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

function JobCard({
  job,
  onAction,
}: {
  job: TranslationJobProgressSummary;
  onAction: (taskId: string, action: "pause" | "resume" | "cancel") => void | Promise<void>;
}) {
  const activeStage = stageOf(job.status, job.errorStage);
  const isPaused = job.status === "PAUSED";
  const m = job.metrics;
  const timings = job.stageTimings ?? {};

  // 可恢复（暂停/失败，含"额度不足自动暂停"）→ 继续 + 取消；运行中 → 暂停 + 取消。
  const canResume = job.status === "PAUSED" || job.status === "FAILED";
  const canPause = !job.isTerminal && job.status !== "PAUSED";
  const canCancel = job.status !== "COMPLETED" && job.status !== "CANCELLED";

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

  // 每阶段自身的进度百分比
  const stageRatio = (idx: number): number => {
    const ratio = (d: number, t: number) =>
      t > 0 ? Math.min(100, Math.round((d / t) * 100)) : 0;
    if (idx === 0) return ratio(m.initDone, m.initTotal);
    if (idx === 1)
      return m.translateUnitTotal > 0
        ? ratio(m.translateUnitDone, m.translateUnitTotal)
        : ratio(m.translateDone, m.translateTotal);
    if (idx === 2) return ratio(m.writebackDone, m.writebackTotal);
    return ratio(m.verifyDone, m.verifyTotal);
  };

  const totalItems = m.translateTotal || m.initTotal || 0;
  const overallMs = stageElapsedMs({
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
            {job.statusLabel}
          </Tag>
          {job.testMode ? <Tag color="purple">测试模式</Tag> : null}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {job.modules.map((mod) => MODULE_LABELS[mod] ?? mod).join(" · ")}
          </Text>
        </Space>
        <Space size={8} align="center">
          {canResume ? (
            <Button size="small" type="primary" onClick={() => onAction(job.taskId, "resume")}>
              继续
            </Button>
          ) : null}
          {canPause ? (
            <Button size="small" onClick={() => onAction(job.taskId, "pause")}>
              暂停
            </Button>
          ) : null}
          {canCancel ? (
            <Button size="small" danger onClick={() => onAction(job.taskId, "cancel")}>
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
          const done = job.status === "COMPLETED" || idx < activeStage;
          const current =
            idx === activeStage && !job.isTerminal && !isPaused;
          const pausedHere = isPaused && idx === activeStage;
          const percent = done
            ? 100
            : current || pausedHere || idx < activeStage
              ? stageRatio(idx)
              : 0;
          const ms = stageElapsedMs(timings[key]);
          return (
            <Flex key={key} align="center" gap={10} style={{ marginBottom: 6 }}>
              <Text
                style={{ width: 44, fontSize: 12, flexShrink: 0 }}
                type={
                  done ? "success" : current || pausedHere ? "warning" : "secondary"
                }
              >
                {name}
              </Text>
              <Progress
                style={{ flex: 1, margin: 0 }}
                percent={percent}
                showInfo={false}
                size="small"
                status={
                  job.status === "FAILED" && current
                    ? "exception"
                    : pausedHere
                      ? "normal"
                      : "active"
                }
                strokeColor={
                  done ? "#1d9e75" : pausedHere ? "#faad14" : undefined
                }
              />
              <Text
                type="secondary"
                style={{ fontSize: 12, minWidth: 170, textAlign: "right", flexShrink: 0 }}
              >
                {stageDetail(idx)}
                {done ? " ✓" : ""}
                {ms != null ? ` · 耗时 ${formatElapsed(ms)}` : ""}
              </Text>
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

      {job.errorMessage && job.statusLabel !== job.errorMessage ? (
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
  const [target, setTarget] = useState<string | undefined>(undefined);
  const [modules, setModules] = useState<string[]>(DEFAULT_MODULES);
  const [aiModel, setAiModel] = useState<string>("deepseek-v4-flash");
  const [limitPerType, setLimitPerType] = useState<number>(20);
  const [isCover, setIsCover] = useState(false);
  const [isHandle, setIsHandle] = useState(false);
  const [testMode, setTestMode] = useState(false);
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
          const label =
            actionType === "pause" ? "已暂停" : actionType === "resume" ? "已继续" : "已取消";
          message.success(label);
          await Promise.all([refreshList(), refreshQuota()]);
        } else {
          message.error(data?.error || "操作失败");
        }
      } catch (err) {
        console.error("[translateV4] task action failed:", err);
        message.error("操作失败，请稍后重试");
      }
    },
    [shop, refreshList, refreshQuota],
  );

  const handleCreate = useCallback(async () => {
    if (!target) {
      message.warning("请选择目标语言");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/translate-v4/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          target,
          modules,
          aiModel,
          limitPerType,
          isCover,
          isHandle,
          testMode,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        message.success("任务已创建，worker 即将开始处理");
        await Promise.all([refreshList(), refreshQuota()]);
      } else {
        message.error(data?.error || "创建失败");
      }
    } catch (err) {
      console.error("[translateV4] create failed:", err);
      message.error("创建失败，请稍后重试");
    } finally {
      setCreating(false);
    }
  }, [
    source,
    target,
    modules,
    aiModel,
    limitPerType,
    isCover,
    isHandle,
    testMode,
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

  return (
    <Page>
      <TitleBar title="智能翻译 (v4)" />

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
          <Tag color="geekblue">{TS_FRONTEND_TASK_SOURCE}</Tag>
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
                if (v === target) setTarget(undefined);
              }}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Text type="secondary">目标语言</Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              placeholder="选择目标语言"
              value={target}
              options={targetOptions}
              onChange={setTarget}
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
            <Space size={6}>
              <Switch checked={testMode} onChange={setTestMode} size="small" />
              <Text>测试模式</Text>
            </Space>
          </Space>
          <Button type="primary" loading={creating} onClick={handleCreate}>
            创建任务
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
            <JobCard key={job.taskId} job={job} onAction={handleAction} />
          ))
        )}
      </Card>

      <SupportChatWidget />
    </Page>
  );
}
