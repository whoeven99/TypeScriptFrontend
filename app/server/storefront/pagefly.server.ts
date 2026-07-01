import axios from "axios";
import { isPageFlyGrayEligible } from "./storefrontGray.server";
import { ok, fail, type BaseResponse } from "./response.server";
import {
  listPageFlyTranslations,
  type PageFlyTranslationVO,
} from "~/server/translateV4/pageflyTranslation.server";

export type { PageFlyTranslationVO };

/**
 * PageFly 译文读取。
 *
 * 默认走 v4（Prisma）；v2PageWhitelist 中的店铺透明代理到 Java /userPageFly/readTranslatedText。
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
  return ok(await listPageFlyTranslations(shop, languageCode));
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
