export type PageFlyTranslationRow = {
  id: number | null;
  sourceText: string;
  targetText: string;
};

/** 读取：全量 v4，走 TSF Turso。 */
export async function readPageFlyCompat(args: {
  pageFlyGrayEligible?: boolean;
  shop?: string;
  languageCode: string;
}): Promise<{
  success: boolean;
  response?: PageFlyTranslationRow[];
  errorMsg?: string;
}> {
  const res = await fetch(
    `/api/translate-v4/pagefly?languageCode=${encodeURIComponent(args.languageCode)}`,
  );
  return res.json();
}

/** 保存：全量 v4，写 TSF Turso。 */
export async function editPageFlyCompat(args: {
  pageFlyGrayEligible?: boolean;
  shop?: string;
  data: {
    id?: number | null;
    sourceText: string;
    targetText: string;
    languageCode: string;
  }[];
}) {
  const res = await fetch("/api/translate-v4/pagefly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: args.data }),
  });
  return res.json();
}
