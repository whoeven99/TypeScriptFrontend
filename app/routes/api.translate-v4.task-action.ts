import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getV4Job, updateV4Job } from "~/server/translateV4/cosmos.server";
import { resolveOfflineAccessToken } from "~/server/translateV4/token.server";
import {
  getTranslateV4RedisClient,
  V4_HINT_KEYS,
  setV4Control,
  clearV4Control,
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

  if (actionType === "cancel") {
    // 翻译执行中取消：不乐观置 CANCELLED（终态会让前端停止轮询、却看不到「正在写入」
    // 过程）。仅设控制信号，由 worker 把已翻译的先写回再落 CANCELLED。
    if (job.status === "TRANSLATING") {
      await setV4Control(taskId, "cancel");
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
    // 翻译执行中暂停：不乐观置 PAUSED，交给 worker 先把已翻译的写回再落 PAUSED，
    // 状态单调推进，避免 PAUSED 闪现导致「继续」按钮提前出现又消失。仅设控制信号。
    if (job.status === "TRANSLATING") {
      await setV4Control(taskId, "pause");
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
