import { CosmosClient, type Container } from "@azure/cosmos";

/**
 * Admin「超大/大/中等/小商店」体量标签 —— Cosmos shop_profile（type=size）只读。
 * 与 worker `shopSizeProfile.ts` 同库同容器；App 侧仅用于卸载通知等展示。
 *
 * Database:  shop            (COSMOS_SHOP_DATABASE_ID)
 * Container: shop_profile    (COSMOS_SHOP_PROFILE_CONTAINER), partition /shopName
 * Document id: shopName
 *
 * 凭证优先 Worker 同名 `COSMOS_ENDPOINT`/`COSMOS_KEY`，再回退 App 的 `_V4`。
 */

export type ShopSizeTier = "超大商店" | "大商店" | "中等商店" | "小商店";

export type ShopSizeProfile = {
  id: string;
  shopName: string;
  type: "size";
  largestLanguage: string | null;
  dataBytes: number;
  dataSizeKB: number;
  sizeTier: ShopSizeTier;
  updatedAt: string;
};

let _client: CosmosClient | null = null;

function resolveEndpointAndKey(): { endpoint: string; key: string } | null {
  const endpoint =
    process.env.COSMOS_ENDPOINT?.trim() ||
    process.env.COSMOS_ENDPOINT_V4?.trim() ||
    "";
  const key =
    process.env.COSMOS_KEY?.trim() || process.env.COSMOS_KEY_V4?.trim() || "";
  if (!endpoint || !key) return null;
  return { endpoint, key };
}

function getClient(): CosmosClient | null {
  const creds = resolveEndpointAndKey();
  if (!creds) return null;
  if (!_client) {
    _client = new CosmosClient({
      endpoint: creds.endpoint,
      key: creds.key,
    });
  }
  return _client;
}

function getContainer(): Container | null {
  const client = getClient();
  if (!client) return null;
  const dbId = process.env.COSMOS_SHOP_DATABASE_ID?.trim() || "shop";
  const containerId =
    process.env.COSMOS_SHOP_PROFILE_CONTAINER?.trim() || "shop_profile";
  return client.database(dbId).container(containerId);
}

/** 读店铺体量标签；无凭证 / 无文档 / 失败时返回 null（不抛）。 */
export async function readShopSizeProfile(
  shop: string,
): Promise<ShopSizeProfile | null> {
  const container = getContainer();
  if (!container) return null;
  try {
    const { resource } = await container
      .item(shop, shop)
      .read<ShopSizeProfile>();
    if (!resource || resource.type !== "size") return null;
    return resource;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? Number((err as { code?: number }).code)
        : undefined;
    if (code === 404) return null;
    console.warn(`[shopSize] readShopSizeProfile failed shop=${shop}`, err);
    return null;
  }
}
