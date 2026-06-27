import prisma from "~/db.server";
import {
  flattenHtmlNodeTranslations,
  htmlNodePartsOf,
  isHtmlContent,
  reassembleHtmlTranslation,
} from "~/server/translateV4/htmlTranslate.server";
import {
  acceptLeafTranslation,
  glossaryTargetMatchesLocale,
  hasPromptSentinelLeakage,
  isTranslatableLeafText,
} from "~/server/translateV4/translateQuality.server";

/**
 * 单字段手动翻译(交互式,同步)。读 TSF 术语表拼系统提示词、调 DeepSeek、扣额度。
 * HTML 字段走与 Spark worker 相同的拆 leaf → 译文本 → 填回 pipeline。
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
      .filter((r) =>
        glossaryTargetMatchesLocale(r.targetText!, r.sourceText!, target),
      )
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
- translatedValue MUST be written entirely in "${target}"; never insert Chinese (汉字), Japanese, or Korean characters unless those exact characters already appear in the source value
- Each value is a plain-text leaf extracted from HTML: never include HTML tags (<td>, <tr>, <table>, etc.) in translatedValue
- Keep opaque sentinel tokens (⟦0⟧, ⟦1⟧, ⟦2⟧, …) exactly unchanged; never translate, modify, reorder, or drop them
- Sentinels may represent URLs or site paths (e.g. /blogs/news/article) — preserve them verbatim
- Keep the literal token ⟦BR⟧ exactly as it appears (line-break placeholder)
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

type ChatMessage = { role: string; content: string };

async function callLlmJson(
  messages: ChatMessage[],
): Promise<{ content: string; usedTokens: number }> {
  const gptKey = process.env.Gpt_ApiKey?.trim();
  let resp: Response;
  if (gptKey) {
    const endpoint = (
      process.env.Gpt_Endpoint?.trim() || "https://eastus.api.cognitive.microsoft.com"
    ).replace(/\/+$/, "");
    const apiVersion = process.env.Gpt_ApiVersion?.trim() || "2024-10-21";
    const gptModel = process.env.Gpt_Model?.trim() || "gpt-4.1-nano";
    resp = await fetch(
      `${endpoint}/openai/deployments/${encodeURIComponent(gptModel)}/chat/completions?api-version=${apiVersion}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": gptKey },
        body: JSON.stringify({
          messages,
          temperature: 0.1,
          frequency_penalty: 0,
          presence_penalty: 0,
          response_format: { type: "json_object" },
        }),
      },
    );
  } else {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) throw new Error("未配置 Gpt_ApiKey 或 DEEPSEEK_API_KEY");
    const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
    resp = await fetch(deepSeekChatUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });
  }

  if (!resp.ok) {
    throw new Error(`LLM ${resp.status}: ${await resp.text().catch(() => "")}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  return {
    content: data.choices?.[0]?.message?.content ?? "{}",
    usedTokens: data.usage?.total_tokens ?? 0,
  };
}

function parseTranslationMap(
  content: string,
): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const parsed = JSON.parse(content) as {
      translations?: { key: string; translatedValue: string }[];
    };
    for (const hit of parsed.translations ?? []) {
      if (typeof hit.key === "string" && typeof hit.translatedValue === "string") {
        map.set(hit.key, hit.translatedValue);
      }
    }
  } catch {
    // caller handles empty map
  }
  return map;
}

async function translateLeafBatch(
  parts: string[],
  target: string,
  glossaryLines: string[],
): Promise<{ map: Map<number, string>; usedTokens: number }> {
  const translatable = parts
    .map((value, i) => ({ value, i }))
    .filter(({ value }) => isTranslatableLeafText(value));
  if (translatable.length === 0) return { map: new Map(), usedTokens: 0 };

  const systemPrompt = buildSystemPrompt(target, glossaryLines);
  const payload = translatable.map(({ value, i }) => ({ key: `f${i}`, value }));
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(payload) },
  ];

  const { content, usedTokens } = await callLlmJson(messages);
  const raw = parseTranslationMap(content);
  const map = new Map<number, string>();
  for (const { value, i } of translatable) {
    const hit = raw.get(`f${i}`);
    if (hit !== undefined) {
      map.set(i, acceptLeafTranslation(value, hit, target));
    }
  }
  return { map, usedTokens };
}

type SingleResult = { translatedText: string; usedTokens: number };

async function translatePlainSingle(args: {
  target: string;
  text: string;
  glossaryLines: string[];
}): Promise<SingleResult> {
  const systemPrompt = buildSystemPrompt(args.target, args.glossaryLines);
  const userPayload = JSON.stringify([{ key: "f0", value: args.text }]);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPayload },
  ];
  const { content, usedTokens } = await callLlmJson(messages);
  const map = parseTranslationMap(content);
  const hit = map.get("f0");
  const translatedText =
    hit !== undefined ? acceptLeafTranslation(args.text, hit, args.target) : args.text;
  return {
    translatedText,
    usedTokens,
  };
}

async function translateHtmlSingle(args: {
  target: string;
  text: string;
  glossaryLines: string[];
}): Promise<SingleResult> {
  const { template, nodeParts } = htmlNodePartsOf(args.text);
  const flatParts: string[] = [];
  for (const parts of nodeParts) flatParts.push(...parts);
  if (flatParts.length === 0) {
    return { translatedText: args.text, usedTokens: 0 };
  }

  let usedTokens = 0;
  const partTranslations = new Map<number, string>();

  const { map: batchMap, usedTokens: batchTokens } = await translateLeafBatch(
    flatParts,
    args.target,
    args.glossaryLines,
  );
  usedTokens += batchTokens;
  for (const [i, v] of batchMap) partTranslations.set(i, v);

  for (let i = 0; i < flatParts.length; i++) {
    const source = flatParts[i]!;
    const translated = partTranslations.get(i);
    if (translated !== undefined) {
      partTranslations.set(i, acceptLeafTranslation(source, translated, args.target));
    }
  }

  const nodeTranslations = flattenHtmlNodeTranslations(nodeParts, (part, partIndex) => {
    return partTranslations.get(partIndex) ?? part;
  });
  let translatedText = reassembleHtmlTranslation(template, nodeTranslations);
  if (hasPromptSentinelLeakage(translatedText)) {
    translatedText = args.text;
  }
  return {
    translatedText,
    usedTokens,
  };
}

export async function translateSingleText(args: {
  shop: string;
  target: string;
  text: string;
}): Promise<SingleResult> {
  const text = args.text ?? "";
  if (!text.trim()) return { translatedText: text, usedTokens: 0 };

  const glossaryLines = await loadGlossaryPromptLines(args.shop, args.target);
  if (isHtmlContent(text)) {
    return translateHtmlSingle({ target: args.target, text, glossaryLines });
  }
  return translatePlainSingle({ target: args.target, text, glossaryLines });
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
