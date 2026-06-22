import prisma from "~/db.server";

/**
 * 术语表的 TSF Prisma 读写。返回形状对齐 Java GlossaryDO，便于术语表页面
 * 在迁移前后复用同一套渲染逻辑（迁移后走这里，未迁移仍走 Java）。
 */
export type GlossaryDoShape = {
  id: number;
  shopName: string;
  sourceText: string;
  targetText: string;
  rangeCode: string | null;
  caseSensitive: number; // 0/1，对齐 Java
  type: number; // 与 caseSensitive 同值，兼容页面字段
  status: number; // 1=启用 0=停用
  createdDate: string;
};

type GlossaryRow = {
  id: number;
  shop: string;
  sourceText: string;
  targetText: string;
  rangeCode: string | null;
  caseSensitive: boolean;
  status: number;
  createdAt: Date;
};

function toDo(g: GlossaryRow): GlossaryDoShape {
  const cs = g.caseSensitive ? 1 : 0;
  return {
    id: g.id,
    shopName: g.shop,
    sourceText: g.sourceText,
    targetText: g.targetText,
    rangeCode: g.rangeCode,
    caseSensitive: cs,
    type: cs,
    status: g.status,
    createdDate: g.createdAt.toISOString(),
  };
}

export async function listGlossaryDo(shop: string): Promise<GlossaryDoShape[]> {
  const rows = await prisma.glossary.findMany({
    where: { shop },
    orderBy: { id: "asc" },
  });
  return rows.map(toDo);
}

export type GlossaryInput = {
  sourceText: string;
  targetText: string;
  rangeCode?: string | null;
  /** 大小写敏感开关（页面里叫 type），0/1 或布尔均可。 */
  type?: number | boolean;
  status?: number;
};

function toCaseSensitive(type: number | boolean | undefined): boolean {
  return type === 1 || type === true;
}

export async function createGlossaryDo(
  shop: string,
  input: GlossaryInput,
): Promise<GlossaryDoShape> {
  const row = await prisma.glossary.create({
    data: {
      shop,
      sourceText: input.sourceText,
      targetText: input.targetText,
      rangeCode: input.rangeCode ?? null,
      caseSensitive: toCaseSensitive(input.type),
      status: input.status ?? 1,
    },
  });
  return toDo(row as GlossaryRow);
}

export async function updateGlossaryDo(
  shop: string,
  id: number,
  input: GlossaryInput,
): Promise<GlossaryDoShape | null> {
  // 限定本店，避免跨店改
  const existing = await prisma.glossary.findFirst({ where: { id, shop } });
  if (!existing) return null;
  const row = await prisma.glossary.update({
    where: { id },
    data: {
      sourceText: input.sourceText,
      targetText: input.targetText,
      rangeCode: input.rangeCode ?? null,
      caseSensitive: toCaseSensitive(input.type),
      ...(input.status != null ? { status: input.status } : {}),
    },
  });
  return toDo(row as GlossaryRow);
}

export async function deleteGlossaryDo(shop: string, ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const res = await prisma.glossary.deleteMany({ where: { shop, id: { in: ids } } });
  return res.count;
}
