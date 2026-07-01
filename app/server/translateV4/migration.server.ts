import prisma from "~/db.server";
import { isV2PageWhitelistShop } from "./v2PageWhitelist";

/** v4 为默认翻译链路；白名单店铺仍走 v2。 */
export async function hasShopMigratedToTsf(shop: string): Promise<boolean> {
  return !isV2PageWhitelistShop(shop);
}

/** 是否使用 v4 体验（首页/翻译页入口、单字段翻译链路等）。 */
export async function isShopMigrated(shop: string): Promise<boolean> {
  return !isV2PageWhitelistShop(shop);
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
