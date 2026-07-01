import prisma from "~/db.server";

/** 全量 v4：所有店铺已迁移到 TSF 翻译链路。 */
export async function hasShopMigratedToTsf(_shop: string): Promise<boolean> {
  return true;
}

/** 是否使用 v4 体验（首页/翻译页入口、单字段翻译链路等）。 */
export async function isShopMigrated(_shop: string): Promise<boolean> {
  return true;
}

/** 迁移 API / 脚本写入后仍可调用；v4 默认模式下为 no-op。 */
export function invalidateMigrationCache(_shop: string): void {}

/** 首次进入 v4 时确保 ShopTranslationSettings 存在（幂等）。 */
export async function ensureShopV4Settings(
  shop: string,
  primaryLocale = "en",
): Promise<void> {
  await prisma.shopTranslationSettings.upsert({
    where: { shop },
    create: {
      shop,
      primaryLocale,
      targets: [],
      autoTranslate: false,
      migratedToTsf: true,
      migratedAt: new Date(),
    },
    update: { primaryLocale },
  });
}
