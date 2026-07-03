/**
 * 汇总页「已翻译/总数」统计 —— TSF 本地计算，口径与 v4 一致（去 Java）。
 *
 * 与 Java getTranslationItemsInfo 的区别：用 worker 同一套 translationFilter 规则
 * （`shouldIncludeFieldV2`）判定「哪些字段算可翻译」，因此 v4 翻完必然 N/N，不会出现
 * 「v4 翻完仍显示 208/232」的漂移。
 *
 * 数据源仍是 Shopify（与 Java 一样需翻页拉取），本模块不提速，只保证去 Java + 口径一致。
 *
 * 覆盖范围（见 LOCAL_COUNT_SPEC + COVERAGE_COUNT_LABELS）：与管理翻译汇总页
 * 各卡片累加口径一致（不含 Policies）；id-based 类型亦用 translatableResources 枚举。
 */
import { shouldIncludeFieldV2 } from "./translationFilter";
import { isBlankValue } from "./translationFilter/v3Base";
import { getTranslateV4RedisClient } from "./redis.server";

/**
 * 与管理翻译汇总、v4 覆盖率、worker 校验写入 **共用** 的 Redis 统计缓存。
 *
 * - Key: `tsf:items_count:{shop}:{locale}`（与 Spark worker `redisV4.itemsCountKey` 一致）
 * - Hash field: Shopify module（如 `PRODUCT`、`MENU`）
 * - Hash value: `{ total, translated, updatedAt }`
 *
 * 刷新入口：
 * - **管理翻译**「刷新统计」：invalidate 该语言 → 逐卡片 `forceRefresh` 写回（15 类，含 Policies）
 * - **v4 智能翻译**「刷新统计」：`refreshItemsCountForLocale` × 各目标语言（14 类，不含 Policies）
 * - **worker** 任务完成：仅更新该 job 的 modules 对应 field
 */
export function itemsCountRedisKey(shop: string, locale: string): string {
  return `tsf:items_count:${shop}:${locale}`;
}

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
  Collections: { type: "COLLECTION", modules: ["COLLECTION"] },
  /** 与管理翻译页 ITEMS_COUNT 的 `Collection` label 对齐。 */
  Collection: { type: "COLLECTION", modules: ["COLLECTION"] },
  Pages: { type: "PAGE", modules: ["PAGE"] },
  Articles: { type: "ARTICLE", modules: ["ARTICLE"] },
  /** 与管理翻译页 ITEMS_COUNT 的 `Article` label 对齐。 */
  Article: { type: "ARTICLE", modules: ["ARTICLE"] },
  "Blog titles": { type: "BLOG", modules: ["BLOG"] },
  Filters: { type: "FILTER", modules: ["FILTER"] },
  Metaobjects: { type: "METAOBJECT", modules: ["METAOBJECT"] },
  "Store metadata": { type: "METAFIELD", modules: ["METAFIELD"] },
  Delivery: { type: "DELIVERY_METHOD_DEFINITION", modules: ["DELIVERY_METHOD_DEFINITION"] },
  Shop: { type: "SHOP", modules: ["SHOP"] },
  Navigation: { type: "LINK", modules: ["MENU", "LINK"] },
  Notifications: { type: "EMAIL_TEMPLATE", modules: ["EMAIL_TEMPLATE"] },
  Policies: { type: "SHOP_POLICY", modules: ["SHOP_POLICY"] },
  Shipping: { type: "PACKING_SLIP_TEMPLATE", modules: ["PACKING_SLIP_TEMPLATE"] },
  Theme: {
    type: "ONLINE_STORE_THEME_JSON_TEMPLATE",
    modules: [
      "ONLINE_STORE_THEME_JSON_TEMPLATE",
      "ONLINE_STORE_THEME_SECTION_GROUP",
      "ONLINE_STORE_THEME_SETTINGS_CATEGORY",
      "ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS",
      "ONLINE_STORE_THEME_LOCALE_CONTENT",
    ],
  },
};

/** 管理翻译汇总页各卡片 resourceType label（与 manage_translation 路由一致）。 */
export const MANAGE_TRANSLATION_COUNT_LABELS = [
  "Products",
  "Collection",
  "Article",
  "Blog titles",
  "Pages",
  "Filters",
  "Metaobjects",
  "Navigation",
  "Notifications",
  "Policies",
  "Shop",
  "Store metadata",
  "Theme",
  "Delivery",
  "Shipping",
] as const;

