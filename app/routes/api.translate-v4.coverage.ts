import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { isTranslateV4Enabled, isTranslateV4ShopAllowed } from "~/server/translateV4/feature.server";
import { computeCoverageSummary } from "~/server/translateV4/coverage.server";

const SHOP_LOCALES_QUERY = `#graphql
  query CoverageShopLocales {
    shopLocales {
      locale
      name
      primary
      published
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!isTranslateV4Enabled()) {
    return json({ ok: false, error: "v4 disabled" }, { status: 403 });
  }

  const { admin, session } = await authenticate.admin(request);
  if (!isTranslateV4ShopAllowed(session.shop)) {
    return json({ ok: false, error: "shop not allowed" }, { status: 403 });
  }

  const url = new URL(request.url);
  const shopName = url.searchParams.get("shopName")?.trim() || session.shop;

  let targetLocales: Array<{ value: string; label: string }> = [];
  try {
    const res = await admin.graphql(SHOP_LOCALES_QUERY);
    const payload = (await res.json()) as {
      data?: {
        shopLocales?: Array<{
          locale: string;
          name: string;
          primary: boolean;
          published: boolean;
        }> | null;
      };
    };
    const rows = payload.data?.shopLocales ?? [];
    targetLocales = rows
      .filter((r) => !r.primary && r.published)
      .map((r) => ({
        value: r.locale,
        label: `${r.name} (${r.locale})`,
      }));
  } catch (err) {
    console.error("[translateV4] coverage locales failed:", err);
    return json({ ok: false, error: "failed to load locales" }, { status: 500 });
  }

  try {
    const summary = await computeCoverageSummary({
      admin,
      shop: shopName,
      targetLocales,
    });
    return json({ ok: true, summary });
  } catch (err) {
    console.error("[translateV4] coverage compute failed:", err);
    return json({ ok: false, error: "coverage compute failed" }, { status: 500 });
  }
};
