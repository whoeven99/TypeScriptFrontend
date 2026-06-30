import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button } from "antd";
import { useTranslation } from "react-i18next";
import { message } from "~/ui/message";
import { useNavigate } from "@remix-run/react";
import {
  createTranslateV4Tasks,
  type ShopLocaleOption,
} from "~/lib/createTranslateV4Tasks";
import { notifyTranslationStatsUpdated } from "~/lib/translationStatsSync";
import { defaultManualV4Modules } from "~/server/translateV4/moduleCatalog";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import { isAutoV4TaskSource } from "~/server/translateV4/types";
import { localeRegionCode, localeShortName } from "~/routes/app.translate-v4/localeDisplay";
import { jobDisplayPercent } from "~/routes/app.translate-v4/jobStageUtils";
import { v4CardStyle, v4ChipStyle, v4Colors } from "~/routes/app.translate-v4/v4Styles";
import { AutoTaskBadge } from "~/routes/app.translate-v4/components/AutoTranslateMarkers";
import { selectShopTargetLocales } from "~/lib/shopTargetLocales";
import { JobCollapsedMeta } from "~/routes/app.translate-v4/components/JobExpandedDetail";
import { ProgressRing, StatusTag } from "~/routes/app.translate-v4/components/V4JobCardParts";
import {
  formatV4CreateTasksMessage,
  translateV4Message,
} from "~/routes/app.translate-v4/v4I18n";

type ExpressLocaleOption = ShopLocaleOption & { published?: boolean };

type Props = {
  shop: string;
  locales: ExpressLocaleOption[];
  primaryLocale: string;
  initialJobs: TranslationJobProgressSummary[];
  /** 本店是否已迁移到新版翻译（来自 ShopTranslationSettings.migratedToTsf）。 */
  migrated: boolean;
};

/** 极速翻译默认模块（与 v2 手动创建默认、api.translate-v4.tasks 一致）。 */
const DEFAULT_MODULES = defaultManualV4Modules();

