/**
 * 店铺画像扫描的 Azure OpenAI 调用（自包含，复用与 llmTranslate 相同的 GPT 环境变量）。
 *
 *   Gpt_ApiKey / Gpt_Endpoint / Gpt_ApiVersion / Gpt_Model
 *
 * 刻意与翻译引擎解耦：画像/术语总结是低频、非流式、JSON 输出的一次性调用。
 */

const GPT_ENDPOINT = (
  process.env.Gpt_Endpoint?.trim() || "https://eastus.api.cognitive.microsoft.com"
).replace(/\/+$/, "");
const GPT_API_VERSION = process.env.Gpt_ApiVersion?.trim() || "2024-10-21";
export const SHOP_SCAN_AI_MODEL = process.env.Gpt_Model?.trim() || "gpt-4.1-nano";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function shopScanAiConfigured(): boolean {
  return Boolean(process.env.Gpt_ApiKey?.trim());
}

/**
 * 非流式调用 Azure OpenAI，强制 JSON 输出，带 429 退避重试。
 * 返回解析后的 JSON 对象与原始文本（原始文本供落 Blob 复盘）。
 */
export async function shopScanChatJson<T = unknown>(
  messages: ChatMessage[],
  model: string = SHOP_SCAN_AI_MODEL,
): Promise<{ parsed: T | null; raw: string; tokens: number }> {
  const key = process.env.Gpt_ApiKey?.trim();
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
    // 容错：截取第一个 { 到最后一个 }
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
