type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export type ShopifyAvailableLocale = {
  isoCode: string;
  name: string;
};

/**
 * Shopify 支持启用的全部语言（Admin availableLocales）。
 * 试译页语言列表以此为准，店铺没有的也能先试译；店面验收前再 enable + publish。
 */
export async function loadShopifyAvailableLocales(
  admin: AdminGraphql,
): Promise<ShopifyAvailableLocale[]> {
  const response = await admin.graphql(
    `#graphql
      query TrialAvailableLocales {
        availableLocales {
          isoCode
          name
        }
      }
    `,
  );
  const json = (await response.json()) as {
    data?: {
      availableLocales?: Array<{ isoCode?: string; name?: string }>;
    };
    errors?: unknown;
  };

  if (json.errors) {
    console.error("[trialTranslate] availableLocales errors:", json.errors);
  }

  return (json.data?.availableLocales ?? [])
    .filter((r): r is { isoCode: string; name: string } =>
      Boolean(r?.isoCode && r?.name),
    )
    .map((r) => ({
      isoCode: String(r.isoCode),
      name: String(r.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
