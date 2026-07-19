import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { ExpandMarketCard } from "~/lib/expandMarket";

export type { ExpandMarketCard, ExpandMarketRegion } from "~/lib/expandMarket";

type AdminGraphql = Pick<AdminApiContext, "graphql">;

/**
 * 读取 Shopify Markets + Web Presence 语言，供「开拓市场」页使用。
 * 对标 Shopify Markets 口径：市场 = 国家/地区体验，语言挂在 web presence 上。
 */
export async function loadExpandMarkets(
  admin: AdminGraphql,
): Promise<ExpandMarketCard[]> {
  const response = await admin.graphql(
    `#graphql
      query ExpandMarketsOverview {
        markets(first: 25) {
          nodes {
            id
            name
            handle
            primary
            currencySettings {
              baseCurrency {
                currencyCode
              }
            }
            conditions {
              regionsCondition {
                regions(first: 50) {
                  nodes {
                    ... on MarketRegionCountry {
                      code
                      name
                    }
                  }
                }
              }
            }
            webPresences(first: 5) {
              nodes {
                id
                defaultLocale {
                  locale
                }
                alternateLocales {
                  locale
                }
                domain {
                  host
                }
              }
            }
          }
        }
      }
    `,
  );

  const json = (await response.json()) as {
    data?: {
      markets?: {
        nodes?: Array<{
          id?: string;
          name?: string;
          handle?: string | null;
          primary?: boolean;
          currencySettings?: {
            baseCurrency?: { currencyCode?: string | null } | null;
          } | null;
          conditions?: {
            regionsCondition?: {
              regions?: {
                nodes?: Array<{ code?: string; name?: string } | null>;
              } | null;
            } | null;
          } | null;
          webPresences?: {
            nodes?: Array<{
              id?: string;
              defaultLocale?: { locale?: string | null } | null;
              alternateLocales?: Array<{ locale?: string | null } | null> | null;
              domain?: {
                host?: string | null;
              } | null;
            } | null>;
          } | null;
        } | null>;
      };
    };
    errors?: unknown;
  };

  if (json.errors) {
    console.error("[expandMarket] markets query errors:", json.errors);
  }

  const nodes = json.data?.markets?.nodes ?? [];
  return nodes
    .filter((n): n is NonNullable<typeof n> => Boolean(n?.id && n?.name))
    .map((n) => {
      const presence = n.webPresences?.nodes?.find((p) => p?.id) ?? null;
      const regions =
        n.conditions?.regionsCondition?.regions?.nodes
          ?.filter((r): r is { code: string; name: string } =>
            Boolean(r?.code && r?.name),
          )
          .map((r) => ({ code: r.code, name: r.name })) ?? [];
      const alternateLocales =
        presence?.alternateLocales
          ?.map((l) => l?.locale?.trim())
          .filter((l): l is string => Boolean(l)) ?? [];

      return {
        id: n.id!,
        name: n.name!,
        handle: n.handle ?? null,
        primary: Boolean(n.primary),
        currencyCode:
          n.currencySettings?.baseCurrency?.currencyCode ?? null,
        regions,
        webPresenceId: presence?.id ?? null,
        domainHost: presence?.domain?.host ?? null,
        defaultLocale: presence?.defaultLocale?.locale ?? null,
        alternateLocales,
      };
    })
    .sort((a, b) => {
      if (a.primary !== b.primary) return a.primary ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** 把语言挂到某个 Market Web Presence 的 alternateLocales（已存在则幂等）。 */
export async function attachLocaleToWebPresence(
  admin: AdminGraphql,
  args: { webPresenceId: string; locale: string; existingLocales: string[] },
): Promise<{ ok: boolean; error?: string }> {
  const locales = Array.from(
    new Set([...(args.existingLocales ?? []), args.locale].filter(Boolean)),
  );

  const response = await admin.graphql(
    `#graphql
      mutation ExpandMarketAttachLocale($id: ID!, $input: WebPresenceUpdateInput!) {
        webPresenceUpdate(id: $id, input: $input) {
          userErrors { field message }
          webPresence {
            id
            domain {
              localization {
                alternateLocales
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        id: args.webPresenceId,
        input: { alternateLocales: locales },
      },
    },
  );

  const json = (await response.json()) as {
    data?: {
      webPresenceUpdate?: {
        userErrors?: Array<{ message?: string }>;
      };
    };
  };
  const errors = json.data?.webPresenceUpdate?.userErrors ?? [];
  if (errors.length) {
    return {
      ok: false,
      error: errors[0]?.message || "expand.error.attachLocaleFailed",
    };
  }
  return { ok: true };
}
