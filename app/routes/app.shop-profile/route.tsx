import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Col,
  type DescriptionsProps,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Progress,
  Row,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  BookOutlined,
  DashboardOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  RobotOutlined,
  AimOutlined,
  ShopOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Button from "~/ui/components/AppButton";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSectionCard from "~/ui/components/AppSectionCard";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import {
  getLatestShopScanJobsByTask,
  getLatestShopScanJob,
  type ShopScanJob,
  type ShopScanMode,
  type ShopScanTask,
  type ShopScanStageState,
  type ShopScanStatus,
} from "~/server/shopScan/cosmos.server";
import { enqueueShopScan } from "~/server/shopScan/trigger.server";
import {
  getShopScanDependencyMessage,
  type EnqueueShopScanResult,
} from "~/lib/shopScanTaskDeps";
import { isProductionNodeEnv } from "~/config/nodeEnv.server";
import {
  loadShopScanArtifacts,
  type GlossarySuggestionView,
  type ShopMarketView,
  type ShopSignalsView,
  type ThemeSceneProfileView,
  type ShopUnderstandingView,
  type TerminologyStrategyView,
  type TranslationContextProfileView,
} from "~/server/shopScan/artifacts.server";

const { Text, Paragraph } = Typography;

function isCiwishop(shop: string): boolean {
  return shop.replace(/\.myshopify\.com$/i, "") === "ciwishop";
}

type ProfileView = {
  shopName: string | null;
  primaryLocale: string | null;
  industry: string | null;
  keywords: string[];
  description: string | null;
  brandTone: string | null;
  aiModel: string | null;
  lastScannedAt: string | null;
};

type ScanView = Pick<
  ShopScanJob,
  "id" | "trigger" | "mode" | "status" | "stages" | "summary" | "createdAt" | "updatedAt"
>;

type TaskRunView = Pick<
  ShopScanJob,
  "id" | "task" | "status" | "updatedAt" | "createdAt" | "errorMessage" | "blobPrefix"
>;

type LoaderData = {
  configured: boolean;
  blobConfigured: boolean;
  profile: ProfileView | null;
  scan: ScanView | null;
  strategy: TerminologyStrategyView | null;
  glossarySuggestions: GlossarySuggestionView[];
  understanding: ShopUnderstandingView | null;
  markets: ShopMarketView[];
  signals: ShopSignalsView | null;
  themeSceneProfile: ThemeSceneProfileView | null;
  translationContextProfile: TranslationContextProfileView | null;
  taskRuns: TaskRunView[];
  artifactSource: "cosmos" | "blob" | "mixed" | "none";
};

