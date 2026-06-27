import { queryShopLanguages } from "~/api/admin";

export type ShopLocaleRow = {
  locale: string;
  name: string;
  primary: boolean;
  published: boolean;
};

export type LoadedShopLocales = {
  rows: ShopLocaleRow[];
  primaryLocale: string;
  localeOptions: Array<{
    value: string;
    label: string;
    primary: boolean;
    published: boolean;
  }>;
};

/** 与语言页 `queryShopLanguages` 同源，保证 v4 目标语言列表一致。 */
export async function loadShopLocalesForTranslation(args: {
  shop: string;
  accessToken: string;
}): Promise<LoadedShopLocales> {
  const raw = await queryShopLanguages(args);
  const rows: ShopLocaleRow[] = Array.isArray(raw)
    ? raw
        .filter((r) => r?.locale)
        .map((r) => ({
          locale: String(r.locale),
          name: String(r.name ?? r.locale),
          primary: Boolean(r.primary),
          published: Boolean(r.published),
        }))
    : [];

  const primaryLocale = rows.find((r) => r.primary)?.locale ?? "en";
  const localeOptions = rows.map((r) => ({
    value: r.locale,
    label: `${r.name} (${r.locale})`,
    primary: r.primary,
    published: r.published,
  }));

  return { rows, primaryLocale, localeOptions };
}
