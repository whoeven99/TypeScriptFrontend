import { blobWrite } from "../blobV4.js";
import { AUTO_TRANSLATE_V4_MODULES } from "../moduleCatalog.js";
import { countModuleScan } from "./scanCounts.js";

/** 阶段1：扫描默认语言的可翻译内容量（items / chars / 分模块），评估店铺规模。 */

export type ContentSizeResult = {
  totalItems: number;
  totalChars: number;
  moduleStats: Record<string, { items: number; chars: number }>;
};

export async function runContentSizeStage(args: {
  shop: string;
  accessToken: string;
  primaryLocale: string;
  blobPrefix: string;
  heartbeat: () => Promise<void>;
}): Promise<ContentSizeResult> {
  const { shop, accessToken, primaryLocale, blobPrefix, heartbeat } = args;
  const moduleStats: Record<string, { items: number; chars: number }> = {};
  let totalItems = 0;
  let totalChars = 0;

  for (const module of AUTO_TRANSLATE_V4_MODULES) {
    // 源语言内容量：以 primaryLocale 作 locale（translated 数此处无意义，只取 total/chars）
    const { total, chars } = await countModuleScan(
      shop,
      accessToken,
      module,
      primaryLocale,
      heartbeat,
    );
    moduleStats[module] = { items: total, chars };
    totalItems += total;
    totalChars += chars;
    await heartbeat();
  }

  await blobWrite(`${blobPrefix}/content-size.json`, {
    stage: "contentSize",
    shop,
    primaryLocale,
    totalItems,
    totalChars,
    moduleStats,
    scannedAt: new Date().toISOString(),
  });

  return { totalItems, totalChars, moduleStats };
}