/** 折叠时默认展示的任务条数 */
const COLLAPSED_JOB_COUNT = 3;

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 12, color: v4Colors.textMuted, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function ExpressJobRow({ job }: { job: TranslationJobProgressSummary }) {
  const percent = jobDisplayPercent(job);

  return (
    <div
      style={{
        ...v4CardStyle,
        padding: "12px 14px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <ProgressRing percent={percent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14, color: v4Colors.text }}>
              {job.source} → {job.target}
            </span>
            {isAutoV4TaskSource(job.taskSource) ? <AutoTaskBadge /> : null}
            <StatusTag status={job.status} label={job.statusLabel} />
          </div>
          <JobCollapsedMeta job={job} />
        </div>
      </div>
    </div>
  );
}

const ExpressTranslateCard = ({
  shop,
  locales,
  primaryLocale,
  initialJobs,
  migrated,
}: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<TranslationJobProgressSummary[]>(initialJobs);
  const [targets, setTargets] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [migratedState, setMigratedState] = useState(migrated);
  const [migrating, setMigrating] = useState(false);
  const [jobsExpanded, setJobsExpanded] = useState(false);

  const source = primaryLocale || "zh-CN";
  const sourceLabel =
    locales.find((l) => l.value === source)?.label ?? source;
  const targetOptions = useMemo<ShopLocaleOption[]>(
    () => selectShopTargetLocales(locales, source),
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

  const jobStatusRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const map = new Map<string, string>();
    for (const j of initialJobs) map.set(j.taskId, j.status);
    jobStatusRef.current = map;
  }, [initialJobs]);

  const applyJobsUpdate = useCallback((newJobs: TranslationJobProgressSummary[]) => {
    for (const j of newJobs) {
      const prev = jobStatusRef.current.get(j.taskId);
      if (j.status === "COMPLETED" && prev !== "COMPLETED") {
        notifyTranslationStatsUpdated({ target: j.target, source: j.source });
      }
      jobStatusRef.current.set(j.taskId, j.status);
    }
    setJobs(newJobs);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translate-v4/tasks?shopName=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();
      if (data?.ok) {
        applyJobsUpdate(data.jobs as TranslationJobProgressSummary[]);
      }
    } catch (err) {
      console.error("[expressV4] refresh list failed:", err);
    }
  }, [shop, applyJobsUpdate]);

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

  const toggleTarget = (value: string) => {
    if (targets.includes(value)) {
      setTargets(targets.filter((t) => t !== value));
    } else {
      setTargets([...targets, value]);
    }
  };

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const result = await createTranslateV4Tasks({
        source,
        targets,
        modules: DEFAULT_MODULES,
        aiModel: "gpt-4.1-nano",
        isCover: false,
        isHandle: false,
        targetOptions,
      });

      if (result.validationError) {
        message.warning(translateV4Message(result.validationError, t));
        return;
      }

      const summary = formatV4CreateTasksMessage(result, t, localeRegionCode);
      if (result.created.length > 0) {
        message.success(summary);
        setTargets([]);
        await refreshList();
      } else {
        message.error(summary);
      }
      if (result.failed.length > 0 && result.created.length > 0) {
        message.warning(
          result.failed
            .map((f) => `${localeRegionCode(f.target)}: ${translateV4Message(f.error, t)}`)
            .join("；"),
          6,
        );
      }
    } catch (err) {
      console.error("[expressV4] create failed:", err);
      message.error(t("v4.createFailedRetry"));
    } finally {
      setCreating(false);
    }
  }, [source, targets, targetOptions, refreshList, t]);

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  useEffect(() => {
    const timer = setInterval(() => {
      const hasActive = jobsRef.current.some((j) => !j.isTerminal);
      if (!hasActive) return;
      void refreshList();
    }, 3000);
    return () => clearInterval(timer);
  }, [refreshList]);

  return (
    <div style={{ ...v4CardStyle, padding: "20px 22px", width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: v4Colors.text }}>
          极速翻译
        </h2>
        <button
          type="button"
          onClick={() => navigate("/app/translate-v4")}
          style={{
            background: "none",
            border: "none",
            color: v4Colors.primary,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          更多设置 →
        </button>
      </div>

      {!migratedState ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 16, marginBottom: 0 }}
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

      <div style={{ marginTop: migratedState ? 20 : 16 }}>
        <SectionLabel>源语言</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={{ ...v4ChipStyle(true), cursor: "default" }}>
            <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>
              {localeRegionCode(source)}
            </span>
            {localeShortName(source, sourceLabel)}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionLabel>目标语言</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {targetOptions.map((opt) => {
            const selected = targets.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleTarget(opt.value)}
                style={v4ChipStyle(selected)}
              >
                <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>
                  {localeRegionCode(opt.value)}
                </span>
                {localeShortName(opt.value, opt.label)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={targets.length === 0 || creating}
          onClick={handleCreate}
          style={{
            borderRadius: 10,
            fontWeight: 700,
            height: 42,
            paddingInline: 24,
            fontSize: 14,
            border: "1px solid",
            transition: "all 0.15s",
            cursor:
              targets.length === 0 || creating ? "not-allowed" : "pointer",
            ...(targets.length > 0 && !creating
              ? {
                  background: v4Colors.primary,
                  borderColor: v4Colors.primary,
                  color: "#fff",
                }
              : {
                  background: "#f8fafc",
                  borderColor: "#e2e8f0",
                  color: "#64748b",
                }),
          }}
        >
          {creating ? "创建中…" : "开始翻译 →"}
        </button>
      </div>

      {jobs.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: v4Colors.text,
              }}
            >
              最近任务
            </span>
            {jobs.some((j) => !j.isTerminal) ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: v4Colors.textMuted,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: v4Colors.successSoft,
                    flexShrink: 0,
                  }}
                />
                实时同步
              </span>
            ) : null}
          </div>
          {visibleJobs.map((job) => (
            <ExpressJobRow key={job.taskId} job={job} />
          ))}
          {hasMoreJobs ? (
            <button
              type="button"
              onClick={() => setJobsExpanded((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: v4Colors.primary,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 0 0",
              }}
            >
              {jobsExpanded ? "收起" : `展开全部（${jobs.length}）`}
            </button>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            marginTop: 22,
            padding: "20px 16px",
            textAlign: "center",
            fontSize: 13,
            color: v4Colors.textMuted,
            borderRadius: 12,
            background: "#f8fafc",
            border: `1px dashed ${v4Colors.cardBorder}`,
          }}
        >
          当前没有翻译任务，选择目标语言后即可开始
        </div>
      )}
    </div>
  );
};

export default ExpressTranslateCard;
