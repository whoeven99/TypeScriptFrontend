/**
 * 店铺画像扫描的 LLM 调用（低频、非流式、JSON 输出）。
 *
 * 默认走 DeepSeek（deepseek-v4-pro），与翻译 worker 共用：
 *   DEEPSEEK_API_KEY / DEEPSEEK_API_KEYS / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL
 *
 * 可选走 Azure OpenAI（模型名 gpt-* 且已配置 Gpt_ApiKey）：
 *   Gpt_ApiKey / Gpt_Endpoint / Gpt_ApiVersion / Gpt_Model
 *
 * 模型优先级：SHOP_SCAN_AI_MODEL > DEEPSEEK_MODEL > deepseek-v4-pro
 */

const GPT_ENDPOINT = (
  process.env.Gpt_Endpoint?.trim() || "https://eastus.api.cognitive.microsoft.com"
).replace(/\/+$/, "");
const GPT_API_VERSION = process.env.Gpt_ApiVersion?.trim() || "2024-10-21";

export const SHOP_SCAN_AI_MODEL =
  process.env.SHOP_SCAN_AI_MODEL?.trim() ||
  process.env.DEEPSEEK_MODEL?.trim() ||
  "deepseek-v4-pro";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function deepseekKeys(): string[] {
  const multi = process.env.DEEPSEEK_API_KEYS?.trim();
  const single = process.env.DEEPSEEK_API_KEY?.trim();
  if (multi) return multi.split(",").map((k) => k.trim()).filter(Boolean);
  return single ? [single] : [];
}

function gptApiKey(): string | null {
  return process.env.Gpt_ApiKey?.trim() || null;
}

function isGptModel(model: string): boolean {
  return /^gpt[-.]/i.test(model.trim());
}

function resolveDeepSeekChatCompletionsUrl(baseURL: string): string {
  const base = baseURL.trim().replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

export function shopScanAiConfigured(): boolean {
  return deepseekKeys().length > 0 || Boolean(gptApiKey());
}

/**
 * 非流式调用 LLM，强制 JSON 输出，带 429 退避重试。
 * 返回解析后的 JSON 对象与原始文本（原始文本供落 Blob 复盘）。
 */
export async function shopScanChatJson<T = unknown>(
  messages: ChatMessage[],
  model: string = SHOP_SCAN_AI_MODEL,
): Promise<{ parsed: T | null; raw: string; tokens: number }> {
  if (isGptModel(model) && gptApiKey()) {
    return callAzureOpenAiJson<T>(messages, model);
  }
  return callDeepSeekChatJson<T>(messages, model);
}

async function callDeepSeekChatJson<T>(
  messages: ChatMessage[],
  model: string,
): Promise<{ parsed: T | null; raw: string; tokens: number }> {
  const keys = deepseekKeys();
  if (keys.length === 0) throw new Error("DeepSeek API key 未配置");
  const apiKey = keys[0]!;
  const baseURL = process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
  const chatUrl = resolveDeepSeekChatCompletionsUrl(baseURL);

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429) {
        const retryAfter = Number(resp.headers.get("Retry-After") ?? "5");
        await sleep(Math.max(retryAfter * 1000, 2_000));
        continue;
      }
      if (!resp.ok) throw new Error(`DeepSeek HTTP ${resp.status}: ${await resp.text()}`);
      const j = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
        usage?: { total_tokens?: number };
      };
      const raw = j.choices?.[0]?.message?.content ?? "";
      const tokens = j.usage?.total_tokens ?? 0;
      return { parsed: safeParse<T>(raw), raw, tokens };
    } catch (e) {
      lastErr = e;
      await sleep(1_000 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function callAzureOpenAiJson<T>(
  messages: ChatMessage[],
  model: string,
): Promise<{ parsed: T | null; raw: string; tokens: number }> {
  const key = gptApiKey();
  if (!key) throw new Error("Gpt_ApiKey 未配置");
  const url = `${GPT_ENDPOINT}/openai/deployments/${encodeURIComponent(
    model,
  )}/chat/completions?api-version=${GPT_API_VERSION}`;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": key },
        body: JSON.stringify({
          messages,
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429) {
        const retryAfter = Number(resp.headers.get("Retry-After") ?? "5");
        await sleep(Math.max(retryAfter * 1000, 2_000));
        continue;
      }
      if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}: ${await resp.text()}`);
      const j = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
        usage?: { total_tokens?: number };
      };
      const raw = j.choices?.[0]?.message?.content ?? "";
      const tokens = j.usage?.total_tokens ?? 0;
      return { parsed: safeParse<T>(raw), raw, tokens };
    } catch (e) {
      lastErr = e;
      await sleep(1_000 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
