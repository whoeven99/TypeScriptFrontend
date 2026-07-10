import { createHmac } from "node:crypto";

const API_DOMAIN = "cn-api.aidc-ai.com";
const API_NAME = "/ai/image/translation";

function getAidgeCredentials(): { appKey: string; appSecret: string } {
  const appKey =
    process.env.AIDGE_ACCESS_KEY_NAME?.trim() ||
    process.env.AIDGE_APP_KEY?.trim() ||
    "";
  const appSecret =
    process.env.AIDGE_ACCESS_KEY_SECRET?.trim() ||
    process.env.AIDGE_APP_SECRET?.trim() ||
    "";
  if (!appKey || !appSecret) {
    throw new Error(
      "Missing AIDGE_ACCESS_KEY_NAME / AIDGE_ACCESS_KEY_SECRET (or AIDGE_APP_KEY / AIDGE_APP_SECRET)",
    );
  }
  return { appKey, appSecret };
}

function useTrialResource(): boolean {
  const raw = process.env.AIDGE_USE_TRIAL?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  // 对齐 Spring ApiConfig.USE_TRIAL_RESOURCE = true
  return true;
}

/**
 * 对齐 Spring AidgeIntegration.getSign：
 * sign = HmacSHA256(secret + timestamp).hexUpper
 */
function buildSignedUrl(apiName: string): string {
  const { appKey, appSecret } = getAidgeCredentials();
  const timestamp = String(Date.now());
  const sign = createHmac("sha256", appSecret)
    .update(appSecret + timestamp, "utf8")
    .digest("hex")
    .toUpperCase();

  const params = new URLSearchParams({
    partner_id: "aidge",
    sign_method: "sha256",
    sign_ver: "v2",
    app_key: appKey,
    timestamp,
    sign,
  });
  return `https://${API_DOMAIN}/rest${apiName}?${params.toString()}`;
}

export type AidgeTranslateArgs = {
  imageUrl: string;
  sourceLanguage: string;
  targetLanguage: string;
};

/**
 * 调用 Aidge 标准图译，成功返回译后临时 imageUrl，失败返回 null。
 * 对齐 Spring aidgeStandPictureTranslate（不含扣费）。
 */
export async function aidgeStandPictureTranslate(
  args: AidgeTranslateArgs,
): Promise<string | null> {
  const url = buildSignedUrl(API_NAME);
  const body = {
    imageUrl: args.imageUrl,
    sourceLanguage: args.sourceLanguage,
    targetLanguage: args.targetLanguage,
    translatingTextInTheProduct: "false",
    useImageEditor: "false",
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (useTrialResource()) {
    headers["x-iop-trial"] = "true";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(40_000),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(
      `[aidge] HTTP ${res.status} source=${args.sourceLanguage} target=${args.targetLanguage}: ${text.slice(0, 500)}`,
    );
    return null;
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    console.error(`[aidge] invalid JSON: ${text.slice(0, 500)}`);
    return null;
  }

  const imageUrl =
    json &&
    typeof json === "object" &&
    "data" in json &&
    json.data &&
    typeof json.data === "object" &&
    "imageUrl" in json.data &&
    typeof (json.data as { imageUrl?: unknown }).imageUrl === "string"
      ? (json.data as { imageUrl: string }).imageUrl
      : null;

  if (!imageUrl) {
    console.error(`[aidge] missing data.imageUrl: ${text.slice(0, 500)}`);
    return null;
  }
  return imageUrl;
}
