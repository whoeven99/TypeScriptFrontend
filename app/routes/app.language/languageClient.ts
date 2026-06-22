import { GetLanguageList, UpdateAutoTranslateByData } from "~/api/JavaServer";

/**
 * 语言页「每语言状态/自动开关」读取的迁移分流。
 * 返回形状对齐 Java GetLanguageList：{ success, response: [{ target, status, autoTranslate }] }
 */
export async function listLanguageStatusCompat(args: {
  migrated: boolean;
  shop: string;
  server: string;
  source: string;
}) {
  if (args.migrated) {
    const res = await fetch("/api/translate-v4/target-locale");
    return res.json();
  }
  return GetLanguageList({
    shop: args.shop,
    server: args.server,
    source: args.source,
  });
}

/**
 * 语言页「按语言自动翻译开关」的迁移分流：已迁移的店写 TSF Prisma
 * （走 /api/translate-v4/target-locale），未迁移的店仍直连 Java。
 */
export async function setAutoTranslateCompat(args: {
  migrated: boolean;
  shopName: string;
  source: string;
  target: string;
  autoTranslate: boolean;
  server: string;
}) {
  if (args.migrated) {
    const res = await fetch("/api/translate-v4/target-locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "setAuto",
        locale: args.target,
        autoTranslate: args.autoTranslate,
      }),
    });
    return res.json();
  }
  return UpdateAutoTranslateByData({
    shopName: args.shopName,
    source: args.source,
    target: args.target,
    autoTranslate: args.autoTranslate,
    server: args.server,
  });
}
