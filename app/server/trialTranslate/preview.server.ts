import { listV4BlobPaths, readV4Blob } from "~/server/translateV4/blob.server";

export type TrialTranslatedField = {
  key: string;
  originalValue: string;
  translatedValue: string;
  status?: string;
};

export type TrialPreviewPayload = {
  resourceId: string;
  fields: TrialTranslatedField[];
  /** 一眼可见字段映射，供店面式预览使用。 */
  visible: {
    title: string;
    titleTranslated: string;
    bodyHtml: string;
    bodyHtmlTranslated: string;
    seoTitle: string;
    seoTitleTranslated: string;
    seoDescription: string;
    seoDescriptionTranslated: string;
  };
};

type TranslatedResourceItem = {
  resourceId: string;
  translations: Array<{
    key: string;
    originalValue: string;
    translatedValue: string;
    digest: string;
    status?: string;
  }>;
};

function pickField(
  fields: TrialTranslatedField[],
  keys: string[],
): { original: string; translated: string } {
  for (const key of keys) {
    const hit = fields.find((f) => f.key === key);
    if (hit) {
      return {
        original: hit.originalValue ?? "",
        translated: hit.translatedValue ?? "",
      };
    }
  }
  return { original: "", translated: "" };
}

/** 从 Trial blob 读取 PRODUCT 译文，组装预览字段。 */
export async function loadTrialProductPreview(
  blobPrefix: string,
  productId: string,
): Promise<TrialPreviewPayload | null> {
  if (!blobPrefix || !productId) return null;

  const resourcePrefix = `${blobPrefix}/translate/PRODUCT/resources/`;
  const paths = (await listV4BlobPaths(resourcePrefix)).filter((p) =>
    p.endsWith(".json"),
  );

  let item: TranslatedResourceItem | null = null;
  for (const path of paths) {
    const parsed = await readV4Blob<TranslatedResourceItem>(path);
    if (parsed?.resourceId === productId) {
      item = parsed;
      break;
    }
  }

  // 兼容旧 chunk 布局（通常试译不会用到）
  if (!item) {
    const modulePrefix = `${blobPrefix}/translate/PRODUCT/`;
    const chunkPaths = (await listV4BlobPaths(modulePrefix)).filter(
      (p) => p.endsWith(".json") && !p.includes("/resources/"),
    );
    for (const path of chunkPaths) {
      const chunk = await readV4Blob<TranslatedResourceItem[]>(path);
      if (!Array.isArray(chunk)) continue;
      const hit = chunk.find((r) => r?.resourceId === productId);
      if (hit) {
        item = hit;
        break;
      }
    }
  }

  if (!item) return null;

  const fields: TrialTranslatedField[] = (item.translations ?? []).map((t) => ({
    key: t.key,
    originalValue: t.originalValue ?? "",
    translatedValue: t.translatedValue ?? "",
    status: t.status,
  }));

  const title = pickField(fields, ["title"]);
  const body = pickField(fields, ["body_html", "bodyHtml"]);
  const seoTitle = pickField(fields, ["meta_title", "metaTitle"]);
  const seoDescription = pickField(fields, [
    "meta_description",
    "metaDescription",
  ]);

  return {
    resourceId: item.resourceId,
    fields,
    visible: {
      title: title.original,
      titleTranslated: title.translated,
      bodyHtml: body.original,
      bodyHtmlTranslated: body.translated,
      seoTitle: seoTitle.original,
      seoTitleTranslated: seoTitle.translated,
      seoDescription: seoDescription.original,
      seoDescriptionTranslated: seoDescription.translated,
    },
  };
}

/**
 * 目标语言店面「该商品」URL。
 * 优先用 onlineStoreUrl（已是 /products/{handle}），再拼 locale 路径前缀；
 * 否则用 primaryDomain + handle 拼出商品页。
 */
export function buildLocalizedProductUrl(
  onlineStoreUrl: string | null | undefined,
  handle: string | null | undefined,
  primaryDomain: string | null | undefined,
  targetLocale: string,
): string | null {
  const locale = targetLocale.trim();
  const h = (handle ?? "").trim();

  if (onlineStoreUrl) {
    try {
      const url = new URL(onlineStoreUrl);
      // 确保落在 /products/{handle}；若 URL 异常则用 handle 重写。
      if (h && !url.pathname.includes(`/products/${h}`)) {
        url.pathname = `/products/${h}`;
      }
      if (locale) {
        const path = url.pathname.startsWith("/")
          ? url.pathname
          : `/${url.pathname}`;
        if (!path.startsWith(`/${locale}/`) && path !== `/${locale}`) {
          url.pathname = `/${locale}${path}`.replace(/\/{2,}/g, "/");
        }
      }
      return url.toString();
    } catch {
      /* fall through */
    }
  }

  const domain = (primaryDomain ?? "").replace(/\/$/, "");
  if (!domain || !h) return null;
  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  if (locale) return `${base}/${locale}/products/${h}`;
  return `${base}/products/${h}`;
}
