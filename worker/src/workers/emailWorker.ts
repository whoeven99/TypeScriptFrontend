/**
 * emailWorker — 翻译完成通知邮件发送 worker。
 *
 * 每次运行：
 *  1. 找出 COMPLETED / PAUSED、未发邮件的任务。
 *     收件人邮箱在发信时通过 Shopify GraphQL 实时查询（不用 Session 快照）。
 *  2. 手动任务（taskSource ≠ TsFrontend-Auto）：等同店内所有进行中手动任务结束后，
 *     查询该店全部待发 manual 任务并汇总发一封（对齐自动翻译合并策略）。
 *  3. 自动任务（taskSource = TsFrontend-Auto）：等同店内所有进行中自动任务结束后，
 *     查询该店全部待发 auto 任务并汇总发一封（对齐 Spring TranslateTask.sendEmail）。
 *     usedTokens=0 的语言仍出现在手动成功邮件表格中；自动成功邮件仍跳过 usedTokens=0。
 *     手动 PAUSED（有进度）与 COMPLETED 合并入 210764，Status 列区分 Completed / Partially Completed。
 *     进度 0% 的 PAUSED 不发信（如扫描后额度为 0），仍 mark emailSent。
 *  4. 发送成功后将 emailSent=true 写回 Cosmos，防止重发。
 *
 * 任务类型对应模板（对齐 Spring TencentEmailService）：
 *   manual + COMPLETED/PAUSED（有进度）→ 210764 手动翻译汇总（同店多语言合并，Status 列区分 Completed / Partially Completed）
 *   auto   + COMPLETED → 140352 自动翻译成功（同店多语言合并）
 *   auto   + PAUSED → 159297 翻译部分完成（额度不足）
 */

import type { TranslationV4Job } from "../services/cosmosV4.js";
import {
  ACTIVE_V4_STATUSES,
  findAutoJobsNeedingEmailForShop,
  findManualJobsNeedingEmailForShop,
  findRecentManualJobsForShop,
  findShopsWithPendingAutoEmail,
  findShopsWithPendingManualEmail,
  hasActiveAutoJobsForShop,
  hasActiveManualJobsForShop,
  updateJob,
} from "../services/cosmosV4.js";
import {
  releaseEmailSendLock,
  tryAcquireEmailSendLock,
} from "../services/redisV4.js";
import { fetchShopContact } from "../services/shopEmail.js";
import {
  sendManualTranslationSuccessEmail,
  sendAutoTranslationSuccessEmail,
  sendTranslationPartialEmail,
  hasPartialEmailProgress,
  maskEmail,
  type TranslationJobSummary,
} from "../services/workerEmail.js";

const LOG = "[emailWorker]";

/** 近期同店手动任务视为一批的窗口（默认 15 分钟）。 */
const MANUAL_EMAIL_COHORT_MS = (() => {
  const n = Number(process.env.MANUAL_EMAIL_COHORT_MS);
  return Number.isFinite(n) && n > 0 ? n : 15 * 60_000;
})();

/** 批次内最后一个任务终态后，再等待一段时间聚合发信（默认 90 秒）。 */
const MANUAL_EMAIL_SETTLE_MS = (() => {
  const n = Number(process.env.MANUAL_EMAIL_SETTLE_MS);
  return Number.isFinite(n) && n >= 0 ? n : 90_000;
})();

function isActiveV4Status(status: TranslationV4Job["status"]): boolean {
  return ACTIVE_V4_STATUSES.includes(status);
}

async function shouldDeferManualEmailBatch(
  shopName: string,
  pendingJobs: TranslationV4Job[],
): Promise<{ defer: boolean; reason?: string; detail?: Record<string, unknown> }> {
  const cohort = await findRecentManualJobsForShop(shopName, MANUAL_EMAIL_COHORT_MS);
  const activeInCohort = cohort.filter((job) => isActiveV4Status(job.status));
  if (activeInCohort.length > 0) {
    return {
      defer: true,
      reason: "cohort_has_active_jobs",
      detail: {
        cohortSize: cohort.length,
        activeCount: activeInCohort.length,
        activeTargets: activeInCohort.map((j) => j.target),
      },
    };
  }

  if (cohort.length <= 1 && pendingJobs.length <= 1) {
    return { defer: false };
  }

  if (MANUAL_EMAIL_SETTLE_MS > 0) {
    const terminalJobs = cohort.filter((job) => !isActiveV4Status(job.status));
    const lastTerminalAt = Math.max(
      ...terminalJobs.map((job) => new Date(job.updatedAt).getTime()),
      0,
    );
    const elapsed = Date.now() - lastTerminalAt;
    if (elapsed < MANUAL_EMAIL_SETTLE_MS) {
      return {
        defer: true,
        reason: "batch_settle_wait",
        detail: {
          cohortSize: cohort.length,
          pendingCount: pendingJobs.length,
          settleMs: MANUAL_EMAIL_SETTLE_MS,
          remainingMs: MANUAL_EMAIL_SETTLE_MS - elapsed,
        },
      };
    }
  }

  return { defer: false };
}

