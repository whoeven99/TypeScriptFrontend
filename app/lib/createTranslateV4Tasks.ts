import { localeRegionCode } from "~/routes/app.translate-v4/localeDisplay";

export type ShopLocaleOption = {
  value: string;
  label: string;
};

export type CreateTranslateV4TasksParams = {
  source: string;
  targets: string[];
  modules: string[];
  aiModel: string;
  isCover: boolean;
  isHandle: boolean;
  targetOptions: ShopLocaleOption[];
  fetchFn?: typeof fetch;
  apiUrl?: string;
};

export type CreateTranslateV4TasksResult = {
  created: { target: string; jobId: string }[];
  failed: { target: string; error: string }[];
  validationError?: string;
};

function localeKey(value: string): string {
  return value.trim();
}

export function normalizeTargetLocales(
  input: string[] | undefined,
  targetOptions: ShopLocaleOption[],
  sourceLocale: string,
): string[] {
  const allowed = new Set(targetOptions.map((o) => o.value));
  const source = localeKey(sourceLocale);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of input ?? []) {
    const key = localeKey(item);
    if (!key || key === source || !allowed.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

export function validateTargetLocales(
  locales: string[],
  sourceLocale: string,
): { ok: true } | { ok: false; message: string } {
  const source = localeKey(sourceLocale);
  if (!locales.length) {
    return { ok: false, message: "v4.validation.selectTarget" };
  }
  if (locales.some((l) => localeKey(l) === source)) {
    return { ok: false, message: "v4.validation.sameAsSource" };
  }
  return { ok: true };
}

async function createOneTask(
  fetchFn: typeof fetch,
  url: string,
  body: Record<string, unknown>,
  target: string,
): Promise<{ target: string; jobId?: string; error?: string }> {
  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      jobId?: string;
      error?: string;
    };
    if (!response.ok || payload.ok === false) {
      return { target, error: payload.error || `HTTP ${response.status}` };
    }
    if (!payload.jobId) {
      return { target, error: "v4.create.missingJobId" };
    }
    return { target, jobId: payload.jobId };
  } catch {
    return { target, error: "v4.create.networkError" };
  }
}

/** 为每个目标语言各创建一个 v4 翻译任务（多次 POST，每个任务独立 jobId）。 */
export async function createTranslateV4Tasks(
  params: CreateTranslateV4TasksParams,
): Promise<CreateTranslateV4TasksResult> {
  const fetchFn = params.fetchFn ?? fetch;
  const source = params.source.trim();
  const targets = normalizeTargetLocales(params.targets, params.targetOptions, source);
  const validation = validateTargetLocales(targets, source);
  if (!validation.ok) {
    return { created: [], failed: [], validationError: validation.message };
  }

  const url = params.apiUrl ?? "/api/translate-v4/tasks";
  const baseBody = {
    source,
    modules: params.modules,
    aiModel: params.aiModel,
    isCover: params.isCover,
    isHandle: params.isHandle,
  };

  const settled = await Promise.allSettled(
    targets.map((target) =>
      createOneTask(fetchFn, url, { ...baseBody, target }, target),
    ),
  );

  const created: { target: string; jobId: string }[] = [];
  const failed: { target: string; error: string }[] = [];

  for (const entry of settled) {
    if (entry.status === "rejected") continue;
    const r = entry.value;
    if (r.jobId) created.push({ target: r.target, jobId: r.jobId });
    else failed.push({ target: r.target, error: r.error ?? "v4.create.unknownError" });
  }

  return { created, failed };
}

export function formatCreateTasksMessage(result: CreateTranslateV4TasksResult): string {
  if (result.validationError) return result.validationError;
  if (result.created.length === 0) {
    const first = result.failed[0];
    if (!first) return "创建失败";
    return `${localeRegionCode(first.target)}: ${first.error}`;
  }
  if (result.failed.length === 0) {
    return result.created.length === 1
      ? "任务已创建，worker 即将开始处理"
      : `已创建 ${result.created.length} 个翻译任务`;
  }
  return `已创建 ${result.created.length} 个，失败 ${result.failed.length} 个`;
}
