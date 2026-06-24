import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Progress,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useNavigate } from "@remix-run/react";
import {
  createTranslateV4Tasks,
  formatCreateTasksMessage,
  type ShopLocaleOption,
} from "~/lib/createTranslateV4Tasks";

const { Title, Text } = Typography;

/** 首页「极速翻译」卡片用到的任务进度形状（与 TranslationJobProgressSummary 对齐的子集）。 */
export type ExpressV4Job = {
  taskId: string;
  status: string;
  statusLabel: string;
  isTerminal: boolean;
  source: string;
  target: string;
  stageSummary: string;
  progressPercent: number | null;
};

type Props = {
  shop: string;
  locales: ShopLocaleOption[];
  primaryLocale: string;
  initialJobs: ExpressV4Job[];
  /** 本店是否已迁移到新版翻译（来自 ShopTranslationSettings.migratedToTsf）。 */
  migrated: boolean;
};

/** 极速翻译默认翻译的模块（与 api.translate-v4.tasks 的默认保持一致）。 */
const DEFAULT_MODULES = ["PRODUCT", "COLLECTION", "PAGE", "ARTICLE"];

/** 折叠时默认展示的任务条数 */
const COLLAPSED_JOB_COUNT = 2;

function progressStatus(job: ExpressV4Job): "success" | "exception" | "active" | "normal" {
  if (job.status === "FAILED") return "exception";
  if (job.isTerminal) return "success";
  return "active";
}

const ExpressTranslateCard = ({
  shop,
  locales,
  primaryLocale,
  initialJobs,
  migrated,
}: Props) => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<ExpressV4Job[]>(initialJobs);
  const [targets, setTargets] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [migratedState, setMigratedState] = useState(migrated);
  const [migrating, setMigrating] = useState(false);
  const [jobsExpanded, setJobsExpanded] = useState(false);

  const source = primaryLocale || "zh-CN";
  const targetOptions = useMemo<ShopLocaleOption[]>(
    () => locales.filter((l) => l.value !== source),
    [locales, source],
  );
  const visibleJobs = useMemo(
    () =>
      jobsExpanded || jobs.length <= COLLAPSED_JOB_COUNT
        ? jobs
        : jobs.slice(0, COLLAPSED_JOB_COUNT),
    [jobs, jobsExpanded],
  );
  const hasMoreJobs = jobs.length > COLLAPSED_JOB_COUNT;

  const handleMigrate = useCallback(async () => {
    setMigrating(true);
    try {
      const res = await fetch("/api/translate-v4/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryLocale: source,
          targets: targetOptions.map((o) => o.value),
        }),
      });
      const data = await res.json();
      if (data?.ok && data.summary) {
        setMigratedState(true);
        message.success("已迁移到新版翻译");
      } else {
        message.error(data?.error || "迁移失败，请稍后重试");
      }
    } catch (err) {
      console.error("[expressV4] migrate failed:", err);
      message.error("迁移失败，请稍后重试");
    } finally {
      setMigrating(false);
    }
  }, [source, targetOptions]);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/tasks?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();
      if (data?.ok) setJobs(data.jobs as ExpressV4Job[]);
    } catch (err) {
      console.error("[expressV4] refresh list failed:", err);
    }
  }, [shop]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const result = await createTranslateV4Tasks({
        source,
        targets,
        modules: DEFAULT_MODULES,
        aiModel: "deepseek-v4-flash",
        isCover: false,
        isHandle: false,
        targetOptions,
      });

      if (result.validationError) {
        message.warning(result.validationError);
        return;
      }

      const summary = formatCreateTasksMessage(result);
      if (result.created.length > 0) {
        message.success(summary);
        setTargets([]);
        await refreshList();
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
      console.error("[expressV4] create failed:", err);
      message.error("创建失败，请稍后重试");
    } finally {
      setCreating(false);
    }
  }, [source, targets, targetOptions, refreshList]);

  // 轮询活跃任务的实时进度（逐条 task-progress）。
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
            return data?.ok ? (data.summary as ExpressV4Job) : null;
          } catch {
            return null;
          }
        }),
      );
      setJobs((prev) =>
        prev.map((j) => updated.find((u) => u && u.taskId === j.taskId) ?? j),
      );
    }, 3000);
    return () => clearInterval(timer);
  }, [shop]);

  return (
    <Card
      style={{ width: "100%" }}
      styles={{ body: { padding: "12px 24px" } }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
          极速翻译
        </Title>
        <Button type="link" onClick={() => navigate("/app/translate-v4")}>
          更多设置
        </Button>
      </Flex>

      {!migratedState ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="升级到新版翻译"
          description="把你的术语表、Liquid 规则和自动翻译配置迁移到新版翻译引擎。迁移后由新版接管，不可回退。"
          action={
            <Button
              type="primary"
              size="small"
              loading={migrating}
              onClick={handleMigrate}
            >
              一键迁移
            </Button>
          }
        />
      ) : null}

      <Flex gap={8} wrap="wrap" align="center" style={{ marginBottom: 16 }}>
        <Text type="secondary">源语言：{source}</Text>
        <Select
          mode="multiple"
          allowClear
          placeholder="选择目标语言"
          value={targets}
          onChange={setTargets}
          options={targetOptions}
          style={{ minWidth: 260, flex: 1 }}
          maxTagCount="responsive"
        />
        <Button
          type="primary"
          loading={creating}
          disabled={targets.length === 0}
          onClick={handleCreate}
        >
          翻译
        </Button>
      </Flex>

      {jobs.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="当前没有翻译任务"
        />
      ) : (
        <div>
          <Space direction="vertical" size="small" style={{ display: "flex" }}>
            {visibleJobs.map((job) => (
              <div key={job.taskId}>
                <Flex justify="space-between" align="center">
                  <Text strong style={{ fontSize: 13 }}>
                    {job.source} → {job.target}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {job.statusLabel}
                    {job.stageSummary ? ` · ${job.stageSummary}` : ""}
                  </Text>
                </Flex>
                <Progress
                  percent={job.progressPercent ?? 0}
                  status={progressStatus(job)}
                  size="small"
                  strokeWidth={4}
                  style={{ marginBottom: 0 }}
                />
              </div>
            ))}
          </Space>
          {hasMoreJobs ? (
            <Button
              type="link"
              size="small"
              style={{ padding: "4px 0 0", height: "auto" }}
              onClick={() => setJobsExpanded((v) => !v)}
            >
              {jobsExpanded
                ? "收起"
                : `展开全部（${jobs.length}）`}
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
};

export default ExpressTranslateCard;
