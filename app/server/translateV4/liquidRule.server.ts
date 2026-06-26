import prisma from "~/db.server";

/** 对齐 Java UserLiquidDO，便于 Admin 页面迁移前后复用同一套渲染逻辑。 */
export type LiquidDoShape = {
  id: string;
  liquidBeforeTranslation: string;
  liquidAfterTranslation: string;
  languageCode: string | null;
  replacementMethod: boolean;
};

export type LiquidTableRow = {
  key: string;
  sourceText: string;
  targetText: string;
  replacementMethod: boolean;
  languageCode: string;
};

type LiquidRow = {
  id: string;
  shop: string;
  beforeTranslation: string;
  afterTranslation: string;
  languageCode: string | null;
  replacementMethod: boolean;
};

function toDo(row: LiquidRow): LiquidDoShape {
  return {
    id: row.id,
    liquidBeforeTranslation: row.beforeTranslation,
    liquidAfterTranslation: row.afterTranslation,
    languageCode: row.languageCode,
    replacementMethod: row.replacementMethod,
  };
}

export function toLiquidTableRow(item: LiquidDoShape): LiquidTableRow {
  return {
    key: item.id,
    sourceText: item.liquidBeforeTranslation,
    targetText: item.liquidAfterTranslation,
    replacementMethod: item.replacementMethod,
    languageCode: item.languageCode ?? "",
  };
}

export async function listLiquidDo(shop: string): Promise<LiquidDoShape[]> {
  const rows = await prisma.liquidRule.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDo);
}

export type LiquidInput = {
  sourceText: string;
  targetText: string;
  languageCode: string;
  replacementMethod?: boolean;
};

async function findDuplicate(
  shop: string,
  sourceText: string,
  languageCode: string,
  excludeId?: string,
): Promise<LiquidRow | null> {
  return prisma.liquidRule.findFirst({
    where: {
      shop,
      beforeTranslation: sourceText,
      languageCode,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function createLiquidDo(
  shop: string,
  input: LiquidInput,
): Promise<LiquidDoShape | "duplicate"> {
  const dup = await findDuplicate(shop, input.sourceText, input.languageCode);
  if (dup) return "duplicate";

  const row = await prisma.liquidRule.create({
    data: {
      shop,
      beforeTranslation: input.sourceText,
      afterTranslation: input.targetText,
      languageCode: input.languageCode,
      replacementMethod: input.replacementMethod ?? true,
    },
  });
  return toDo(row);
}

export async function updateLiquidDo(
  shop: string,
  id: string,
  input: LiquidInput,
): Promise<LiquidDoShape | null | "duplicate"> {
  const existing = await prisma.liquidRule.findFirst({ where: { id, shop } });
  if (!existing) return null;

  const dup = await findDuplicate(
    shop,
    input.sourceText,
    input.languageCode,
    id,
  );
  if (dup) return "duplicate";

  const row = await prisma.liquidRule.update({
    where: { id },
    data: {
      beforeTranslation: input.sourceText,
      afterTranslation: input.targetText,
      languageCode: input.languageCode,
      ...(input.replacementMethod != null
        ? { replacementMethod: input.replacementMethod }
        : {}),
    },
  });
  return toDo(row);
}

export async function deleteLiquidDo(
  shop: string,
  ids: string[],
): Promise<string[]> {
  if (!ids.length) return [];
  const existing = await prisma.liquidRule.findMany({
    where: { shop, id: { in: ids } },
    select: { id: true },
  });
  const validIds = existing.map((r) => r.id);
  if (!validIds.length) return [];
  await prisma.liquidRule.deleteMany({
    where: { shop, id: { in: validIds } },
  });
  return validIds;
}

/** 对齐 Java updateLiquidReplacementMethod：切换精确/模糊替换。 */
export async function toggleLiquidReplacementMethod(
  shop: string,
  id: string,
): Promise<boolean | null> {
  const existing = await prisma.liquidRule.findFirst({ where: { id, shop } });
  if (!existing) return null;
  const next = !existing.replacementMethod;
  await prisma.liquidRule.update({
    where: { id },
    data: { replacementMethod: next },
  });
  return next;
}
