import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  getV4Job,
  updateV4Job,
  deleteV4Job,
} from "~/server/translateV4/cosmos.server";
import { deleteV4JobBlobs } from "~/server/translateV4/blob.server";
import { resolveOfflineAccessToken } from "~/server/translateV4/token.server";
import {
  getTranslateV4RedisClient,
  V4_HINT_KEYS,
  setV4Control,
  setV4PausePending,
  clearV4Control,
  clearV4PausePending,
  clearV4TaskRedis,
  v4ControlKey,
  v4ProgressKey,
} from "~/server/translateV4/redis.server";
import {
  resolveResumeV4JobStatus,
  stageFromStatus,
} from "~/server/translateV4/resumeStatus";
import { canPauseV4Job } from "~/server/translateV4/types";

/** POST /api/translate-v4/task-action —— pause / resume / cancel 一个 TsFrontend 任务。 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as {
    taskId?: string;
    shopName?: string;
    action?: string;
  };

  const taskId = body.taskId?.trim() || "";
  const shopName = body.shopName?.trim() || session.shop;
  const actionType = body.action?.trim();

  if (!taskId) return json({ ok: false, error: "taskId required" }, { status: 400 });

  const job = await getV4Job(shopName, taskId);
  if (!job) return json({ ok: false, error: "task not found" }, { status: 404 });

  if (actionType === "delete") {
    // 安全：只允许删本店的任务
    if (job.shopName !== session.shop) {
      return json({ ok: false, error: "无权删除" }, { status: 403 });
    }
    // 只删终态/已暂停的任务，避免删正在处理中的（worker 还在写它）
    const deletable = new Set(["COMPLETED", "FAILED", "CANCELLED", "PAUSED"]);
    if (!deletable.has(job.status)) {
      return json({ ok: false, error: "任务进行中，请先取消再删除" }, { status: 400 });
    }
    // 清 Blob（内容 chunk）+ Cosmos（任务文档）+ Redis（进度/控制键）
    await deleteV4JobBlobs(job.blobPrefix);
    await deleteV4Job(job.shopName, taskId);
    await clearV4TaskRedis(taskId);
    return json({ ok: true, deleted: true });
  }

  if (actionType === "cancel") {
    // 翻译执行中取消：设控制信号，worker 等在飞 LLM 收尾后直接 CANCELLED（不写回）。
    if (job.status === "TRANSLATING") {
      await setV4Control(taskId, "cancel");
      await setV4PausePending(taskId, "已取消");
      return json({ ok: true, pending: true });
    }
    await updateV4Job(shopName, taskId, { status: "CANCELLED", claimedBy: null });
    await setV4Control(taskId, "cancel");
    return json({ ok: true, status: "CANCELLED" });
  }

  if (actionType === "pause") {
    if (!canPauseV4Job(job.status)) {
      return json({ ok: false, error: "仅翻译阶段可暂停" }, { status: 400 });
    }
    // 翻译执行中暂停：不乐观置 PAUSED，worker 等在飞 LLM 收尾后直接 PAUSED（不写回）。
    if (job.status === "TRANSLATING") {
      await setV4Control(taskId, "pause");
      await setV4PausePending(taskId, "已手动暂停");
      return json({ ok: true, pending: true });
    }
    // 排队未运行(TRANSLATE_QUEUED)：没有在飞内容，直接置 PAUSED。
    await updateV4Job(shopName, taskId, {
      status: "PAUSED",
      claimedBy: null,
      errorStage: stageFromStatus(job.status),
    });
    await setV4Control(taskId, "pause");
    return json({ ok: true, status: "PAUSED" });
  }

  if (actionType === "resume") {
    if (job.status !== "PAUSED" && job.status !== "FAILED") {
      return json(
        { ok: false, error: `cannot resume from status ${job.status}` },
        { status: 400 },
      );
    }

    try {
      const redis = getTranslateV4RedisClient();
      const [pausePending, controlRaw] = await Promise.all([
        redis.hget(v4ProgressKey(taskId), "pausePending"),
        redis.get(v4ControlKey(taskId)),
      ]);
      if (
        pausePending === "1" ||
        controlRaw === "pause" ||
        controlRaw === "cancel"
      ) {
        return json(
          { ok: false, error: "任务仍在收尾，请稍后再继续" },
          { status: 409 },
        );
      }
    } catch {
      // non-fatal — Cosmos 状态已是 PAUSED 时通常可继续
    }

    const resumeStatus = resolveResumeV4JobStatus(
      job.status,
      job.errorStage,
      job.metrics,
    );
    if (!resumeStatus) {
      return json(
        { ok: false, error: `cannot resume from status ${job.status}` },
        { status: 400 },
      );
    }

    // 续跑前刷新 offline token（worker 写回用）
    const freshToken =
      (await resolveOfflineAccessToken(shopName, session.accessToken)) ??
      job.shopifyAccessToken;

    await updateV4Job(shopName, taskId, {
      status: resumeStatus,
      claimedBy: null,
      errorMessage: null,
      errorStage: null,
      shopifyAccessToken: freshToken,
    });
    await clearV4Control(taskId); // 清除暂停/取消键，避免 resume 后立即再次中断
    await clearV4PausePending(taskId); // 清掉「额度不足/暂停待落盘」标记，避免续跑后仍显示旧提示

    // 推 hint 让 worker 立即拾取
    const hintStage = resumeStatus.replace("_QUEUED", "").toLowerCase();
    const hintKey = (V4_HINT_KEYS as Record<string, string>)[hintStage];
    if (hintKey) {
      try {
        await getTranslateV4RedisClient().lpush(
          hintKey,
          JSON.stringify({ taskId, shopName }),
        );
      } catch {
        // non-fatal
      }
    }
    return json({ ok: true, status: resumeStatus });
  }

  return json({ ok: false, error: "unknown action" }, { status: 400 });
};
