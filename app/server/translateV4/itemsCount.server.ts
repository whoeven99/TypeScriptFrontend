/**
 * 汇总页「已翻译/总数」统计 —— TSF 本地计算，口径与 v4 一致（去 Java）。
 *
 * 与 Java getTranslationItemsInfo 的区别：用 worker 同一套 translationFilter 规则
 * （`shouldIncludeFieldV2`）判定「哪些字段算可翻译」，因此 v4 翻完必然 N/N，不会出现
 * 「v4 翻完仍显示 208/232」的漂移。
 *
 * 数据源仍是 Shopify（与 Java 一样需翻页拉取），本模块不提速，只保证去 Java + 口径一致。
 *
 * 覆盖范围（见 LOCAL_COUNT_SPEC）：仅纳入「v4 有对应 module」且「非 id-based 发布过滤」
 * 的类型。COLLECTION/PAGE/ARTICLE（带 published 过滤的 id-based）、无 v4 module 的
 * Notifications/Policies/Shipping、以及 Theme，暂仍走 Java。
 */
import { shouldIncludeFieldV2 } from "./translationFilter";
import { getTranslateV4RedisClient } from "./redis.server";

/** 仅依赖 admin.graphql，避免与 SDK 版本耦合。 */
export type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<any> }>;
};

/** 汇总页消费形状（与 Java 返回保持一致）。 */
export type ItemsCountRow = {
  language: string;
  type: string;
  translatedNumber: number;
  totalNumber: number;
};

/**
 * 汇总页「卡片 label」→ { type: 组件匹配键, modules: 需累加的 v4 module }。
 *
 * 这些 module 名即 Shopify TranslatableResourceType（identity），且都不是 id-based
 * 发布过滤模块，可直接 translatableResources(resourceType:) 枚举，口径与 v4 一致。
 * Navigation 由 MENU + LINK 合并，组件按 type "LINK" 读取（对齐 Java 既有行为）。
 */
const LOCAL_COUNT_SPEC: Record<string, { type: string; modules: string[] }> = {
  Products: { type: "PRODUCT", modules: ["PRODUCT"] },
  "Blog titles": { type: "BLOG", modules: ["BLOG"] },
  Metaobjects: { type: "METAOBJECT", modules: ["METAOBJECT"] },
  "Store metadata": { type: "METAFIELD", modules: ["METAFIELD"] },
  Delivery: { type: "DELIVERY_METHOD_DEFINITION", modules: ["DELIVERY_METHOD_DEFINITION"] },
  Shop: { type: "SHOP", modules: ["SHOP"] },
  Navigation: { type: "LINK", modules: ["MENU", "LINK"] },
};

const TRANSLATABLE_RESOURCES_QUERY = `#graphql
  query CountTranslatableResources(
    $resourceType: TranslatableResourceType!
    $first: Int!
    $locale: String!
    $after: String
  ) {
    translatableResources(resourceType: $resourceType, first: $first, after: $after) {
      edges {
        node {
          resourceId
          translations(locale: $locale) {
            key
            outdated
          }
          translatableContent {
            key
            value
            type
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }`;

const PAGE_SIZE = 50;

type TranslatableNode = {
  translations?: Array<{ key: string; outdated?: boolean | null }> | null;
  translatableContent?: Array<{
    key: string;
    value: string;
    type?: string | null;
  }> | null;
};

/** 某字段是否已有「当前译文」（非过期）。 */
function hasCurrentTranslation(
  translations: TranslatableNode["translations"],
  key: string,
): boolean {
  return (translations ?? []).some((t) => t.key === key && t.outdated !== true);
}

/**
 * 统计一个 module 在某目标语言下的 已翻译/总可翻译 字段数。
 *
 * - total（分母）：用 shouldIncludeFieldV2 + isCover:true 判定「应翻字段」（不受现有译文影响）。
 * - translated（分子）：上述字段里，已有「当前译文」的数量。
 *
 * isHandle 默认 false，对齐 v4 任务默认（tasks.ts 默认 isHandle:false）。
 * module 名即 Shopify TranslatableResourceType（本模块覆盖的类型均为 identity）。
 */
export async function countModuleItems({
  admin,
  module,
  target,
  isHandle = false,
}: {
  admin: AdminGraphqlClient;
  module: string;
  target: string;
  isHandle?: boolean;
}): Promise<{ total: number; translated: number }> {
  let total = 0;
  let translated = 0;
  let after: string | null = null;

  for (;;) {
    const response = await admin.graphql(TRANSLATABLE_RESOURCES_QUERY, {
      variables: { resourceType: module, first: PAGE_SIZE, locale: target, after },
    });
    const data = await response.json();
    const conn = data?.data?.translatableResources;
    const edges: Array<{ node: TranslatableNode }> = conn?.edges ?? [];

    for (const edge of edges) {
      const node = edge.node;
      const translations = node.translations ?? [];
      for (const content of node.translatableContent ?? []) {
        const includable = shouldIncludeFieldV2(
          { key: content.key, value: content.value, type: content.type },
          undefined, // 分母不受现有译文影响
          { module, isCover: true, isHandle },
        );
        if (!includable) continue;
        total++;
        if (hasCurrentTranslation(translations, content.key)) translated++;
      }
    }

    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor ?? null;
    if (!after) break;
  }

  return { total, translated };
}

