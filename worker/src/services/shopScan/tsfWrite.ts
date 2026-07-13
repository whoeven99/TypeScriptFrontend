import { tsfExecute } from "../tsfDb.js";

/**
 * 店铺画像扫描的 TSF Turso 写入（worker 侧走 libsql 原生 SQL，非 Prisma）。
 *
 * 只写「当前生效」的结构化产物：ShopProfile（画像）、ShopTargetLocale（已发布语言同步）、
 * Glossary（AI 术语，status=0 待确认）。大块明细在 Blob，任务状态在 Cosmos。
 */

export type ShopProfileWrite = {
  shop: string;
  shopName: string | null;
  primaryLocale: string | null;
  industry: string | null;
  keywords: string[] | null;
  description: string | null;
  brandTone: string | null;
  aiModel: string | null;
  lastScanId: string;
};

/** upsert 当前生效画像（每店一行，新扫描覆盖）。 */
export async function upsertShopProfile(input: ShopProfileWrite): Promise<void> {
  const keywordsJson = input.keywords ? JSON.stringify(input.keywords) : null;
  await tsfExecute({
    sql: `
      INSERT INTO ShopProfile
        (shop, shopName, primaryLocale, industry, keywords, description, brandTone, aiModel, lastScanId, lastScannedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
      ON CONFLICT(shop) DO UPDATE SET
        shopName = excluded.shopName,
        primaryLocale = excluded.primaryLocale,
        industry = excluded.industry,
        keywords = excluded.keywords,
        description = excluded.description,
        brandTone = excluded.brandTone,
        aiModel = excluded.aiModel,
        lastScanId = excluded.lastScanId,
        lastScannedAt = datetime('now'),
        updatedAt = datetime('now')
    `,
    args: [
      input.shop,
      input.shopName,
      input.primaryLocale,
      input.industry,
      keywordsJson,
      input.description,
      input.brandTone,
      input.aiModel,
      input.lastScanId,
    ],
  });
}

/** 仅更新画像的扫描指针（阶段2跳过但扫描完成时用）。无行则忽略。 */
export async function touchShopProfileScan(
  shop: string,
  lastScanId: string,
): Promise<void> {
  await tsfExecute({
    sql: "UPDATE ShopProfile SET lastScanId = ?, lastScannedAt = datetime('now'), updatedAt = datetime('now') WHERE shop = ?",
    args: [lastScanId, shop],
  });
}

/**
 * 同步已发布目标语言到 ShopTargetLocale（新增默认 autoTranslate=0），已有行保留开关。
 * 与 TSF `addTargetLocales` 口径一致：只增不删（画像扫描不负责删语言）。
 */
export async function upsertTargetLocales(
  shop: string,
  locales: string[],
): Promise<number> {
  let inserted = 0;
  for (const locale of locales) {
    const loc = locale.trim();
    if (!loc) continue;
    const res = await tsfExecute({
      sql: `
        INSERT INTO ShopTargetLocale (shop, locale, autoTranslate, status, createdAt, updatedAt)
        VALUES (?, ?, 0, 1, datetime('now'), datetime('now'))
        ON CONFLICT(shop, locale) DO NOTHING
      `,
      args: [shop, loc],
    });
    if (res.rowsAffected > 0) inserted++;
  }
  return inserted;
}

export type AiGlossaryEntry = {
  sourceText: string;
  targetText: string;
  rangeCode: string | null;
  caseSensitive?: boolean;
};

/**
 * 批量插入 AI 术语（status=0 待确认，createdBy='ai-shop-scan'）。
 * 幂等去重：同店同 (sourceText, rangeCode) 已存在则跳过（含用户手动创建的）。
 * 返回实际插入条数。
 */
export async function insertAiGlossaryEntries(
  shop: string,
  entries: AiGlossaryEntry[],
): Promise<number> {
  if (!entries.length) return 0;
  let inserted = 0;
  for (const entry of entries) {
    const source = entry.sourceText.trim();
    const target = entry.targetText.trim();
    if (!source || !target) continue;
    const range = entry.rangeCode?.trim() || null;

    const existing = await tsfExecute({
      sql:
        range === null
          ? "SELECT id FROM Glossary WHERE shop = ? AND sourceText = ? AND rangeCode IS NULL LIMIT 1"
          : "SELECT id FROM Glossary WHERE shop = ? AND sourceText = ? AND rangeCode = ? LIMIT 1",
      args: range === null ? [shop, source] : [shop, source, range],
    });
    if (existing.rows.length > 0) continue;

    await tsfExecute({
      sql: `
        INSERT INTO Glossary (shop, sourceText, targetText, rangeCode, caseSensitive, status, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, 0, 'ai-shop-scan', datetime('now'))
      `,
      args: [shop, source, target, range, entry.caseSensitive ? 1 : 0],
    });
    inserted++;
  }
  return inserted;
}
