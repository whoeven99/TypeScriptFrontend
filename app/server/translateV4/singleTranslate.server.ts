import prisma from "~/db.server";

/**
 * 单字段手动翻译(交互式,同步)。读 TSF 术语表拼系统提示词、调 DeepSeek、扣额度。
 * 系统提示词与 worker buildSystemPrompt 对齐,保证手动翻译和批量/自动翻译质量一致。
 */

/** 与 worker tsfDb.loadGlossaryRowsFromTsf 同口径:status=1 且 rangeCode=target/ALL。 */
async function loadGlossaryPromptLines(shop: string, target: string): Promise<string[]> {
  try {
    const rows = await prisma.glossary.findMany({
      where: {
        shop,
        status: 1,
        OR: [{ rangeCode: target }, { rangeCode: "ALL" }, { rangeCode: null }],
      },
    });
    return rows
      .filter((r) => r.sourceText && r.targetText)
      .map((r) => `- Translate "${r.sourceText}" as "${r.targetText}".`)
      .filter((line, i, arr) => arr.indexOf(line) === i)
      .sort();
  } catch (err) {
    console.error(`[single] 读术语表失败 shop=${shop}:`, err);
    return [];
  }
}

/** 与 worker buildSystemPrompt 对齐(JSON 数组进、JSON 出)。 */
function buildSystemPrompt(target: string, glossaryLines: string[]): string {
  const glossaryBlock = glossaryLines.length
    ? `\nGlossary (apply consistently):\n${glossaryLines.join("\n")}\n`
    : "";
  return `You are a professional e-commerce translator.
Detect the input language automatically and translate the content into "${target}".
Rules:
- Be accurate and natural for e-commerce
- Translate ALL content into "${target}", no matter what language the input is in (English, Chinese, Spanish, etc.)
- If a value is already entirely in "${target}", return it unchanged
- Keep any ⟦number⟧ tokens exactly as they appear; never translate, modify, reorder, or drop them
- Output literal characters; do NOT HTML-escape. Use ' and " directly — never &#39; or &quot;
- Do NOT add or remove leading or trailing whitespace
- If the value is empty, return it unchanged
- You MUST return an entry for every key in the input
${glossaryBlock}
The user message is a JSON array of {"key","value"} objects to translate.
Return ONLY a JSON object {"translations":[{"key":"<key>","translatedValue":"<text>"}]}, no markdown.`;
}

function deepSeekChatUrl(): string {
  const base = (process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com").replace(
    /\/+$/,
    "",
  );
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
}

type SingleResult = { translatedText: string; usedTokens: number };

export async function translateSingleText(args: {
  shop: string;
  target: string;
  text: string;
}): Promise<SingleResult> {
  const text = args.text ?? "";
  if (!text.trim()) return { translatedText: text, usedTokens: 0 };

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY 未配置");
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

  const glossaryLines = await loadGlossaryPromptLines(args.shop, args.target);
  const systemPrompt = buildSystemPrompt(args.target, glossaryLines);
  const userPayload = JSON.stringify([{ key: "f0", value: text }]);

  const resp = await fetch(deepSeekChatUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    throw new Error(`DeepSeek ${resp.status}: ${await resp.text().catch(() => "")}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const usedTokens = data.usage?.total_tokens ?? 0;

  let translatedText = text;
  try {
    const parsed = JSON.parse(content) as {
      translations?: { key: string; translatedValue: string }[];
    };
    const hit = parsed.translations?.find((t) => t.key === "f0") ?? parsed.translations?.[0];
    if (hit && typeof hit.translatedValue === "string") translatedText = hit.translatedValue;
  } catch {
    // 解析失败:退回原文,避免写坏数据
    translatedText = text;
  }

  return { translatedText, usedTokens };
}

/** 扣额度(沿用 worker 的 Java quota 语义;billing 未迁前仍走 Java)。best-effort。 */
export async function deductQuota(shop: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  const base = (process.env.TSF_SERVER_URL?.trim() || process.env.SERVER_URL?.trim() || "").replace(
    /\/+$/,
    "",
  );
  if (!base) return;
  try {
    await fetch(
      `${base}/quota/deduct?shopName=${encodeURIComponent(shop)}&tokens=${tokens}`,
      { method: "POST" },
    );
  } catch (err) {
    console.error(`[single] 扣额度失败 shop=${shop}:`, err);
  }
}
