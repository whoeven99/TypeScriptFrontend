/**
 * Admin「超大/大/中等/小商店」体量标签 —— Cosmos shop_profile（type=size）。
 *
 * 由 shop scan 的 contentSize 阶段写入；翻译 INIT 不再维护。
 *
 * Database:  shop            (COSMOS_SHOP_DATABASE_ID)
 * Container: shop_profile    (COSMOS_SHOP_PROFILE_CONTAINER), partition /shopName
 * Document id: shopName
 */
import { CosmosClient, type Container } from "@azure/cosmos";

export type ShopSizeTier = "超大商店" | "大商店" | "中等商店" | "小商店";

const MiB = 1024 * 1024;

export type ShopSizeLanguageStat = {
  bytes: number;
  items: number;
  units: number;
  updatedAt: string;
};

export type ShopSizeProfile = {
  id: string;
  shopName: string;
  type: "size";
  largestLanguage: string | null;
  dataBytes: number;
  dataSizeKB: number;
  sizeTier: ShopSizeTier;
  languages: Record<string, ShopSizeLanguageStat>;
  updatedAt: string;
  /** 最近一次写入来源（shop-scan contentSize）。 */
  source?: "shop-scan";
};

function tierBounds(): { medium: number; large: number; huge: number } {
  const num = (v: string | undefined, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : def;
  };
  return {
    medium: num(process.env.SHOP_SIZE_TIER_MEDIUM_BYTES, 2 * MiB),
    large: num(process.env.SHOP_SIZE_TIER_LARGE_BYTES, 10 * MiB),
    huge: num(process.env.SHOP_SIZE_TIER_HUGE_BYTES, 50 * MiB),
  };
}

export function tierForBytes(bytes: number): ShopSizeTier {
  const { medium, large, huge } = tierBounds();
  if (bytes >= huge) return "超大商店";
  if (bytes >= large) return "大商店";
  if (bytes >= medium) return "中等商店";
  return "小商店";
}

let _client: CosmosClient | null = null;
let _ensureContainerPromise: Promise<Container> | null = null;

function getClient(): CosmosClient {
  if (!_client) {
    const endpoint = process.env.COSMOS_ENDPOINT?.trim();
    const key = process.env.COSMOS_KEY?.trim();
    if (!endpoint || !key) {
      throw new Error("COSMOS_ENDPOINT and COSMOS_KEY are required");
    }
    _client = new CosmosClient({ endpoint, key });
  }
  return _client;
}

function databaseId(): string {
  return process.env.COSMOS_SHOP_DATABASE_ID?.trim() || "shop";
}

function containerId(): string {
  return process.env.COSMOS_SHOP_PROFILE_CONTAINER?.trim() || "shop_profile";
}

async function ensureContainer(): Promise<Container> {
  if (_ensureContainerPromise) return _ensureContainerPromise;

  _ensureContainerPromise = (async () => {
    const client = getClient();
    const { database } = await client.databases.createIfNotExists({
      id: databaseId(),
    });
    const { container } = await database.containers.createIfNotExists({
      id: containerId(),
      partitionKey: { paths: ["/shopName"] },
    });
    return container;
  })();

  return _ensureContainerPromise;
}

/**
 * contentSize 完成后 upsert Admin 体量标签。
 *
 * - bytes 口径：shop scan `totalChars`（源文字符长度之和，与旧 INIT 字节档位同阈值）。
 * - 以 primaryLocale 为 canonical 语言写入；保留文档里其它语言历史条目，档位取最大语言。
 * - best-effort：失败只打日志，不抛错，避免拖垮 scan。
 */
export async function recordShopSizeFromContentSize(input: {
  shopName: string;
  primaryLocale: string;
  totalItems: number;
  totalChars: number;
}): Promise<void> {
  const { shopName, primaryLocale, totalItems, totalChars } = input;
  const locale = primaryLocale.trim();
  if (!shopName?.trim() || !locale || totalChars <= 0) return;

  try {
    const container = await ensureContainer();
    const now = new Date().toISOString();
    const bytes = Math.max(0, Math.floor(totalChars));
    const items = Math.max(0, Math.floor(totalItems));

    const { resource: existing } = await container
      .item(shopName, shopName)
      .read<ShopSizeProfile>()
      .catch(() => ({ resource: null as ShopSizeProfile | null }));

    const languages: Record<string, ShopSizeLanguageStat> = {
      ...(existing?.languages ?? {}),
    };
    // shop scan 是源语言全量计量，直接覆写 primary 条目（不用 max，避免旧值卡住）。
    languages[locale] = {
      bytes,
      items,
      units: items,
      updatedAt: now,
    };

    let largestLanguage: string | null = null;
    let dataBytes = 0;
    for (const [lang, stat] of Object.entries(languages)) {
      if (stat.bytes > dataBytes) {
        dataBytes = stat.bytes;
        largestLanguage = lang;
      }
    }

    const doc: ShopSizeProfile = {
      id: shopName,
      shopName,
      type: "size",
      largestLanguage,
      dataBytes,
      dataSizeKB: Math.round(dataBytes / 1024),
      sizeTier: tierForBytes(dataBytes),
      languages,
      updatedAt: now,
      source: "shop-scan",
    };

    await container.items.upsert<ShopSizeProfile>(doc);
    console.log(
      `[shopSize] shop-scan ${shopName} ${locale}=${(bytes / 1024).toFixed(0)}KB` +
        ` → tier=${doc.sizeTier} (max ${largestLanguage}=${doc.dataSizeKB}KB)`,
    );
  } catch (err) {
    console.warn(`[shopSize] recordShopSizeFromContentSize failed ${shopName}`, err);
  }
}