function logDetail(phase: string, payload: Record<string, unknown>): void {
  console.info(`${LOG} ${phase} ${JSON.stringify(payload)}`);
}

function describeJob(job: TranslationV4Job): Record<string, unknown> {
  return {
    id: job.id,
    shop: job.shopName,
    taskSource: job.taskSource ?? null,
    status: job.status,
    target: job.target,
    emailSent: job.emailSent ?? false,
    usedTokens: job.metrics.usedTokens ?? 0,
    translateDone: job.metrics.translateDone,
    translateTotal: job.metrics.translateTotal,
  };
}

/** 从任务的 stageTimings / createdAt / updatedAt 估算完成耗时（分钟）。 */
function calcElapsedMinutes(job: TranslationV4Job): number {
  const start = job.stageTimings?.INIT?.startedAt ?? job.createdAt;
  const end =
    job.stageTimings?.VERIFY?.endedAt ??
    job.stageTimings?.WRITEBACK?.endedAt ??
    job.updatedAt;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 60_000));
}

/** 从任务 metrics 计算翻译完成百分比（PAUSED 时用）。 */
function calcCompletionPercent(job: TranslationV4Job): number {
  const { translateTotal, translateDone } = job.metrics;
  if (!translateTotal || translateTotal <= 0) return 0;
  return Math.min(100, (translateDone / translateTotal) * 100);
}

function toJobSummary(job: TranslationV4Job): TranslationJobSummary {
  const terminalStatus: TranslationJobSummary["terminalStatus"] =
    job.status === "PAUSED" ? "PAUSED" : "COMPLETED";
  return {
    target: job.target,
    usedTokens: job.metrics.usedTokens ?? 0,
    translateDone: job.metrics.translateDone ?? 0,
    elapsedMinutes: calcElapsedMinutes(job),
    completionPercent: calcCompletionPercent(job),
    terminalStatus,
  };
}

async function markEmailSentBatch(jobs: TranslationV4Job[]): Promise<void> {
  for (const job of jobs) {
    await markEmailSent(job);
  }
}

/** 去掉 .myshopify.com 后缀，得到可读店名（firstName 不可用时的兜底）。 */
function parseShopName(shopName: string): string {
  return shopName.replace(/\.myshopify\.com$/, "");
}

export type RecipientContact = {
  email: string;
  userName: string;
};

/** 发信前从 Shopify GraphQL 拉取收件人与称呼。 */
async function resolveRecipientContact(
  job: TranslationV4Job,
): Promise<RecipientContact | null> {
  logDetail("resolve-recipient-start", {
    jobId: job.id,
    shop: job.shopName,
  });
  const contact = await fetchShopContact(job.shopName);
  const email = contact.email;
  const userName = contact.firstName?.trim() || parseShopName(job.shopName);
  logDetail("resolve-recipient-done", {
    jobId: job.id,
    shop: job.shopName,
    email: email ? maskEmail(email) : null,
    userName,
    firstNameSource: contact.firstName ? "shopify_api" : "shop_prefix_fallback",
    found: Boolean(email),
  });
  if (!email) return null;
  return { email, userName };
}

/** 标记 emailSent=true，使用 etag 防止并发写冲突，失败静默（不影响主流程）。 */
async function markEmailSent(job: TranslationV4Job): Promise<void> {
  try {
    await updateJob(job.shopName, job.id, { emailSent: true });
    logDetail("mark-email-sent-ok", { jobId: job.id, shop: job.shopName });
  } catch (e) {
    console.warn(`${LOG} markEmailSent failed job=${job.id}`, e);
  }
}

