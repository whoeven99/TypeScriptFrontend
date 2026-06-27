import {
  DeleteLiquidDataByIds,
  InsertShopNameLiquidData,
  SelectShopNameLiquidData,
  UpdateLiquidReplacementMethod,
} from "~/api/JavaServer";

export type LiquidTableRow = {
  key: string;
  sourceText: string;
  targetText: string;
  replacementMethod: boolean;
  languageCode: string;
};

function mapLiquidDoToRow(item: Record<string, unknown>): LiquidTableRow {
  return {
    key: String(item?.id ?? ""),
    sourceText: String(item?.liquidBeforeTranslation ?? ""),
    targetText: String(item?.liquidAfterTranslation ?? ""),
    replacementMethod: Boolean(item?.replacementMethod),
    languageCode: String(item?.languageCode ?? ""),
  };
}

async function postTsfLiquid(body: Record<string, unknown>) {
  const res = await fetch("/api/translate-v4/liquid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** 列表：迁移店走 TSF，未迁移店走 Java。 */
export async function selectLiquidCompat(args: {
  migrated: boolean;
  shop: string;
  server: string;
}): Promise<{ success: boolean; response?: LiquidTableRow[]; errorMsg?: string }> {
  if (args.migrated) {
    const res = await fetch("/api/translate-v4/liquid");
    const data = await res.json();
    if (!data.success) return data;
    const rows = (data.response ?? []).map((item: Record<string, unknown>) =>
      mapLiquidDoToRow(item),
    );
    return { success: true, response: rows };
  }

  const data = await SelectShopNameLiquidData({
    shop: args.shop,
    server: args.server,
  });
  if (!data.success) return data;
  const rows = Array.isArray(data.response)
    ? data.response.map((item: Record<string, unknown>) => ({
        key: String(item?.id ?? ""),
        sourceText: String(item?.liquidBeforeTranslation ?? ""),
        targetText: String(item?.liquidAfterTranslation ?? ""),
        replacementMethod: Boolean(item?.replacementMethod),
        languageCode: String(item?.languageCode ?? ""),
      }))
    : [];
  return { success: true, response: rows };
}

/** 新增/编辑：迁移店走 TSF，未迁移店走 Java InsertShopNameLiquidData。 */
export async function insertLiquidCompat(args: {
  migrated: boolean;
  id?: string;
  shop: string;
  server: string;
  sourceText: string;
  targetText: string;
  replacementMethod: boolean;
  languageCode: string;
}) {
  if (args.migrated) {
    if (args.id) {
      return postTsfLiquid({
        intent: "update",
        id: args.id,
        sourceText: args.sourceText,
        targetText: args.targetText,
        replacementMethod: args.replacementMethod,
        languageCode: args.languageCode,
      });
    }
    return postTsfLiquid({
      intent: "insert",
      sourceText: args.sourceText,
      targetText: args.targetText,
      replacementMethod: args.replacementMethod,
      languageCode: args.languageCode,
    });
  }

  const numericId = args.id ? Number(args.id) : undefined;
  return InsertShopNameLiquidData({
    id: numericId && !Number.isNaN(numericId) ? numericId : undefined,
    shop: args.shop,
    server: args.server,
    sourceText: args.sourceText,
    targetText: args.targetText,
    replacementMethod: args.replacementMethod,
    languageCode: args.languageCode,
  });
}

/** 删除：迁移店走 TSF，未迁移店走 Java。 */
export async function deleteLiquidCompat(args: {
  migrated: boolean;
  shop: string;
  server: string;
  ids: string[];
}) {
  if (args.migrated) {
    return postTsfLiquid({ intent: "delete", ids: args.ids });
  }
  const numericIds = args.ids
    .map((x) => Number(x))
    .filter((n) => !Number.isNaN(n));
  return DeleteLiquidDataByIds({
    shop: args.shop,
    server: args.server,
    ids: numericIds,
  });
}

/** 切换替换方式：迁移店走 TSF，未迁移店走 Java。 */
export async function toggleLiquidReplacementMethodCompat(args: {
  migrated: boolean;
  shop: string;
  server: string;
  id: string;
}) {
  if (args.migrated) {
    return postTsfLiquid({ intent: "toggleReplacementMethod", id: args.id });
  }
  const numericId = Number(args.id);
  return UpdateLiquidReplacementMethod({
    shop: args.shop,
    server: args.server,
    id: numericId,
  });
}
