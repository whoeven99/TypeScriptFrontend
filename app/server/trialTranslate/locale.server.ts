import { mutationShopLocaleEnable } from "~/api/admin";
import { addTargetLocales } from "~/server/translateV4/targetLocale.server";
import {
  invalidateShopLocalesCache,
  loadShopLocalesForTranslation,
} from "~/server/translateV4/shopLocales.server";

type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

/**
 * 确保目标语言已在店铺启用（保存译文前置），但不发布到店面。
 * - 未启用 → shopLocaleEnable
 * - 同步写入 TSF ShopTargetLocale
 */
export async function ensureTrialLocaleEnabled(args: {
  shop: string;
  accessToken: string;
  locale: string;
  primaryLocale: string;
}): Promise<{
  ok: boolean;
  locale: string;
  published: boolean;
  error?: string;
}> {
  const locale = args.locale.trim();
  if (!locale) {
    return { ok: false, locale, published: false, error: "trial.validation.selectTarget" };
  }
  if (locale === args.primaryLocale) {
    return {
      ok: false,
      locale,
      published: false,
      error: "trial.validation.sameAsSource",
    };
  }

  invalidateShopLocalesCache(args.shop);
  let loaded = await loadShopLocalesForTranslation({
    shop: args.shop,
    accessToken: args.accessToken,
  });
  let row = loaded.rows.find((r) => r.locale === locale);

  if (!row) {
    const enableResults = await mutationShopLocaleEnable({
      shop: args.shop,
      accessToken: args.accessToken,
      source: args.primaryLocale,
      targets: [locale],
    });
    const enabled = enableResults?.some(
      (item) => item.status === "fulfilled" && Boolean(item.value),
    );
    if (!enabled) {
      return {
        ok: false,
        locale,
        published: false,
        error: "trial.error.addLanguageFailed",
      };
    }
    await addTargetLocales(args.shop, [locale]);
    invalidateShopLocalesCache(args.shop);
    loaded = await loadShopLocalesForTranslation({
      shop: args.shop,
      accessToken: args.accessToken,
    });
    row = loaded.rows.find((r) => r.locale === locale);
  }

  if (!row) {
    return {
      ok: false,
      locale,
      published: false,
      error: "trial.error.addLanguageFailed",
    };
  }

  // 已在店铺：仍确保 TSF target 表有记录。是否发布留到店面验收步骤。
  await addTargetLocales(args.shop, [locale]);

  return { ok: true, locale, published: Boolean(row.published) };
}

/**
 * 确保目标语言已在店铺启用并发布（店面验收前置）。
 * - 未启用 → shopLocaleEnable
 * - 未发布 → shopLocaleUpdate(published: true)
 * - 同步写入 TSF ShopTargetLocale
 */
export async function ensureTrialLocaleEnabledAndPublished(args: {
  shop: string;
  accessToken: string;
  admin: AdminGraphql;
  locale: string;
  primaryLocale: string;
}): Promise<{
  ok: boolean;
  locale: string;
  published: boolean;
  error?: string;
}> {
  const ensured = await ensureTrialLocaleEnabled(args);
  if (!ensured.ok) return ensured;

  const locale = ensured.locale;
  if (ensured.published) {
    return { ok: true, locale, published: true };
  }

  const response = await args.admin.graphql(
    `#graphql
      mutation TrialShopLocalePublish($locale: String!, $shopLocale: ShopLocaleInput!) {
        shopLocaleUpdate(locale: $locale, shopLocale: $shopLocale) {
          userErrors { field message }
          shopLocale { locale published primary name }
        }
      }
    `,
    {
      variables: {
        locale,
        shopLocale: { published: true },
      },
    },
  );
  const json = (await response.json()) as {
    data?: {
      shopLocaleUpdate?: {
        userErrors?: Array<{ message?: string }>;
        shopLocale?: { published?: boolean };
      };
    };
  };
  const errors = json.data?.shopLocaleUpdate?.userErrors ?? [];
  if (errors.length > 0) {
    return {
      ok: false,
      locale,
      published: false,
      error: "trial.error.publishLanguageFailed",
    };
  }
  if (!json.data?.shopLocaleUpdate?.shopLocale?.published) {
    return {
      ok: false,
      locale,
      published: false,
      error: "trial.error.publishLanguageFailed",
    };
  }
  invalidateShopLocalesCache(args.shop);

  return { ok: true, locale, published: true };
}
