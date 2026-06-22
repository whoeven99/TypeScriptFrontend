import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import {
  GetGlossaryByShopName,
  SelectShopNameLiquidData,
  GetTranslateDOByShopNameAndSource,
  MarkShopMigratedToTsf,
} from "~/api/JavaServer";

/**
 * 通知 Java：本店已迁移到 TSF。Java 自己记录，后续自动翻译任务跳过该店，
 * 避免新旧两版重复翻译。两边 Redis 不同实例，故走 Java API 而非直接写 Redis。
 */
async function notifyJavaShopMigrated(shop: string, server: string): Promise<void> {
  try {
    await MarkShopMigratedToTsf({ shop, server });
  } catch (err) {
    // 非致命：标记失败不应阻断迁移；下次进卡片会再补通知
    console.error(`[migrate] ${shop} 通知 Java 迁移标记失败:`, err);
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
    await notifyJavaShopMigrated(shop, server); // 自愈：标记可能丢失
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

    // 通知 Java 跳过本店的自动翻译（避免双翻译）
    await notifyJavaShopMigrated(shop, server);

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
