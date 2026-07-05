import { listGlossaryDo } from "~/server/translateV4/glossary.server";
import { getSwitcherConfigForAdmin } from "~/server/storefront/switcherAdmin.server";
import type { ShopLocaleOption } from "~/lib/createTranslateV4Tasks";

export type HomeDiagnostics = {
  unpublishedLocales: Array<{ locale: string; label: string }>;
  glossaryCount: number | null;
  switcher: {
    selectorsEnabled: boolean | null;
    themeEnabled: boolean | null;
  };
};

export type HomeLocaleOption = ShopLocaleOption & {
  primary?: boolean;
  published?: boolean;
};

type AdminGraphqlLike = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

const emptyDiagnostics = (): HomeDiagnostics => ({
  unpublishedLocales: [],
  glossaryCount: null,
  switcher: { selectorsEnabled: null, themeEnabled: null },
});

async function loadSwitcherThemeEnabled(
  admin: AdminGraphqlLike,
): Promise<boolean | null> {
  const switcherBlockType = process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID;
  if (!switcherBlockType) return null;

  try {
    const response = await admin.graphql(
      `#graphql
        query HomeSwitcherThemeDiagnostics {
          themes(roles: MAIN, first: 1) {
            nodes {
              files(filenames: "config/settings_data.json") {
                nodes {
                  body {
                    ... on OnlineStoreThemeFileBodyText {
                      content
                    }
                  }
                }
              }
            }
          }
        }`,
    );
    const data = await response.json();
    const content =
      data?.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body?.content;
    if (typeof content !== "string" || !content.trim()) return null;

    const jsonString = content.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const blocks = JSON.parse(jsonString)?.current?.blocks;
    if (!blocks) return false;

    const switcherBlock = Object.values(blocks).find(
      (block: any) => block?.type === switcherBlockType,
    ) as { disabled?: boolean } | undefined;
    if (!switcherBlock) return false;
    return !switcherBlock.disabled;
  } catch (err) {
    console.error("[translateV4] switcher theme diagnostics failed:", err);
    return null;
  }
}

export async function loadHomeDiagnostics({
  admin,
  shop,
  locales,
}: {
  admin: AdminGraphqlLike;
  shop: string;
  locales: HomeLocaleOption[];
}): Promise<HomeDiagnostics> {
  try {
    const unpublishedLocales = locales
      .filter((locale) => !locale.primary && !locale.published)
      .map((locale) => ({
        locale: locale.value,
        label: locale.label,
      }));

    const [glossaryRows, switcherConfig, switcherThemeEnabled] =
      await Promise.all([
        listGlossaryDo(shop).catch((err) => {
          console.error("[translateV4] glossary diagnostics failed:", err);
          return null;
        }),
        getSwitcherConfigForAdmin(shop).catch((err) => {
          console.error("[translateV4] switcher diagnostics failed:", err);
          return null;
        }),
        loadSwitcherThemeEnabled(admin),
      ]);

    return {
      unpublishedLocales,
      glossaryCount: Array.isArray(glossaryRows)
        ? glossaryRows.filter((row) => row.status === 1).length
        : null,
      switcher: {
        selectorsEnabled: switcherConfig
          ? switcherConfig.languageSelector || switcherConfig.currencySelector
          : null,
        themeEnabled: switcherThemeEnabled,
      },
    };
  } catch (err) {
    console.error("[translateV4] home diagnostics failed:", err);
    return emptyDiagnostics();
  }
}
