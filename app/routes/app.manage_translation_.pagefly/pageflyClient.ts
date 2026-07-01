import { EditTranslatedData, ReadTranslatedText } from "~/api/JavaServer";

export type PageFlyTranslationRow = {
  id: number | null;
  sourceText: string;
  targetText: string;
};

/** 读取：灰度店走 TSF Turso，否则走 Java。 */
export async function readPageFlyCompat(args: {
  pageFlyGrayEligible: boolean;
  shop: string;
  server: string;
  languageCode: string;
}): Promise<{
  success: boolean;
  response?: PageFlyTranslationRow[];
  errorMsg?: string;
}> {
  if (args.pageFlyGrayEligible) {
    const res = await fetch(
      `/api/translate-v4/pagefly?languageCode=${encodeURIComponent(args.languageCode)}`,
    );
    return res.json();
  }

  return ReadTranslatedText({
    shop: args.shop,
    server: args.server,
    languageCode: args.languageCode,
  });
}

/** 保存：灰度店走 TSF Turso，否则走 Java。 */
export async function editPageFlyCompat(args: {
  pageFlyGrayEligible: boolean;
  shop: string;
  server: string;
  data: {
    id?: number | null;
    sourceText: string;
    targetText: string;
    languageCode: string;
  }[];
}) {
  if (args.pageFlyGrayEligible) {
    const res = await fetch("/api/translate-v4/pagefly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: args.data }),
    });
    return res.json();
  }

  return EditTranslatedData({
    shop: args.shop,
    server: args.server,
    data: args.data,
  });
}
