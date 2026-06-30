import axios from "axios";
import prisma from "~/db.server";
import { isPageFlyGrayEligible } from "./storefrontGray.server";
import { ok, fail, type BaseResponse } from "./response.server";

/** 对应 Java PageFlyVO：{ id, sourceText, targetText } */
export type PageFlyTranslationVO = {
  id: number;
  sourceText: string;
  targetText: string;
};

/**
 * 灰度入口：PageFly 译文读取。
 *
 * 灰度条件（双重）：migratedToTsf=true 且 shop 在 TRANSLATE_V4_SHOP_ALLOWLIST 中
 *   → 从 Prisma PageFlyTranslation 读取
 * 未满足条件
 *   → 透明代理到 Java /userPageFly/readTranslatedText（保留 Java 路径）
 */
export async function readPageFlyTranslations(
  shop: string,
  languageCode: string,
): Promise<BaseResponse<PageFlyTranslationVO[]>> {
  const eligible = await isPageFlyGrayEligible(shop);
  if (eligible) {
    return readFromPrisma(shop, languageCode);
  }
  return proxyToJava(shop, languageCode);
}

async function readFromPrisma(
  shop: string,
  languageCode: string,
): Promise<BaseResponse<PageFlyTranslationVO[]>> {
  const rows = await prisma.pageFlyTranslation.findMany({
    where: { shop, languageCode, isDeleted: false },
    select: { id: true, sourceText: true, targetText: true },
    orderBy: { id: "asc" },
  });
  return ok(rows);
}

async function proxyToJava(
  shop: string,
  languageCode: string,
): Promise<BaseResponse<PageFlyTranslationVO[]>> {
  const base = process.env.SERVER_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    console.error("[storefront/pagefly] SERVER_URL not configured, cannot proxy to Java");
    return fail(10001, "upstream not available");
  }
  try {
    const res = await axios.post<BaseResponse<PageFlyTranslationVO[]>>(
      `${base}/userPageFly/readTranslatedText`,
      null,
      {
        params: { shopName: shop, languageCode },
        timeout: 10_000,
      },
    );
    return res.data;
  } catch (err) {
    console.error(`[storefront/pagefly] proxyToJava failed shop=${shop}:`, err);
    return fail(10001, "upstream error");
  }
}