function artifactPriority(status: ShopScanStatus): number {
  switch (status) {
    case "COMPLETED":
    case "PARTIAL":
      return 4;
    case "SCANNING":
      return 3;
    case "QUEUED":
    case "CREATED":
      return 2;
    case "SKIPPED":
    case "FAILED":
      return 1;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function sortArtifactJobs(jobs: ShopScanJob[]): ShopScanJob[] {
  return [...jobs].sort((a, b) => {
    const priorityDiff = artifactPriority(b.status) - artifactPriority(a.status);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function profileArtifactCompleteness(artifacts: {
  translationContextProfile: TranslationContextProfileView | null;
  themeSceneProfile: ThemeSceneProfileView | null;
  understanding: ShopUnderstandingView | null;
  signals: ShopSignalsView | null;
  markets: ShopMarketView[];
}): number {
  // strategy / understanding 在 loader 里跨 job 单独合并，这里只比较素材类产物完整度，
  // 避免 profile-workspace 素材分更高时盖掉 profile_ai 的术语策略。
  return [
    artifacts.translationContextProfile ? 4 : 0,
    artifacts.themeSceneProfile ? 2 : 0,
    artifacts.understanding ? 1 : 0,
    artifacts.signals ? 1 : 0,
    artifacts.markets.length > 0 ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function isRicherStrategy(
  next: TerminologyStrategyView,
  current: TerminologyStrategyView | null,
): boolean {
  if (!current) return true;
  const score = (s: TerminologyStrategyView) =>
    s.brandTerms.length +
    s.doNotTranslateTerms.length +
    s.preferredTerms.length +
    s.regionalStyleGuidance.length +
    s.moduleHints.length;
  return score(next) > score(current);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  if (isProductionNodeEnv() && !isCiwishop(shop)) {
    throw redirect("/app/translate-v4");
  }

  const configured = Boolean(
    process.env.COSMOS_ENDPOINT_V4?.trim() && process.env.COSMOS_KEY_V4?.trim(),
  );
  const blobConfigured = Boolean(process.env.AZURE_BLOB_CONNECTION_STRING?.trim());

  let profile: ProfileView | null = null;
  let scan: ScanView | null = null;
  let strategy: TerminologyStrategyView | null = null;
  let glossarySuggestions: GlossarySuggestionView[] = [];
  let understanding: ShopUnderstandingView | null = null;
  let markets: ShopMarketView[] = [];
  let signals: ShopSignalsView | null = null;
  let themeSceneProfile: ThemeSceneProfileView | null = null;
  let translationContextProfile: TranslationContextProfileView | null = null;
  let taskRuns: TaskRunView[] = [];
  let artifactSource: LoaderData["artifactSource"] = "none";

  try {
    const row = await prisma.shopProfile.findUnique({ where: { shop } });
    if (row) {
      profile = {
        shopName: row.shopName,
        primaryLocale: row.primaryLocale,
        industry: row.industry,
        keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
        description: row.description,
        brandTone: row.brandTone,
        aiModel: row.aiModel,
        lastScannedAt: row.lastScannedAt ? row.lastScannedAt.toISOString() : null,
      };
    }
  } catch (err) {
    console.error("[shop-profile page] read ShopProfile failed:", err);
  }

  if (configured) {
    try {
      const latestByTask = await getLatestShopScanJobsByTask(shop);
      const jobs = Object.values(latestByTask).filter(Boolean) as ShopScanJob[];
      taskRuns = jobs
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((job) => ({
          id: job.id,
          task: job.task,
          status: job.status,
          updatedAt: job.updatedAt,
          createdAt: job.createdAt,
          errorMessage: job.errorMessage,
          blobPrefix: job.blobPrefix,
        }));

      const contentJob = latestByTask.content_size ?? null;
      const coverageJob = latestByTask.coverage ?? null;
      const profileSourceJobs = (
        [
          latestByTask.profile_material,
          latestByTask.profile_identity,
          latestByTask.market_locale,
          latestByTask.catalog_material,
          latestByTask.editorial_material,
          latestByTask.style_material,
        ].filter(Boolean) as ShopScanJob[]
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const latestProfileSourceJob = profileSourceJobs[0] ?? null;
      const profileMaterialJob = latestByTask.profile_material ?? null;
      const profileAiJob = latestByTask.profile_ai ?? null;
      const glossarySamplesJob = latestByTask.glossary_samples ?? null;
      const glossaryAiJob = latestByTask.glossary_ai ?? null;
      const latestLegacyJob = await getLatestShopScanJob(shop);
      const latest = jobs[0] ?? latestLegacyJob;

      if (latest) {
        const latestUpdated = [...jobs]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? latest;
        const anyActive = jobs.some((job) => ACTIVE_STATUSES.includes(job.status));
        scan = {
          id: latestUpdated.id,
          trigger: latestUpdated.trigger,
          mode: latestUpdated.mode,
          status: anyActive ? "SCANNING" : latestUpdated.status,
          stages: {
            contentSize: mapJobStatusToStage(contentJob?.status),
            profile: mapJobStatusToStage(profileAiJob?.status ?? latestProfileSourceJob?.status),
            coverage: mapJobStatusToStage(coverageJob?.status),
            glossary: mapJobStatusToStage(glossaryAiJob?.status ?? glossarySamplesJob?.status),
          },
          summary: {
            totalItems: contentJob?.summary.totalItems,
            totalChars: contentJob?.summary.totalChars,
            moduleStats: contentJob?.summary.moduleStats,
            coverage: coverageJob?.summary.coverage,
            profileStrategy: profileAiJob?.summary.profileStrategy,
            glossaryCount: glossaryAiJob?.summary.glossaryCount,
            glossarySuggestions: glossaryAiJob?.summary.glossarySuggestions,
          },
          createdAt: latestUpdated.createdAt,
          updatedAt: latestUpdated.updatedAt,
        };
      }

      const profileArtifactCandidates = sortArtifactJobs(
        Array.from(
          new Map(
            [
              profileAiJob,
              ...profileSourceJobs,
              profileMaterialJob,
              latestLegacyJob,
            ]
              .filter(Boolean)
              .map((job) => [job!.id, job!]),
          ).values(),
        ),
      );
      let bestProfileArtifacts:
        | (Awaited<ReturnType<typeof loadShopScanArtifacts>> & {
            score: number;
            updatedAtMs: number;
            preferAi: boolean;
          })
        | null = null;
      let bestStrategy:
        | { strategy: TerminologyStrategyView; updatedAtMs: number; preferAi: boolean }
        | null = null;
      let bestUnderstanding:
        | { understanding: ShopUnderstandingView; updatedAtMs: number; preferAi: boolean }
        | null = null;
      for (const candidate of profileArtifactCandidates) {
        const profileArtifacts = await loadShopScanArtifacts(candidate.blobPrefix, candidate.summary);
        const score = profileArtifactCompleteness(profileArtifacts);
        const updatedAtMs = new Date(candidate.updatedAt).getTime();
        const preferAi = candidate.task === "profile_ai";

        if (profileArtifacts.strategy) {
          const richer = isRicherStrategy(
            profileArtifacts.strategy,
            bestStrategy?.strategy ?? null,
          );
          if (
            !bestStrategy ||
            (preferAi && !bestStrategy.preferAi) ||
            (preferAi === bestStrategy.preferAi &&
              (richer ||
                (!richer &&
                  !isRicherStrategy(bestStrategy.strategy, profileArtifacts.strategy) &&
                  updatedAtMs > bestStrategy.updatedAtMs)))
          ) {
            bestStrategy = {
              strategy: profileArtifacts.strategy,
              updatedAtMs,
              preferAi,
            };
          }
        }

        if (profileArtifacts.understanding) {
          if (
            !bestUnderstanding ||
            (preferAi && !bestUnderstanding.preferAi) ||
            (preferAi === bestUnderstanding.preferAi &&
              updatedAtMs > bestUnderstanding.updatedAtMs)
          ) {
            bestUnderstanding = {
              understanding: profileArtifacts.understanding,
              updatedAtMs,
              preferAi,
            };
          }
        }

        if (score === 0) continue;
        if (
          !bestProfileArtifacts ||
          score > bestProfileArtifacts.score ||
          (score === bestProfileArtifacts.score && preferAi && !bestProfileArtifacts.preferAi) ||
          (score === bestProfileArtifacts.score &&
            preferAi === bestProfileArtifacts.preferAi &&
            updatedAtMs > bestProfileArtifacts.updatedAtMs)
        ) {
          bestProfileArtifacts = {
            ...profileArtifacts,
            score,
            updatedAtMs,
            preferAi,
          };
        }
      }
      if (bestProfileArtifacts || bestStrategy || bestUnderstanding) {
        strategy = bestStrategy?.strategy ?? bestProfileArtifacts?.strategy ?? null;
        understanding =
          bestUnderstanding?.understanding ?? bestProfileArtifacts?.understanding ?? null;
        markets = bestProfileArtifacts?.markets ?? [];
        signals = bestProfileArtifacts?.signals ?? null;
        themeSceneProfile = bestProfileArtifacts?.themeSceneProfile ?? null;
        translationContextProfile = bestProfileArtifacts?.translationContextProfile ?? null;
        artifactSource = bestProfileArtifacts?.source ?? (bestStrategy || bestUnderstanding ? "cosmos" : "none");
      }

      const glossaryArtifactCandidates = sortArtifactJobs(
        Array.from(
          new Map(
            [glossaryAiJob, glossarySamplesJob, latestLegacyJob]
              .filter(Boolean)
              .map((job) => [job!.id, job!]),
          ).values(),
        ),
      );
      for (const candidate of glossaryArtifactCandidates) {
        const glossaryArtifacts = await loadShopScanArtifacts(candidate.blobPrefix, candidate.summary);
        if (glossaryArtifacts.glossarySuggestions.length === 0) continue;
        if (glossarySuggestions.length === 0) {
          glossarySuggestions = glossaryArtifacts.glossarySuggestions;
        }
        if (artifactSource === "none") artifactSource = glossaryArtifacts.source;
        break;
      }

      if (!scan && latestLegacyJob) {
        scan = {
          id: latestLegacyJob.id,
          trigger: latestLegacyJob.trigger,
          mode: latestLegacyJob.mode,
          status: latestLegacyJob.status,
          stages: latestLegacyJob.stages,
          summary: latestLegacyJob.summary,
          createdAt: latestLegacyJob.createdAt,
          updatedAt: latestLegacyJob.updatedAt,
        };
      }
    } catch (err) {
      console.error("[shop-profile page] read latest scan failed:", err);
    }
  }

  return json<LoaderData>({
    configured,
    blobConfigured,
    profile,
    scan,
    strategy,
    glossarySuggestions,
    understanding,
    markets,
    signals,
    themeSceneProfile,
    translationContextProfile,
    taskRuns,
    artifactSource,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (isProductionNodeEnv() && !isCiwishop(session.shop)) {
    throw redirect("/app/translate-v4");
  }
  const formData = await request.formData();
  const rawTask = String(formData.get("task") ?? "").trim();
  const task: ShopScanTask =
    rawTask === "content_size" ||
    rawTask === "coverage" ||
    rawTask === "profile_material" ||
    rawTask === "profile_identity" ||
    rawTask === "market_locale" ||
    rawTask === "catalog_material" ||
    rawTask === "editorial_material" ||
    rawTask === "style_material" ||
    rawTask === "profile_ai" ||
    rawTask === "glossary_samples" ||
    rawTask === "glossary_ai"
      ? rawTask
      : "profile_material";
  const result = await enqueueShopScan({
    shop: session.shop,
    trigger: "manual",
    task,
  });
  return json(result);
};

<<<<<<< HEAD
const STATUS_COLOR: Record<ShopScanStatus, string> = {
  CREATED: "default",
  QUEUED: "processing",
  SCANNING: "processing",
  COMPLETED: "success",
  PARTIAL: "warning",
  SKIPPED: "default",
  FAILED: "error",
};

=======
>>>>>>> origin/master
const STATUS_LABEL: Record<ShopScanStatus, string> = {
  CREATED: "已创建",
  QUEUED: "排队中",
  SCANNING: "扫描中",
  COMPLETED: "已完成",
  PARTIAL: "部分完成",
  SKIPPED: "已跳过",
  FAILED: "失败",
};

const STAGE_LABEL: Record<string, string> = {
  contentSize: "内容规模",
  profile: "店铺画像",
  coverage: "语言覆盖率",
  glossary: "AI 术语建议",
};

const STAGE_STATE_LABEL: Record<ShopScanStageState, string> = {
  PENDING: "待处理",
  DONE: "完成",
  SKIPPED: "跳过",
  FAILED: "失败",
};

const STATUS_ICON: Record<ShopScanStatus, React.ReactNode> = {
  CREATED: <ClockCircleOutlined />,
  QUEUED: <SyncOutlined spin />,
  SCANNING: <SyncOutlined spin />,
  COMPLETED: <CheckCircleOutlined />,
  PARTIAL: <ExclamationCircleOutlined />,
  SKIPPED: <ExclamationCircleOutlined />,
  FAILED: <CloseCircleOutlined />,
};

const STATUS_TONE: Record<ShopScanStatus, string> = {
  CREATED: "var(--app-color-text-secondary)",
  QUEUED: "var(--app-accent-primary)",
  SCANNING: "var(--app-accent-primary)",
  COMPLETED: "var(--app-accent-growth)",
  PARTIAL: "var(--app-accent-utility)",
  SKIPPED: "var(--app-color-text-secondary)",
  FAILED: "var(--app-accent-critical)",
};

const STAGE_TONE: Record<ShopScanStageState, string> = {
  PENDING: "rgba(0,0,0,0.45)",
  DONE: "var(--app-accent-growth)",
  SKIPPED: "rgba(0,0,0,0.45)",
  FAILED: "var(--app-accent-critical)",
};

const ACTIVE_STATUSES: ShopScanStatus[] = ["CREATED", "QUEUED", "SCANNING"];
const MODE_LABEL: Record<ShopScanMode, string> = {
  full: "全量扫描",
  data_only: "基础扫描",
  ai_only: "AI 补全",
};
const TASK_LABEL: Record<ShopScanTask, string> = {
  content_size: "扫描内容规模",
  coverage: "扫描语言覆盖率",
  profile_material: "扫描全部画像源",
  profile_identity: "扫描店铺身份",
  market_locale: "扫描语言与市场",
  catalog_material: "扫描商品与类目",
  editorial_material: "扫描文章与系列",
  style_material: "扫描 Theme 场景",
  profile_ai: "生成店铺画像",
  glossary_samples: "扫描术语样本",
  glossary_ai: "生成术语建议",
};
const DATA_TASKS: ShopScanTask[] = [
  "content_size",
  "coverage",
  "profile_identity",
  "market_locale",
  "catalog_material",
  "editorial_material",
  "style_material",
  "profile_material",
  "glossary_samples",
];
const PROFILE_SOURCE_TASKS: ShopScanTask[] = [
  "profile_identity",
  "market_locale",
  "catalog_material",
  "editorial_material",
  "style_material",
  "profile_material",
];
const AI_TASKS: ShopScanTask[] = ["profile_ai", "glossary_ai"];
const TABLE_SCROLL_X = { x: "max-content" as const };
const OVERVIEW_GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};
const OVERVIEW_METRIC_STYLE: CSSProperties = {
  padding: "14px 16px",
  borderRadius: "var(--app-radius-lg)",
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--app-color-bg-subtle, #f6f7f9)",
};
const ACTION_GROUP_STYLE: CSSProperties = {
  padding: "12px",
  borderRadius: "var(--app-radius-lg)",
  border: "1px solid var(--app-color-border-secondary)",
  background: "var(--app-color-bg-subtle, #f6f7f9)",
};
const DENSE_TABLE_PROPS = {
  size: "small" as const,
  scroll: TABLE_SCROLL_X,
};

function statusTone(status: ShopScanStatus | null | undefined): "neutral" | "info" | "success" | "caution" | "critical" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PARTIAL":
    case "SKIPPED":
      return "caution";
    case "FAILED":
      return "critical";
    case "QUEUED":
    case "SCANNING":
      return "info";
    case "CREATED":
    case null:
    case undefined:
      return "neutral";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function SectionHeading({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <Flex align="center" gap={8}>
      <span style={{ color: "var(--app-accent-primary)", display: "inline-flex" }}>{icon}</span>
      <span>{title}</span>
    </Flex>
  );
}

function OverviewMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div style={OVERVIEW_METRIC_STYLE}>
      <Flex vertical gap={6}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Text>
        <Text strong style={{ fontSize: 22, lineHeight: "28px", color: "var(--app-color-text)" }}>
          {value}
        </Text>
        {hint ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {hint}
          </Text>
        ) : null}
      </Flex>
    </div>
  );
}

function compactDescriptionsColumns(): DescriptionsProps["column"] {
  return { xs: 1, sm: 2, lg: 3 };
}

function HoverFullText({
  value,
  mono = false,
}: {
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return <Text type="secondary">-</Text>;
  return (
    <Tooltip title={value} placement="topLeft">
      <span
        style={{
          display: "inline-block",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          verticalAlign: "bottom",
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            : undefined,
        }}
      >
        {value}
      </span>
    </Tooltip>
  );
}

function mapJobStatusToStage(status: ShopScanStatus | null | undefined): ShopScanStageState {
  switch (status) {
    case "COMPLETED":
      return "DONE";
    case "SKIPPED":
      return "SKIPPED";
    case "PARTIAL":
    case "FAILED":
      return "FAILED";
    case "CREATED":
    case "QUEUED":
    case "SCANNING":
    case null:
    case undefined:
      return "PENDING";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function enqueueResultMessage(result: EnqueueShopScanResult): string {
  if (result.message) return result.message;
  switch (result.reason) {
    case "disabled_in_production":
      return "生产环境已禁用店铺扫描入队";
    case "not_configured":
      return "Cosmos 未配置，无法创建扫描任务";
    case "dependency_not_met":
      return "前置任务未完成，无法入队";
    case "skipped_existing":
      return "已有进行中或已完成的扫描，已跳过";
    case "error":
      return "创建扫描任务失败，请稍后重试";
    case undefined:
      return result.enqueued ? "任务已入队" : "任务入队失败";
    default: {
      const _exhaustive: never = result.reason;
      return _exhaustive;
    }
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function formatNumber(n: number | undefined | null): string {
  if (typeof n !== "number") return "-";
  return String(n);
}

export default function ShopProfilePage() {
  const {
    configured,
    blobConfigured,
    profile,
    scan,
    strategy,
    glossarySuggestions,
    understanding,
    markets,
    signals,
    themeSceneProfile,
    translationContextProfile,
    taskRuns,
    artifactSource,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<EnqueueShopScanResult>();
  const revalidator = useRevalidator();
  const [hydrated, setHydrated] = useState(false);

  const isActive = scan ? ACTIVE_STATUSES.includes(scan.status) : false;
  const isRescanning = fetcher.state !== "idle";
  const taskRunByTask = useMemo(
    () => Object.fromEntries(taskRuns.map((run) => [run.task, run])) as Partial<Record<ShopScanTask, TaskRunView>>,
    [taskRuns],
  );
  const latestByTaskStatus = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(taskRunByTask).map(([task, run]) => [
          task,
          { status: run!.status, blobPrefix: run!.blobPrefix },
        ]),
      ) as Partial<
        Record<ShopScanTask, { status: ShopScanStatus; blobPrefix?: string | null }>
      >,
    [taskRunByTask],
  );
  const profileMaterialRun = taskRunByTask.profile_material;
  const profileIdentityRun = taskRunByTask.profile_identity;
  const marketLocaleRun = taskRunByTask.market_locale;
  const catalogMaterialRun = taskRunByTask.catalog_material;
  const editorialMaterialRun = taskRunByTask.editorial_material;
  const styleMaterialRun = taskRunByTask.style_material;
  const profileAiRun = taskRunByTask.profile_ai;
  const latestProfileSourceRun = useMemo(() => {
    return PROFILE_SOURCE_TASKS.map((task) => taskRunByTask[task])
      .filter((run): run is TaskRunView => Boolean(run))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null;
  }, [taskRunByTask]);
  const completedTaskCount = taskRuns.filter((run) => run.status === "COMPLETED").length;

  // 扫描进行中时自动轮询刷新
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      if (revalidator.state === "idle") revalidator.revalidate();
    }, 5000);
    return () => clearInterval(timer);
  }, [isActive, revalidator]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const lastEnqueueResultRef = useRef<EnqueueShopScanResult | null>(null);
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (lastEnqueueResultRef.current === fetcher.data) return;
    lastEnqueueResultRef.current = fetcher.data;
    if (fetcher.data.enqueued) {
      message.success("任务已入队");
      if (revalidator.state === "idle") revalidator.revalidate();
      return;
    }
    message.error(enqueueResultMessage(fetcher.data));
  }, [fetcher.state, fetcher.data, revalidator]);

  const moduleRows = useMemo(() => {
    const stats = scan?.summary?.moduleStats ?? {};
    return Object.entries(stats)
      .map(([module, v]) => ({ key: module, module, items: v.items, chars: v.chars }))
      .filter((r) => r.items > 0)
      .sort((a, b) => b.items - a.items);
  }, [scan]);

  const coverageRows = useMemo(() => {
    return (scan?.summary?.coverage ?? []).map((c) => ({ key: c.locale, ...c }));
  }, [scan]);
  const publishedLocaleCount =
    translationContextProfile?.marketProfile?.publishedLocales.length ?? coverageRows.length;
  const parameterBlockCount = [
    Boolean(translationContextProfile?.shopContext),
    Boolean(translationContextProfile?.terminologyProfile),
    Boolean(translationContextProfile?.marketProfile),
    Boolean(translationContextProfile?.themeSceneProfile),
    Boolean((translationContextProfile?.modulePolicyProfile?.moduleHints.length ?? 0) > 0),
  ].filter(Boolean).length;
  const lastUpdated = scan?.updatedAt ?? profile?.lastScannedAt ?? null;

  const glossaryRows = useMemo(() => {
    return glossarySuggestions.map((g, i) => ({
      key: `${g.locale}-${g.source}-${i}`,
      ...g,
    }));
  }, [glossarySuggestions]);

  const moduleHintRows = useMemo(() => {
    return (strategy?.moduleHints ?? []).map((h) => ({
      key: h.module,
      ...h,
    }));
  }, [strategy]);

  const marketRows = useMemo(() => {
    return markets.map((m, i) => ({
      key: m.handle || `${m.name}-${i}`,
      ...m,
    }));
  }, [markets]);

  const termRows = useMemo(() => {
    return (signals?.weightedTopTerms ?? []).map((t, i) => ({
      key: `term-${t.term}-${i}`,
      ...t,
    }));
  }, [signals]);

  const phraseRows = useMemo(() => {
    return (signals?.weightedTopPhrases ?? []).map((t, i) => ({
      key: `phrase-${t.term}-${i}`,
      ...t,
    }));
  }, [signals]);

  const sampleRows = useMemo(() => {
    return (signals?.representativeSamples ?? []).map((s, i) => ({
      key: `sample-${s.source}-${i}`,
      ...s,
    }));
  }, [signals]);

  const sourceStatRows = useMemo(() => {
    return Object.entries(signals?.sourceStats ?? {})
      .map(([source, count]) => ({ key: source, source, count }))
      .sort((a, b) => b.count - a.count);
  }, [signals]);

  const sceneStatRows = useMemo(() => {
    return (themeSceneProfile?.sceneStats ?? []).map((row, index) => ({
      key: `scene-${row.scene}-${index}`,
      ...row,
    }));
  }, [themeSceneProfile]);

  const roleStatRows = useMemo(() => {
    return (themeSceneProfile?.roleStats ?? []).map((row, index) => ({
      key: `role-${row.role}-${index}`,
      ...row,
    }));
  }, [themeSceneProfile]);

  const sceneHintRows = useMemo(() => {
    return (themeSceneProfile?.sceneHints ?? []).map((row, index) => ({
      key: `hint-${row.module}-${row.keyPattern}-${index}`,
      ...row,
    }));
  }, [themeSceneProfile]);

  const handleScan = (task: ShopScanTask) => {
    const dependencyMessage = getShopScanDependencyMessage(task, latestByTaskStatus);
    if (dependencyMessage) {
      message.warning(dependencyMessage);
      return;
    }
    fetcher.submit({ task }, { method: "POST" });
  };

  const taskButtonDisabledReason = (task: ShopScanTask): string | null => {
    if (!configured) return "Cosmos 未配置";
    if (isActive) return "已有扫描任务进行中，请稍候";
    return getShopScanDependencyMessage(task, latestByTaskStatus);
  };
  const profileAiBlockedReason = taskButtonDisabledReason("profile_ai");

  return (
    <Page>
      <TitleBar title="店铺画像 (Shop Profile)" />
      <Flex vertical gap={20}>
        <AppPageHeader
          title={
            <Flex align="center" gap={10}>
              <DashboardOutlined style={{ color: "var(--app-accent-primary)" }} />
              <span>店铺画像</span>
            </Flex>
          }
          description="这一页只聚焦扫描状态、翻译参数产物和规则产物，帮助我们确认当前有哪些可用于翻译链路的输入。"
          extra={
            <Flex gap={8} wrap="wrap">
              {scan ? (
                <AppStatusBadge tone={statusTone(scan.status)}>{STATUS_LABEL[scan.status]}</AppStatusBadge>
              ) : null}
              {scan?.mode ? <AppStatusBadge tone="info">{MODE_LABEL[scan.mode]}</AppStatusBadge> : null}
              <AppStatusBadge tone={configured ? "success" : "critical"}>
                Cosmos {configured ? "已配置" : "未配置"}
              </AppStatusBadge>
              <AppStatusBadge tone={blobConfigured ? "success" : "caution"}>
                Blob {blobConfigured ? "可读" : "未配置"}
              </AppStatusBadge>
            </Flex>
          }
        />

        {!configured ? (
          <AppSectionCard>
            <Empty
              image={<ExclamationCircleOutlined style={{ fontSize: 48, color: "var(--app-accent-utility)" }} />}
              description="店铺画像扫描未配置（缺少 Cosmos 环境变量）"
            />
          </AppSectionCard>
        ) : !scan && !profile ? (
          <AppSectionCard
            title="开始使用"
            description="先执行基础扫描拿到素材，再按需触发 AI 整理。页面会持续展示参数与规则产物，不在这里直接生成提示词。"
            extra={
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={isRescanning}
                onClick={() => handleScan("profile_material")}
              >
                开始扫描画像素材
              </Button>
            }
          >
            <Empty
              image={<ThunderboltOutlined style={{ fontSize: 48, color: "var(--app-accent-primary)" }} />}
              description="尚未扫描。请先手动执行所需的数据扫描，再按需触发 AI 整理。"
            />
          </AppSectionCard>
        ) : (
          <>
            <AppSectionCard
              title={<SectionHeading icon={<DashboardOutlined />} title="扫描概览" />}
              description="顶部概览先看状态，下面再逐块看参数、规则和明细数据。"
              extra={<AppStatusBadge tone="neutral">Artifacts {artifactSource}</AppStatusBadge>}
              bodyPadding="18px"
              style={{
                background:
                  "linear-gradient(180deg, rgba(84,103,255,0.04) 0%, rgba(84,103,255,0.01) 100%)",
              }}
            >
              <Flex vertical gap={16}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                  <Flex gap={8} wrap="wrap">
                    <AppStatusBadge tone={configured ? "success" : "critical"}>
                      Cosmos {configured ? "已配置" : "未配置"}
                    </AppStatusBadge>
                    <AppStatusBadge tone={blobConfigured ? "success" : "caution"}>
                      Blob {blobConfigured ? "可读" : "未配置"}
                    </AppStatusBadge>
                    <AppStatusBadge tone="neutral">Artifacts {artifactSource}</AppStatusBadge>
                  </Flex>
                  <Text type={!blobConfigured ? "warning" : "secondary"} style={{ fontSize: 12 }}>
                    {!blobConfigured
                      ? "当前页面未配置 Blob 读取，参数产物与规则产物会为空。"
                      : artifactSource === "none"
                        ? "当前还未读到扫描产物，请先执行一次基础扫描。"
                        : "扫描与 AI 都改为手动触发，页面只负责呈现产物。"}
                  </Text>
                </Flex>

                <div style={OVERVIEW_GRID_STYLE}>
                  <OverviewMetric
                    label="最近更新时间"
                    value={formatDate(lastUpdated)}
                    hint={scan?.mode ? MODE_LABEL[scan.mode] : "尚未开始扫描"}
                  />
                  <OverviewMetric
                    label="任务完成度"
                    value={`${completedTaskCount} / ${taskRuns.length || 0}`}
                    hint={isActive ? "当前存在运行中的任务" : "当前没有运行中的任务"}
                  />
                  <OverviewMetric
                    label="已发布语言"
                    value={publishedLocaleCount}
                    hint={publishedLocaleCount > 0 ? "来自 market / coverage 产物" : "尚未读取到语言数据"}
                  />
                  <OverviewMetric
                    label="参数区块"
                    value={`${parameterBlockCount} / 5`}
                    hint={`术语建议 ${glossarySuggestions.length} 条`}
                  />
                </div>
              </Flex>
            </AppSectionCard>

            <Row gutter={[20, 20]}>
              <Col xs={24} xl={12}>
                <AppSectionCard
                  title={<SectionHeading icon={<ReloadOutlined />} title="手动任务" />}
                  description="按任务粒度执行扫描和 AI 整理，避免一次性跑完整条链路。"
                >
                  <Flex vertical gap={16}>
                    <div style={ACTION_GROUP_STYLE}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        数据扫描
                      </Text>
                      <Flex gap={8} wrap="wrap" style={{ marginTop: 8 }}>
                        {DATA_TASKS.map((task) => {
                          const disabledReason = taskButtonDisabledReason(task);
                          const button = (
                            <Button
                              type={task === "profile_material" ? "primary" : "default"}
                              loading={isRescanning}
                              disabled={Boolean(disabledReason)}
                              onClick={() => handleScan(task)}
                            >
                              {TASK_LABEL[task]}
                            </Button>
                          );
                          return disabledReason ? (
                            <Tooltip key={task} title={disabledReason}>
                              <span>{button}</span>
                            </Tooltip>
                          ) : (
                            <span key={task}>{button}</span>
                          );
                        })}
                      </Flex>
                    </div>
                    <div style={ACTION_GROUP_STYLE}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        AI 整理
                      </Text>
                      <Flex gap={8} wrap="wrap" style={{ marginTop: 8 }}>
                        {AI_TASKS.map((task) => {
                          const disabledReason = taskButtonDisabledReason(task);
                          const button = (
                            <Button
                              type="default"
                              icon={<RobotOutlined />}
                              loading={isRescanning}
                              disabled={Boolean(disabledReason)}
                              onClick={() => handleScan(task)}
                            >
                              {TASK_LABEL[task]}
                            </Button>
                          );
                          return disabledReason ? (
                            <Tooltip key={task} title={disabledReason}>
                              <span>{button}</span>
                            </Tooltip>
                          ) : (
                            <span key={task}>{button}</span>
                          );
                        })}
                      </Flex>
                    </div>
                    {taskRuns.length > 0 ? (
                      <Table
                        {...DENSE_TABLE_PROPS}
                        pagination={false}
                        dataSource={taskRuns.map((run) => ({ key: run.id, ...run }))}
                        columns={[
                          {
                            title: "任务",
                            dataIndex: "task",
                            key: "task",
                            render: (task: ShopScanTask) => TASK_LABEL[task] ?? task,
                          },
                          {
                            title: "状态",
                            dataIndex: "status",
                            key: "status",
                            width: 120,
                            render: (status: ShopScanStatus) => (
                              <AppStatusBadge tone={statusTone(status)}>{STATUS_LABEL[status]}</AppStatusBadge>
                            ),
                          },
                          {
                            title: "最近更新时间",
                            dataIndex: "updatedAt",
                            key: "updatedAt",
                            width: 180,
                            render: (value: string) => formatDate(value),
                          },
                          {
                            title: "备注",
                            dataIndex: "errorMessage",
                            key: "errorMessage",
                            ellipsis: true,
                            render: (value: string | null | undefined) => <HoverFullText value={value} />,
                          },
                        ]}
                      />
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        暂无任务记录
                      </Text>
                    )}
                  </Flex>
                </AppSectionCard>
              </Col>

              <Col xs={24} xl={12}>
                <AppSectionCard
                  title={<SectionHeading icon={scan ? STATUS_ICON[scan.status] : <SyncOutlined />} title="扫描状态" />}
                  description="这里看当前运行状态和四个阶段的完成情况。"
                  extra={
                    scan ? <AppStatusBadge tone={statusTone(scan.status)}>{STATUS_LABEL[scan.status]}</AppStatusBadge> : null
                  }
                >
                  <Flex vertical gap={16}>
                    <Flex vertical gap={2}>
                      <Text type="secondary" style={{ fontSize: 12 }}>更新时间</Text>
                      <Text>{formatDate(scan?.updatedAt)}</Text>
                    </Flex>

                    <Divider style={{ margin: "4px 0" }} />

                    <Flex vertical gap={8}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        扫描阶段
                      </Text>
                      <Row gutter={[12, 12]}>
                    {(Object.keys(STAGE_LABEL) as Array<keyof typeof STAGE_LABEL>).map(
                      (stage, idx, arr) => {
                        const st = scan
                          ? (scan.stages as Record<string, ShopScanStageState>)[stage]
                          : undefined;
                        const isDone = st === "DONE";
                        const isLast = idx === arr.length - 1;
                        return (
                          <Col xs={12} sm={6} key={stage}>
                            <Flex align="center" gap={8}>
                              {/* 步骤序号圆圈 */}
                              <Flex
                                align="center"
                                justify="center"
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: isDone
                                    ? "var(--app-accent-growth)"
                                    : st === "FAILED"
                                      ? "var(--app-accent-critical)"
                                      : "rgba(0,0,0,0.06)",
                                  color: isDone || st === "FAILED"
                                    ? "#fff"
                                    : "rgba(0,0,0,0.45)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  flexShrink: 0,
                                  border: isDone || st === "FAILED"
                                    ? "none"
                                    : "2px solid rgba(0,0,0,0.10)",
                                }}
                              >
                                {isDone ? (
                                  <CheckCircleOutlined />
                                ) : st === "FAILED" ? (
                                  <CloseCircleOutlined />
                                ) : (
                                  idx + 1
                                )}
                              </Flex>
                              <Flex vertical gap={0} style={{ flex: 1 }}>
                                <Text
                                  strong
                                  style={{
                                    fontSize: 13,
                                    color: isDone
                                      ? "var(--app-color-text)"
                                      : "var(--app-color-text-secondary)",
                                  }}
                                >
                                  {STAGE_LABEL[stage]}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: st
                                      ? STAGE_TONE[st]
                                      : "var(--app-color-text-tertiary)",
                                  }}
                                >
                                  {st ? STAGE_STATE_LABEL[st] : "-"}
                                </Text>
                              </Flex>
                              {/* 连接线 */}
                              {!isLast && (
                                <div
                                  style={{
                                    display: "none",
                                    // shown on sm+
                                  }}
                                />
                              )}
                            </Flex>
                          </Col>
                        );
                      },
                    )}
                      </Row>
                    </Flex>
                  </Flex>
                </AppSectionCard>
              </Col>
            </Row>

            {/* 店铺画像：独占一行 */}
            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <DatabaseOutlined style={{ color: "var(--app-accent-primary)" }} />
                  <span>店铺画像</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              {profile ? (
                <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small" bordered>
                  <Descriptions.Item label="店铺名称">
                    {profile.shopName || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="默认语言">
                    <Tag>{profile.primaryLocale || "-"}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="行业/品类">
                    <Tag color="blue">{profile.industry || "-"}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="品牌语气">
                    {profile.brandTone || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="AI 模型" span={2}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {profile.aiModel || "-"}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="关键词" span={3}>
                    {profile.keywords.length ? (
                      <Flex gap={4} wrap="wrap">
                        {profile.keywords.map((k) => (
                          <Tag key={k} color="purple">{k}</Tag>
                        ))}
                      </Flex>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="店铺描述" span={3}>
                    <Paragraph
                      style={{ margin: 0 }}
                      ellipsis={hydrated ? { rows: 2, expandable: true } : false}
                    >
                      {profile.description || "-"}
                    </Paragraph>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Empty description="画像尚未生成（可能素材不足或 AI 未配置）" />
              )}
            </AppSectionCard>

            {/* AI 第一步完整理解（Blob；Turso 只落了 industry/keywords/description/brandTone） */}
            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <RobotOutlined style={{ color: "var(--app-accent-utility)" }} />
                  <span>店铺理解详情（AI 第一步）</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              {understanding ? (
                <Flex vertical gap={16}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    完整理解结果存于扫描 Blob；上方「店铺画像」仅展示已写入数据库、可注入翻译的字段。
                  </Text>
                  <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small" bordered>
                    <Descriptions.Item label="行业">
                      {understanding.industry || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="子品类">
                      {understanding.subIndustry || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="价格区间">
                      {understanding.priceRange || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="品牌定位" span={3}>
                      {understanding.brandPositioning || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="品牌语气">
                      {understanding.voiceStyle || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="SEO 导向" span={2}>
                      {understanding.seoDirection || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="核心商品类型" span={3}>
                      {understanding.coreProductTypes.length ? (
                        <Flex gap={4} wrap="wrap">
                          {understanding.coreProductTypes.map((t) => (
                            <Tag key={t} color="blue">
                              {t}
                            </Tag>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="卖点" span={3}>
                      {understanding.sellingPoints.length ? (
                        <Flex vertical gap={4}>
                          {understanding.sellingPoints.map((p) => (
                            <Text key={p}>· {p}</Text>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="市场本地化关注点" span={3}>
                      {understanding.marketNotes.length ? (
                        <Flex vertical gap={4}>
                          {understanding.marketNotes.map((n) => (
                            <Text key={n}>· {n}</Text>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Flex>
              ) : (
                <Empty description="暂无完整理解详情（需完成扫描且 Blob 可读）" />
              )}
            </AppSectionCard>

            {/* Markets：扫描时采集，尚未持久化到独立表 */}
            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <ShopOutlined style={{ color: "var(--app-accent-primary)" }} />
                  <span>市场配置（Markets）</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              {marketRows.length > 0 ? (
                <Flex vertical gap={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    来自 Shopify Markets，用于本地化策略输入；当前仅保存在扫描结果中。
                  </Text>
                  <Table
                    size="small"
                    scroll={TABLE_SCROLL_X}
                    pagination={false}
                    dataSource={marketRows}
                    columns={[
                      {
                        title: "市场",
                        dataIndex: "name",
                        key: "name",
                        width: 220,
                        ellipsis: true,
                        render: (value: string) => <HoverFullText value={value} />,
                      },
                      {
                        title: "Handle",
                        dataIndex: "handle",
                        key: "handle",
                        width: 120,
                        ellipsis: true,
                        render: (value: string) => <HoverFullText value={value} mono />,
                      },
                      {
                        title: "货币",
                        dataIndex: "baseCurrency",
                        key: "baseCurrency",
                        width: 90,
                        render: (v: string | null) =>
                          v ? <Tag>{v}</Tag> : <Text type="secondary">-</Text>,
                      },
                      {
                        title: "语言",
                        dataIndex: "locales",
                        key: "locales",
                        render: (locales: string[]) =>
                          locales.length ? (
                            <Flex gap={4} wrap="wrap">
                              {locales.map((l) => (
                                <Tag key={l}>{l}</Tag>
                              ))}
                            </Flex>
                          ) : (
                            "-"
                          ),
                      },
                      {
                        title: "状态",
                        dataIndex: "status",
                        key: "status",
                        width: 90,
                        render: (v: string) => v || "-",
                      },
                    ]}
                  />
                </Flex>
              ) : (
                <Empty description="暂无市场数据（需完成画像扫描且 Blob 可读）" />
              )}
            </AppSectionCard>

            {/* 信号提取层中间结果 */}
            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <BarChartOutlined style={{ color: "var(--app-accent-utility)" }} />
                  <span>内容信号（加权词频 / 抽样）</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              {signals ? (
                <Flex vertical gap={16}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    工程侧提纯结果，供 AI 归纳使用；来源含 menu / collection / theme / product 等。
                  </Text>

                  {(signals.brandTerms.length > 0 ||
                    signals.categoryTerms.length > 0 ||
                    signals.menuTerms.length > 0) && (
                    <Row gutter={[16, 12]}>
                      {signals.brandTerms.length > 0 && (
                        <Col xs={24} md={8}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            品牌/供应商
                          </Text>
                          <Flex gap={4} wrap="wrap" style={{ marginTop: 6 }}>
                            {signals.brandTerms.map((t) => (
                              <Tag key={t}>{t}</Tag>
                            ))}
                          </Flex>
                        </Col>
                      )}
                      {signals.categoryTerms.length > 0 && (
                        <Col xs={24} md={8}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            品类词
                          </Text>
                          <Flex gap={4} wrap="wrap" style={{ marginTop: 6 }}>
                            {signals.categoryTerms.map((t) => (
                              <Tag key={t} color="blue">
                                {t}
                              </Tag>
                            ))}
                          </Flex>
                        </Col>
                      )}
                      {signals.menuTerms.length > 0 && (
                        <Col xs={24} md={8}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            导航词
                          </Text>
                          <Flex gap={4} wrap="wrap" style={{ marginTop: 6 }}>
                            {signals.menuTerms.map((t) => (
                              <Tag key={t} color="green">
                                {t}
                              </Tag>
                            ))}
                          </Flex>
                        </Col>
                      )}
                    </Row>
                  )}

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        高权重关键词
                      </Text>
                      <Table
                        size="small"
                        scroll={TABLE_SCROLL_X}
                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                        style={{ marginTop: 8 }}
                        dataSource={termRows}
                        columns={[
                          {
                            title: "词",
                            dataIndex: "term",
                            key: "term",
                            ellipsis: true,
                            render: (value: string) => <HoverFullText value={value} />,
                          },
                          {
                            title: "得分",
                            dataIndex: "score",
                            key: "score",
                            width: 72,
                            align: "right",
                            render: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "-"),
                          },
                          {
                            title: "次数",
                            dataIndex: "count",
                            key: "count",
                            width: 64,
                            align: "right",
                          },
                          {
                            title: "来源",
                            dataIndex: "sources",
                            key: "sources",
                            ellipsis: true,
                            render: (sources: string[]) => (
                              <HoverFullText value={sources.join(", ") || "-"} />
                            ),
                          },
                        ]}
                        locale={{ emptyText: "暂无" }}
                      />
                    </Col>
                    <Col xs={24} lg={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        高权重短语
                      </Text>
                      <Table
                        size="small"
                        scroll={TABLE_SCROLL_X}
                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                        style={{ marginTop: 8 }}
                        dataSource={phraseRows}
                        columns={[
                          {
                            title: "短语",
                            dataIndex: "term",
                            key: "term",
                            ellipsis: true,
                            render: (value: string) => <HoverFullText value={value} />,
                          },
                          {
                            title: "得分",
                            dataIndex: "score",
                            key: "score",
                            width: 72,
                            align: "right",
                            render: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "-"),
                          },
                          {
                            title: "次数",
                            dataIndex: "count",
                            key: "count",
                            width: 64,
                            align: "right",
                          },
                        ]}
                        locale={{ emptyText: "暂无" }}
                      />
                    </Col>
                  </Row>

                  {sourceStatRows.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        来源样本数
                      </Text>
                      <Flex gap={4} wrap="wrap" style={{ marginTop: 6 }}>
                        {sourceStatRows.map((r) => (
                          <Tag key={r.source}>
                            {r.source}: {r.count}
                          </Tag>
                        ))}
                      </Flex>
                    </div>
                  )}

                  {sampleRows.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        代表文案样本
                      </Text>
                      <Table
                        size="small"
                        scroll={TABLE_SCROLL_X}
                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                        style={{ marginTop: 8 }}
                        dataSource={sampleRows}
                        columns={[
                          {
                            title: "来源",
                            dataIndex: "source",
                            key: "source",
                            width: 140,
                            ellipsis: true,
                            render: (value: string) => <HoverFullText value={value} mono />,
                          },
                          {
                            title: "文本",
                            dataIndex: "text",
                            key: "text",
                            ellipsis: true,
                            render: (value: string) => <HoverFullText value={value} />,
                          },
                        ]}
                      />
                    </div>
                  )}
                </Flex>
              ) : (
                <Empty description="暂无信号数据（需完成画像扫描且 Blob 可读）" />
              )}
            </AppSectionCard>

            {/* 翻译提示词预览：真实注入翻译 API 的 shop profile 上下文 */}
            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <AimOutlined style={{ color: "var(--app-accent-primary)" }} />
                  <span>翻译参数产物</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              <Flex vertical gap={16}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <Flex gap={6} wrap="wrap">
                    <Tag {...SCAN_TAG_STYLE}>
                      Source: 店铺 / 市场 / 商品 / 文章 / Theme
                    </Tag>
                    <Tag {...SCAN_TAG_STYLE}>
                      Assembler: {TASK_LABEL.profile_ai}
                    </Tag>
                    {latestProfileSourceRun ? (
                      <Tag color={STATUS_COLOR[latestProfileSourceRun.status]}>
                        Source: {STATUS_LABEL[latestProfileSourceRun.status]}
                      </Tag>
                    ) : null}
                    {profileIdentityRun ? (
                      <Tag {...SCAN_TAG_STYLE}>店铺: {STATUS_LABEL[profileIdentityRun.status]}</Tag>
                    ) : null}
                    {marketLocaleRun ? (
                      <Tag {...SCAN_TAG_STYLE}>市场: {STATUS_LABEL[marketLocaleRun.status]}</Tag>
                    ) : null}
                    {catalogMaterialRun ? (
                      <Tag {...SCAN_TAG_STYLE}>商品: {STATUS_LABEL[catalogMaterialRun.status]}</Tag>
                    ) : null}
                    {editorialMaterialRun ? (
                      <Tag {...SCAN_TAG_STYLE}>文章: {STATUS_LABEL[editorialMaterialRun.status]}</Tag>
                    ) : null}
                    {styleMaterialRun ? (
                      <Tag {...SCAN_TAG_STYLE}>Theme: {STATUS_LABEL[styleMaterialRun.status]}</Tag>
                    ) : null}
                    {profileAiRun ? (
                      <Tag color={STATUS_COLOR[profileAiRun.status]}>
                        AI: {STATUS_LABEL[profileAiRun.status]}
                      </Tag>
                    ) : null}
                  </Flex>
                  <Flex gap={8} wrap="wrap">
                    <Button
                      type="default"
                      loading={isRescanning}
                      disabled={!configured || isActive}
                      onClick={() => handleScan("profile_material")}
                    >
                      扫描全部画像源
                    </Button>
                    <Button
                      type="primary"
                      icon={<RobotOutlined />}
                      loading={isRescanning}
                      disabled={!configured || isActive || Boolean(profileAiBlockedReason)}
                      onClick={() => handleScan("profile_ai")}
                    >
                      生成参数产物
                    </Button>
                  </Flex>
                </Flex>
                {profileAiBlockedReason ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {profileAiBlockedReason}
                  </Text>
                ) : profileAiRun?.status === "SKIPPED" && profileAiRun.errorMessage ? (
                  <Text type="warning" style={{ fontSize: 12 }}>
                    AI 已跳过：{profileAiRun.errorMessage}
                    {profileAiRun.errorMessage === "missing_profile_material"
                      ? "（profile-workspace 缺少店铺身份/信号素材。请先点「扫描全部画像源」，再生成参数产物。）"
                      : null}
                  </Text>
                ) : null}
              {translationContextProfile ? (
                <Flex vertical gap={16}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    这里展示的是翻译链路真正可消费的结构化参数。页面只负责确认有哪些参数和规则已产出，不在这里直接拼提示词。
                  </Text>
                  <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small" bordered>
                    <Descriptions.Item label="生成时间">
                      {formatDate(translationContextProfile.generatedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="店铺参数">
                      {translationContextProfile.shopContext ? "已就绪" : "缺失"}
                    </Descriptions.Item>
                    <Descriptions.Item label="术语参数">
                      {translationContextProfile.terminologyProfile ? "已就绪" : "缺失"}
                    </Descriptions.Item>
                    <Descriptions.Item label="市场参数">
                      {translationContextProfile.marketProfile ? "已就绪" : "缺失"}
                    </Descriptions.Item>
                    <Descriptions.Item label="场景规则">
                      {translationContextProfile.themeSceneProfile ? "已就绪" : "缺失"}
                    </Descriptions.Item>
                    <Descriptions.Item label="模块规则">
                      {translationContextProfile.modulePolicyProfile?.moduleHints.length ?? 0} 个模块
                    </Descriptions.Item>
                    <Descriptions.Item label="关键词" span={3}>
                      {translationContextProfile.shopContext?.keywords.length ? (
                        <Flex gap={4} wrap="wrap">
                          {translationContextProfile.shopContext.keywords.map((item) => (
                            <Tag key={item} color="purple">
                              {item}
                            </Tag>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="品牌词" span={3}>
                      {translationContextProfile.terminologyProfile?.brandTerms.length ? (
                        <Flex gap={4} wrap="wrap">
                          {translationContextProfile.terminologyProfile.brandTerms.map((item) => (
                            <Tag key={item} color="blue">
                              {item}
                            </Tag>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="不翻译词" span={3}>
                      {translationContextProfile.terminologyProfile?.doNotTranslateTerms.length ? (
                        <Flex gap={4} wrap="wrap">
                          {translationContextProfile.terminologyProfile.doNotTranslateTerms.map(
                            (item) => (
                              <Tag key={item} color="red">
                                {item}
                              </Tag>
                            ),
                          )}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="专业词/建议译法" span={3}>
                      {translationContextProfile.terminologyProfile?.preferredTerms.length ? (
                        <Flex gap={4} wrap="wrap">
                          {translationContextProfile.terminologyProfile.preferredTerms.map(
                            (item) => (
                              <Tag key={`${item.source}-${item.note ?? ""}`} color="geekblue">
                                {item.note ? `${item.source} → ${item.note}` : item.source}
                              </Tag>
                            ),
                          )}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="已发布语言" span={3}>
                      {translationContextProfile.marketProfile?.publishedLocales.length ? (
                        <Flex gap={4} wrap="wrap">
                          {translationContextProfile.marketProfile.publishedLocales.map((item) => (
                            <Tag key={item}>{item}</Tag>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="市场备注" span={3}>
                      {translationContextProfile.marketProfile?.marketNotes.length ? (
                        <Flex vertical gap={4}>
                          {translationContextProfile.marketProfile.marketNotes.map((item) => (
                            <Text key={item}>· {item}</Text>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="模块规则数" span={3}>
                      {translationContextProfile.modulePolicyProfile?.moduleHints.length ? (
                        <Flex gap={4} wrap="wrap">
                          {translationContextProfile.modulePolicyProfile.moduleHints.map((item) => (
                            <Tag key={item.module} color="geekblue">
                              {item.module}
                            </Tag>
                          ))}
                        </Flex>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Flex>
              ) : (
                <Empty
                  description={
                    blobConfigured
                      ? "暂无参数产物（未读到 translation-context-profile.json）"
                      : "暂无参数产物（当前页面未配置 Blob 读取）"
                  }
                />
              )}
              </Flex>
            </AppSectionCard>

            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <AimOutlined style={{ color: "var(--app-accent-utility)" }} />
                  <span>规则产物（Theme / Scene / Module）</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              <Flex vertical gap={16}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <Flex gap={6} wrap="wrap">
                    <Tag {...SCAN_TAG_STYLE}>来源: {TASK_LABEL.style_material}</Tag>
                    {styleMaterialRun ? (
                      <Tag color={STATUS_COLOR[styleMaterialRun.status]}>
                        {STATUS_LABEL[styleMaterialRun.status]}
                      </Tag>
                    ) : null}
                  </Flex>
                  <Button
                    type="primary"
                    loading={isRescanning}
                    disabled={!configured || isActive}
                    onClick={() => handleScan("style_material")}
                  >
                    扫描 Theme 场景
                  </Button>
                </Flex>
              {themeSceneProfile ? (
                <Flex vertical gap={16}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    这里展示扫描阶段从 theme key 提炼出的 scene / role / tone 规则信号，用于后续运行时判定该走哪类翻译策略。
                  </Text>

                  {(sceneStatRows.length > 0 || roleStatRows.length > 0) && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Scene 分布
                        </Text>
                        <Flex gap={6} wrap="wrap" style={{ marginTop: 8 }}>
                          {sceneStatRows.map((row) => (
                            <Tag key={row.key} color="blue">
                              {row.scene}: {row.count}
                            </Tag>
                          ))}
                        </Flex>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Role 分布
                        </Text>
                        <Flex gap={6} wrap="wrap" style={{ marginTop: 8 }}>
                          {roleStatRows.map((row) => (
                            <Tag key={row.key} color="green">
                              {row.role}: {row.count}
                            </Tag>
                          ))}
                        </Flex>
                      </Col>
                    </Row>
                  )}

                  {(themeSceneProfile.appNamespaces.length > 0 ||
                    themeSceneProfile.highConfidencePatterns.length > 0) && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          App Namespace
                        </Text>
                        <Flex gap={6} wrap="wrap" style={{ marginTop: 8 }}>
                          {themeSceneProfile.appNamespaces.length > 0 ? (
                            themeSceneProfile.appNamespaces.map((item) => (
                              <Tag key={item} color="gold">
                                {item}
                              </Tag>
                            ))
                          ) : (
                            <Text type="secondary">-</Text>
                          )}
                        </Flex>
                      </Col>
                      <Col xs={24} lg={14}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          High Confidence Pattern
                        </Text>
                        <Flex gap={6} wrap="wrap" style={{ marginTop: 8 }}>
                          {themeSceneProfile.highConfidencePatterns.length > 0 ? (
                            themeSceneProfile.highConfidencePatterns.map((item) => (
                              <Tag key={item}>{item}</Tag>
                            ))
                          ) : (
                            <Text type="secondary">-</Text>
                          )}
                        </Flex>
                      </Col>
                    </Row>
                  )}

                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Scene Hint 明细
                    </Text>
                    <Table
                      size="small"
                      scroll={{ x: 1280 }}
                      pagination={{ pageSize: 8, hideOnSinglePage: true }}
                      style={{ marginTop: 8 }}
                      dataSource={sceneHintRows}
                      columns={[
                        {
                          title: "模块",
                          dataIndex: "module",
                          key: "module",
                          width: 220,
                          ellipsis: true,
                          render: (value: string) => <HoverFullText value={value} mono />,
                        },
                        {
                          title: "Key Pattern",
                          dataIndex: "keyPattern",
                          key: "keyPattern",
                          width: 320,
                          ellipsis: true,
                          render: (value: string) => <HoverFullText value={value} mono />,
                        },
                        {
                          title: "Namespace",
                          dataIndex: "namespace",
                          key: "namespace",
                          width: 160,
                          ellipsis: true,
                          render: (value: string | null) => <HoverFullText value={value} mono />,
                        },
                        {
                          title: "Resource Pattern",
                          dataIndex: "resourcePattern",
                          key: "resourcePattern",
                          width: 220,
                          ellipsis: true,
                          render: (value: string | null) => <HoverFullText value={value} mono />,
                        },
                        {
                          title: "Scene",
                          dataIndex: "scene",
                          key: "scene",
                          width: 140,
                          render: (value: string) => <Tag color="blue">{value}</Tag>,
                        },
                        {
                          title: "Role",
                          dataIndex: "role",
                          key: "role",
                          width: 120,
                          render: (value: string | null) => <HoverFullText value={value} mono />,
                        },
                        {
                          title: "Tone / Creativity",
                          key: "tone",
                          width: 170,
                          render: (_: unknown, row: (typeof sceneHintRows)[number]) => (
                            <HoverFullText
                              value={`${row.tonePreference} / ${row.creativity}`}
                            />
                          ),
                        },
                        {
                          title: "置信度",
                          dataIndex: "confidence",
                          key: "confidence",
                          width: 88,
                          align: "right",
                          render: (value: number) => value.toFixed(2),
                        },
                      ]}
                      locale={{ emptyText: "暂无 theme scene hint" }}
                    />
                  </div>
                </Flex>
              ) : (
                <Empty
                  description={
                    blobConfigured
                      ? "暂无规则产物（未读到 style-context / theme-key-profile / profile-facts）。仅「扫描 Theme」不够，需先「扫描全部画像源」写入 profile-workspace。"
                      : "暂无规则产物（当前页面未配置 Blob 读取）"
                  }
                />
              )}
              </Flex>
            </AppSectionCard>

            {/* 第二步 AI 归纳：术语策略与模块建议 */}
            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <AimOutlined style={{ color: "var(--app-accent-utility)" }} />
                  <span>术语与翻译策略（AI 第二步）</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              {strategy ? (
                <Flex vertical gap={16}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    基于店铺理解结论归纳的术语控制与模块级翻译方向，仅供预览，不会自动写入术语表。
                  </Text>

                  {(strategy.brandTerms.length > 0 || strategy.doNotTranslateTerms.length > 0) && (
                    <Row gutter={[16, 12]}>
                      {strategy.brandTerms.length > 0 && (
                        <Col xs={24} md={12}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            品牌词
                          </Text>
                          <Flex gap={4} wrap="wrap" style={{ marginTop: 6 }}>
                            {strategy.brandTerms.map((t) => (
                              <Tag key={t} color="blue">
                                {t}
                              </Tag>
                            ))}
                          </Flex>
                        </Col>
                      )}
                      {strategy.doNotTranslateTerms.length > 0 && (
                        <Col xs={24} md={12}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            不翻译词
                          </Text>
                          <Flex gap={4} wrap="wrap" style={{ marginTop: 6 }}>
                            {strategy.doNotTranslateTerms.map((t) => (
                              <Tag key={t} color="red">
                                {t}
                              </Tag>
                            ))}
                          </Flex>
                        </Col>
                      )}
                    </Row>
                  )}

                  {strategy.regionalStyleGuidance.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        地区化行业风格
                      </Text>
                      <Flex gap={4} wrap="wrap" style={{ marginTop: 6 }}>
                        {strategy.regionalStyleGuidance.map((t) => (
                          <Tag key={t} color="purple">
                            {t}
                          </Tag>
                        ))}
                      </Flex>
                    </div>
                  )}

                  {strategy.preferredTerms.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        建议固定译法
                      </Text>
                      <Table
                        size="small"
                        scroll={TABLE_SCROLL_X}
                        pagination={false}
                        style={{ marginTop: 8 }}
                        dataSource={strategy.preferredTerms.map((t, i) => ({
                          key: `${t.source}-${i}`,
                          ...t,
                        }))}
                        columns={[
                          {
                            title: "源词",
                            dataIndex: "source",
                            key: "source",
                            ellipsis: true,
                            render: (value: string) => <HoverFullText value={value} mono />,
                          },
                          {
                            title: "说明",
                            dataIndex: "note",
                            key: "note",
                            ellipsis: true,
                            render: (value: string | null) => <HoverFullText value={value} />,
                          },
                        ]}
                      />
                    </div>
                  )}

                  {moduleHintRows.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        模块级翻译建议
                      </Text>
                      <Table
                        size="small"
                        scroll={{ x: 920 }}
                        pagination={false}
                        style={{ marginTop: 8 }}
                        dataSource={moduleHintRows}
                        columns={[
                          {
                            title: "模块",
                            dataIndex: "module",
                            key: "module",
                            width: 160,
                            ellipsis: true,
                            render: (value: string) => <HoverFullText value={value} mono />,
                          },
                          {
                            title: "语气",
                            dataIndex: "tonePolicy",
                            key: "tonePolicy",
                            ellipsis: true,
                            render: (value: string | null) => <HoverFullText value={value} />,
                          },
                          {
                            title: "直译/意译",
                            dataIndex: "literalVsAdaptive",
                            key: "literalVsAdaptive",
                            ellipsis: true,
                            render: (value: string | null) => <HoverFullText value={value} />,
                          },
                        ]}
                      />
                    </div>
                  )}
                </Flex>
              ) : (
                <Empty description="暂无术语策略（需完成扫描且 AI 第二步成功生成）" />
              )}
            </AppSectionCard>

            {/* 内容规模 + 语言覆盖率：双栏 */}
            <Row gutter={[20, 20]}>
              <Col xs={24} lg={12}>
                <AppSectionCard
                  title={
                    <Flex align="center" gap={8}>
                      <ThunderboltOutlined style={{ color: "var(--app-accent-utility)" }} />
                      <span>内容规模</span>
                    </Flex>
                  }
                  style={{ boxShadow: "var(--app-shadow-card)", height: "100%" }}
                >
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Statistic
                        title="可翻译条目"
                        value={formatNumber(scan?.summary?.totalItems)}
                        valueStyle={{ color: "var(--app-accent-primary)", fontSize: 24 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="源文字符数"
                        value={formatNumber(scan?.summary?.totalChars)}
                        valueStyle={{ color: "var(--app-color-text)", fontSize: 24 }}
                      />
                    </Col>
                  </Row>
                  <Table
                    size="small"
                    scroll={TABLE_SCROLL_X}
                    pagination={false}
                    dataSource={moduleRows}
                    columns={[
                      {
                        title: "模块",
                        dataIndex: "module",
                        key: "module",
                        ellipsis: true,
                        render: (value: string) => <HoverFullText value={value} mono />,
                      },
                      {
                        title: "条目",
                        dataIndex: "items",
                        key: "items",
                        align: "right",
                        width: 72,
                        render: (v: number) => formatNumber(v),
                        sorter: (a, b) => a.items - b.items,
                      },
                      {
                        title: "字符",
                        dataIndex: "chars",
                        key: "chars",
                        align: "right",
                        width: 72,
                        render: (v: number) => formatNumber(v),
                        sorter: (a, b) => a.chars - b.chars,
                      },
                    ]}
                    locale={{ emptyText: "暂无数据" }}
                  />
                </AppSectionCard>
              </Col>

              <Col xs={24} lg={12}>
                <AppSectionCard
                  title={
                    <Flex align="center" gap={8}>
                      <GlobalOutlined style={{ color: "var(--app-accent-primary)" }} />
                      <span>已发布语言覆盖率</span>
                    </Flex>
                  }
                  style={{ boxShadow: "var(--app-shadow-card)", height: "100%" }}
                >
                  {coverageRows.length > 0 ? (
                    <Table
                      size="small"
                      scroll={{ x: 760 }}
                      pagination={false}
                      dataSource={coverageRows}
                      columns={[
                        { title: "语言", dataIndex: "locale", key: "locale", width: 80 },
                        {
                          title: "进度",
                          key: "count",
                          align: "right",
                          width: 100,
                          render: (_: unknown, r: (typeof coverageRows)[number]) =>
                            `${formatNumber(r.translated)} / ${formatNumber(r.total)}`,
                        },
                        {
                          title: "覆盖率",
                          dataIndex: "percent",
                          key: "percent",
                          render: (percent: number | null) =>
                            percent === null ? (
                              <Text type="secondary">-</Text>
                            ) : (
                              <Flex align="center" gap={8}>
                                <Progress
                                  percent={percent}
                                  size="small"
                                  status={percent >= 100 ? "success" : "active"}
                                  style={{ flex: 1, margin: 0 }}
                                  strokeColor={
                                    percent >= 100
                                      ? "var(--app-accent-growth)"
                                      : percent >= 50
                                        ? "var(--app-accent-primary)"
                                        : "var(--app-accent-utility)"
                                  }
                                />
                                <Text
                                  strong
                                  style={{
                                    fontSize: 13,
                                    minWidth: 40,
                                    textAlign: "right",
                                    color:
                                      percent >= 100
                                        ? "var(--app-accent-growth)"
                                        : "var(--app-color-text)",
                                  }}
                                >
                                  {percent}%
                                </Text>
                              </Flex>
                            ),
                        },
                      ]}
                      locale={{ emptyText: "无已发布的目标语言" }}
                    />
                  ) : (
                    <Empty description="无已发布的目标语言" />
                  )}
                </AppSectionCard>
              </Col>
            </Row>

            {/* AI 术语建议（仅展示，不写术语表库） */}
            <AppSectionCard
              title={
                <Flex align="center" gap={8}>
                  <BookOutlined style={{ color: "var(--app-accent-primary)" }} />
                  <span>AI 术语建议</span>
                </Flex>
              }
              style={{ boxShadow: "var(--app-shadow-card)" }}
            >
              <Flex vertical gap={12}>
                <Flex align="baseline" gap={8}>
                  <Text>本次扫描归纳术语</Text>
                  <Text
                    strong
                    style={{
                      fontSize: 20,
                      color: "var(--app-accent-primary)",
                    }}
                  >
                    {formatNumber(glossarySuggestions.length)}
                  </Text>
                  <Text>条</Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  从已有译文样本归纳，仅保存在本页扫描结果中，不会写入正式术语表。
                </Text>
                {glossaryRows.length > 0 ? (
                  <Table
                    size="small"
                    scroll={TABLE_SCROLL_X}
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                    dataSource={glossaryRows}
                    columns={[
                      { title: "语言", dataIndex: "locale", key: "locale", width: 80 },
                      {
                        title: "源词",
                        dataIndex: "source",
                        key: "source",
                        ellipsis: true,
                        render: (value: string) => <HoverFullText value={value} mono />,
                      },
                      {
                        title: "建议译文",
                        dataIndex: "target",
                        key: "target",
                        ellipsis: true,
                        render: (value: string) => <HoverFullText value={value} />,
                      },
                    ]}
                  />
                ) : (
                  <Empty description="暂无术语建议（需有已发布语言及足够译文样本）" />
                )}
              </Flex>
            </AppSectionCard>
          </>
        )}
      </Flex>
    </Page>
  );
}