/** 语言覆盖率：与管理翻译各卡片累加口径一致，不含 Policies（handle 非独立统计项）。 */
export const COVERAGE_COUNT_LABELS = MANAGE_TRANSLATION_COUNT_LABELS.filter(
  (label) => label !== "Policies",
);

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
          translations(locale: $locale) {
            key
            value
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

const PAGE_SIZE = 250;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shopify GraphQL with light retry (throttle / transient errors during active jobs). */
async function adminGraphqlJson(
  admin: AdminGraphqlClient,
  query: string,
  variables: Record<string, unknown>,
  retries = 2,
): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await admin.graphql(query, { variables });
      const data = await response.json();
      const errors = data?.errors as Array<{ message?: string }> | undefined;
      if (errors?.length) {
        const msg = errors.map((e) => e.message ?? "GraphQL error").join("; ");
        const throttled = /throttl|rate limit|429/i.test(msg);
        if (throttled && attempt < retries) {
          await sleep(1200 * (attempt + 1));
          continue;
        }
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

type TranslatableNode = {
  translations?: Array<{
    key: string;
    value?: string | null;
    outdated?: boolean | null;
  }> | null;
  translatableContent?: Array<{
    key: string;
    value: string;
    type?: string | null;
  }> | null;
};

/** 某字段是否已有「当前译文」（非过期且非空）。 */
function hasCurrentTranslation(
  translations: TranslatableNode["translations"],
  key: string,
): boolean {
  const row = (translations ?? []).find((t) => t.key === key);
  if (!row) return false;
  if (row.outdated === true) return false;
  return !isBlankValue(row.value);
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
    const data = await adminGraphqlJson(admin, TRANSLATABLE_RESOURCES_QUERY, {
      resourceType: module,
      first: PAGE_SIZE,
      locale: target,
      after,
    });
    const conn = data?.data?.translatableResources;
    const edges: Array<{ node: TranslatableNode }> = conn?.edges ?? [];

    for (const edge of edges) {
      const node = edge.node;
      const translations = node.translations ?? [];
      for (const content of node.translatableContent ?? []) {
        const includable = shouldIncludeFieldV2(
          { key: content.key, value: content.value, type: content.type },
          undefined,
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
  return itemsCountRedisKey(shop, locale);
}

const ITEMS_COUNT_TTL = 7 * 24 * 3600; // 与 worker PROGRESS_TTL 一致

/** 读 worker 写入的 module 统计缓存；无/异常返回 null。 */
const ITEMS_COUNT_BATCH_COMPUTE_CONCURRENCY = Math.max(
  1,
  Number(process.env.ITEMS_COUNT_BATCH_COMPUTE_CONCURRENCY) || 2,
);

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workerCount = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (;;) {
        const current = index++;
        if (current >= items.length) return;
        await fn(items[current]);
      }
    }),
  );
}

function parseStoredModuleCount(
  raw: string | null | undefined,
): { total: number; translated: number } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.total === "number" && typeof v?.translated === "number") {
      return { total: v.total, translated: v.translated };
    }
    return null;
  } catch {
    return null;
  }
}

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
    return parseStoredModuleCount(raw);
  } catch {
    return null;
  }
}

