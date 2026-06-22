import { InsertGlossaryInfo, UpdateTargetTextById } from "~/api/JavaServer";

/**
 * 术语表写操作的迁移分流：已迁移的店写 TSF Prisma（走 /api/translate-v4/glossary），
 * 未迁移的店仍直连 Java。两条路返回同样的 { success, response } 形状。
 */
async function postTsfGlossary(body: Record<string, unknown>) {
  const res = await fetch("/api/translate-v4/glossary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function insertGlossaryCompat(args: {
  migrated: boolean;
  shop: string;
  sourceText: string;
  targetText: string;
  rangeCode: string;
  type: number;
  server: string;
}) {
  if (args.migrated) {
    return postTsfGlossary({
      intent: "insert",
      sourceText: args.sourceText,
      targetText: args.targetText,
      rangeCode: args.rangeCode,
      type: args.type,
    });
  }
  return InsertGlossaryInfo({
    shop: args.shop,
    sourceText: args.sourceText,
    targetText: args.targetText,
    rangeCode: args.rangeCode,
    type: args.type,
    server: args.server,
  });
}

export async function updateGlossaryCompat(args: {
  migrated: boolean;
  shop: string;
  data: {
    key: number;
    sourceText: string;
    targetText: string;
    rangeCode: string;
    type: number;
    status: number;
  };
  server: string;
}) {
  if (args.migrated) {
    const d = args.data;
    return postTsfGlossary({
      intent: "update",
      id: d.key,
      sourceText: d.sourceText,
      targetText: d.targetText,
      rangeCode: d.rangeCode,
      type: d.type,
      status: d.status,
    });
  }
  return UpdateTargetTextById({
    shop: args.shop,
    data: args.data,
    server: args.server,
  });
}