/** 该汇总页卡片是否已支持 TSF 本地计算（否则仍走 Java）。 */
export function isLocalItemsCountSupported(resourceTypeLabel: string): boolean {
  return resourceTypeLabel in LOCAL_COUNT_SPEC;
}

/** 与 worker redisV4.itemsCountKey 一致的缓存键（field=module，value=JSON）。 */
function itemsCountKey(shop: string, locale: string): string {
  return `tsf:items_count:${shop}:${locale}`;
}

const ITEMS_COUNT_TTL = 7 * 24 * 3600; // 与 worker PROGRESS_TTL 一致

/** 读 worker 写入的 module 统计缓存；无/异常返回 null。 */
async function readStoredModuleCount(
  shop: string,
  locale: string,
  module: string,
): Promise<{ total: number; translated: number } | null> {
  try {
    const raw = await getTranslateV4RedisClient().hget(
      itemsCountKey(shop, locale),
      module,
    );
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.total === "number" && typeof v?.translated === "number") {
      return { total: v.total, translated: v.translated };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Shopify GID 资源类型 → 缓存 module（仅含已纳入本地统计的类型）。
 * gid://shopify/<Type>/<id> 的 <Type> 段映射到此。未列出的（如 ProductOption、
 * OnlineStoreTheme）不在统计缓存内，保存时无需失效。
 */
const GID_TYPE_TO_MODULE: Record<string, string> = {
  Product: "PRODUCT",
  Blog: "BLOG",
  Metaobject: "METAOBJECT",
  Metafield: "METAFIELD",
  DeliveryMethodDefinition: "DELIVERY_METHOD_DEFINITION",
  Shop: "SHOP",
  Menu: "MENU",
  Link: "LINK",
};

/** 从一批 resourceId 推导出受影响、且被缓存的 module 列表（去重）。 */
export function cachedModulesFromResourceIds(resourceIds: string[]): string[] {
  const out = new Set<string>();
  for (const id of resourceIds) {
    const gidType = id?.split("/")?.[3]; // gid://shopify/<Type>/<id>
    const module = gidType ? GID_TYPE_TO_MODULE[gidType] : undefined;
    if (module) out.add(module);
  }
  return [...out];
}

/**
 * 失效指定 module 的统计缓存（保存译文后调用），下次汇总页据此重算。best-effort。
 */
export async function invalidateItemsCount(
  shop: string,
  locale: string,
  modules: string[],
): Promise<void> {
  if (!modules.length) return;
  try {
    await getTranslateV4RedisClient().hdel(itemsCountKey(shop, locale), ...modules);
  } catch {
    // best-effort
  }
}

/** 现算后回写缓存，让后续刷新走缓存（best-effort）。 */
async function writeStoredModuleCount(
  shop: string,
  locale: string,
  module: string,
  value: { total: number; translated: number },
): Promise<void> {
  try {
    const redis = getTranslateV4RedisClient();
    const key = itemsCountKey(shop, locale);
    await redis.hset(
      key,
      module,
      JSON.stringify({ ...value, updatedAt: new Date().toISOString() }),
    );
    await redis.expire(key, ITEMS_COUNT_TTL);
  } catch {
    // best-effort
  }
}

/**
 * 汇总页某卡片的统计（v4 口径，取代 Java GetTranslationItemsInfo）。
 * 优先读 worker 写入的 Redis 缓存（秒出）；缺失则现算 Shopify 并回写缓存。
 * 多 module（如 Navigation = MENU+LINK）累加，返回与 Java 同形的单元素数组。
 */
export async function getItemsCountByLabel({
  admin,
  shop,
  target,
  resourceTypeLabel,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  target: string;
  resourceTypeLabel: string;
}): Promise<ItemsCountRow[]> {
  const spec = LOCAL_COUNT_SPEC[resourceTypeLabel];
  if (!spec) return [];

  let total = 0;
  let translated = 0;
  for (const module of spec.modules) {
    let r = await readStoredModuleCount(shop, target, module);
    if (!r) {
      r = await countModuleItems({ admin, module, target });
      await writeStoredModuleCount(shop, target, module, r);
    }
    total += r.total;
    translated += r.translated;
  }

  return [
    {
      language: target,
      type: spec.type,
      translatedNumber: translated,
      totalNumber: total,
    },
  ];
}