async function readStoredModuleCounts(
  shop: string,
  locale: string,
): Promise<Record<string, { total: number; translated: number }> | null> {
  try {
    const raw = await getTranslateV4RedisClient().hgetall(
      itemsCountKey(shop, locale),
    );
    const out: Record<string, { total: number; translated: number }> = {};
    for (const [module, value] of Object.entries(raw)) {
      const parsed = parseStoredModuleCount(value);
      if (parsed) out[module] = parsed;
    }
    return out;
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

/** 失效某语言下全部 module 统计缓存（汇总页「刷新统计」）。best-effort。 */
export async function invalidateAllItemsCountForLocale(
  shop: string,
  locale: string,
): Promise<void> {
  if (!locale) return;
  try {
    await getTranslateV4RedisClient().del(itemsCountKey(shop, locale));
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
 * 汇总页某卡片的统计（v4 口径，TSF 本地计算）。
 * 优先读 worker 写入的 Redis 缓存（秒出）；缺失则现算 Shopify 并回写缓存。
 * 多 module（如 Navigation = MENU+LINK）累加，返回与 Java 同形的单元素数组。
 */
export async function getItemsCountByLabel({
  admin,
  shop,
  target,
  resourceTypeLabel,
  skipCache = false,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  target: string;
  resourceTypeLabel: string;
  /** true：跳过 Redis，现查 Shopify 并回写缓存。 */
  skipCache?: boolean;
}): Promise<ItemsCountRow[]> {
  const spec = LOCAL_COUNT_SPEC[resourceTypeLabel];
  if (!spec) return [];

  let total = 0;
  let translated = 0;
  for (const module of spec.modules) {
    let r = skipCache ? null : await readStoredModuleCount(shop, target, module);
    if (!r) {
      try {
        r = await countModuleItems({ admin, module, target });
        await writeStoredModuleCount(shop, target, module, r);
      } catch (err) {
        console.error(
          `[itemsCount] compute failed shop=${shop} locale=${target} module=${module}:`,
          err,
        );
        r = (await readStoredModuleCount(shop, target, module)) ?? { total: 0, translated: 0 };
      }
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

/** 从 Redis 缓存累加多个汇总卡片（Navigation/Theme 等多 module 卡片与单卡逻辑一致）。 */
export async function getItemsCountByLabelsBatch({
  admin,
  shop,
  target,
  resourceTypeLabels,
  skipCache = false,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  target: string;
  resourceTypeLabels: readonly string[];
  skipCache?: boolean;
}): Promise<ItemsCountRow[]> {
  const labels = [...new Set(resourceTypeLabels)].filter(
    isLocalItemsCountSupported,
  );
  const cachedByModule = skipCache
    ? null
    : await readStoredModuleCounts(shop, target);
  const computedByModule = new Map<
    string,
    { total: number; translated: number }
  >();
  const modulesToCompute = new Set<string>();

  for (const label of labels) {
    const spec = LOCAL_COUNT_SPEC[label];
    for (const module of spec.modules) {
      if (!cachedByModule?.[module]) modulesToCompute.add(module);
    }
  }

  await runWithConcurrency(
    [...modulesToCompute],
    ITEMS_COUNT_BATCH_COMPUTE_CONCURRENCY,
    async (module) => {
      try {
        const count = await countModuleItems({ admin, module, target });
        computedByModule.set(module, count);
        await writeStoredModuleCount(shop, target, module, count);
      } catch (err) {
        console.error(
          `[itemsCount] batch compute failed shop=${shop} locale=${target} module=${module}:`,
          err,
        );
        const cached =
          cachedByModule?.[module] ??
          (await readStoredModuleCount(shop, target, module)) ??
          { total: 0, translated: 0 };
        computedByModule.set(module, cached);
      }
    },
  );

  return labels.map((label) => {
    const spec = LOCAL_COUNT_SPEC[label];
    let total = 0;
    let translated = 0;
    for (const module of spec.modules) {
      const count =
        cachedByModule?.[module] ??
        computedByModule.get(module) ??
        { total: 0, translated: 0 };
      total += count.total;
      translated += count.translated;
    }
    return {
      language: target,
      type: spec.type,
      translatedNumber: translated,
      totalNumber: total,
    };
  });
}

export async function sumItemsCountByLabelsFromCache(
  shop: string,
  locale: string,
  labels: readonly string[] = COVERAGE_COUNT_LABELS,
): Promise<{ translated: number; total: number; cacheMissing: boolean }> {
  let translated = 0;
  let total = 0;
  let cacheMissing = false;
  const cachedByModule = await readStoredModuleCounts(shop, locale);

  for (const label of labels) {
    const spec = LOCAL_COUNT_SPEC[label];
    if (!spec) {
      cacheMissing = true;
      continue;
    }
    for (const module of spec.modules) {
      const cached = cachedByModule?.[module] ?? null;
      if (!cached) {
        cacheMissing = true;
        continue;
      }
      translated += cached.translated;
      total += cached.total;
    }
  }

  return { translated, total, cacheMissing };
}

/** 现算 Shopify 并累加多个汇总卡片（与管理翻译汇总页同口径）。 */
export async function sumItemsCountByLabels({
  admin,
  shop,
  target,
  labels = COVERAGE_COUNT_LABELS,
  skipCache = false,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  target: string;
  labels?: readonly string[];
  skipCache?: boolean;
}): Promise<{ translated: number; total: number }> {
  let translated = 0;
  let total = 0;

  for (const label of labels) {
    if (!isLocalItemsCountSupported(label)) continue;
    const rows = await getItemsCountByLabel({
      admin,
      shop,
      target,
      resourceTypeLabel: label,
      skipCache,
    });
    for (const row of rows) {
      translated += row.translatedNumber;
      total += row.totalNumber;
    }
  }

  return { translated, total };
}

/**
 * 强制刷新某一语言的统计缓存（现算 Shopify + 写 Redis，不先 invalidate —— 避免翻译进行中清空 worker 写入）。
 * 管理翻译/v4 覆盖率共用同一 Redis key；`labels` 决定刷新哪些卡片/module。
 */
export async function refreshItemsCountForLocale({
  admin,
  shop,
  locale,
  labels = MANAGE_TRANSLATION_COUNT_LABELS,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  locale: string;
  labels?: readonly string[];
}): Promise<{ translated: number; total: number }> {
  return sumItemsCountByLabels({
    admin,
    shop,
    target: locale,
    labels,
    skipCache: true,
  });
}

/** 批量刷新多语言（v4 覆盖率「刷新统计」）；单语言失败不阻断其余语言。 */
export async function refreshItemsCountForLocales({
  admin,
  shop,
  locales,
  labels = COVERAGE_COUNT_LABELS,
}: {
  admin: AdminGraphqlClient;
  shop: string;
  locales: string[];
  labels?: readonly string[];
}): Promise<void> {
  for (const locale of locales) {
    try {
      await refreshItemsCountForLocale({ admin, shop, locale, labels });
    } catch (err) {
      console.error(`[itemsCount] refresh locale failed shop=${shop} locale=${locale}:`, err);
    }
  }
}
