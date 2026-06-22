import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { getTranslateV4RedisClient } from "~/server/translateV4/redis.server";
import {
  GetGlossaryByShopName,
  SelectShopNameLiquidData,
  GetTranslateDOByShopNameAndSource,
} from "~/api/JavaServer";

/**
 * 已迁移店铺标记 SET。Java 的 autoTranslateTask 启动时读这个 SET 跳过已迁移店，
 * 避免新旧两版重复自动翻译。⚠️ 需与 Java 读取的是同一个 Redis 实例。
 * 写入纯字符串（与 Java StringRedisTemplate 一致），勿用会 JSON 编码的客户端。
 */
const TSF_MIGRATED_SHOPS_KEY = "tsf:migrated:shops";

async function markShopMigratedInRedis(shop: string): Promise<void> {
  try {
    await getTranslateV4RedisClient().sadd(TSF_MIGRATED_SHOPS_KEY, shop);
  } catch (err) {
    // 非致命：标记失败不应阻断迁移；下次进卡片会再补写
    console.error(`[migrate] ${shop} 写 Redis 迁移标记失败:`, err);
  }
}

/** 迁移结果摘要——回给卡片展示「迁移了哪些数据」。 */
type MigrationSummary = {
  already: boolean;
  glossaryCount: number;
  liquidCount: number;
  settings: {
    primaryLocale: string;
    targets: string[];
    autoTranslate: boolean;
  };
};

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

/** GET /api/translate-v4/migrate —— 返回本店当前迁移摘要（已迁移则带数据量，未迁移返回 null）。 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const existing = await prisma.shopTranslationSettings.findUnique({
    where: { shop },
  });
  if (!existing?.migratedToTsf) {
    return json({ ok: true, migrated: false, summary: null });
  }
  const [glossaryCount, liquidCount] = await Promise.all([
    prisma.glossary.count({ where: { shop } }),
    prisma.liquidRule.count({ where: { shop } }),
  ]);
  const summary: MigrationSummary = {
    already: true,
    glossaryCount,
    liquidCount,
    settings: {
      primaryLocale: existing.primaryLocale,
      targets: Array.isArray(existing.targets) ? (existing.targets as string[]) : [],
      autoTranslate: existing.autoTranslate,
    },
  };
  return json({ ok: true, migrated: true, summary });
};

/** 从 Java Translates 读自动翻译开关（best-effort，读不到则 false）。 */
async function readAutoTranslate(shop: string, source: string): Promise<boolean> {
  try {
    const res = await GetTranslateDOByShopNameAndSource({ shop, source });
    const data = (res as { response?: unknown })?.response ?? res;
    if (Array.isArray(data)) return data.some((r) => Boolean(r?.autoTranslate));
    return Boolean((data as { autoTranslate?: boolean })?.autoTranslate);
  } catch (err) {
    console.error(`[migrate] ${shop} read autoTranslate failed:`, err);
    return false;
  }
}

/**
 * POST /api/translate-v4/migrate
 * 把本店的旧版翻译数据（术语表、Liquid 规则、自动翻译配置）从 Java 迁到 TSF Prisma，
 * 置 migratedToTsf=true（不可逆）。幂等：已迁移则直接返回当前数据摘要。
 * body: { primaryLocale, targets }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const server = process.env.SERVER_URL ?? "";

  const body = (await request.json().catch(() => ({}))) as {
    primaryLocale?: string;
    targets?: string[];
  };
  const primaryLocale = body.primaryLocale?.trim() || "en";
  const targets = Array.isArray(body.targets)
    ? Array.from(new Set(body.targets.map((t) => String(t).trim()).filter(Boolean)))
    : [];

  // 幂等：已迁移直接回当前摘要
  const existing = await prisma.shopTranslationSettings.findUnique({
    where: { shop },
  });
  if (existing?.migratedToTsf) {
    await markShopMigratedInRedis(shop); // 自愈：标记可能被清过
    const [glossaryCount, liquidCount] = await Promise.all([
      prisma.glossary.count({ where: { shop } }),
      prisma.liquidRule.count({ where: { shop } }),
    ]);
    const summary: MigrationSummary = {
      already: true,
      glossaryCount,
      liquidCount,
      settings: {
        primaryLocale: existing.primaryLocale,
        targets: Array.isArray(existing.targets) ? (existing.targets as string[]) : [],
        autoTranslate: existing.autoTranslate,
      },
    };
    return json({ ok: true, summary });
  }

  try {
    // 1) 从 Java 读旧数据
    const [glossaryRes, liquidRes, autoTranslate] = await Promise.all([
      GetGlossaryByShopName({ shop, server }),
      SelectShopNameLiquidData({ shop, server }),
      readAutoTranslate(shop, primaryLocale),
    ]);

    const glossaryRows = asArray((glossaryRes as { response?: unknown })?.response);
    const liquidRows = asArray((liquidRes as { response?: unknown })?.response).filter(
      (r) => !r?.isDeleted,
    );

    const glossaryData = glossaryRows.map((g) => ({
      shop,
      sourceText: String(g?.sourceText ?? ""),
      targetText: String(g?.targetText ?? ""),
      rangeCode: g?.rangeCode != null ? String(g.rangeCode) : null,
      caseSensitive: Number(g?.caseSensitive) === 1,
    }));

    const liquidData = liquidRows.map((l) => ({
      shop,
      beforeTranslation: String(l?.liquidBeforeTranslation ?? ""),
      afterTranslation: String(l?.liquidAfterTranslation ?? ""),
      languageCode: l?.languageCode != null ? String(l.languageCode) : null,
      replacementMethod: Boolean(l?.replacementMethod),
    }));

    // 2) 写入 TSF Prisma（事务内：先清后插，保证可重跑且无重复）
    await prisma.$transaction([
      prisma.glossary.deleteMany({ where: { shop } }),
      prisma.liquidRule.deleteMany({ where: { shop } }),
      ...(glossaryData.length
        ? [prisma.glossary.createMany({ data: glossaryData })]
        : []),
      ...(liquidData.length
        ? [prisma.liquidRule.createMany({ data: liquidData })]
        : []),
      prisma.shopTranslationSettings.upsert({
        where: { shop },
        create: {
          shop,
          primaryLocale,
          targets,
          autoTranslate,
          migratedToTsf: true,
          migratedAt: new Date(),
        },
        update: {
          primaryLocale,
          targets,
          autoTranslate,
          migratedToTsf: true,
          migratedAt: new Date(),
        },
      }),
    ]);

    // 写 Redis 标记，让 Java 自动翻译任务跳过本店（避免双翻译）
    await markShopMigratedInRedis(shop);

    const summary: MigrationSummary = {
      already: false,
      glossaryCount: glossaryData.length,
      liquidCount: liquidData.length,
      settings: { primaryLocale, targets, autoTranslate },
    };
    console.log(
      `[migrate] ${shop} done: glossary=${summary.glossaryCount} liquid=${summary.liquidCount} auto=${autoTranslate} targets=${targets.join(",")}`,
    );
    return json({ ok: true, summary });
  } catch (err) {
    console.error(`[migrate] ${shop} failed:`, err);
    return json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
};
