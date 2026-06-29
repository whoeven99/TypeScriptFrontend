import axios from "axios";
import prisma from "~/db.server";
import { routeStorefrontRead } from "./routing.server";
import { ok, fail, type BaseResponse } from "./response.server";

/** 对应 Java parseLiquidDataByShopNameAndLanguage 的响应 response 形状：
 *  { "原文": ["译文", replacementMethod(bool)], ... }
 */
export type LiquidMap = Record<string, [string, boolean]>;

/**
 * 判断字符串是否为 JSON 对象/数组（Java 侧会跳过这类 before/after）。
 * 仅检查以 `{` 或 `[` 开头并能成功解析为 object/array 的情况。
 */
function isJsonObject(str: string): boolean {
  if (!str) return false;
  const s = str.trimStart();
  if (s[0] !== "{" && s[0] !== "[") return false;
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
}

/**
 * 灰度入口：migratedToTsf 且命中 v4 allowlist 时从 Prisma 读，否则透明代理到 Java。
 * 保留 Java 路径，不删除 Java 对应逻辑。
 */
export async function parseLiquidTranslations(
  shop: string,
  languageCode: string,
): Promise<BaseResponse<LiquidMap>> {
  return routeStorefrontRead(
    shop,
    () => readFromPrisma(shop, languageCode),
    () => proxyToJava(shop, languageCode),
  );
}

/** migratedToTsf + allowlist 路径：从 Prisma LiquidRule 读取。 */
async function readFromPrisma(
  shop: string,
  languageCode: string,
): Promise<BaseResponse<LiquidMap>> {
  const rules = await prisma.liquidRule.findMany({
    where: { shop, languageCode },
    orderBy: { createdAt: "asc" },
    select: {
      beforeTranslation: true,
      afterTranslation: true,
      replacementMethod: true,
    },
  });

  const map: LiquidMap = {};
  for (const rule of rules) {
    if (isJsonObject(rule.beforeTranslation) || isJsonObject(rule.afterTranslation)) {
      continue;
    }
    map[rule.beforeTranslation] = [rule.afterTranslation, rule.replacementMethod];
  }

  if (Object.keys(map).length === 0) {
    return fail(10001, "no data");
  }
  return ok(map);
}

/** migratedToTsf=false 路径：透明代理到 Java，保留 Java 代码。 */
async function proxyToJava(
  shop: string,
  languageCode: string,
): Promise<BaseResponse<LiquidMap>> {
  const base = process.env.SERVER_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    console.error("[storefront/liquid] SERVER_URL not configured, cannot proxy to Java");
    return fail(10001, "upstream not available");
  }
  try {
    const res = await axios.post<BaseResponse<LiquidMap>>(
      `${base}/liquid/parseLiquidDataByShopNameAndLanguage`,
      null,
      {
        params: { shopName: shop, languageCode },
        timeout: 10_000,
      },
    );
    return res.data;
  } catch (err) {
    console.error(`[storefront/liquid] proxyToJava failed shop=${shop}:`, err);
    return fail(10001, "upstream error");
  }
}