/** 处理同一店铺的手动翻译邮件：整店任务都终态后汇总发一封。 */
async function handleManualJobGroup(shopName: string): Promise<void> {
  const hasActive = await hasActiveManualJobsForShop(shopName);
  if (hasActive) {
    logDetail("handle-manual-skipped", {
      reason: "active_manual_jobs_still_running",
      shop: shopName,
    });
    return;
  }

  const jobs = await findManualJobsNeedingEmailForShop(shopName);
  if (jobs.length === 0) {
    return;
  }

  const defer = await shouldDeferManualEmailBatch(shopName, jobs);
  if (defer.defer) {
    logDetail("handle-manual-skipped", {
      reason: defer.reason,
      shop: shopName,
      jobIds: jobs.map((j) => j.id),
      targets: jobs.map((j) => j.target),
      ...defer.detail,
    });
    return;
  }

  const lockAcquired = await tryAcquireEmailSendLock(shopName, "manual");
  if (!lockAcquired) {
    logDetail("handle-manual-skipped", {
      reason: "email_send_lock_busy",
      shop: shopName,
      jobIds: jobs.map((j) => j.id),
    });
    return;
  }

  try {
    logDetail("handle-manual-start", {
      shop: shopName,
      jobCount: jobs.length,
      jobs: jobs.map(describeJob),
    });

    const recipient = await resolveRecipientContact(jobs[0]);
    if (!recipient) {
      logDetail("handle-manual-skipped", {
        reason: "no_shop_email",
        shop: shopName,
        jobIds: jobs.map((j) => j.id),
      });
      return;
    }
    const { email: to, userName } = recipient;
    const completedJobs = jobs.filter((j) => j.status === "COMPLETED");
    const pausedJobs = jobs.filter((j) => j.status === "PAUSED");
    const pausedWithProgressJobs = pausedJobs.filter((j) =>
      hasPartialEmailProgress(toJobSummary(j)),
    );
    const pausedZeroProgress = pausedJobs.filter(
      (j) => !hasPartialEmailProgress(toJobSummary(j)),
    );
    const jobsToEmail: TranslationJobSummary[] = [
      ...completedJobs.map(toJobSummary),
      ...pausedWithProgressJobs.map(toJobSummary),
    ];

    logDetail("handle-manual-split", {
      shop: shopName,
      to: maskEmail(to),
      completedCount: completedJobs.length,
      pausedCount: pausedJobs.length,
      pausedWithProgressCount: pausedWithProgressJobs.length,
      pausedZeroProgressCount: pausedZeroProgress.length,
      completedTargets: completedJobs.map((j) => j.target),
      pausedTargets: pausedJobs.map((j) => j.target),
      emailedTargets: jobsToEmail.map((j) => j.target),
    });

    if (jobsToEmail.length === 0) {
      if (pausedZeroProgress.length > 0) {
        logDetail("handle-manual-skipped", {
          reason: "all_zero_progress",
          shop: shopName,
          jobIds: pausedZeroProgress.map((j) => j.id),
          targets: pausedZeroProgress.map((j) => j.target),
        });
        await markEmailSentBatch(pausedZeroProgress);
      }
      return;
    }

    const sent = await sendManualTranslationSuccessEmail(
      shopName,
      to,
      userName,
      jobsToEmail,
    );
    logDetail("handle-manual-send-result", {
      shop: shopName,
      to: maskEmail(to),
      sent,
      jobIds: [...completedJobs, ...pausedWithProgressJobs].map((j) => j.id),
      targets: jobsToEmail.map((j) => j.target),
    });
    if (sent) {
      await markEmailSentBatch([...completedJobs, ...pausedJobs]);
      logDetail("handle-manual-done", {
        shop: shopName,
        langs: jobsToEmail.map((j) => j.target),
        markedJobIds: [...completedJobs, ...pausedJobs].map((j) => j.id),
      });
    }
  } finally {
    await releaseEmailSendLock(shopName, "manual");
  }
}

