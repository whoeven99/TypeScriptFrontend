import prisma from "~/db.server";
import { sameTranslationLocale } from "./locale";
import { hasShopMigratedToTsf } from "./migration.server";

/**
 * 语言页「按语言自动翻译开关」的 TSF Prisma 读写（迁移后的店用）。
 * 每店每目标语言一行；worker 据此精确按语言建自动任务。
 */
export type TargetLocaleRow = {
  locale: string;
  autoTranslate: boolean;
  status: number;
};

export async function listTargetLocales(shop: string): Promise<TargetLocaleRow[]> {
  await ensureTargetLocalesBackfilled(shop);
  const rows = await prisma.shopTargetLocale.findMany({ where: { shop } });
  return rows.map((r) => ({
    locale: r.locale,
    autoTranslate: r.autoTranslate,
    status: r.status,
  }));
}

/** 早期迁移只写了 ShopTranslationSettings.targets，补建每语言行供语言页读取。 */
async function ensureTargetLocalesBackfilled(shop: string): Promise<void> {
  const count = await prisma.shopTargetLocale.count({ where: { shop } });
  if (count > 0) return;

  const settings = await prisma.shopTranslationSettings.findUnique({
    where: { shop },
    select: { targets: true, migratedToTsf: true },
  });
  if (!settings?.migratedToTsf) return;

  const targets = Array.isArray(settings.targets)
    ? (settings.targets as string[]).filter(Boolean)
    : [];
  if (!targets.length) return;

  await upsertTargetLocales(
    shop,
    targets.map((locale) => ({ locale, autoTranslate: false })),
  );
}

/** 同步整店开关：任一语言开启即 ShopTranslationSettings.autoTranslate=true（卡片摘要用）。 */
async function syncShopAutoFlag(shop: string): Promise<void> {
  const anyOn = await prisma.shopTargetLocale.count({
    where: { shop, autoTranslate: true },
  });
  await prisma.shopTranslationSettings.updateMany({
    where: { shop },
    data: { autoTranslate: anyOn > 0 },
  });
}

export async function setAutoTranslate(
  shop: string,
  locale: string,
  autoTranslate: boolean,
): Promise<void> {
  await prisma.shopTargetLocale.upsert({
    where: { shop_locale: { shop, locale } },
    create: { shop, locale, autoTranslate },
    update: { autoTranslate },
  });
  await syncShopAutoFlag(shop);
}

export async function deleteTargetLocales(shop: string, locales: string[]): Promise<number> {
  if (!locales.length) return 0;
  const res = await prisma.shopTargetLocale.deleteMany({
    where: { shop, locale: { in: locales } },
  });
  await syncShopAutoFlag(shop);
  return res.count;
}

/**
 * 将 Shopify 店铺语言同步到 TSF（ShopTargetLocale + settings.targets）。
 * 仅已迁移店执行；新增语言默认 autoTranslate=false，已有行保留原开关。
 */
export async function syncShopTargetLocalesFromShopify(
  shop: string,
  shopLocales: Array<{ locale: string; primary?: boolean }>,
  primaryLocale: string,
): Promise<void> {
  if (!(await hasShopMigratedToTsf(shop))) return;

  const targetCodes = shopLocales
    .filter((l) => !l.primary && l.locale.trim())
    .filter((l) => !sameTranslationLocale(l.locale, primaryLocale))
    .map((l) => l.locale.trim());

  const uniqueLocales = [...new Set(targetCodes)];
  if (uniqueLocales.length === 0) return;

  const existing = await prisma.shopTargetLocale.findMany({ where: { shop } });

  for (const locale of uniqueLocales) {
    const prev = existing.find((r) => sameTranslationLocale(r.locale, locale));
    await prisma.shopTargetLocale.upsert({
      where: { shop_locale: { shop, locale: prev?.locale ?? locale } },
      create: { shop, locale, autoTranslate: false },
      update: {},
    });
  }

  const toDelete = existing
    .filter((r) => !uniqueLocales.some((loc) => sameTranslationLocale(loc, r.locale)))
    .map((r) => r.locale);
  if (toDelete.length > 0) {
    await deleteTargetLocales(shop, toDelete);
  }

  await prisma.shopTranslationSettings.updateMany({
    where: { shop, migratedToTsf: true },
    data: { targets: uniqueLocales },
  });
}

/** 迁移时批量写入每目标语言的自动开关。 */
export async function upsertTargetLocales(
  shop: string,
  items: { locale: string; autoTranslate: boolean }[],
): Promise<void> {
  for (const it of items) {
    if (!it.locale) continue;
    await prisma.shopTargetLocale.upsert({
      where: { shop_locale: { shop, locale: it.locale } },
      create: { shop, locale: it.locale, autoTranslate: it.autoTranslate },
      update: { autoTranslate: it.autoTranslate },
    });
  }
  await syncShopAutoFlag(shop);
}
