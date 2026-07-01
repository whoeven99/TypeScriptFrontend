import prisma from "~/db.server";

/** 对齐 Java PageFlyVO / Admin 表格字段。 */
export type PageFlyTranslationVO = {
  id: number;
  sourceText: string;
  targetText: string;
};

export type PageFlyEditItem = {
  id?: number | null;
  sourceText: string;
  targetText: string;
  languageCode: string;
};

export async function listPageFlyTranslations(
  shop: string,
  languageCode: string,
): Promise<PageFlyTranslationVO[]> {
  const rows = await prisma.pageFlyTranslation.findMany({
    where: { shop, languageCode, isDeleted: false },
    select: { id: true, sourceText: true, targetText: true },
    orderBy: { id: "asc" },
  });
  return rows;
}

async function allocateNextPageFlyId(): Promise<number> {
  const agg = await prisma.pageFlyTranslation.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

/**
 * 批量新增/更新 PageFly 译文，语义对齐 Java UserPageFlyService.editTranslatedData。
 */
export async function editPageFlyTranslations(
  shop: string,
  items: PageFlyEditItem[],
): Promise<PageFlyTranslationVO[]> {
  if (!items.length) return [];

  const resultList: PageFlyTranslationVO[] = [];

  for (const item of items) {
    if (!item?.sourceText || !item.languageCode) continue;

    if (item.id == null) {
      const id = await allocateNextPageFlyId();
      const row = await prisma.pageFlyTranslation.create({
        data: {
          id,
          shop,
          sourceText: item.sourceText,
          targetText: item.targetText,
          languageCode: item.languageCode,
        },
        select: { id: true, sourceText: true, targetText: true },
      });
      resultList.push(row);
      continue;
    }

    const existing = await prisma.pageFlyTranslation.findFirst({
      where: { id: item.id, shop },
    });
    if (!existing) {
      resultList.push({
        id: item.id,
        sourceText: item.sourceText,
        targetText: item.targetText,
      });
      continue;
    }

    if (item.targetText === "") {
      const row = await prisma.pageFlyTranslation.update({
        where: { id: item.id },
        data: { isDeleted: true, targetText: "" },
        select: { id: true, sourceText: true, targetText: true },
      });
      resultList.push(row);
      continue;
    }

    const row = await prisma.pageFlyTranslation.update({
      where: { id: item.id },
      data: {
        sourceText: item.sourceText,
        targetText: item.targetText,
        languageCode: item.languageCode,
        isDeleted: false,
      },
      select: { id: true, sourceText: true, targetText: true },
    });
    resultList.push(row);
  }

  return resultList;
}