/** 处理同一店铺的自动翻译邮件：整店任务都终态后汇总发一封。 */
async function handleAutoJobGroup(shopName: string): Promise<void> {
  // 等所有进行中的自动任务结束后再发（对齐 Java 按店汇总逻辑）
  const hasActive = await hasActiveAutoJobsForShop(shopName);
  if (hasActive) {
    logDetail("handle-auto-skipped", {
      reason: "active_auto_jobs_still_running",
      shop: shopName,
    });
    return;
  }

  const jobs = await findAutoJobsNeedingEmailForShop(shopName);
  if (jobs.length === 0) {
    return;
  }

  const lockAcquired = await tryAcquireEmailSendLock(shopName, "auto");
  if (!lockAcquired) {
    logDetail("handle-auto-skipped", {
      reason: "email_send_lock_busy",
      shop: shopName,
      jobIds: jobs.map((j) => j.id),
    });
    return;
  }

  try {
    logDetail("handle-auto-start", {
    shop: shopName,
    jobCount: jobs.length,
    jobs: jobs.map(describeJob),
  });

  const recipient = await resolveRecipientContact(jobs[0]);
  if (!recipient) {
    logDetail("handle-auto-skipped", {
      reason: "no_shop_email",
      shop: shopName,
      jobIds: jobs.map((j) => j.id),
    });
    return;
  }
  const { email: to, userName } = recipient;
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");
  const pausedJobs = jobs.filter((j) => j.status === "PAUSED");
  logDetail("handle-auto-split", {
    shop: shopName,
    to: maskEmail(to),
    completedCount: completedJobs.length,
    pausedCount: pausedJobs.length,
    completedTargets: completedJobs.map((j) => j.target),
    pausedTargets: pausedJobs.map((j) => j.target),
  });

  // 成功任务：发汇总成功邮件（140352）
  if (completedJobs.length > 0) {
    const sent = await sendAutoTranslationSuccessEmail(
      shopName,
      to,
      userName,
      completedJobs.map(toJobSummary),
    );
    logDetail("handle-auto-success-send-result", {
      shop: shopName,
      to: maskEmail(to),
      sent,
      jobIds: completedJobs.map((j) => j.id),
      targets: completedJobs.map((j) => j.target),
    });
    if (sent) {
      for (const job of completedJobs) {
        await markEmailSent(job);
      }
      logDetail("handle-auto-success-done", {
        shop: shopName,
        langs: completedJobs.map((j) => j.target),
        markedJobIds: completedJobs.map((j) => j.id),
      });
    }
  }

  // 暂停任务：发部分完成邮件（159297）；进度 0% 不发信，避免扫描后额度为 0 的误通知
  if (pausedJobs.length > 0) {
    const pausedSummaries = pausedJobs.map(toJobSummary);
    const pausedWithProgress = pausedSummaries.filter(hasPartialEmailProgress);
    if (pausedWithProgress.length === 0) {
      logDetail("handle-auto-partial-skipped", {
        reason: "all_zero_progress",
        shop: shopName,
        jobIds: pausedJobs.map((j) => j.id),
        targets: pausedJobs.map((j) => j.target),
      });
      await markEmailSentBatch(pausedJobs);
      return;
    }

    const sent = await sendTranslationPartialEmail(
      shopName,
      to,
      userName,
      "auto translation",
      pausedWithProgress,
    );
    logDetail("handle-auto-partial-send-result", {
      shop: shopName,
      to: maskEmail(to),
      sent,
      jobIds: pausedJobs.map((j) => j.id),
      targets: pausedJobs.map((j) => j.target),
      emailedTargets: pausedWithProgress.map((j) => j.target),
    });
    if (sent) {
      await markEmailSentBatch(pausedJobs);
      logDetail("handle-auto-partial-done", {
        shop: shopName,
        langs: pausedWithProgress.map((j) => j.target),
        markedJobIds: pausedJobs.map((j) => j.id),
      });
    }
  }
  } finally {
    await releaseEmailSendLock(shopName, "auto");
  }
}

export async function runEmailWorker(): Promise<void> {
  const startedAt = Date.now();
  const [manualShops, autoShops] = await Promise.all([
    findShopsWithPendingManualEmail(),
    findShopsWithPendingAutoEmail(),
  ]);

  if (manualShops.length === 0 && autoShops.length === 0) {
    return;
  }

  logDetail("run-start", {
    manualShopCount: manualShops.length,
    autoShopCount: autoShops.length,
    manualShops,
    autoShops,
  });

  for (const shopName of manualShops) {
    await handleManualJobGroup(shopName).catch((e) => {
      logDetail("handle-manual-error", {
        shop: shopName,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
      console.error(`${LOG} handleManualJobGroup error shop=${shopName}`, e);
    });
  }

  for (const shopName of autoShops) {
    await handleAutoJobGroup(shopName).catch((e) => {
      logDetail("handle-auto-error", {
        shop: shopName,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
      console.error(`${LOG} handleAutoJobGroup error shop=${shopName}`, e);
    });
  }

  logDetail("run-done", {
    manualShopCount: manualShops.length,
    autoShopCount: autoShops.length,
    elapsedMs: Date.now() - startedAt,
  });
}
